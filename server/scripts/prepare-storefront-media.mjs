/** Rebuild editorial demo images. Run npm run media from server/. No database writes. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { EXTRA_PRODUCTS } from '../src/seed/extra-products.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = async p => JSON.parse(await fs.readFile(path.join(root, p), 'utf8'));
const legacyRaw = await read('FarmTable/XML+Json/products.json');
const legacy = legacyRaw.products || legacyRaw;
const pool = (await read('server/src/seed/data/product-images.json')).products;
// Explicit selections exclude prepared dishes, leaves-only photos and the wrong species.
const selections = {
  'legacy:2': 1, 'legacy:7': ['x-nac-vai', 0], 'legacy:12': 1, 'legacy:16': 1, 'legacy:35': 0,
  'x-cu-den': 1, 'x-mang-tay': 3, 'x-nam-huong': 4, 'x-bap-my': 1,
  'x-nhan': 4, 'x-mit-thai': 1, 'x-trung-vit': 3, 'x-trung-ga-omega': 1,
  'x-ngheu': 4, 'x-cua-bien': 2, 'x-dui-ga': 1, 'x-bo-034': 2,
  'x-ca-dieu-hong': null, 'x-cai-be-xanh': null, 'x-thanh-long': null,
};
const newCommons = {
  'x-uc-ga': 'Kycklingfilé.jpg',
  'legacy:23': 'Cucumber 6.jpg',
  'legacy:36': 'HK food ingredient red meat frozen pork chop raw butt steak October 2021 SS2 011.jpg',
  'legacy:33': 'Schweinebauch roh.jpg',
  'x-bo-than': 'Beef tenderloin.jpg',
  'x-bi-do': 'Cucurbita moschata Butternut 2012 G2.jpg',
  'x-bap-my': 'Liat Portal for Foodie Disorder - Fresh Corn on the Cob.jpg',
};
const strip = text => String(text || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&');
async function commons(title) {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.search = new URLSearchParams({ action:'query', format:'json', titles:`File:${title}`, prop:'imageinfo', iiprop:'url|extmetadata', iiurlwidth:'960' });
  const res = await fetch(url, { signal:AbortSignal.timeout(20000) });
  if (!res.ok) throw Error(`Commons metadata ${res.status}`);
  const json = await res.json();
  const info = Object.values(json.query.pages)[0].imageinfo?.[0];
  if (!info) throw Error(`No image: ${title}`);
  return {url:info.thumburl, page:info.descriptionurl, title, artist:strip(info.extmetadata.Artist?.value), license:info.extmetadata.LicenseShortName?.value || '', licenseUrl:info.extmetadata.LicenseUrl?.value || ''};
}
const output = path.join(root,'client/public/media/catalog');
const cacheDir = path.join(root,'server/.cache/storefront-media');
await fs.mkdir(output,{recursive:true});
await fs.mkdir(cacheDir,{recursive:true});
const products = [
  ...legacy.filter(p=>p.badge!=='Bí ẩn'&&!['Nhập khẩu','Nhập khẩu trực tiếp'].includes(p.farm)).map(p=>({key:`legacy:${p.id}`,name:p.name,originalImage:p.mainImage,seedGallery:[...(p.galleryImages||[]),...(pool[`legacy:${p.id}`]||[]).map(x=>x.url)]})),
  ...EXTRA_PRODUCTS.map(p=>({key:p.key,name:p.name,originalImage:pool[p.key]?.[0]?.url || '',seedGallery:(pool[p.key]||[]).map(x=>x.url)})),
];
const manifest = { generatedAt:new Date().toISOString(), note:'Stock illustrations only; not evidence of cultivar, origin, condition or certification. Resized and converted to WebP. Original licenses apply.', products:{} };
let index=0;
async function worker() {
  while(index<products.length) {
    const p=products[index++];
    const choice=selections[p.key] ?? 0;
    let source=null;
    try {
      if(newCommons[p.key]) source=await commons(newCommons[p.key]);
      else if(selections[p.key]!==null) source=Array.isArray(choice)?pool[choice[0]]?.[choice[1]]:pool[p.key]?.[choice];
      const id=p.key.replace(':','-');
      const entry={...p,mainImage:'/media/product-unavailable.svg',thumbnailImage:'/media/product-unavailable.svg',imageCredits:[],review:'needs-photo'};
      if(source?.url) {
        const cache=path.join(cacheDir,`${id}-${createHash('sha256').update(source.url).digest('hex').slice(0,12)}.source`);
        let buffer;
        try {buffer=await fs.readFile(cache);} catch {
          const response=await fetch(source.url,{signal:AbortSignal.timeout(20000)});
          if(!response.ok) throw Error(`HTTP ${response.status}`);
          buffer=Buffer.from(await response.arrayBuffer());
          await fs.writeFile(cache,buffer);
        }
        for(const width of [400,960]) await sharp(buffer).rotate().resize({width,height:width,fit:'inside',withoutEnlargement:true}).webp({quality:82,effort:4}).toFile(path.join(output,`${id}-${width}.webp`));
        entry.mainImage=`/media/catalog/${id}-960.webp`;
        entry.thumbnailImage=`/media/catalog/${id}-400.webp`;
        entry.imageCredits=[{...source,url:entry.mainImage,artist:strip(source.artist),modified:'Resized and converted to WebP; original license retained.'}];
        entry.review='illustration';
      }
      manifest.products[p.key]=entry;
      console.log(`${p.key}: ${entry.review}`);
    } catch(error) {
      manifest.products[p.key]={...p,mainImage:'/media/product-unavailable.svg',thumbnailImage:'/media/product-unavailable.svg',imageCredits:[],review:'needs-photo',error:error.message};
      console.log(`${p.key}: needs-photo (${error.message})`);
    }
  }
}
await Promise.all([worker(),worker(),worker()]);
manifest.features = [];
const featureSources = [
  ['hero', 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1200'],
  ['box-fruit', legacy.find(p=>p.id==='13').mainImage],
  ['box-vegetable', 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=800'],
];
for(const [id, originalImage] of featureSources) {
  const response=await fetch(originalImage,{signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error(`Feature image ${id}: ${response.status}`);
  const target=path.join(root,'client/public/media',`${id}.webp`);
  await sharp(Buffer.from(await response.arrayBuffer())).rotate().resize({width:id==='hero'?1200:800,withoutEnlargement:true}).webp({quality:82}).toFile(target);
  manifest.features.push({originalImage,mainImage:`/media/${id}.webp`,source:originalImage,license:'Unsplash License',licenseUrl:'https://unsplash.com/license',modified:'Resized and converted to WebP from existing project illustration.'});
}
await fs.writeFile(path.join(root,'server/src/seed/data/storefront-media.json'),JSON.stringify(manifest,null,2)+'\n');
const credits=Object.values(manifest.products).filter(p=>p.imageCredits.length).map(p=>{const c=p.imageCredits[0];return `## ${p.name}\n\n${c.artist} · ${c.license}\n\nSource: ${c.page}\n\nLocal: ${p.mainImage}\n\n${c.modified}\n`;}).join('\n');
await fs.writeFile(path.join(output,'CREDITS.md'),`# Product illustration credits\n\nThese are stock illustrations, not photographs of actual FarmTable farms or batches. Thumbnails are resized WebP derivatives; the original license applies to each image. CC BY-SA derivatives retain the same license.\n\n${credits}\n# Existing storefront illustrations\n\n${manifest.features.map(p=>`${p.mainImage}\n\nSource: ${p.source}\n\n${p.license}: ${p.licenseUrl}\n\n${p.modified}\n`).join('\n')}`);
// Source downloads are a local build cache, never shipped with the storefront.
await fs.writeFile(path.join(output,'.gitignore'),'*.source\n');
console.log(JSON.stringify({count:products.length,ready:Object.values(manifest.products).filter(p=>p.review==='illustration').length}));
