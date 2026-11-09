const { chromium } = require('playwright');
const { default: AxeBuilder } = require('@axe-core/playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'docs/storefront-upgrade');
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:3000';
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: process.env.QA_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined), headless: true, args: ['--renderer-process-limit=1'] });
  const report = { base, environment: 'Edge headless, emulated viewports. Lab observations, not field Core Web Vitals or human usability results.', views: [], tests: [], errors: [], externalAssets: [], performance: [] };
  let context, page;
  const save = () => fs.writeFileSync(path.join(out, 'browser-results.json'), JSON.stringify(report, null, 2));
  async function fresh() {
    if (context) await context.close();
    context = await browser.newContext({ viewport: { width: 375, height: 844 } });
    await context.addInitScript(() => {
      window.__lab = { lcp: null, cls: 0 };
      new PerformanceObserver(list => { for (const e of list.getEntries()) window.__lab.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__lab.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
    });
    page = await context.newPage();
    page.on('pageerror', e => report.errors.push(e.message));
    page.on('request', r => { if (['image','font','stylesheet'].includes(r.resourceType()) && !r.url().startsWith(base) && !r.url().startsWith('data:')) report.externalAssets.push(r.url()); });
  }
  async function settle() {
    await page.locator('#main > :not(router-outlet)').waitFor();
    await page.locator('.spinner').waitFor({ state: 'hidden', timeout: 25000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].filter(i => i.getBoundingClientRect().top < innerHeight).map(i => Promise.race([i.decode().catch(() => {}), new Promise(r => setTimeout(r, 4000))])));
    });
  }
  async function visit(route, width = 375, capture = false, axe = false) {
    await page.setViewportSize({ width, height: width < 700 ? 844 : 1000 });
    await page.goto(base + route); await settle();
    const view = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, font: getComputedStyle(document.body).fontFamily, brokenImages: [...document.images].filter(i => i.complete && !i.naturalWidth).length }));
    assert.equal(view.overflow, false, `overflow: ${route} ${width}`);
    assert.equal(view.brokenImages, 0);
    assert.ok(view.font.includes('Nunito Sans'));
    if (axe) {
      const results = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
      view.violations = results.violations.map(v => ({ id:v.id, targets:v.nodes.map(n=>n.target) }));
      assert.equal(view.violations.length, 0, JSON.stringify(view.violations));
    }
    report.views.push({ route, width, ...view });
    if (capture) await page.screenshot({ path:path.join(out, `${route==='/'?'home':route.split('/').filter(Boolean).slice(0,1).join('-')}-${width}.png`) });
    save();
  }
  async function step(name, fn) {
    try { await fn(); report.tests.push({ name, passed:true }); }
    catch(e) { report.tests.push({ name, passed:false, error:e.message }); throw e; }
    finally { save(); }
  }
  try {
    await fresh();
    const info = await (await context.request.get(base+'/api/v1/storefront-info')).json();
    assert.equal(info.shippingFee, 20000); assert.equal(info.freeShippingFrom, 200000);
    const products = await (await context.request.get(base+'/api/v1/products?limit=50')).json();
    const product = products.data[0];
    const farms = await (await context.request.get(base+'/api/v1/farms')).json();
    const detail = '/products/'+product.slug;
    await step('Responsive storefront, source transparency and local fonts', async () => {
      for (const route of ['/', '/shop', detail, '/farms/'+farms[0].slug, '/mystery-box']) for (const width of [375,1440]) await visit(route,width,true,width===375);
      for (const width of [320,768,900]) await visit(detail,width);
      assert.equal(report.externalAssets.length,0, 'Public catalog assets must load from same origin');
    });
    await step('Quantity updates product total and demo claims are explicit', async () => {
      await visit(detail);
      assert.ok(await page.getByText('Dữ liệu mẫu · chưa phải hồ sơ nhà bán đã xác minh').isVisible());
      await page.getByRole('button',{name:'Tăng',exact:true}).click();
      await page.waitForFunction(expected => Number(document.querySelector('.quantity-total b').textContent.replace(/\D/g,'')) === expected, product.price*2);
      assert.ok(await page.getByRole('heading',{name:'Nguồn gốc và chứng nhận'}).isVisible());
    });
    await step('Invalid price ranges stay inline without requesting products', async () => {
      await visit('/shop');await page.getByRole('button',{name:'Bộ lọc',exact:false}).click();
      await page.getByRole('spinbutton',{name:'Giá từ',exact:true}).fill('50000');
      await page.getByRole('spinbutton',{name:'Giá đến',exact:true}).fill('10000');
      await page.getByRole('button',{name:'Áp dụng',exact:true}).click();
      await page.locator('#price-filter-error').waitFor();
      assert.equal(new URL(page.url()).search,'');
    });
    await step('One failed home section preserves the other products', async () => {
      await page.route('**/api/v1/group-buys?*',r=>r.fulfill({status:503,json:{error:{code:'UNAVAILABLE',message:'Mua chung tạm thời không tải được'}}}));
      await visit('/');
      await page.getByText('Chưa tải được mua chung.',{exact:false}).waitFor();
      assert.ok(await page.locator('app-product-card').count());
      await page.unroute('**/api/v1/group-buys?*');
      await page.getByRole('button',{name:'Tải lại nội dung'}).click();await settle();
      assert.equal(await page.getByRole('button',{name:'Tải lại nội dung'}).count(),0);
    });
    await step('Unavailable farm filter preserves shop and retries cleanly', async () => {
      await page.route('**/api/v1/farms',r=>r.fulfill({status:503,json:{error:{code:'UNAVAILABLE',message:'Tạm lỗi'}}}));
      await visit('/shop');await page.getByRole('button',{name:'Bộ lọc',exact:false}).click();
      await page.getByText('Chưa tải được danh sách nông trại.',{exact:false}).waitFor();
      assert.ok(await page.locator('app-product-card').count());
      await page.unroute('**/api/v1/farms');await page.getByRole('button',{name:'Thử lại',exact:true}).click();
      await page.getByText('Chưa tải được danh sách nông trại.',{exact:false}).waitFor({state:'hidden'});
    });
    await step('Sold-out and newly expired rescue products cannot be purchased', async () => {
      let fixture={...product,inStock:false};
      await page.route('**/api/v1/products/'+product.slug,r=>r.fulfill({json:fixture}));
      await visit(detail);assert.equal(await page.getByRole('button',{name:'Mua ngay',exact:true}).isEnabled(),false);
      fixture={...product,inStock:true,type:'rescue',rescue:{originalPrice:product.price*2,discountRate:50,expiresAt:new Date(Date.now()+2000).toISOString(),reason:'Hình thức không đồng đều',expired:false}};
      await page.reload();await settle();
      await page.getByText('Hàng giải cứu đã hết hạn bán',{exact:false}).waitFor({timeout:8000});
      assert.equal(await page.getByRole('button',{name:'Mua ngay',exact:true}).isEnabled(),false);
      await page.unroute('**/api/v1/products/'+product.slug);
    });
    const envPath=path.join(root,'server/.env');
    const password=process.env.UI_QA_PASSWORD || (fs.existsSync(envPath) ? fs.readFileSync(envPath,'utf8').match(/^SEED_DEMO_PASSWORD=(.*)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g,'') : null);
    assert.ok(password,'Set UI_QA_PASSWORD for seeded buyer checks');
    await fresh();await visit('/login');
    await page.locator('[formcontrolname="email"]').fill('bich.tran@example.com');
    await page.locator('[formcontrolname="password"]').fill(password);
    await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await page.waitForURL(u=>!u.pathname.includes('/login'));
    await step('Checkout preserves form, updates price and retries safely without placing a real order',async()=>{
      let cost=product.price;
      const cart=()=>({items:[{id:'qa-line',kind:'product',productId:product.id,name:product.name,slug:product.slug,image:product.thumbnailImage||product.mainImage,unit:product.unit,unitPrice:cost,qty:1,lineTotal:cost,available:5,isRescue:false,vendor:{id:'qa-vendor',name:'Nhà bán kiểm thử'},warning:null}],itemCount:1,subtotal:cost,shippingFee:cost>=info.freeShippingFrom?0:info.shippingFee,total:cost+(cost>=info.freeShippingFrom?0:info.shippingFee),shippingRule:{fee:info.shippingFee,freeFrom:info.freeShippingFrom},hasIssues:false});
      await page.route('**/api/v1/cart',r=>r.fulfill({json:cart()}));
      const keys=[];
      await page.route('**/api/v1/orders',r=>{
        keys.push(r.request().headers()['idempotency-key']);
        if(keys.length===1){cost+=1000;return r.fulfill({status:409,json:{error:{code:'PRICE_CHANGED',message:'Giá đã thay đổi. Kiểm tra tổng mới.'}}});}
        return r.abort('failed');
      });
      await visit('/checkout');
      await page.locator('[name="name"]').fill('Người kiểm thử');
      await page.locator('[name="phone"]').fill('0901234567');
      await page.locator('[name="address"]').fill('Địa chỉ kiểm thử, không giao hàng');
      await page.locator('[name="save"]').uncheck();
      await page.getByRole('button',{name:'Đặt hàng (COD)',exact:true}).click();
      await page.getByText('Giá hoặc phí ship vừa thay đổi.',{exact:false}).waitFor();
      assert.equal(await page.locator('[name="address"]').inputValue(),'Địa chỉ kiểm thử, không giao hàng');
      await page.getByRole('button',{name:'Đặt hàng (COD)',exact:true}).click();
      await page.getByText('Chưa xác nhận được kết quả đặt hàng.',{exact:false}).waitFor();
      await page.getByRole('button',{name:'Đặt hàng (COD)',exact:true}).click();
      await page.waitForFunction(()=>document.querySelector('[data-submit-error]')?.textContent.includes('Chưa xác nhận'));
      assert.equal(keys.length,3);assert.ok(keys[1]);assert.equal(keys[1],keys[2]);assert.notEqual(keys[0],keys[1]);
      assert.equal(await page.locator('.toast-error').count(),0,'Checkout errors stay inline instead of covering the submit button');
      await page.screenshot({path:path.join(out,'checkout-network.png')});
    });
    await fresh();
    await step('Production cold-load lab metrics',async()=>{
      await visit('/',375);
      await page.waitForTimeout(500);
      report.performance.push(await page.evaluate(()=>({viewport:innerWidth,...window.__lab,resourceTransferBytes:performance.getEntriesByType('resource').reduce((n,r)=>n+r.transferSize,0),navigationMs:performance.getEntriesByType('navigation')[0]?.duration})));
      assert.equal(report.externalAssets.length,0);
    });
    assert.equal(report.errors.length,0,JSON.stringify(report.errors));
    console.log(JSON.stringify({views:report.views.length,tests:report.tests,errors:report.errors,externalAssets:report.externalAssets,performance:report.performance},null,2));
  } finally { save(); await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1)});
