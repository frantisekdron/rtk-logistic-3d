import * as T from './three.module.js';
import { buildWarehouse } from './model.js';

const host = document.querySelector('#warehouse');
if (host) init(host);

function init(host) {
  const posterFiles = ['warehouse.webp','view4.webp','view-14.webp'];
  const asset = name => window.rtkBundledPosters?.[name] || new URL('scene/' + name, document.baseURI).href;
  const frameUrls = posterFiles.map(asset);
  const pause = document.querySelector('[data-scene-pause]');
  const turn = document.querySelector('[data-scene-turn]');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const initialAngle = Math.atan2(23,36);
  let index = 0, paused = reduce.matches, inView = true, hidden = document.hidden;
  let renderer, scene, camera, moving, observer, timer = 0;
  let angle = initialAngle, goal = angle, elapsed = 0, activePointer = null, dirty = true, last = 0;
  let orbitCanvas, orbitContext, atlas, orbitReady=false, orbitTimer=0, orbitIndex=0, zoom=1;
  const zoomButton=document.querySelector('[data-scene-zoom]');
  function paintOrbit(){
    if(!orbitReady)return;
    const n=(orbitIndex%36+36)%36, w=atlas.naturalWidth/6, h=atlas.naturalHeight/6;
    orbitContext.clearRect(0,0,600,380);
    orbitContext.drawImage(atlas,(n%6)*w,Math.floor(n/6)*h,w,h,0,0,600,380);
    orbitCanvas.style.transform='scale('+zoom+')';
    host.dataset.frame=String(n);
  }
  function orbitClock(){
    clearInterval(orbitTimer);
    if(orbitReady && !paused && inView && !hidden && activePointer===null)
      orbitTimer=setInterval(()=>{orbitIndex++;paintOrbit();},420);
  }
  zoomButton?.addEventListener('click',()=>{
    zoom=zoom===1?1.28:1;
    zoomButton.setAttribute('aria-pressed',String(zoom>1));
    zoomButton.textContent=zoom>1?'Oddálit':'Přiblížit';
    if(renderer){camera.zoom=zoom;camera.updateProjectionMatrix();refresh();}
    else {poster.style.transform='scale('+zoom+')';paintOrbit();}
  });
  const poster = document.createElement('img');
  poster.addEventListener('load',()=>{host.style.backgroundImage='none';},{once:true});
  poster.src = frameUrls[0];
  poster.alt = '';
  poster.setAttribute('aria-hidden','true');
  poster.draggable = false;
  Object.assign(poster.style,{position:'absolute',inset:'0',width:'100%',height:'100%',objectFit:'contain',pointerEvents:'none'});
  if (getComputedStyle(host).position === 'static') host.style.position='relative';
  host.style.touchAction='pan-y';
  host.append(poster);

  function states(){
    host.dataset.sceneState = renderer ? 'ready' : orbitReady ? 'turntable' : 'poster';
    host.dataset.paused = String(paused);
    if (pause) {
      const label = paused ? 'Spustit animaci' : 'Pozastavit animaci';
      pause.setAttribute('aria-label',label);
      pause.setAttribute('title',label);
      pause.setAttribute('aria-pressed',String(paused));
      pause.querySelector('use')?.setAttribute('href',paused?'#play':'#pause');
    }
  }

  function refresh(){
    dirty=true;
    if (!renderer) {
      orbitClock();
      return;
    }
    if (!timer && inView && !hidden) timer=requestAnimationFrame(draw);
  }

  function staticMode(){
    renderer?.domElement.remove();
    renderer?.dispose();
    renderer=null;
    poster.hidden=false;
    poster.style.opacity='1';
    if(!atlas){
      atlas=new Image();
      orbitCanvas=document.createElement('canvas');
      orbitCanvas.width=600; orbitCanvas.height=380;
      orbitCanvas.className='orbit-canvas';
      orbitContext=orbitCanvas.getContext('2d');
      atlas.onload=()=>{
        if(!orbitContext)return;
        orbitReady=true;
        host.append(orbitCanvas);
        poster.style.opacity='0';
        host.dataset.sceneState='turntable';
        paintOrbit();orbitClock();
      };
      atlas.src=asset('orbit.webp');
    }
    states();
    refresh();
  }

  function resize() {
    if(!renderer)return;
    const w=host.clientWidth,h=host.clientHeight;
    if(!w||!h)return;
    const aspect=w/h;
    const frame=Math.max(34.6,21.95*aspect);
    camera.left=-frame/2;camera.right=frame/2;
    camera.top=frame/2/aspect;camera.bottom=-camera.top;camera.updateProjectionMatrix();
    renderer.setSize(w,h,false);
    refresh();
  }

  function createRenderer(){
    try {
      const canvas=document.createElement('canvas');
      const options={alpha:true,antialias:true,powerPreference:'low-power',premultipliedAlpha:true};
      const gl=canvas.getContext('webgl2',options) || canvas.getContext('webgl',options);
      if(!gl){staticMode();return;}
      renderer=new T.WebGLRenderer({...options,canvas,context:gl});
      renderer.setClearColor(0x000000,0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.8));
      renderer.shadowMap.enabled=true;
      renderer.shadowMap.type=T.PCFSoftShadowMap;
      renderer.outputColorSpace=T.SRGBColorSpace;
      renderer.toneMapping=T.ACESFilmicToneMapping;
      renderer.toneMappingExposure=1.33;
      Object.assign(canvas.style,{position:'absolute',inset:'0',display:'block',width:'100%',height:'100%',cursor:'grab'});
      canvas.setAttribute('aria-hidden','true');
      scene=new T.Scene();
      camera=new T.OrthographicCamera(-17.3,17.3,11,-11,.1,135);
      const model=buildWarehouse();
      moving=model.moving;
      scene.add(model.root);
      const hemi=new T.HemisphereLight(0xeaf8ff,0xa3a29a,1.6);
      const key=new T.DirectionalLight(0xffead0,2.70);
      key.position.set(-13,24,20);
      key.castShadow=true;
      key.shadow.mapSize.set(2048,2048);
      Object.assign(key.shadow.camera,{left:-19,right:19,top:16,bottom:-16,near:1,far:82});
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
      const envTarget=pmrem.fromScene(env,.05,.1,50);
      scene.environment=envTarget.texture;
      pmrem.dispose();
      env.traverse(mesh=>{mesh.geometry?.dispose();mesh.material?.dispose();});
      host.append(canvas);
      canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();staticMode();},{once:true});
      resize();
      states();
    }catch{staticMode();}
  }

  function draw(now){
    timer=0;
    if(!renderer||!inView||hidden)return;
    const dt=last ? Math.min(.05,(now-last)/1000) : 0;
    last=now;
    const rotating=Math.abs(goal-angle)>.0005;
    if(dirty || !paused || rotating){
      if(!paused){
        elapsed+=dt;
        if(activePointer===null) goal+=dt*.15;
      }
      angle+= (goal-angle) * (reduce.matches ? 1 : 1-Math.exp(-8*Math.max(dt,.005)));
      const view=angle;
      camera.position.set(Math.sin(view)*42.7,25.7,Math.cos(view)*42.7);
      camera.lookAt(0,1.7,0);
      moving.position.x=6.30+Math.sin(elapsed*.41)*.90;
      try{renderer.render(scene,camera);}catch{staticMode();return;}
      poster.style.opacity='0';
      dirty=false;
    }
    if(!paused||rotating) timer=requestAnimationFrame(draw);
  }

  function rotateStep(direction){
    if(renderer){
      goal+=direction*Math.PI/4;
    }else if(orbitReady){
      orbitIndex+=direction*4;
      paintOrbit();
    }else{
      index=(index+direction+frameUrls.length)%frameUrls.length;
      poster.src=frameUrls[index];
    }
    refresh();
  }
  turn?.addEventListener('click',()=>rotateStep(1));
  host.addEventListener('keydown',event=>{
    if(event.key!=='ArrowLeft' && event.key!=='ArrowRight')return;
    event.preventDefault();
    rotateStep(event.key==='ArrowRight'?1:-1);
  });
  pause?.addEventListener('click',()=>{paused=!paused;states();refresh();});
  reduce.addEventListener('change',e=>{paused=e.matches;states();refresh();});
  let startX=0,startY=0,startAngle=0,dragging=false;
  host.addEventListener('pointerdown',e=>{
    if(e.button!==0||activePointer!==null)return;
    activePointer=e.pointerId; startX=e.clientX;startY=e.clientY;startAngle=renderer?goal:orbitIndex;dragging=false;orbitClock();
  });
  host.addEventListener('pointermove',e=>{
    if(e.pointerId!==activePointer)return;
    const dx=e.clientX-startX,dy=e.clientY-startY;
    if (!dragging && Math.abs(dx)>5 && Math.abs(dx)>Math.abs(dy)) {
      dragging=true;host.setPointerCapture(e.pointerId);
    }
    if(!dragging)return;
    if(!renderer && orbitReady){
      orbitIndex=Math.round(startAngle-dx/Math.max(host.clientWidth,200)*45);paintOrbit();return;
    }
    if(renderer){
      renderer.domElement.style.cursor='grabbing';
      goal=startAngle-dx/Math.max(host.clientWidth,240)*Math.PI*1.4;
      refresh();
    }
  });
  function endPointer(e){
    if(e.pointerId!==activePointer)return;
    if (dragging && !renderer && !orbitReady && e.type==='pointerup' && Math.abs(e.clientX-startX)>25) {
      index=(index+(e.clientX>startX?1:2))%3;
      poster.src=frameUrls[index];
    }
    activePointer=null;orbitClock();
    if(renderer)renderer.domElement.style.cursor='grab';
    dragging=false;
  }
  for(const type of ['pointerup','pointercancel','lostpointercapture'])host.addEventListener(type,endPointer);
  host.addEventListener('pointerleave',e=>{if(!dragging)endPointer(e);});
  document.addEventListener('visibilitychange',()=>{hidden=document.hidden;last=0;refresh();});
  if(window.ResizeObserver)new ResizeObserver(resize).observe(host);
  else window.addEventListener('resize',resize);
  let requested=false;
  if(!window.IntersectionObserver){createRenderer();return;}
  observer = new IntersectionObserver(entries=>{
    inView=entries[0].isIntersecting;
    if(inView&&!requested){requested=true;createRenderer();}
    last=0;refresh();
  },{rootMargin:'48px'});
  observer.observe(host);
  states();
}
