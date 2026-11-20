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
