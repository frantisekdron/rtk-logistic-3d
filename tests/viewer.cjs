const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');

const url = process.env.SITE_URL;
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const artifacts = 'viewer-results';
fs.mkdirSync(artifacts, {recursive:true});

async function verify(browser, {name, mobile, fallback}) {
  const context = await browser.newContext({
    viewport: mobile ? {width:390,height:844} : {width:1440,height:900},
    reducedMotion:'reduce', hasTouch:mobile, isMobile:mobile
  });
  try {
    if (fallback) await context.addInitScript(() => {
      const get = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, ...args) {
        if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null;
        return get.call(this,type,...args);
      };
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', e => { if(e.type()==='error') errors.push(e.text()); });
    await page.goto(url, {waitUntil:'domcontentloaded',timeout:60000});
    const model = page.locator('#warehouse');
    await model.scrollIntoViewIfNeeded();
    await page.waitForFunction(wanted => document.querySelector('#warehouse')?.dataset.sceneState===wanted,
      fallback?'poster':'ready',{timeout:45000});
    assert.equal(await page.locator('.partner-list li').count(),6);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No horizontal overflow');
    if(fallback){
      assert.ok(await model.locator('img').evaluate(img=>img.complete&&img.naturalWidth>0));
      assert.equal(await page.locator('[data-scene-phase=loading]').isDisabled(),true);
      await page.screenshot({path:artifacts+'/'+name+'.png'});
      assert.deepEqual(errors,[]);
      console.log('PASS',name,'real-photo fallback, disabled 3D controls, client references');
      return;
    }
    await page.waitForFunction(()=>document.querySelector('#warehouse img').style.opacity==='0');
    const canvas = model.locator('canvas');
    const signature = async () => digest(await canvas.screenshot());
    const first = await signature();
    const changed = async old => {
      for(let i=0;i<12;i++) {if(await signature()!==old)return;}
      assert.fail('Model pixels did not change after the interaction');
    };
    await page.locator('[data-scene-turn]').click();await changed(first);
    const second=await signature();
    const bounds=await canvas.boundingBox();
    assert.ok(bounds.width>200 && bounds.height>150);
    const x=Math.round(bounds.x+bounds.width*.6), y=Math.round(bounds.y+bounds.height*.52);
    if(mobile){
      const session=await context.newCDPSession(page);
      const touch=(type,dx)=>session.send('Input.dispatchTouchEvent',{type,touchPoints:dx===null?[]:[{x:x+dx,y}]});
      await touch('touchStart',0);for(const dx of [-12,-32,-75,-112])await touch('touchMove',dx);await touch('touchEnd',null);
      await session.detach();
    } else {
      await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x-112,y+1,{steps:12});await page.mouse.up();
    }
    await changed(second);
    const third=await signature();await page.locator('[data-scene-zoom]').click();await changed(third);
    await page.locator('[data-expand-model]').click();
    assert.ok(await page.locator('#model-dialog').evaluate(el=>el.open));
    await page.screenshot({path:artifacts+'/'+name+'.png'});
    await page.locator('[data-expand-model]').click();
    await page.locator('main #warehouse').waitFor({state:'visible'});
    await page.locator('[data-scene-roof]').click();
    assert.equal(await page.locator('[data-scene-roof]').getAttribute('aria-pressed'),'true');
    await page.locator('[data-scene-phase=arrival]').click();
    assert.equal(await model.getAttribute('data-paused'),'false');
    assert.equal(await page.locator('[data-scene-status]').textContent(),'Příjezd k rampě');
    const running=await signature();await changed(running);
    await page.locator('[data-scene-phase=loading]').click();
    assert.equal(await page.locator('[data-scene-status]').textContent(),'Nakládka palet');
    await page.locator('[data-scene-phase=dispatch]').click();
    assert.equal(await page.locator('[data-scene-status]').textContent(),'Expedice zásilky');
    await page.locator('[data-scene-pause]').click();
    assert.equal(await model.getAttribute('data-paused'),'true');
    assert.deepEqual(errors,[]);
    console.log('PASS',name,'3D scene, turn, drag, zoom, enlarged view, cutaway, operation phases and pause');
  } finally { await context.close(); }
}
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,
    args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
  try {
    await verify(browser,{name:'desktop-webgl',mobile:false,fallback:false});
    await verify(browser,{name:'mobile-webgl',mobile:true,fallback:false});
    await verify(browser,{name:'mobile-no-webgl',mobile:true,fallback:true});
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1)});
