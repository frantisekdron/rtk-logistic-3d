const {chromium} = require('playwright-core');
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const fs = require('node:fs');

const artifacts = 'viewer-results';
fs.mkdirSync(artifacts, {recursive:true});
async function verify(browser, {name, mobile, fallback, reduced}) {
  const context = await browser.newContext({
    viewport: mobile ? {width:390,height:844} : {width:1440,height:900},
    reducedMotion: reduced ? 'reduce' : 'no-preference', hasTouch:mobile, isMobile:mobile
  });
  const page = await context.newPage();
  page.setDefaultTimeout(45000);
  try {
    if (fallback) await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type,...args) {
        return type.startsWith('webgl') ? null : original.call(this,type,...args);
      };
    });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', msg => {if (msg.type()==='error') errors.push(msg.text());});
    await page.goto(process.env.SITE_URL, {waitUntil:'domcontentloaded'});
    const yard = page.locator('#warehouse');
    await yard.scrollIntoViewIfNeeded();
    await page.locator('#warehouse[data-scene-state="'+(fallback?'software':'ready')+'"] canvas').waitFor();
    await page.waitForFunction(()=>document.querySelector('.yard-poster').hidden);
    const truck = yard.locator('button');
    const phase = value => page.locator('.model[data-story="'+value+'"]').waitFor();
    // Capture the viewport-cropped yard; a composited canvas element can retain a
    // stale layer screenshot on mobile after a renderer switches.
    const pixels = async () => {
      const box=await yard.boundingBox();
      const screen=page.viewportSize();
      const x=Math.max(0,Math.ceil(box.x)), y=Math.max(0,Math.ceil(box.y));
      const width=Math.min(screen.width-x,Math.floor(box.x+box.width)-x);
      const height=Math.min(screen.height-y,Math.floor(box.y+box.height)-y);
      assert.ok(width>120 && height>100);
      return createHash('sha256').update(await page.screenshot({clip:{x,y,width,height}})).digest('hex');
    };
    const start = await pixels();
    assert.equal(await page.locator('.dispatch-console,input[type=range]').count(),0);
    const logos=page.locator('.partner-list img');
    assert.deepEqual(await logos.evaluateAll(nodes=>nodes.map(img=>img.alt)),['BAUHAUS','OBI','HORNBACH','Globus','baumax','UNI HOBBY']);
    assert.ok(await logos.evaluateAll(async nodes=>{await Promise.all(nodes.map(img=>img.decode()));return nodes.every(img=>img.naturalWidth>0);}));
    assert.equal(await page.locator('.header-cta').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(0, 149, 36)');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.waitForTimeout(420);
    if (reduced) assert.equal(await pixels(),start,'Reduced motion holds until requested');
    else assert.notEqual(await pixels(),start,'The warehouse moves without input');
    if (fallback && !reduced) {
      const cadence=await page.evaluate(async()=>{
        const surface=document.querySelector('#warehouse canvas[data-active]');
        const probe=document.createElement('canvas');probe.width=160;probe.height=100;
        const ctx=probe.getContext('2d',{willReadFrequently:true});
        const images=new Set(), timestamps=[];
        for(let i=0;i<45;i++){
          timestamps.push(await new Promise(requestAnimationFrame));
          ctx.drawImage(surface,0,0,160,100);
          const data=ctx.getImageData(0,0,160,100).data;
          let hash=0;for(let j=0;j<data.length;j+=4)hash=(Math.imul(31,hash)+data[j])|0;
          images.add(hash);
        }
        return {different:images.size,ms:Math.round(timestamps.at(-1)-timestamps[0])};
      });
      assert.ok(cadence.different>=30,'The software renderer draws continuous motion, not a flipbook');
      console.log('Canvas cadence',cadence);
    }
    const body = await truck.boundingBox();
    assert.ok(body.width>=44 && body.height>=44);
    const hit = {x:body.x+body.width/2, y:body.y+body.height/2};
    if (mobile) await page.touchscreen.tap(hit.x,hit.y);
    else await page.mouse.click(hit.x,hit.y);
    await phase('ready');
    assert.equal(await truck.getAttribute('aria-label'),'Naloženo. Poslat kamion na cestu');
    assert.notEqual(await pixels(),start,'Loading changes the view');
    if (!reduced) {
      await page.waitForTimeout(1800);
      const parked=await truck.boundingBox();
      const active=await pixels();
      let changed=false;
      for(let i=0;i<8 && !changed;i++){
        await page.waitForTimeout(200);
        changed=await pixels()!==active;
      }
      console.log('Parked scene',name,await yard.evaluate(el=>({mode:el.dataset.sceneState,visible:document.visibilityState,canvases:el.querySelectorAll('canvas').length,rect:el.getBoundingClientRect().toJSON()})));
      assert.ok(changed,'Other actors still move when the truck is waiting');
      const still=await truck.boundingBox();
      assert.ok(Math.abs(parked.x-still.x)<1 && Math.abs(parked.y-still.y)<1);
    }
    await page.screenshot({path:artifacts+'/'+name+'.png'});
    if (mobile) await truck.locator('.truck-bubble').tap();
    else {await truck.focus();await page.keyboard.press('Enter');}
    if (!reduced) await phase('driving');
    await phase('sent');
    await phase('idle');
    assert.deepEqual(errors,[]);
    console.log('PASS',name,'truck hit target, load, zoom, dispatch, reset, ambient/reduced motion');
  } catch (e) {
    console.error('Scene:',await page.locator('.model').getAttribute('data-story').catch(()=>null));
    await page.screenshot({path:artifacts+'/'+name+'-failure.png'}).catch(()=>{});
    throw e;
  } finally {await context.close();}
}
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,
    args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
  try {
    await verify(browser,{name:'desktop-webgl',mobile:false,fallback:false,reduced:false});
    await verify(browser,{name:'mobile-webgl',mobile:true,fallback:false,reduced:false});
    await verify(browser,{name:'mobile-software',mobile:true,fallback:true,reduced:false});
    await verify(browser,{name:'reduced-motion',mobile:false,fallback:true,reduced:true});
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
