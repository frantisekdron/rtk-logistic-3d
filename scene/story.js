import {cycle} from './route.js?v=yard-motion1';

// The truck keeps its place on the route when a visitor takes over.
export function createStory(onChange) {
  let stage = 'idle', time = 15, age = 0, speed = 1.1;
  function enter(next) {stage=next; age=0; onChange(next);}
  function load(reduced) {
    if (stage==='ready') {
      if (reduced) time=cycle-.01;
      enter(reduced?'sent':'driving');
    } else if (stage==='idle') {
      if (reduced) {time=29; enter('ready');}
      else enter(time>=15 && time<29?'loading':'docking');
    }
  }
  function update(dt, reduced) {
    if (reduced) {
      if (stage==='loading' || stage==='docking') {time=29; enter('ready');}
      if (stage==='driving') {time=cycle-.01; enter('sent');}
      if (stage==='sent' && (age+=dt)>=2.1) {time=15; enter('idle');}
      return;
    }
    if (stage==='ready') return;
    const desired = stage==='idle' || stage==='sent' ? 1.1 : 1.8;
    speed += (desired-speed)*(-Math.expm1(-dt*1.8));
    const next = time+speed*dt;
    if (stage==='loading' && next>=29) {
      time=29; enter('ready'); return;
    }
    const crossesDock = time<15 && next>=15;
    const crossesGate = next>=cycle;
    time = next%cycle;
    if (stage==='docking' && crossesDock) enter('loading');
    else if (stage==='driving' && crossesGate) enter('sent');
    else if (stage==='sent' && (age+=dt)>=2.1) enter('idle');
  }
  return {load,update,get time(){return time;},get stage(){return stage;}};
}
