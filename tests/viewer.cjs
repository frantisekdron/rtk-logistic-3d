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
  const truck = yard.locator('button');
  const phase = name => page.locator('figure[data-story="'+name+'"]').waitFor();
  // Hide the moving label in this capture: a pass requires motion in the picture itself.
  const pixels = async () => createHash('sha256').update(await yard.screenshot({
    style:'.truck-target,.yard-play{opacity:0!important}'
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
    page.on('pageerror', err => errors.push(err.message));
    const url = new URL(site);
    url.searchParams.set('v',process.env.GITHUB_SHA || 'test');
    if (direct) url.searchParams.set('animace','1');
    await page.goto(url.href,{waitUntil:'load'});
    await yard.scrollIntoViewIfNeeded();
    assert.ok(await yard.locator('img').evaluate(img => img.complete && img.naturalWidth>0));
    if (!script) {
      assert.equal(await truck.isVisible(),false);
      await expectMotion();
      console.log('PASS',name,'native animated picture moves with scripts disabled');
      return;
    }
    if (reduced && !direct) {
      const before = await pixels();
      await page.waitForTimeout(450);
      assert.equal(await pixels(),before,'Reduced motion starts still');
      await yard.getByRole('link',{name:'Přehrát provoz skladu'}).click();
    }
    await truck.waitFor();
    if (engine==='chromium' && !blocked) await page.waitForSelector('#warehouse[data-surface="film"]');
    if (blocked) assert.equal(await yard.getAttribute('data-surface'),'image');
    await expectMotion();
    if (reduced) {
      console.log('PASS',name,'motion enabled by explicit choice');
      return;
    }
    const box = await truck.boundingBox();
    assert.ok(box.width>=44 && box.height>=44);
    const x=box.x+box.width/2, y=box.y+box.height/2;
    if (mobile) await page.touchscreen.tap(x,y);
    else await page.mouse.click(x,y);
    await phase('ready');
    assert.equal(await truck.getAttribute('aria-label'),'Naloženo. Poslat kamion na cestu');
    assert.match(await yard.locator('img').getAttribute('src'),/na-rampe\.webp$/);
    await page.waitForTimeout(1300);
    await expectMotion();
    await page.screenshot({path:artifacts+'/'+name+'.png'});
    if (mobile) await truck.locator('.truck-bubble').tap();
    else {await truck.focus(); await page.keyboard.press('Enter');}
    await phase('driving');
    await phase('sent');
    await phase('idle');
    assert.deepEqual(await page.locator('.partner-list img').evaluateAll(imgs => imgs.map(i=>i.alt)),
      ['BAUHAUS','OBI','HORNBACH','Globus','baumax','UNI HOBBY']);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.deepEqual(errors,[]);
    console.log('PASS',name,'autoplay, moving pixels, load, moving depot at rest, dispatch and return');
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
