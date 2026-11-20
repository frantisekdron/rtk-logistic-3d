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
  page.setDefaultTimeout(20000);
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
    await page.locator('#warehouse[data-scene-state="'+(fallback?'frames':'ready')+'"] canvas').waitFor();
    await page.waitForFunction(()=>document.querySelector('.yard-poster').hidden);
    const truck = yard.locator('button');
    const phase = value => page.locator('.model[data-story="'+value+'"]').waitFor();
    const pixels = async () => createHash('sha256').update(await yard.locator('canvas').screenshot()).digest('hex');
    const start = await pixels();
    assert.equal(await page.locator('.dispatch-console,input[type=range]').count(),0);
    assert.equal(await page.locator('.partner-list li').count(),6);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.waitForTimeout(420);
    if (reduced) assert.equal(await pixels(),start,'Reduced motion holds until requested');
    else assert.notEqual(await pixels(),start,'The warehouse moves without input');
    const body = await truck.boundingBox();
    assert.ok(body.width>=44 && body.height>=44);
    const hit = {x:body.x+body.width/2, y:body.y+body.height/2};
    if (mobile) await page.touchscreen.tap(hit.x,hit.y);
    else await page.mouse.click(hit.x,hit.y);
    await phase('ready');
    assert.equal(await truck.getAttribute('aria-label'),'Naloženo. Poslat kamion na cestu');
    assert.notEqual(await pixels(),start,'Loading changes the view');
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
    await verify(browser,{name:'mobile-frames',mobile:true,fallback:true,reduced:false});
    await verify(browser,{name:'reduced-motion',mobile:false,fallback:true,reduced:true});
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
