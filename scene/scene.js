import * as T from './three.module.js';
import {buildWarehouse} from './model.js';
import {truckPoseAt} from './route.js';
import {createStory} from './story.js';

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
  idle: ['Naložit paletu', 'Naložit paletu do žlutého kamionu', 'pallet'],
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
const camera = new T.OrthographicCamera(-20, 20, 20*380/600, -20*380/600, .1, 135);
const center = new T.Vector3(0, 1.6, 1);
const offset = new T.Vector3(Math.sin(.48)*42.7, 24, Math.cos(.48)*42.7);
camera.position.copy(center).add(offset);
camera.lookAt(center);
camera.updateMatrixWorld();
const point = new T.Vector3();
const dock = new T.Vector3(7, 1.3, 4.8).project(camera);
let renderer, model, scene, frames;
let visible = false, started = false, timer = 0, last = 0, focus = 0;
let width = 0, height = 0, hovering = false;

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

async function useFrames() {
  const old = renderer;
  renderer = null;
  old?.domElement.remove();
  old?.dispose();
  poster.hidden = false;
  target.hidden = true;
  host.dataset.sceneState = 'poster';
  try {
    const {loadYardFrames} = await import('./frames.js');
    frames = await loadYardFrames();
    host.prepend(frames.canvas);
    host.dataset.sceneState = 'frames';
    target.hidden = false;
    resize();
  } catch {
    status.textContent = 'Ilustrace skladu RTK v Zápech.';
  }
}

function start() {
  started = true;
  try {
    const canvas = document.createElement('canvas');
    const options = {alpha:true, antialias:true, powerPreference:'low-power', premultipliedAlpha:true};
    const gl = canvas.getContext('webgl2', options) || canvas.getContext('webgl', options);
    if (!gl) {useFrames(); return;}
    renderer = new T.WebGLRenderer({...options, canvas, context:gl});
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.8));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.33;
    canvas.setAttribute('aria-hidden','true');
    scene = new T.Scene();
    model = buildWarehouse();
    scene.add(model.root);
      const hemi=new T.HemisphereLight(0xeaf8ff,0xa3a29a,1.6);
      const key=new T.DirectionalLight(0xffead0,2.70);
      key.position.set(-13,24,20);
      key.castShadow=true;
      key.shadow.mapSize.set(2048,2048);
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
    host.prepend(canvas);
    canvas.addEventListener('webglcontextlost', e => {
      e.preventDefault();
      useFrames();
    }, {once:true});
    host.dataset.sceneState = 'ready';
    target.hidden = false;
    resize();
  } catch {
    useFrames();
  }
}

// Project the truck body with the same camera used to render the yard and its baked frames.
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

function draw(now) {
  timer = 0;
  if (!visible || document.hidden || (!renderer && !frames)) return;
  const dt = last ? Math.min(.25, (now-last)/1000) : 0;
  last = now;
  const reading = hovering || target.matches(':focus-visible');
  story.update(dt, motion.matches, reading);
  const wanted = ['docking','loading','ready','driving'].includes(story.stage) ? 1 : 0;
  focus = motion.matches ? wanted : T.MathUtils.damp(focus,wanted,4.4,dt);
  const zoom = 1 + .28*focus;
  const panX = -dock.x*width*.19*focus;
  const panY = dock.y*height*.19*focus;
  const surface = renderer?.domElement || frames.canvas;
  surface.style.transform = 'translate('+panX+'px,'+panY+'px) scale('+zoom+')';
  let time = story.time;
  if (renderer) {
    model.update(time);
    try {renderer.render(scene,camera);} catch {useFrames(); return;}
  } else {
    time = Math.floor(time*4)/4;
    frames.paint(time);
  }
  poster.hidden = true;
  followTruck(time, zoom, panX, panY);
  if (Math.abs(focus-wanted)>.001 || story.stage==='sent' ||
      (story.stage!=='idle' && story.stage!=='ready') ||
      (story.stage==='idle' && !motion.matches && !reading)) requestDraw();
}

function resume() {last = 0; requestDraw();}
showStage('idle');
target.addEventListener('click', () => {story.load(motion.matches); resume();});
target.addEventListener('pointerenter', e => {hovering = e.pointerType === 'mouse';});
target.addEventListener('pointerleave', () => {hovering = false; resume();});
target.addEventListener('blur', resume);
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
