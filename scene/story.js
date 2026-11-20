import {cycle} from './route.js';

// All three phases play the same route as the unattended scene.
export function createStory(onChange) {
  let stage = 'idle', time = 15, age = 0;
  function enter(next) {
    stage = next;
    age = 0;
    onChange(next);
  }
  function load(reduced) {
    if (stage === 'ready') {
      time = reduced ? cycle - 0.01 : 29;
      enter(reduced ? 'sent' : 'driving');
      return;
    }
    if (stage !== 'idle') return;
    if (reduced) {
      time = 28.95;
      enter('ready');
    } else if (time < 15 || time >= 29) {
      enter('docking');
    } else {
      // Keep a pallet already on its way to the trailer moving smoothly.
      if (time >= 22) time = 15;
      enter('loading');
    }
  }
  function update(dt, reduced, reading) {
    switch (stage) {
      case 'idle':
        if (!reduced && !reading) time = (time + dt * 1.35) % cycle;
        break;
      case 'docking': {
        const remaining = (15 - time + cycle) % cycle;
        if (reduced || remaining <= dt * 9) {
          time = 15;
          enter('loading');
        } else time = (time + dt * 9) % cycle;
        break;
      }
      case 'loading':
        time = reduced ? 28.95 : Math.min(28.95, time + dt * 4.4);
        if (time >= 28.95) enter('ready');
        break;
      case 'driving':
        time = reduced ? 41.99 : Math.min(41.99, time + dt * 3.5);
        if (time >= 41.99) enter('sent');
        break;
      case 'sent':
        age += dt;
        if (age >= 2.1) {
          time = reduced ? 15 : 0;
          enter('idle');
        }
    }
  }
  return {load, update, get time() {return time;}, get stage() {return stage;}};
}
