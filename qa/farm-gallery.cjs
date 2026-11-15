const {chromium}=require('playwright');
const {default:AxeBuilder}=require('@axe-core/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const out=path.join(root,'docs/farm-gallery');
fs.mkdirSync(out,{recursive:true});
const base='http://127.0.0.1:3000';
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--renderer-process-limit=1']});
 const report={views:[],checks:[],errors:[]};
 try {
  const context=await browser.newContext(); const page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));
  const farms=await (await context.request.get(base+'/api/v1/farms')).json();
  assert.ok(farms.length>0);
  for(const f of farms) assert.ok(f.avatarUrl || f.images.length || f.referencePhotos.length, f.name);
  for(const width of [320,768,1440]) for(const route of ['/farms','/farms/dau-tay-da-lat']) {
   await page.setViewportSize({width,height:900}); await page.goto(base+route);
   await page.locator('app-farm-avatar img').first().waitFor();
   await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.getBoundingClientRect().top<innerHeight).map(i=>Promise.race([i.decode().catch(()=>{}),new Promise(r=>setTimeout(r,3000))])));});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,route+width);
   assert.equal(await page.locator('app-farm-avatar img').first().evaluate(i=>i.naturalWidth>0),true);
   if(route.includes('dau-tay')) {
    const large=page.locator('.farm-gallery > figure > img');
    const before=await large.getAttribute('src');
    const thumbs=page.locator('.farm-photo-thumbs button'); assert.equal(await thumbs.count(),3);
    await thumbs.nth(1).click(); await page.waitForFunction(old=>document.querySelector('.farm-gallery > figure > img')?.getAttribute('src')!==old,before); assert.notEqual(await large.getAttribute('src'),before);
    assert.equal(await thumbs.nth(1).getAttribute('aria-pressed'),'true');
    assert.ok(await page.locator('.farm-gallery figcaption a').first().getAttribute('href'));
    await page.screenshot({path:path.join(out,`farm-${width}.png`)});
   }
   if(width===320) {
    const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    assert.deepEqual(axe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
   }
   report.views.push({route,width,overflow:false,avatarLoaded:true});
  }
  for(const route of ['/rescue','/mystery-box','/group-buy']) {
   await page.goto(base+route); await page.locator('h1').waitFor();
   assert.equal((await page.locator('h1').innerText()).includes('—'),false);
  }
  report.checks.push('All seeded farms have avatar imagery; three slogan headings have no em dash; thumbnails switch and cite sources.');
  await page.goto(base+'/'); await page.locator('.farm-chip app-farm-avatar img').first().waitFor();
  // Isolated vendor UI fixture: no changes to the live farm database.
  const vendorContext=await browser.newContext(); const vp=await vendorContext.newPage();
  vp.on('pageerror',e=>report.errors.push(e.message));
  const vendor={id:'111111111111111111111111',role:'vendor',name:'Nhà bán kiểm thử',vendorStatus:'approved'};
  await vp.route('**/api/v1/auth/me',r=>r.fulfill({json:vendor}));
  let fixture={...farms[0],id:'222222222222222222222222',images:[],avatarUrl:'',status:'active'};
  let saved,failed=true;
  await vp.route('**/api/v1/vendor/farms**',async r=>{
   if(r.request().method()==='PATCH') {saved=r.request().postDataJSON();fixture={...fixture,...saved};await r.fulfill({json:fixture});}
   else await r.fulfill({json:[fixture]});
  });
  await vp.route('**/api/v1/vendor/uploads',r=>{
   if(failed){failed=false;return r.fulfill({status:500,json:{error:{code:'UPLOAD_FAILED',message:'Tải ảnh thất bại, vui lòng thử lại'}}});}
   return r.fulfill({json:{url:'/media/farms/dalat-1-200.webp'}});
  });
  await vp.setViewportSize({width:375,height:900}); await vp.goto(base+'/vendor/farm');
  await vp.getByRole('button',{name:'Sửa',exact:true}).first().click();
  const file=path.join(root,'client/public/media/farms/dalat-1-200.webp');
  await vp.locator('input[type=file]').setInputFiles(file);
  await vp.getByRole('alert').filter({hasText:'Tải ảnh thất bại'}).waitFor();
  await vp.locator('input[type=file]').setInputFiles(file);
  await vp.getByRole('button',{name:'Ảnh đại diện',exact:true}).waitFor();
  await vp.getByLabel('Hoặc URL ảnh').fill('/media/farms/dalat-2-200.webp');
  await vp.getByRole('button',{name:'Thêm ảnh',exact:true}).click();
  await vp.getByRole('button',{name:'Dùng làm avatar',exact:true}).click();
  await vp.getByRole('button',{name:'Gỡ ảnh 2',exact:true}).click();
  assert.equal(await vp.getByRole('button',{name:'Ảnh đại diện',exact:true}).count(),1);
  assert.equal(await vp.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await vp.screenshot({path:path.join(out,'vendor-375.png')});
  const axe=await new AxeBuilder({page:vp}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  assert.deepEqual(axe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
  await vp.getByRole('button',{name:'Lưu',exact:true}).click();
  await vp.locator('.farm-photo-editor').waitFor({state:'hidden'});
  assert.deepEqual(saved.images,['/media/farms/dalat-1-200.webp']);
  assert.equal(saved.avatarUrl,'/media/farms/dalat-1-200.webp');
  report.checks.push('Vendor upload failure/retry, URL add, select/remove avatar, and save payload verified with mocked writes.');
  assert.deepEqual(report.errors,[]);
  console.log(JSON.stringify(report,null,2));
 } finally {fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
