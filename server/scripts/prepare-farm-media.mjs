import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const cache=path.join(root,'server/.cache/farm-media-metadata.json');
const selected=[
  ['dalat-1','Forcejoj apud Da Lat 01.jpg','Nhà kính tại khu vực Đà Lạt','vegetable'],
  ['dalat-2','Forcejoj apud Da Lat 02.jpg','Không gian nhà kính tại Đà Lạt','vegetable'],
  ['dalat-3','Forcejoj apud Da Lat 04.jpg','Khu canh tác nhà kính tại Đà Lạt','vegetable'],
  ['strawberry','Strawberry greenhouse at a pick-your-own farm, near Den Burg, Texel, 2022.jpg','Mô hình nhà kính trồng dâu tại Texel, Hà Lan','strawberry'],
  ['tea-1','Moc-chau-tea-doi-2094890 960 720.jpg','Đồi chè Mộc Châu','tea'],
  ['tea-2','Chemocchau.jpg','Vùng trồng chè tại Mộc Châu','tea'],
  ['orchard-1','20190924 coconut farm walking path-3.jpg','Lối đi trong vườn dừa tại Bến Tre','orchard'],
  ['orchard-2','20190924 coconut farm walking path-1.jpg','Không gian vườn dừa tại Bến Tre','orchard'],
  ['fish-1','Fish farm in Vietnam.jpg','Mô hình nuôi thủy sản tại Việt Nam','fish'],
  ['fish-2','Fish-farms-vietnam.jpg','Khu nuôi cá tại Việt Nam','fish'],
  ['dairy-1','Desa Cattle Dairy Farm cows roaming.jpg','Trang trại bò sữa Desa tại Sabah, Malaysia','dairy'],
  ['dairy-2','Desa Cattle Dairy Farm Milking.jpg','Khu vắt sữa tại trang trại Desa, Malaysia','dairy'],
  ['poultry-1','Free-range chicken farm. - geograph.org.uk - 153288.jpg','Mô hình chăn nuôi gà thả vườn tại Anh','poultry'],
  ['poultry-2','Free Range Chickens at Aston Farm - geograph.org.uk - 177245.jpg','Gà thả vườn tại Aston Farm, Anh','poultry'],
  ['mushroom','Coltivazione di Pleurotus eryngii.JPG','Mô hình trồng nấm đùi gà','mushroom'],
];
const endpoint=new URL('https://commons.wikimedia.org/w/api.php');
endpoint.search=new URLSearchParams({action:'query',format:'json',titles:selected.map(p=>'File:'+p[1]).join('|'),prop:'imageinfo',iiprop:'url|extmetadata',iiurlwidth:'1200'});
let json;
try {json=JSON.parse(await fs.readFile(cache,'utf8'));} catch {
  let response=await fetch(endpoint,{signal:AbortSignal.timeout(25000)});
  if(response.status===429){await new Promise(r=>setTimeout(r,15000));response=await fetch(endpoint,{signal:AbortSignal.timeout(25000)});}
  if(!response.ok)throw Error(`Commons metadata ${response.status}`);
  json=await response.json();
  await fs.mkdir(path.dirname(cache),{recursive:true});
  await fs.writeFile(cache,JSON.stringify(json));
}
const pages=Object.values(json.query.pages);
const clean=s=>String(s||'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&');
const out=path.join(root,'client/public/media/farms');
await fs.mkdir(out,{recursive:true});
const manifest={note:'Real photographs used as references for demo farm profiles. Not evidence of affiliation with the named FarmTable seller.',photos:[]};
for(const [id,title,caption,group] of selected){
  const p=pages.find(p=>p.title.replaceAll('_',' ').toLowerCase()===('File:'+title).replaceAll('_',' ').toLowerCase());
  const info=p?.imageinfo?.[0];
  if(!info){console.log(`Skip missing: ${title}`);continue;}
  const meta=info.extmetadata||{};
  const license=meta.LicenseShortName?.value||'';
  if(!/CC BY|CC0|Public domain/i.test(license)){console.log(`Skip license: ${title}: ${license}`);continue;}
  if(/AI-generated|Midjourney|Stable Diffusion|DALL-E/i.test(meta.Categories?.value||''))throw Error(`Synthetic source rejected: ${title}`);
  let cached=false;
  try {await fs.access(path.join(out,`${id}-200.webp`));await fs.access(path.join(out,`${id}-1200.webp`));cached=true;} catch {}
  if(!cached){
    let r=await fetch(info.thumburl||info.url,{signal:AbortSignal.timeout(25000)});
    if(r.status===429){await new Promise(resolve=>setTimeout(resolve,15000));r=await fetch(info.thumburl||info.url,{signal:AbortSignal.timeout(25000)});}
    if(!r.ok)throw Error(`Photo ${id}: ${r.status}`);
    const buffer=Buffer.from(await r.arrayBuffer());
    for(const width of [200,1200])await sharp(buffer).rotate().resize({width,height:width,fit:'inside',withoutEnlargement:true}).webp({quality:82}).toFile(path.join(out,`${id}-${width}.webp`));
  }
  manifest.photos.push({id,group,url:`/media/farms/${id}-1200.webp`,thumbnail:`/media/farms/${id}-200.webp`,caption,artist:clean(meta.Artist?.value),license,licenseUrl:meta.LicenseUrl?.value||'',source:info.descriptionurl,kind:'reference'});
  console.log(`Saved ${id}: ${license}`);
}
if(manifest.photos.length<10)throw Error('Not enough licensed photographs to publish the farm gallery');
await fs.writeFile(path.join(root,'server/src/seed/data/farm-media.json'),JSON.stringify(manifest,null,2)+'\n');
await fs.writeFile(path.join(out,'CREDITS.md'),'# Farm reference photographs\n\n'+manifest.note+'\n\nThese are resized WebP derivatives. The original license, including CC BY-SA where applicable, is retained.\n\n'+manifest.photos.map(p=>`## ${p.caption}\n\n${p.artist} · ${p.license}\n\nSource: ${p.source}\n\nLicense: ${p.licenseUrl||p.source}\n\nFiles: ${p.url}, ${p.thumbnail}\n`).join('\n'));
