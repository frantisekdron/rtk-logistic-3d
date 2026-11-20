import * as T from './three.module.js';
import {cycle, truckPoseAt} from './route.js';

const palette = {
  plinth: ['#263137',.45,.48], bevel: ['#44545a',.52,.37], road: ['#4c565a',.02,.91],
  asphalt: ['#323e42',.04,.92], concrete: ['#9aa4a3',.03,.84], lightConcrete: ['#bec8c2',.04,.76],
  steel: ['#ced4ce',.52,.39], sheet: ['#a9b6b9',.49,.54], rib: ['#cad1cd',.54,.45],
  trim: ['#6d7f83',.61,.39], charcoal: ['#26363c',.45,.51], black: ['#162127',.18,.65],
  glass: ['#416575',.60,.23], clear: ['#6c9298',.54,.22], screen: ['#a9d4cc',.32,.33],
  white: ['#e6ebe1',.19,.47], yellow: ['#d4ec51',.12,.5], orange: ['#ce743c',.29,.57],
  red: ['#b93c2c',.19,.5], wood: ['#98734d',.01,.82], box1: ['#b98852',.02,.77],
  box2: ['#cfa572',.03,.78], box3: ['#ddbe91',.03,.78], tape: ['#e3c99b',.02,.78],
  tire: ['#192022',.04,.85], hub: ['#c0cccf',.65,.38], stripe: ['#c3c8b1',.02,.82],
  light: ['#fff0c9',.03,.35,'#ffcc72',.36], limeLight: ['#d9ff64',.03,.42,'#c1f743',.26]
};

