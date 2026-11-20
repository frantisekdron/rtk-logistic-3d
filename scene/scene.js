import * as T from './three.module.js';
import {buildWarehouse} from './model.js?v=green2';
import {truckPoseAt} from './route.js?v=yard-motion1';
import {createStory} from './story.js?v=yard-motion1';

const host = document.querySelector('#warehouse');
const figure = host.closest('figure');
const poster = host.querySelector('img');
const target = host.querySelector('button');
const bubble = target.querySelector('.truck-bubble');
const line = target.querySelector('.truck-line');
const icon = target.querySelector('use');
const status = document.getElementById('yard-status');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const words = {
  idle: ['Naložit paletu', 'Naložit paletu do zeleného kamionu', 'pallet'],
  docking: ['Couvám k rampě…', 'Kamion couvá k rampě.', 'truck'],
  loading: ['Ještě tuhle krabici…', 'Vozík nakládá paletu do kamionu.', 'pallet'],
  ready: ['Naloženo. Jedem?', 'Naloženo. Poslat kamion na cestu', 'truck'],
  driving: ['Držte si krabice!', 'Kamion se zásilkou vyjíždí.', 'truck'],
  sent: ['Šťastnou cestu!', 'Zásilka je na cestě.', 'truck']
};
let labelWidth = 0;
function showStage(stage) {
  const [text, description, symbol] = words[stage];
  figure.dataset.story = stage;
  line.textContent = text;
  icon.setAttribute('href', '#' + symbol);
  target.setAttribute('aria-label', description);
  target.setAttribute('aria-disabled', String(stage !== 'idle' && stage !== 'ready'));
  if (stage !== 'idle') status.textContent = description;
  labelWidth = bubble.offsetWidth;
}

const story = createStory(showStage);
const camera = new T.OrthographicCamera(-22, 22, 22*380/600, -22*380/600, .1, 135);
const center = new T.Vector3(0, 1.6, 1);
const offset = new T.Vector3(Math.sin(.48)*42.7, 24, Math.cos(.48)*42.7);
camera.position.copy(center).add(offset);
camera.lookAt(center);
camera.updateMatrixWorld();
const point = new T.Vector3();
const dock = new T.Vector3(7, 1.3, 4.8).project(camera);
let renderer, model, scene, software;
let yardTime=15, shadowTime=-1, frameTime=0, sampleTime=0, slowWindows=0;
let switching=false, softwareFailed=false, firstPaint=0;
const coarse=matchMedia('(pointer:coarse)').matches;
const maxRatio=Math.min(devicePixelRatio || 1,coarse?1.35:1.6);
let visible = false, started = false, timer = 0, last = 0, focus = 0;
let width = 0, height = 0;

function requestDraw() {
  if (visible && !document.hidden && !timer) timer = requestAnimationFrame(draw);
}
function resize() {
  width = host.clientWidth;
  height = host.clientHeight;
  labelWidth = bubble.offsetWidth;
  renderer?.setSize(width, height, false);
  requestDraw();
}

async function useSoftware(keepPicture=false) {
  if (switching || software) return;
  switching=true;
  const old=renderer;
  if (!keepPicture) {
    renderer=null;
    old?.domElement.remove();
    old?.dispose();
    poster.classList.remove('painted');
    poster.hidden=false;
    target.hidden=true;
    host.dataset.sceneState='poster';
  }
  try {
    const {loadSoftwareYard}=await import('./software.js');
    const next=await loadSoftwareYard(model,camera);
    model.update(story.time,yardTime);
    next.paint();
    software=next; renderer=null;
    if (old && keepPicture) {
      old.domElement.removeAttribute('data-active');
      old.domElement.animate([{opacity:1},{opacity:0}],{duration:280,fill:'forwards'})
        .finished.finally(()=>{old.domElement.remove();old.dispose();}).catch(()=>{});
      next.canvas.style.transform=old.domElement.style.transform;
    }
    next.canvas.dataset.active='';
    host.prepend(next.canvas);
    host.dataset.sceneState='software';
    target.hidden=false;
    resize();
  } catch {
    softwareFailed=true;
    if (!keepPicture) status.textContent='Ilustrace skladu RTK v Zápech.';
  } finally {switching=false;}
}

