import fs from 'node:fs';
import { FARM_META } from '../../seed/farm-meta.js';
import { EXTRA_FARM_META } from '../../seed/extra-products.js';

const photos=JSON.parse(fs.readFileSync(new URL('../../seed/data/farm-media.json',import.meta.url),'utf8')).photos;
const seededNames=new Set([...Object.keys(FARM_META),...Object.keys(EXTRA_FARM_META)]);
export function farmReferencePhotos(farm) {
  if (!seededNames.has(farm.name)) return [];
  let group='vegetable';
  if (/dâu/i.test(farm.name)) group='strawberry';
  else if (/nấm/i.test(farm.name)) group='mushroom';
  else if (/sữa/i.test(farm.name)) group='dairy';
  else if (/gà|\bCP\b/i.test(farm.name)) group='poultry';
  else if (/thủy|hải sản/i.test(farm.name)) group='fish';
  else if (/miệt|trái cây|liên kết|vườn bơ|cô Ba/i.test(farm.name)) group='orchard';
  else if (farm.province==='Sơn La') group='tea';
  const selected=photos.filter(p=>p.group===group);
  return group==='strawberry' ? [...selected,...photos.filter(p=>p.group==='vegetable').slice(0,2)] : selected;
}
