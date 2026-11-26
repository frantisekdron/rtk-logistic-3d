const {chromium, webkit} = require('playwright-core');
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const fs = require('node:fs');

const engine = process.env.BROWSER_ENGINE || 'chromium';
const site = process.env.SITE_URL;
const artifacts = 'viewer-results';
fs.mkdirSync(artifacts, {recursive:true});

async function verify(browser, {name, mobile=false, blocked=false, reduced=false, script=true, direct=false}) {
  const context = await browser.newContext({
    viewport: mobile ? {width:390,height:844} : {width:1440,height:900},
    hasTouch:mobile, isMobile:mobile, javaScriptEnabled:script,
    reducedMotion: reduced ? 'reduce' : 'no-preference'
  });
  const page = await context.newPage();
  page.setDefaultTimeout(40000);
  const errors = [];
  const yard = page.locator('#warehouse');
  const control = yard.locator('.yard-play');
  // Measure playback independently of the control or its focus styling.
  const pixels = async () => createHash('sha256').update(await yard.screenshot({
    style:'.yard-play{opacity:0!important}'
  })).digest('hex');
  async function expectMotion() {
    const first = await pixels();
    for (let i=0; i<6; i++) {
      await page.waitForTimeout(350);
      if (first !== await pixels()) return;
    }
    assert.fail('The visible warehouse pixels stayed still');
  }
  try {
    if (blocked) await page.addInitScript(() => {
      HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('Blocked in test','NotAllowedError'));
      HTMLCanvasElement.prototype.getContext = () => null;
    });
    page.on('pageerror', err => errors.push(err.stack || err.message));
    const url = new URL(site);
    url.searchParams.set('v',process.env.GITHUB_SHA || 'test');
    if (direct) url.searchParams.set('animace','1');
    await page.goto(url.href,{waitUntil:'load'});
    await yard.scrollIntoViewIfNeeded();
    assert.ok(await yard.locator('img').evaluate(img => img.complete && img.naturalWidth>0));
    assert.equal(await yard.locator('.truck-target,.truck-bubble').count(),0);
    if (!script) {
      assert.equal(await control.isVisible(),false);
      await expectMotion();
      console.log('PASS',name,'native animated picture moves with scripts disabled');
      return;
    }
    assert.equal(await yard.getByRole('button').count(),1);
    assert.equal((await control.textContent()).trim(),'');
    assert.equal(await control.locator('use').getAttribute('href'),'#pause');
    if (!blocked) await page.waitForSelector('#warehouse[data-surface="film"]');
    await expectMotion();
    const box = await control.boundingBox();
    const icon = await control.locator('svg').boundingBox();
    assert.ok(box.width >= 44 && box.height >= 44 && icon.width <= 28);
    // A tap in the scene must leave playback alone.
    await yard.click({position:{x:Math.round(box.width*2),y:75}});
    assert.equal(await control.getAttribute('aria-label'),'Pozastavit animaci');
    if (mobile) await control.tap();
    else {await control.focus(); await page.keyboard.press('Space');}
    assert.equal(await control.locator('use').getAttribute('href'),'#play');
    assert.equal(await control.getAttribute('aria-label'),'Přehrát animaci');
    await page.waitForFunction(()=>!document.querySelector('#warehouse video').seeking);
    await yard.locator('img').evaluate(img=>img.decode());
    const clock = await yard.locator('video').evaluate(v=>v.currentTime);
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const stopped = await pixels();
    await page.waitForTimeout(450);
    assert.equal(await pixels(),stopped,'Pause must freeze the scene');
    assert.equal(await yard.locator('video').evaluate(v=>v.currentTime),clock);
    await control.click();
    assert.equal(await control.locator('use').getAttribute('href'),'#pause');
    assert.ok(await yard.locator('video').evaluate(v=>v.currentTime) >= clock-.15);
    await expectMotion();
    await page.screenshot({path:artifacts+'/'+name+'.png'});
    assert.deepEqual(await page.locator('.partner-list img').evaluateAll(imgs => imgs.map(i=>i.alt)),
      ['BAUHAUS','OBI','HORNBACH','Globus','baumax','UNI HOBBY']);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.deepEqual(errors,[]);
    console.log('PASS',name,'autoplay, one icon, inert scene, pause and resume');
  } catch (err) {
    console.error('Scene:',await yard.evaluate(el=>({surface:el.dataset.surface,state:el.closest('figure').dataset.story,image:el.querySelector('img').currentSrc,videoTime:el.querySelector('video').currentTime})).catch(()=>null));
    await page.screenshot({path:artifacts+'/'+name+'-failure.png'}).catch(()=>{});
    throw err;
  } finally {await context.close();}
}

(async()=>{
  const browser = engine==='webkit' ? await webkit.launch() : await chromium.launch({
    executablePath:process.env.CHROME_BIN || '/usr/bin/google-chrome',headless:true
  });
  try {
    await verify(browser,{name:'desktop'});
    await verify(browser,{name:'mobile-autoplay-denied',mobile:true,blocked:true});
    await verify(browser,{name:'no-javascript',script:false});
    await verify(browser,{name:'reduced-motion',reduced:true});
    await verify(browser,{name:'direct-play',reduced:true,direct:true});
  } finally {await browser.close();}
})().catch(err=>{console.error(err);process.exit(1);});
