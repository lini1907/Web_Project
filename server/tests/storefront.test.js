import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { productMedia } from '../src/modules/products/product-media.js';
import { toPublicProduct } from '../src/modules/products/product.dto.js';
import { parse, v } from '../src/utils/validate.js';
import { farmReferencePhotos } from '../src/modules/farms/farm-media.js';

const manifest = JSON.parse(fs.readFileSync(new URL('../src/seed/data/storefront-media.json', import.meta.url),'utf8')).products;
test('all editorial illustrations are shipped locally with credits; missing photos are explicit',()=>{
  assert.equal(Object.keys(manifest).length,89);
  for(const row of Object.values(manifest)) {
    assert.ok(fs.existsSync(new URL(`../../client/public${row.mainImage}`,import.meta.url)),row.name);
    assert.ok(fs.existsSync(new URL(`../../client/public${row.thumbnailImage}`,import.meta.url)),row.name);
    if(row.review==='illustration'){assert.ok(row.imageCredits[0]?.page);assert.ok(row.imageCredits[0]?.license);}
    else assert.equal(row.mainImage,'/media/product-unavailable.svg');
  }
});
test('seed corrections never replace a seller-uploaded main image',()=>{
  const row=manifest['legacy:11'];
  const corrected=productMedia({legacyId:'11',mainImage:row.originalImage});
  assert.equal(corrected.mainImage,row.mainImage);
  assert.deepEqual(corrected.galleryImages,[]);
  const upload=productMedia({legacyId:'11',mainImage:'/uploads/new-fish.jpg',galleryImages:['/uploads/other.jpg']});
  assert.equal(upload.mainImage,'/uploads/new-fish.jpg');assert.equal(upload.photoStatus,'seller-provided');
  assert.deepEqual(upload.galleryImages,['/uploads/other.jpg']);
  const gallery=productMedia({legacyId:'11',mainImage:row.originalImage,galleryImages:[...(row.seedGallery||[]),'/uploads/actual-fish.jpg','https://example.com/seller-photo.jpg']});
  assert.deepEqual(gallery.galleryImages,['/uploads/actual-fish.jpg','https://example.com/seller-photo.jpg']);
});
test('product facts are explicit and demo flag follows seeded provenance',()=>{
  const p=toPublicProduct({_id:'example',legacyId:'x-test',stock:2,price:20000,packagingNote:'Hộp 500g',storageNote:'Xem nhãn',deliveryNote:'Xác nhận với nhà bán'});
  assert.equal(p.isDemo,true);assert.equal(p.packagingNote,'Hộp 500g');assert.equal(p.storageNote,'Xem nhãn');assert.equal(p.deliveryNote,'Xác nhận với nhà bán');
  assert.equal(toPublicProduct({_id:'live',stock:2}).isDemo,false);
});
test('image validation accepts generated media while rejecting executable URL schemes',()=>{
  assert.deepEqual(parse({image:v.url()},{image:'/media/catalog/legacy-11-960.webp'}),{image:'/media/catalog/legacy-11-960.webp'});
  assert.throws(()=>parse({image:v.url()},{image:'javascript:alert(1)'}));
});
test('farm references have local images and attribution, and never attach to unknown farms',()=>{
  const media=JSON.parse(fs.readFileSync(new URL('../src/seed/data/farm-media.json',import.meta.url),'utf8'));
  assert.equal(media.photos.length,15);
  for(const photo of media.photos) {
    assert.equal(photo.kind,'reference');
    assert.ok(photo.source.startsWith('https://commons.wikimedia.org/'));
    assert.ok(photo.license); assert.ok(photo.artist);
    assert.ok(fs.existsSync(new URL(`../../client/public${photo.url}`,import.meta.url)));
    assert.ok(fs.existsSync(new URL(`../../client/public${photo.thumbnail}`,import.meta.url)));
  }
  assert.deepEqual(farmReferencePhotos({name:'Nông trại mới không thuộc dữ liệu mẫu'}),[]);
});
test('avatar can be cleared without allowing unsafe image URLs',()=>{
  assert.deepEqual(parse({avatarUrl:v.url({allowEmpty:true})},{avatarUrl:''}),{avatarUrl:''});
  assert.throws(()=>parse({avatarUrl:v.url({allowEmpty:true})},{avatarUrl:'javascript:alert(1)'}));
  assert.throws(()=>parse({images:v.array(v.url(),{max:8})},{images:Array(9).fill('/media/farm.webp')}));
});
