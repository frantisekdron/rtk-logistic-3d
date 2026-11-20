import * as T from './three.module.js';
import { buildWarehouse } from './model.js';

const host = document.querySelector('#warehouse');
if (host) init(host);

function init(host) {
  const posterFiles = ['../assets/areal.webp'];
  const asset = name => window.rtkBundledPosters?.[name] || new URL('scene/' + name, document.baseURI).href;
  const frameUrls = posterFiles.map(asset);
  const pause = document.querySelector('[data-scene-pause]');
  const turn = document.querySelector('[data-scene-turn]');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const initialAngle = Math.atan2(23,36);
  let index = 0, paused = reduce.matches, inView = true, hidden = document.hidden;
  let renderer, scene, camera, model, observer, timer = 0;
  let cutaway=false;
  const phaseButtons=[...document.querySelectorAll('[data-scene-phase]')];
  const roofButton=document.querySelector('[data-scene-roof]');
  const status=document.querySelector('[data-scene-status]');
  const phaseNames={arrival:"Příjezd k rampě",loading:"Nakládka palet",dispatch:"Expedice zásilky"};
  const consolePanel=document.querySelector('.dispatch-console');
  const timeSlider=document.querySelector('[data-scene-time]');
  const timeOutput=document.querySelector('[data-cycle-time]');
  const cameraSlider=document.querySelector('[data-camera-angle]');
  const cameraOutput=document.querySelector('[data-camera-value]');
  const command=document.querySelector('[data-dispatch-command]');
  const commandLabel=document.querySelector('[data-command-label]');
  const missionDetail=document.querySelector('[data-mission-detail]');
  const announcement=document.querySelector('[data-dispatch-announcement]');
  const commandNames={arrival:'Přistavit k rampě',loading:'Odbavit kamion',dispatch:'Přijmout další vůz'};
  let shownPhase="", lastTelemetry=-1;
  function telemetry(){
    const t=((elapsed%42)+42)%42;
    const tick=Math.floor(t*10);
    if(tick===lastTelemetry)return;lastTelemetry=tick;
    timeSlider.value=t;
    timeSlider.setAttribute('aria-valuetext',`${Math.floor(t)} sekund z 42`);
    timeSlider.style.setProperty('--progress',`${t/42*100}%`);
    timeOutput.textContent=`00:${String(Math.floor(t)).padStart(2,'0')} / 00:42`;
    missionDetail.textContent=t<7?'Brána otevřena. Kamion přijíždí.':t<15?'Kamion couvá k nakládací rampě.':t<22?'Vozík přiváží paletu k návěsu.':t<29?'Paleta naložena. Vozík uvolňuje rampu.':'Zásilka na cestě. Rampa se uvolňuje.';
  }
  function selectPhase(phase){
    if(!model||!renderer)return;
    elapsed={arrival:0,loading:15,dispatch:29}[phase];
    paused=false;lastTelemetry=-1;states();showPhase(model.update(elapsed));telemetry();refresh();
    announcement.textContent=phaseNames[phase]+'. Pokyn přijat.';
  }
  timeSlider.addEventListener('input',()=>{
    if(!model||!renderer)return;
    elapsed=Number(timeSlider.value);paused=true;states();showPhase(model.update(elapsed));telemetry();refresh();
  });
  cameraSlider.addEventListener('input',()=>{
    if(!renderer)return;
    goal=initialAngle+Number(cameraSlider.value)*Math.PI/180;
    cameraOutput.textContent=cameraSlider.value+'°';refresh();
  });
  command.addEventListener('click',()=>selectPhase({arrival:'loading',loading:'dispatch',dispatch:'arrival'}[shownPhase]||'arrival'));
  function showPhase(phase){
    if(phase===shownPhase)return;shownPhase=phase;
    phaseButtons.forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.scenePhase===phase)));
    status.textContent=phaseNames[phase];
    consolePanel.dataset.phase=phase;
    commandLabel.textContent=commandNames[phase];
  }
  phaseButtons.forEach(button=>button.addEventListener("click",()=>selectPhase(button.dataset.scenePhase)));
  roofButton?.addEventListener("click",()=>{
    if(!model)return;cutaway=!cutaway;model.setCutaway(cutaway);
    roofButton.setAttribute("aria-pressed",String(cutaway));
    refresh();
  });
  let angle = initialAngle, goal = angle, elapsed = 18, activePointer = null, dirty = true, last = 0;
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
    consolePanel.dataset.paused=String(paused);
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
    if (!timer && !hidden) timer=requestAnimationFrame(draw);
  }

  function staticMode(){
    renderer?.domElement.remove();
    renderer?.dispose();
    renderer=null;
    poster.hidden=false;
    poster.style.opacity='1';
    status.textContent='Fotografie areálu · 3D není v tomto prohlížeči dostupné';
    for(const control of [...phaseButtons,roofButton,turn,pause,timeSlider,cameraSlider,command])if(control)control.disabled=true;
    missionDetail.textContent='Pro interaktivní pult otevřete web v prohlížeči s podporou 3D.';
    states();
    refresh();
  }

  function resize() {
    if(!renderer)return;
    const w=host.clientWidth,h=host.clientHeight;
    if(!w||!h)return;
    const aspect=w/h;
    const frame=Math.max(40,26*aspect);
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
      model=buildWarehouse();
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
      host.append(canvas);
      canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();staticMode();},{once:true});
      resize();
      states();
    }catch{staticMode();}
  }

  function draw(now){
    timer=0;
    if(!renderer||hidden||(!inView&&!dirty))return;
    const dt=last ? Math.min(.05,(now-last)/1000) : 0;
    last=now;
    const rotating=Math.abs(goal-angle)>.0005;
    if(dirty || !paused || rotating){
      if(!paused){
        elapsed+=dt;
        // The camera stays still so the operating cycle remains legible.
      }
      angle+= (goal-angle) * (reduce.matches ? 1 : 1-Math.exp(-8*Math.max(dt,.005)));
      const view=angle;
      camera.position.set(Math.sin(view)*42.7,25.7,Math.cos(view)*42.7);
      camera.lookAt(0,1.4,1);
      showPhase(model.update(elapsed));
      telemetry();
      try{renderer.render(scene,camera);}catch{staticMode();return;}
      poster.style.opacity='0';
      dirty=false;
    }
    if(inView&&(!paused||rotating)) timer=requestAnimationFrame(draw);
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
      const degrees=Math.round(((goal-initialAngle)*180/Math.PI+540)%360-180);
      cameraSlider.value=degrees;cameraOutput.textContent=degrees+'°';
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
  observer.observe(host.closest('.model') || host);
  states();
}
