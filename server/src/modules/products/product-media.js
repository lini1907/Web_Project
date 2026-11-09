import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync(new URL('../../seed/data/storefront-media.json', import.meta.url), 'utf8'));
const manifest = data.products;
export function boxImage(image) { return data.features?.find(row => row.originalImage === image)?.mainImage || image || ''; }

/** Editorial corrections affect seed illustrations only. Seller-uploaded replacements always win. */
export function productMedia(p = {}) {
  const key = p.legacyId?.startsWith('x-') ? p.legacyId : `legacy:${p.legacyId}`;
  const entry = manifest[key];
  if (entry && (p.mainImage === entry.originalImage || p.mainImage === entry.mainImage)) {
    const galleryImages = (p.galleryImages || []).filter(url => !(entry.seedGallery || []).includes(url));
    return { mainImage: entry.mainImage, thumbnailImage: entry.thumbnailImage, galleryImages, imageCredits: [...entry.imageCredits, ...(p.imageCredits || []).filter(c => galleryImages.includes(c.url))], photoStatus: entry.review };
  }
  return { mainImage: p.mainImage || '', thumbnailImage: p.mainImage || '', galleryImages: p.galleryImages || [], imageCredits: p.imageCredits || [], photoStatus: p.mainImage ? 'seller-provided' : 'needs-photo' };
}
