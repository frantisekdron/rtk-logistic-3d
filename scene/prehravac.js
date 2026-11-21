// The browser plays the pre-rendered 3D scene. This script only directs the truck.
(() => {
  'use strict';
  const yard=document.getElementById('warehouse');
  const figure=yard.closest('figure');
  const video=yard.querySelector('video');
  const picture=yard.querySelector('picture');
  const image=picture.querySelector('img');
  const reducedSource=picture.querySelector('source');
  const button=yard.querySelector('button');
  const line=button.querySelector('.truck-line');
  const icon=button.querySelector('use');
  const play=yard.querySelector('.yard-play');
  const status=document.getElementById('yard-status');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const folder=new URL('scene/film/',document.baseURI);
  const file=name=>new URL(name,folder).href;
  const lap=21, arrival=5.5, loaded=12.5;
  // Projected truck centre and size, sampled from the original orthographic camera at 5 Hz.
  const track=[[41.67,57.9,11.25,13.14],[44.28,58.95,11.25,13.14],[46.94,60.02,11.25,13.14],[49.62,61.1,11.25,13.14],[52.28,62.17,11.25,13.14],[54.89,63.22,11.25,13.14],[57.41,64.24,11.25,13.14],[59.77,65.27,11.07,13.63],[61.53,66.69,9.72,15],[62.57,68.29,7.67,15.57],[62.97,69.87,5.31,15.48],[62.9,71.25,4.25,15.29],[62.56,72.34,6.05,15.57],[62.15,73.12,7.28,15.59],[61.82,73.59,7.98,15.53],[61.7,73.74,8.21,15.5],[61.8,73.59,8.21,15.5],[62.07,73.18,8.21,15.5],[62.49,72.55,8.21,15.5],[63.03,71.76,8.21,15.5],[63.63,70.86,8.21,15.5],[64.28,69.89,8.21,15.5],[64.94,68.92,8.21,15.5],[65.58,67.97,8.21,15.5],[66.15,67.12,8.21,15.5],[66.63,66.41,8.21,15.5],[66.99,65.88,8.21,15.5],[67.18,65.59,8.21,15.5],[67.21,65.55,8.21,15.5],[67.21,65.55,8.21,15.5],[67.21,65.55,8.21,15.5],[67.21,65.55,8.21,15.5],[67.21,65.55,8.21,15.5],[67.21,65.55,8.21,15.5],[67.21,65.55,8.21,15.5],[67.21,65.55,8.21,15.5],[67.21,65.55,8.21,15.5],[67.21,65.55,8.21,15.5],[67.21,65.55,8.21,15.5],[67.21,65.55,8.21,15.5],[67.21,65.55,8.21,15.5],[67.21,65.55,8.21,15.5],[67.21,65.55,8.21,15.5],[67.21,65.55,8.21,15.5],[67.21,65.55,8.21,15.5],[67.21,65.55,8.21,15.5],[67.21,65.55,8.21,15.5],[67.21,65.55,8.21,15.5],[67.21,65.55,8.21,15.5],[67.21,65.55,8.21,15.5],[67.21,65.55,8.21,15.5],[67.21,65.55,8.21,15.5],[67.21,65.55,8.21,15.5],[67.21,65.55,8.21,15.5],[67.21,65.55,8.21,15.5],[67.21,65.55,8.21,15.5],[67.21,65.55,8.21,15.5],[67.21,65.55,8.21,15.5],[67.21,65.55,8.21,15.5],[67.21,65.55,8.21,15.5],[67.21,65.55,8.21,15.5],[67.21,65.55,8.21,15.5],[67.21,65.55,8.21,15.5],[67.18,65.59,8.21,15.5],[67,65.86,8.21,15.5],[66.65,66.39,8.21,15.5],[66.13,67.15,8.21,15.5],[65.47,68.13,8.21,15.5],[64.67,69.32,8.21,15.5],[63.56,70.6,9.39,15.16],[61.81,71.69,10.87,13.97],[59.51,72.37,11.39,11.94],[56.86,72.42,10.98,10.06],[54.2,71.69,11.33,12.84],[51.57,70.61,11.25,13.14],[48.83,69.5,11.25,13.14],[46.01,68.36,11.25,13.14],[43.12,67.2,11.25,13.14],[40.19,66.02,11.25,13.14],[37.25,64.84,11.25,13.14],[34.31,63.66,11.25,13.14],[31.4,62.48,11.25,13.14],[28.54,61.33,11.25,13.14],[25.76,60.21,11.25,13.14],[23.07,59.13,11.25,13.14],[20.49,58.09,11.25,13.14],[18.55,56.61,9.41,15.15],[17.93,54.69,5.05,15.44],[18.51,52.92,7,15.6],[19.87,51.65,10.08,14.78],[21.54,50.99,11.32,12.87],[23.12,50.82,11.15,10.58],[24.39,50.98,11.19,10.7],[25.27,51.25,11.39,12.11],[25.78,51.48,11.32,12.89],[25.95,51.56,11.25,13.14],[26.16,51.65,11.25,13.14],[26.76,51.89,11.25,13.14],[27.73,52.28,11.25,13.14],[29.01,52.8,11.25,13.14],[30.59,53.44,11.25,13.14],[32.43,54.18,11.25,13.14],[34.49,55.01,11.25,13.14],[36.74,55.91,11.25,13.14],[39.15,56.88,11.25,13.14]];
  const words={
    idle:['Naložit paletu','Naložit paletu do zeleného kamionu','pallet'],
    docking:['Couvám k rampě…','Kamion míří k nakládací rampě.','truck'],
    loading:['Ještě tuhle krabici…','Vozík nakládá paletu do kamionu.','pallet'],
    ready:['Naloženo. Jedem?','Naloženo. Poslat kamion na cestu','truck'],
    driving:['Držte si krabice!','Kamion se zásilkou vyjíždí.','truck'],
    sent:['Šťastnou cestu!','Zásilka je na cestě.','truck']
  };
  let stage='idle', enabled=false, raf=0, imageStart=performance.now(), imageOffset=0;
  let lastVideoTime=-1, lastProgress=0, surface='image', previous=0, imageName='provoz.webp';
  let warmed, canPlay=true, pendingSeek=null;
  function phase(name) {
    stage=name;
    figure.dataset.story=name;
    const [label,description,symbol]=words[name];
    line.textContent=label;
    button.setAttribute('aria-label',description);
    button.setAttribute('aria-disabled',String(name!=='idle' && name!=='ready'));
    icon.setAttribute('href','#'+symbol);
    if(name!=='idle') status.textContent=description;
  }
  function useSurface(name) {
    surface=name;
    yard.dataset.surface=name;
  }
  function useImage(name,offset=0) {
    if(imageName!==name){
      imageName=name;
      image.src=file(name);
    }
    imageOffset=offset;
    imageStart=performance.now();
    useSurface('image');
  }
  function imageTime(now) {
    // rAF timestamps mark the start of the frame and can predate a media switch.
    const elapsed=Math.max(0,now-imageStart);
    return (imageOffset+elapsed/1000)%lap;
  }
  function startVideo(at) {
    if(!enabled || !canPlay) return;
    if(!video.src) video.src=file('provoz.mp4');
    if(video.readyState>=1) video.currentTime=at;
    else pendingSeek=at;
    video.defaultMuted=true; video.muted=true;
    lastVideoTime=-1;lastProgress=0;
    video.play().catch(()=>{ /* The animated image already plays without autoplay permission. */ });
  }
  video.addEventListener('loadedmetadata',()=>{
    if(pendingSeek!==null){video.currentTime=pendingSeek;pendingSeek=null;}
  });
  video.addEventListener('error',()=>{
    canPlay=false;
    if(!enabled || surface==='image') return;
    useImage(stage==='driving'?'odjezd.webp':'provoz.webp',stage==='driving'?loaded:0);
  });
  function follow(t) {
    const n=t*5, index=Math.floor(n)%track.length;
    const a=track[index],b=track[(index+1)%track.length],f=n-Math.floor(n);
    const at=i=>a[i]+(b[i]-a[i])*f;
    button.style.left=at(0)+'%';button.style.top=at(1)+'%';
    button.style.width=at(2)+'%';button.style.height=at(3)+'%';
    const x=at(0)*yard.clientWidth/100;
    const half=line.parentElement.offsetWidth/2+7;
    const shift=Math.max(half,Math.min(yard.clientWidth-half,x))-x;
    button.style.setProperty('--bubble-x','calc(50% + '+shift+'px)');
    button.style.setProperty('--tip-x','calc(50% - '+shift+'px)');
  }
  function hold() {
    phase('ready');
    useImage('na-rampe.webp',loaded);
    video.pause();
    follow(loaded);
  }
  function tick(now) {
    raf=0;
    if(!enabled || document.hidden) return;
    if(stage==='ready') return;
    let time=imageTime(now);
    if(!video.paused && video.readyState>=2 && !video.seeking){
      const clock=video.currentTime%lap;
      if(clock!==lastVideoTime){
        if(lastVideoTime>=0) {useSurface('film');lastProgress=now;}
        lastVideoTime=clock;
      }
      if(surface==='film' && now-lastProgress<1000) time=clock;
      else if(surface==='film'){
        useImage(stage==='driving'?'odjezd.webp':'provoz.webp',stage==='driving'?loaded:0);
        time=imageTime(now);
      }
    } else if(surface==='film' && (video.paused || now-lastProgress>1000)){
      useImage(stage==='driving'?'odjezd.webp':'provoz.webp',stage==='driving'?loaded:0);
      time=imageTime(now);
    }
    const wrapped=previous>time+lap/2;
    if(stage==='docking' && time>=arrival && time<loaded) phase('loading');
    if(stage==='loading' && (time>=loaded || wrapped)){hold();return;}
    if(stage==='driving' && (time>=lap-1.6 || wrapped)) phase('sent');
    if(stage==='sent' && wrapped){
      phase('idle');
      if(imageName==='odjezd.webp'){
        if(surface==='image') useImage('provoz.webp');
        else {imageName='provoz.webp';image.src=file(imageName);}
      }
    }
    previous=time;
    follow(time);
    raf=requestAnimationFrame(tick);
  }
  function wake() {
    if(enabled && !document.hidden && !raf) raf=requestAnimationFrame(tick);
  }
  function enable() {
    if(enabled)return;
    enabled=true;yard.dataset.enabled='';
    reducedSource.media='not all';button.hidden=false;
    phase('idle');useImage('provoz.webp');follow(0);previous=0;
    startVideo(0);wake();
  }
  function pauseForPreference() {
    enabled=false;delete yard.dataset.enabled;
    cancelAnimationFrame(raf);raf=0;video.pause();button.hidden=true;
    reducedSource.media='(prefers-reduced-motion: reduce)';
    phase('idle');useImage('provoz.webp');
  }
  button.addEventListener('click',()=>{
    if(stage==='ready'){
      phase('driving');previous=loaded;
      useImage('odjezd.webp',loaded);startVideo(loaded);wake();
    } else if(stage==='idle'){
      const t=surface==='film'?video.currentTime%lap:imageTime(performance.now());
      phase(t>=arrival && t<loaded?'loading':'docking');
      warmed=new Image();warmed.src=file('na-rampe.webp');
      // A user gesture can also release iOS / low-power autoplay restrictions.
      if(video.paused) startVideo(t);
      wake();
    }
  });
  play.addEventListener('click',e=>{e.preventDefault();enable();button.focus({preventScroll:true});});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){cancelAnimationFrame(raf);raf=0;}
    else if(enabled && stage!=='ready'){if(video.paused) startVideo(previous);wake();}
  });
  window.addEventListener('pageshow',wake);
  window.addEventListener('resize',()=>{if(enabled) follow(stage==='ready'?loaded:previous);});
  const preferenceChanged=()=>{if(reduce.matches)pauseForPreference();else enable();};
  if(reduce.addEventListener)reduce.addEventListener('change',preferenceChanged);
  else if(reduce.addListener)reduce.addListener(preferenceChanged);
  if(!reduce.matches || new URLSearchParams(location.search).get('animace')==='1')enable();
})();
