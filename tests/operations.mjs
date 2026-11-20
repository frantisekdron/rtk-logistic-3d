import assert from 'node:assert/strict';
import {buildWarehouse} from '../scene/model.js';
const m=buildWarehouse();
assert.equal(m.update(0),'arrival');
assert.equal(m.update(18),'loading');
const dock=m.truck.position.clone();
m.update(27);assert.deepEqual(m.truck.position.toArray(),dock.toArray(),'Truck must stay at dock while loading');
m.update(17);const forkStart=m.fork.position.z;
m.update(19);assert(m.fork.position.z>forkStart,'Forklift must advance toward the trailer');
assert.equal(m.update(31),'dispatch');assert(m.truck.position.z>dock.z,'Truck must leave dock during dispatch');
m.setCutaway(true);assert.equal(m.roof.visible,false);
m.setCutaway(false);assert.equal(m.roof.visible,true);
for(let t=0;t<84;t+=.125){
 m.update(t);
 for(const actor of [m.truck,m.fork,...m.workers.map(w=>w.g)]){
  assert(actor.position.toArray().every(Number.isFinite));
  assert(Math.abs(actor.position.x)<15.3&&actor.position.z<13.3,'Actor remains on the site');
 }
}
m.update(18);const frozen=m.workers.map(w=>w.g.position.toArray());
m.update(18);assert.deepEqual(m.workers.map(w=>w.g.position.toArray()),frozen,'Same simulation time must keep all actors paused');
console.log('PASS: dock dwell, pallet approach, departure, roof interaction, actor bounds and deterministic pause');

const {truckPoseAt,vanPoseAt}=await import('../scene/route.js');
const {createStory}=await import('../scene/story.js');
const dt=1/120;
for(const route of [truckPoseAt,vanPoseAt]){
  for(let t=0;t<100;t+=dt){
    const a=route(t),b=route(t+dt);
    assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<.055,'Continuous position through all corners and the loop');
    assert.ok(Math.cos(a.heading-b.heading)>.999,'Vehicles must turn without heading jumps');
  }
}
for(const start of [0,8,16,24,36]){
  const states=[];
  const story=createStory(s=>states.push(s));
  while(Math.abs(story.time-start)>.025) story.update(1/60,false);
  const before=story.time;
  story.load(false); story.load(false);
  assert.equal(story.time,before,'A click does not teleport any actor');
  for(let i=0;i<2000 && story.stage!=='ready';i++) story.update(1/60,false);
  assert.equal(story.stage,'ready');
  m.update(story.time,17);
  const truck=m.truck.position.clone(),worker=m.workers[0].g.position.clone(),van=m.passing.position.clone();
  story.update(.4,false);m.update(story.time,17.4);
  assert.deepEqual(m.truck.position,truck);
  assert.ok(m.workers[0].g.position.distanceTo(worker)>.08 && m.passing.position.distanceTo(van)>.5,'Yard keeps moving while truck waits');
  story.load(false);
  for(let i=0;i<900 && story.stage!=='idle';i++) story.update(1/60,false);
  assert.deepEqual(states.slice(-3),['driving','sent','idle']);
}
m.update(22.39999);m.root.updateMatrixWorld(true);
const tip=m.cargo.localToWorld(m.truck.position.clone().set(0,.1,.98));
m.update(22.40001);m.root.updateMatrixWorld(true);
const bed=m.delivered.localToWorld(m.truck.position.clone().set(0,.1,0));
assert.ok(tip.distanceTo(bed)<.002,'The pallet stays put across the handoff');
const reduced=createStory(()=>{});
reduced.update(5,true);assert.equal(reduced.time,15);
reduced.load(true);assert.equal(reduced.stage,'ready');
reduced.load(true);assert.equal(reduced.stage,'sent');
console.log('PASS: continuous routes, pallet handover, independent yard clock, dispatch and reduced motion');