export function buildWarehouse() {
  const root = new T.Group();
  const moving = new T.Group();
  const roof = new T.Group(); root.add(roof);
  const actors=[];
  const blue=new T.MeshStandardMaterial({color:'#355a97',metalness:.35,roughness:.55});
  const pools = new Map();
  const unit = new T.BoxGeometry(1,1,1);
  const round = new T.CylinderGeometry(.5,.5,1,20);
  const material = Object.fromEntries(Object.entries(palette).map(([name,p])=> {
    const m = new T.MeshStandardMaterial({color:p[0],metalness:p[1],roughness:p[2],emissive:p[3]||0,emissiveIntensity:p[4]||0});
    m.name=name;
    return [name,m];
  }));
  material.blue=blue; material.skin=new T.MeshStandardMaterial({color:'#c7a180',roughness:.85}); material.green=new T.MeshStandardMaterial({color:'#56644d',roughness:.95});
  const ox = new T.Matrix4();
  let parent = root;
  function part(shape,name,x,y,z,w,h,d,rx=0,ry=0,rz=0) {
    const obj = new T.Object3D();
    obj.position.set(x,y,z);
    obj.rotation.set(rx,ry,rz);
    obj.scale.set(w,h,d);
    obj.updateMatrix();
    const key = [parent.uuid,shape.uuid,name].join('/');
    if(!pools.has(key)) pools.set(key,{shape,mat:material[name],parent,items:[]});
    pools.get(key).items.push(new T.Matrix4().multiplyMatrices(ox,obj.matrix));
  }
  const b=(...a)=>part(unit,...a);
  const c=(...a)=>part(round,...a);
  function local(x,y,z,angle,cb) {
    const previous=ox.clone();
    const a=new T.Matrix4().makeRotationY(angle);
    a.setPosition(x,y,z);
    ox.multiply(a);
    cb();
    ox.copy(previous);
  }
  function rod(name,a,e,size) {
    const A=new T.Vector3(...a), E=new T.Vector3(...e), mid=A.clone().lerp(E,.5), delta=E.sub(A);
    const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize());
    const rot=new T.Euler().setFromQuaternion(q);
    b(name,mid.x,mid.y,mid.z,size,delta.length(),size,rot.x,rot.y,rot.z);
  }
  let seed=1432;
  const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  function crate(x,y,z,w,h,d,id=0) {
    b(['box1','box2','box3'][id%3],x,y+h/2,z,w,h,d);
    b('tape',x+w*.15,y+h+.008,z,.052,.018,d);
    b('tape',x+w*.15,y+h-.13,z+d/2+.009,.052,.26,.017);
    if(w>.68) b('white',x-w*.23,y+h*.39,z+d/2+.011,.16,.09,.012);
  }
  function mark(x,y,z,scale,rotation=0,body='charcoal',letters='white'){
    local(x,y,z,rotation,()=>{
      b(body,0,0,0,2.99*scale,.91*scale,.075*scale);
      const glyphs=[
        [[0,0,0,1],[0,1,.57,1],[.57,1,.70,.81],[.70,.81,.56,.58],[.56,.58,0,.58],[.29,.58,.73,0]],
        [[0,1,.80,1],[.40,1,.40,0]],[[0,0,0,1],[0,.38,.70,1],[.27,.63,.77,0]]
      ];
      glyphs.forEach((segments,i)=>segments.forEach(([x1,y1,x2,y2])=>{
        const start=-1.23+i*.88;
        rod(letters,[(start+x1*.74)*scale,(y1-.50)*.65*scale,.054*scale],[(start+x2*.74)*scale,(y2-.50)*.65*scale,.054*scale],.115*scale);
      }));
    });
  }
  function wheel(x,y,z,r) {
    c('tire',x,y,z,r*2,.31,r*2,0,0,Math.PI/2);
    const edge=x+.17*Math.sign(x);
    c('hub',edge,y,z,r*1.12,.044,r*1.12,0,0,Math.PI/2);
    c('trim',edge+.032*Math.sign(x),y,z,r*.50,.05,r*.50,0,0,Math.PI/2);
  }
  function vehicle(x,z,angle,color,short=false) {
    local(x,.08,z,angle,()=>{
      const end=short?1.54:2.81;
      b('charcoal',0,.47,-.04,1.28,.30,end*2+.68);
      b('steel',0,.81,-.46,1.51,.14,2*end-.14);
      b('white',-.72,1.50,-.46,.07,1.36,2*end-.18);
      b('white',.72,1.50,-.46,.07,1.36,2*end-.18);
      b('white',0,1.50,end-.58,1.49,1.36,.07);

      b('rib',0,2.20,-.46,1.53,.10,2*end-.12);
      for(const dx of [-.75,.75]) {
        b('trim',dx,1.48,-.46,.028,.06,2*end-.20);
        for(let dz=-end-.30;dz<end-.55;dz+=.165) b('sheet',dx,1.50,dz,.027,1.18,.020);
      }
      b('yellow',.77,1.66,-.4,.04,.19,2*end-.48);
      mark(.793,1.62,-.48,.37,Math.PI/2,'white','charcoal');
      for(const dz of [-end+.04,-end+.68,end-.19]) for(const dx of [-.67,.67]) wheel(dx,.40,dz,.36);
      b(color,0,1.11,end+.38,1.47,1.19,1.37);
      b(color,0,1.72,end+.19,1.39,.23,1.04);
      b('glass',0,1.44,end+1.034,1.18,.42,.05,-.13);
      for(const dx of [-.74,.74]){
        b('glass',dx,1.42,end+.45,.029,.43,.65);
        b('black',dx*1.17,1.40,end+.67,.11,.19,.15);
        b('trim',dx*1.1,1.39,end+.67,.11,.04,.06);
        b('light',dx*.79,.85,end+1.08,.24,.12,.045);
        wheel(dx*.93,.41,end+.57,.36);
      }
      b('black',0,.83,end+1.09,.76,.31,.065);
      for(let y=.73;y<1.01;y+=.072) b('trim',0,y,end+1.13,.74,.026,.026);
      b('steel',0,.55,end+1.08,1.46,.12,.09);
      b('white',0,.67,end+1.14,.23,.071,.02);
    });
  }

  // Stylised reconstruction from RTK's published photographs: twin gables,
  // continuous high windows, blue seams, low side wings and a loading court.
  b('plinth',0,-.5,1,30.6,.65,24.6);
  b('bevel',0,-.16,1,30.7,.1,24.7);
  b('asphalt',0,-.07,1,30.6,.12,24.6);
  b('road',0,.005,9.5,30,.025,5.8);
  b('concrete',0,.02,-3,28,.04,12.4);
  for(let x=-14;x<15;x+=2) b('stripe',x,.025,10.5,1,.022,.08);
  for(const z of [7.4,12.2]) b('stripe',0,.027,z,29,.02,.06);
  for(const x of [-13,-9,-5,-1,3,7,13]) b('yellow',x,.04,5.4,.06,.02,3.2);
  // Pedestrian route safely separated from vehicle lanes.
  b('trim',-3,.045,2.6,20,.025,1.0);
  for(const z of [2.08,3.12]) b('yellow',-3,.06,z,20,.02,.055);
  for(let x=-12.6;x<-10.5;x+=.36) b('white',x,.05,5.15,.18,.02,3.8);
  b('lightConcrete',-1,.38,-4,18,.72,10);
  b('white',-1,3.62,-9,18,5.8,.15);
  b('white',-10,3.62,-4,.15,5.8,10);
  b('white',8,3.62,-4,.15,5.8,10);
  // Front wall leaves the blue goods door open.
  b('white',-8.65,2.55,1,2.7,3.75,.16);
  b('white',1.45,2.55,1,13.1,3.75,.16);
  b('white',-1,4.7,1,18,.5,.17);
  b('glass',-1,5.25,1.02,17.7,.62,.13);
  b('white',-1,5.97,1,18,.83,.16);
  for(let x=-9.8;x<8;x+=.75){
    b('rib',x,2.6,1.105,.027,3.6,.035);
    b('steel',x,5.25,1.13,.04,.64,.04);
    b('rib',x,6,1.11,.027,.78,.035);
  }
  for(const x of [-10,8]) {
    b('blue',x,3.7,1.12,.11,6.1,.11);
    b('blue',x,3.7,-9,.11,6.1,.11);
    for(let z=-8.7;z<1;z+=.3)b('rib',x+(x<0?-.09:.09),3.5,z,.04,5.4,.035);
  }
  // Two low-pitch gables, exactly the recognisable silhouette in the photos.
  function gable(cx){
    const shape=new T.Shape();shape.moveTo(-4.5,0);shape.lineTo(0,.9);shape.lineTo(4.5,0);shape.closePath();
    for(const z of [-9,1.08]){
      const mesh=new T.Mesh(new T.ShapeGeometry(shape),material.white);mesh.material=material.white.clone();mesh.material.side=T.DoubleSide;
      mesh.position.set(cx,6.39,z);mesh.castShadow=true;root.add(mesh);
    }
    const saved=parent;parent=roof;
    for(const side of [-1,1]){
      b('sheet',cx+side*2.25,6.86,-4,4.6,.12,10.25,0,0,-side*Math.atan(.2));
      for(let z=-9;z<=1;z+=.32)b('rib',cx+side*2.25,6.95,z,4.6,.035,.035,0,0,-side*Math.atan(.2));
    }
    parent=saved;
    for(const z of [-9.15,1.2])for(const side of [-1,1])rod('blue',[cx,7.33,z],[cx+side*4.55,6.42,z],.13);
    b('blue',cx,7.32,-4,.13,.13,10.4);
  }
  gable(-5.5);gable(3.5);
  // Blue sectional goods door and curved canopy, left of the main facade.
  b('black',-6,2.0,1.1,2.5,2.8,.13);
  for(const dx of [-1.27,1.27]) b('blue',-6+dx,2.03,1.22,.13,2.87,.23);
  b('blue',-6,3.28,1.2,2.55,.5,.18);
  for(let x=-7.3;x<-4.7;x+=.2)b('steel',x,3.7+Math.sin((x+7.3)/2.6*Math.PI)*.32,1.5,.22,.065,1.2);
  // Low side extensions, also present in the source photographs.
  for(const [x,w,h] of [[-12,4,2.6],[10.5,5,3.2]]){
    b('lightConcrete',x,.38,-3.8,w,.72,9.6);
    b('white',x,.7+h/2,-8.6,w,h,.14);
    for(const side of [-1,1])b('white',x+side*w/2,.7+h/2,-3.8,.12,h,9.6);
    if(x<0)b('black',x,1.8,1.03,w*.58,2.12,.06);
    b('blue',x,2.6,1.09,w*.58,.35,.08);
    for(const dx of [-w*.3,w*.3])b('blue',x+dx,1.8,1.12,.12,2.2,.12);
    const saved=parent;parent=roof;b('sheet',x,h+.77,-3.8,w+.18,.12,9.8,0,0,x<0?.12:-.12);parent=saved;
    b('blue',x,h+.78,1.15,w+.18,.12,.13,0,0,x<0?.12:-.12);
  }
  // The loading wing is open toward the courtyard; remove its solid body.
  // Instance is replaced below by wall strips so a forklift can enter the trailer.
  b('charcoal',10.5,.81,1.8,2.6,.16,1.6);
  for(const x of [8.9,12.1]){c('yellow',x,.45,1.7,.12,.85,.12);c('charcoal',x,.6,1.7,.125,.14,.125);}
  // Storage visible in cutaway mode, with a clear aisle through the wing.
  for(const z of [-7,-4])for(const x of [-7,-3,1,5]){
    for(const dx of [-1.3,1.3])b('blue',x+dx,2.9,z,.09,4.3,.12);
    for(const y of [1,2.4,3.8]){
      b('orange',x,y,z,2.8,.12,1.1);
      for(const dx of [-.75,.1,.85])crate(x+dx,y+.1,z,.65,.75,.85,Math.round((x+8)%3));
    }
  }
  mark(-.6,4.65,1.13,1.0,0,'charcoal','white');
  // Courtyard landscaping: the island and slender tree seen in RTK photographs.
  b('concrete',.8,.12,4.5,4.8,.22,1.35);
  for(let n=0;n<11;n++)b('green',-1.2+n*.4,.48+(n%3)*.09,4.5,.65,.62,.9,0,n*.7);
  b('wood',.7,2.35,4.5,.12,4.4,.13,.02);
  for(let n=0;n<7;n++)b('green',.7+Math.sin(n*2)*.45,3.5+n*.23,4.5+Math.cos(n*2)*.3,.9,.7,.65,0,n);
  // Gatehouse and blue water-tower detail from the front photograph.
  c('blue',13.6,2.05,-7.8,.13,4.1,.13);c('blue',13.6,4.2,-7.8,.65,.6,.65);
  for(const x of [-14.5,14.5])for(let z=-10;z<7;z+=2){b('trim',x,.6,z,.045,1.2,.045);b('steel',x,.7,z,.02,.55,2);}
  function group(build){const g=new T.Group();root.add(g);const old=parent;parent=g;build();parent=old;return g;}
  const truck=group(()=>vehicle(0,0,0,'yellow',true));
  const passing=group(()=>vehicle(0,0,0,'white',true));passing.scale.setScalar(.86);
  // Animated articulated workers, with helmets and high-visibility vests.
  function worker(x,z){
    const g=group(()=>{b('yellow',0,.95,0,.28,.38,.19);b('white',0,.95,.105,.28,.05,.025);b('skin',0,1.24,0,.18,.20,.19);b('yellow',0,1.37,0,.23,.10,.23);});
    g.position.set(x,.08,z);
    const limbs=[];
    for(const [dx,y,len,mat] of [[-.09,.76,.45,'charcoal'],[.09,.76,.45,'charcoal'],[-.21,1.1,.34,'yellow'],[.21,1.1,.34,'yellow']]){
      const pivot=new T.Group();pivot.position.set(dx,y,0);g.add(pivot);
      const mesh=new T.Mesh(unit,material[mat]);mesh.scale.set(.10,len,.12);mesh.position.y=-len/2;mesh.castShadow=true;pivot.add(mesh);limbs.push(pivot);
    }
    return {g,limbs,x,z};
  }
  const workers=[worker(-8,2.6),worker(5.6,2.6),worker(13.4,-2)];
  // Forklift with a separately animated carriage and removable pallet.
  const fork=group(()=>{
    b('yellow',0,.4,0,.78,.45,1.10);b('charcoal',0,.68,-.26,.7,.16,.5);
    for(const dx of [-.37,.37])for(const dz of [-.36,.36])wheel(dx,.23,dz,.21);
    for(const dx of [-.32,.32])for(const dz of [-.36,.32])b('charcoal',dx,1.0,dz,.045,.8,.045);
    b('yellow',0,1.43,0,.83,.10,.95);
    b('yellow',0,.91,-.09,.27,.36,.20);b('skin',0,1.16,-.09,.17,.18,.18);b('yellow',0,1.28,-.09,.22,.08,.22);
    for(const dx of [-.27,.27])b('charcoal',dx,.88,.63,.07,1.65,.1);
  });
  const lift=group(()=>{for(const dx of [-.27,.27])b('steel',dx,0,.92,.09,.06,.85);b('trim',0,.2,.62,.6,.08,.10);});root.remove(lift);fork.add(lift);
  const cargo=group(()=>{b('wood',0,.10,.98,.84,.12,.74);crate(0,.17,.98,.77,.55,.67,2);});root.remove(cargo);lift.add(cargo);
  const delivered=group(()=>{b('wood',0,.1,0,.84,.12,.74);crate(0,.17,0,.77,.55,.67,2);});
  const gate=group(()=>{b('white',1.3,0,0,2.6,.07,.1);for(let x=.1;x<2.6;x+=.35)b('red',x,0,.06,.16,.08,.025);});gate.position.set(-13.4,1,7.3);
  b('blue',-13.4,.5,7.3,.25,1,.25);
  root.remove(delivered);truck.add(delivered);
  const lerp=(a,b,p)=>a+(b-a)*Math.max(0,Math.min(1,p));
  const ease=p=>{p=Math.max(0,Math.min(1,p));return p*p*(3-2*p);};
  function update(time){
    const t=((time%cycle)+cycle)%cycle;
    const pose=truckPoseAt(t);
    truck.position.set(pose.x,0,pose.z);truck.rotation.y=pose.heading;
    // A second truck uses the separate outer lane, with no crossing of the loading path.
    const p=(time%32)/32;passing.position.set(lerp(-12,12,p<.5?p*2:2-p*2),0,12.5);passing.rotation.y=p<.5?Math.PI/2:-Math.PI/2;
    const loading=t>=15&&t<29;
    const u=Math.max(0,Math.min(14,t-15));
    const fz=u<5?lerp(-3.2,2.2,ease(u/5)):u<8?2.2:lerp(2.2,-3.2,ease((u-8)/6));
    fork.position.set(10.5,.82,loading?fz:-3.2);
    lift.position.y=loading?lerp(.12,.20,ease(u/4)):.12;
    cargo.visible=t<22;delivered.visible=t>=22&&t<35;
    delivered.position.set(0,1.0,-1.2);
    gate.rotation.z=t<8?-.95:0;
    workers.forEach((w,i)=>{
      const phase=time*.45+i*2, span=i===0?2.4:i===1?1.4:2.0;
      const offset=Math.sin(phase)*span;const forward=Math.cos(phase)>0;
      w.g.position.set(i<2?w.x+offset:w.x,.08,i<2?w.z:w.z+offset);
      w.g.rotation.y=i<2?(forward?Math.PI/2:-Math.PI/2):(forward?0:Math.PI);
      w.limbs.forEach((limb,k)=>limb.rotation.x=Math.sin(time*7+i)*.42*(k%2?-1:1));
    });
    return t<15?'arrival':t<29?'loading':'dispatch';
  }
  update(18);
  function setCutaway(show){roof.visible=!show;}
  for(const {shape,mat,parent: target,items} of pools.values()) {
    const mesh=new T.InstancedMesh(shape,mat,items.length);
    items.forEach((m,i)=>mesh.setMatrixAt(i,m));
    mesh.castShadow=true;
    mesh.receiveShadow=true;
    target.add(mesh);
  }
  return {root,moving,update,setCutaway,truck,fork,workers,roof};
}