function start() {
  started = true;
  try {
    model=buildWarehouse();
    const canvas = document.createElement('canvas');
    const options = {alpha:true, antialias:true, powerPreference:'default', premultipliedAlpha:true};
    const gl = canvas.getContext('webgl2', options) || canvas.getContext('webgl', options);
    if (!gl) {useSoftware(); return;}
    renderer = new T.WebGLRenderer({...options, canvas, context:gl});
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(maxRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.33;
    canvas.setAttribute('aria-hidden','true');
    scene = new T.Scene();
    scene.add(model.root);
      const hemi=new T.HemisphereLight(0xeaf8ff,0xa3a29a,1.6);
      const key=new T.DirectionalLight(0xffead0,2.70);
      key.position.set(-13,24,20);
      key.castShadow=true;
      key.shadow.mapSize.setScalar(coarse?512:1024);
      Object.assign(key.shadow.camera,{left:-23,right:23,top:22,bottom:-22,near:1,far:82});
      key.shadow.camera.updateProjectionMatrix();
      key.shadow.bias=-.0004;key.shadow.normalBias=.021;
      const rim=new T.DirectionalLight(0xd3e7ff,1.5);
      rim.position.set(10,13,-9);
      scene.add(hemi,key,rim);
      const env=new T.Scene();
      env.background=new T.Color('#71828a');
      for(const [x,y,z,w,h,power] of [[-8,6,9,8,6,3.7],[9,5,5,3,7,1.5],[0,9,-9,8,3,3.1]]){
        const mat=new T.MeshBasicMaterial({color:new T.Color(power,power,power),side:T.DoubleSide});
        const panel=new T.Mesh(new T.PlaneGeometry(w,h),mat);
        panel.position.set(x,y,z);panel.lookAt(0,0,0);env.add(panel);
      }
      const pmrem=new T.PMREMGenerator(renderer);
      const envTarget=pmrem.fromScene(env,.03,.1,50);
      scene.environment=envTarget.texture;
      pmrem.dispose();
      env.traverse(mesh=>{mesh.geometry?.dispose();mesh.material?.dispose();});
    canvas.dataset.active='';
    host.prepend(canvas);
    canvas.addEventListener('webglcontextlost', e => {
      e.preventDefault();
      useSoftware();
    }, {once:true});
    host.dataset.sceneState = 'ready';
    target.hidden = false;
    resize();
  } catch {
    useSoftware();
  }
}

// Project the truck body with the same camera used by both renderers.
function followTruck(time, zoom, panX, panY) {
  const {x, z, heading} = truckPoseAt(time);
  const sin = Math.sin(heading), cos = Math.cos(heading);
  let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
  for (const dx of [-.8, .8]) for (const dz of [-2.05, 2.7]) for (const y of [.15, 2.32]) {
    point.set(x + dx*cos + dz*sin, y, z - dx*sin + dz*cos).project(camera);
    const px = (1 + point.x*zoom) * width/2 + panX;
    const py = (1 - point.y*zoom) * height/2 + panY;
    left = Math.min(left, px); right = Math.max(right, px);
    top = Math.min(top, py); bottom = Math.max(bottom, py);
  }
  const cx = (left+right)/2;
  const bubbleCenter = Math.max(labelWidth/2+8, Math.min(width-labelWidth/2-8, cx));
  target.style.left = cx + 'px';
  target.style.top = (top+bottom)/2 + 'px';
  target.style.width = Math.max(44, right-left) + 'px';
  target.style.height = Math.max(44, bottom-top) + 'px';
  const shift = bubbleCenter-cx;
  target.style.setProperty('--bubble-x', 'calc(50% + ' + shift + 'px)');
  target.style.setProperty('--tip-x', 'calc(50% - ' + shift + 'px)');
}

function adaptResolution(dt) {
  if (!renderer || !dt) return;
  frameTime=frameTime ? frameTime+(dt-frameTime)*.06 : dt;
  sampleTime+=dt;
  if (sampleTime<2.5) return;
  sampleTime=0;
  // Shader compilation can slow the first frames. Require two slow windows.
  slowWindows=frameTime>1/24?slowWindows+1:0;
  if (slowWindows>=2 && !softwareFailed) {useSoftware(true);return;}
  const old=renderer.getPixelRatio();
  const next=frameTime>1/35 ? Math.max(.75,old-.2) : frameTime<1/57 ? Math.min(maxRatio,old+.12) : old;
  if (Math.abs(next-old)>.02) renderer.setPixelRatio(next);
}

function draw(now) {
  timer=0;
  if (!visible || document.hidden || (!renderer && !software)) return;
  const gap=last?(now-last)/1000:0;
  const dt=Math.min(.1,gap);
  last=now;
  story.update(dt,motion.matches);
  if (!motion.matches) yardTime+=dt;
  const wanted={idle:0,docking:.42,loading:1,ready:1,driving:.55,sent:0}[story.stage];
  focus=motion.matches?wanted:T.MathUtils.damp(focus,wanted,2.5,dt);
  const zoom=1+.24*focus,panX=-dock.x*width*.18*focus,panY=dock.y*height*.18*focus;
  const surface=renderer?.domElement || software.canvas;
  surface.style.transform='translate('+panX+'px,'+panY+'px) scale('+zoom+')';
  model.update(story.time,yardTime);
  if (renderer) {
    if (!motion.matches) adaptResolution(Math.min(gap,.6));
    if (now-shadowTime>=42 || motion.matches || shadowTime<0) {
      renderer.shadowMap.needsUpdate=true;
      shadowTime=now;
    }
    try {renderer.render(scene,camera);} catch {useSoftware();return;}
  } else software.paint();
  if (!poster.hidden) {
    if (!poster.classList.contains('painted')) {firstPaint=now;poster.classList.add('painted');}
    if (motion.matches || now-firstPaint>500) poster.hidden=true;
  }
  followTruck(story.time,zoom,panX,panY);
  if (!motion.matches || story.stage==='sent') requestDraw();
}

function resume() {last=0; requestDraw();}
showStage('idle');
target.addEventListener('click',()=>{story.load(motion.matches);requestDraw();});
motion.addEventListener('change', resume);
document.addEventListener('visibilitychange', resume);
if (window.ResizeObserver) new ResizeObserver(resize).observe(host);
else window.addEventListener('resize',resize);
if (window.IntersectionObserver) {
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !started) start();
    resume();
  }).observe(host);
} else {visible = true; start();}
