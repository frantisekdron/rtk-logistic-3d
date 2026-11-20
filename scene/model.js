import * as T from './three.module.js';

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
  const pools = new Map();
  const unit = new T.BoxGeometry(1,1,1);
  const round = new T.CylinderGeometry(.5,.5,1,20);
  const material = Object.fromEntries(Object.entries(palette).map(([name,p])=> {
    const m = new T.MeshStandardMaterial({color:p[0],metalness:p[1],roughness:p[2],emissive:p[3]||0,emissiveIntensity:p[4]||0});
    m.name=name;
    return [name,m];
  }));
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
  // Stepped foundation, road markings and painted edges of the loading apron.
  b('plinth',0,-.54,0,26.8,.64,18.2);
  b('bevel',0,-.22,0,26.86,.12,18.26);
  b('asphalt',0,-.09,0,26.78,.16,18.16);
  b('road',0,.004,2.5,26.15,.024,6.9);
  b('concrete',-.35,.012,-3.73,24,.07,9.25);
  for(const x of [-10.25,-8,-5.75,-3.5,-1.25,1,3.25,5.5,7.75,10,12.25]) b('stripe',x,.014,7.76,1.05,.018,.08);
  for(let x=-12.5;x<13;x+=2.6) b('trim',x,.038,3.53,.022,.03,4.68);
  for(const x of [-9.8,-6.9,-3.9,-.85,2.2,5.14]) {
    b('yellow',x,.044,2.95,.052,.025,3.51);
    b('yellow',x+.37,.045,4.70,.79,.025,.052);
  }
  for(let k=0;k<8;k++) b('white',8.08+k*.31,.038,2.91,.12,.02,1.17);
  for(const z of [6.77,8.54]) b('stripe',-.25,.027,z,23.8,.018,.043);
  // Foundations with individual bumper stones and continuous curb.
  b('lightConcrete',-.8,.34,-3.47,21.22,.62,9.31);
  b('charcoal',-.8,.67,-3.47,21.12,.09,9.23);
  b('concrete',-.8,.74,-3.47,21.02,.07,9.12);
  // Main envelope with folded metal sheets on exterior faces.
  b('sheet',-.8,3.03,-8,21,.1+4.48,.17);
  b('sheet',-11.2,3.03,-3.46,.16,4.55,9.06);
  for(let x=-11.12;x<9.7;x+=.28) b('rib',x,3.04,-8.12,.034,4.5,.07);
  for(let z=-7.85;z<1;z+=.28) b('rib',-11.31,3.02,z,.07,4.46,.038);
  b('charcoal',-.8,5.42,-8.01,21.2,.24,.34);
  b('charcoal',-11.18,5.42,-3.52,.32,.24,9.14);
  // Front dispatch wall. Open bay doors alternate with metal-clad wall sections.
  const dockCenters=[-7.86,-4.83,-1.80,1.23];
  b('sheet',-4.35,3.91,1.04,13.66,1.12,.24);
  for(let x=-11.07;x<2.51;x+=.24) b('rib',x,3.91,1.19,.026,1.11,.038);
  b('charcoal',-4.35,4.56,1.04,13.84,.19,.35);
  b('yellow',-4.35,4.44,1.24,13.80,.07,.06);
  b('sheet',-10.38,2.16,1.04,1.63,2.71,.25);
  for(const x of [-6.34,-3.31,-.28]) b('sheet',x,2.17,1.04,.80,2.80,.25);
  b('sheet',2.40,2.15,1.04,.43,2.8,.25);
  dockCenters.forEach((x,index)=>{
    b('black',x,1.98,1.09,2.16,2.58,.16);
    b('trim',x,2.02,1.20,1.84,2.33,.10);
    for(let y=.97;y<3.19;y+=.21) b('sheet',x,y,1.27,1.79,.17,.06);
    for(const dx of [-.49,0,.49]) b('glass',x+dx,2.26,1.315,.33,.13,.04);
    b('black',x,3.22,1.34,2.25,.20,.40);
    for(const dx of [-1,1]) {
      b('black',x+dx,2.01,1.35,.18,2.35,.34);
      b('black',x+dx*.79,.66,1.45,.26,.33,.32);
      c('yellow',x+dx*1.13,.38,1.67,.115,.74,.115);
      c('charcoal',x+dx*1.13,.50,1.67,.119,.12,.119);
    }
    b('charcoal',x,.74,1.46,1.52,.12,.50);
    b('light',x,3.61,1.23,.44,.08,.10);
    for(let n=0;n<index+1;n++) b('charcoal',x-.25+n*.16,3.93,1.21,.07,.22,.03);
  });
  // Structural bays on the open side reveal mezzanine storage and braced frames.
  for(const x of [-10.98,-7.49,-4,-.51,2.98,6.47,9.42]) {
    b('trim',x,3.10,-7.77,.13,4.85,.16);
    b('steel',x,5.46,-3.49,.14,.16,8.8);
  }
  for(const x of [3,6.47,9.45]) {
    b('trim',x,3.08,.91,.15,4.65,.16);
    b('yellow',x,1.07,.91,.21,.64,.22);
  }
  b('charcoal',6.23,5.47,1.01,6.75,.24,.27);
  b('yellow',6.23,5.43,1.16,6.73,.078,.041);
  b('trim',9.5,5.47,-3.47,.27,.24,9.1);
  rod('steel',[9.43,.85,-7.86],[9.43,5.33,-5.70],.085);
  rod('steel',[9.43,5.32,-7.86],[9.43,.85,-5.70],.085);
  // A partially open zinc standing-seam roof with upstands, vents, and skylights.
  b('sheet',-6.64,5.52,-3.47,9.34,.18,9.23);
  for(let x=-11.20;x<-2.0;x+=.23) b('rib',x,5.63,-3.47,.027,.055,9.17);
  b('steel',-6.62,5.63,1.12,9.50,.12,.17);
  b('charcoal',-1.98,5.53,-3.47,.15,.24,9.26);
  b('sheet',3.81,5.49,-7.30,11.54,.12,1.48);
  for(let x=-1.85;x<9.6;x+=.24) b('rib',x,5.58,-7.31,.026,.06,1.44);
  for(const x of [-9.62,-7.91,-6.20]) {
    b('charcoal',x,5.66,-4.49,1.25,.09,3.20);
    b('glass',x,5.74,-4.49,1.12,.12,3.03);
    for(const dz of [-1.50,-.50,.50,1.50]) b('steel',x,5.82,-4.49+dz,1.19,.05,.055);
    b('clear',x-.26,5.806,-4.49,.025,.035,2.98);
  }
  for(const x of [-8.95,-6.85,-4.75]) {
    b('black',x,5.67,-.34,1.65,.14,1.31);
    b('steel',x,5.90,-.34,1.52,.40,1.18);
    c('charcoal',x,6.13,-.34,.76,.055,.76);
    for(let a=0;a<5;a++) {
      const r=a*Math.PI/5;
      b('trim',x,6.167,-.34,.70,.021,.035,0,r);
    }
    c('hub',x,6.17,-.34,.17,.04,.17);
    for(let z=-.82;z<.24;z+=.16) b('trim',x+.77,5.90,z,.03,.24,.045);
  }
  // Precast office annex with wraparound glazing and finely divided mullions.
  b('lightConcrete',-10.21,.51,2.18,3.24,.95,2.18);
  b('sheet',-10.21,1.79,2.18,3.21,2.12,2.13);
  b('glass',-10.21,2.05,3.27,2.91,1.22,.05);
  b('glass',-8.58,2.03,2.21,.045,1.19,1.92);
  for(let x=-11.59;x<-8.76;x+=.53) b('trim',x,2.04,3.31,.045,1.24,.05);
  for(let z=1.37;z<3.30;z+=.47) b('trim',-8.55,2.05,z,.04,1.24,.041);
  b('charcoal',-10.21,2.95,2.18,3.42,.23,2.38);
  b('steel',-10.21,3.08,2.18,3.40,.09,2.33);
  b('light',-10.21,2.83,3.37,3.10,.044,.04);
  // Shelving with narrow aisles and multiple irregular stacks of banded cartons.
  let seed=1432;
  const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  function crate(x,y,z,w,h,d,id=0) {
    b(['box1','box2','box3'][id%3],x,y+h/2,z,w,h,d);
    b('tape',x+w*.15,y+h+.008,z,.052,.018,d);
    b('tape',x+w*.15,y+h-.13,z+d/2+.009,.052,.26,.017);
    if(w>.68) b('white',x-w*.23,y+h*.39,z+d/2+.011,.16,.09,.012);
  }
  for(const z of [-5.86,-3.09,-.37]) {
    for(const x of [-.96,1.05,3.06,5.07,7.08,9.09]) {
      for(const dz of [-.55,.55]) b('charcoal',x,2.87,z+dz,.075,4.14,.075);
      rod('trim',[x,1.10,z-.53],[x,2.32,z+.53],.045);
      rod('trim',[x,3.44,z-.53],[x,4.7,z+.53],.045);
    }
    for(const y of [1.02,2.29,3.57]) {
      for(const dz of [-.56,.56]) b('orange',4.066,y,z+dz,10.16,.12,.08);
      b('wood',4.066,y+.04,z,10.13,.07,1.10);
      for(let i=0;i<5;i++) for(let j=0;j<2;j++) {
        if(random()<.16) continue;
        const x=-.96+i*2.01+.50+j*.93;
        const h=.45+random()*.34;
        crate(x,y+.11,z,.78+random()*.09,h,.88,Math.floor(random()*3));
        if(random()>.72) crate(x-.10,y+.12+h,z-.03,.56,.23,.65,2);
      }
    }
  }
  // Raised RTK letters on a high-contrast dock-side nameplate.
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
  mark(-6.2,4.90,1.16,1.23,0,'charcoal','limeLight');
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
      b('white',0,1.50,-.46,1.49,1.36,2*end-.18);
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
  vehicle(-4.83,3.38,0,'yellow',true);
  vehicle(4.38,6.32,Math.PI/2,'white',false);
  // Forklift with safety cage, seat, hydraulic mast, forks and a strapped pallet.
  root.add(moving);
  moving.position.set(6.30,.08,2.07);
  parent=moving;
  local(0,0,0,-Math.PI/2,()=>{
    b('yellow',0,.51,0,.82,.5,1.29);
    b('charcoal',0,.78,-.32,.74,.21,.55);
    b('tire',0,.96,-.18,.44,.15,.42);
    b('tire',0,1.12,-.36,.44,.32,.08,-.15);
    for(const dx of [-.35,.35]) for(const dz of [-.45,.38]) b('charcoal',dx,1.17,dz,.055,.83,.055);
    b('yellow',0,1.62,-.03,.87,.11,1.03);
    for(const dx of [-.43,.43]) for(const dz of [-.41,.42]) wheel(dx,.26,dz,.24);
    for(const dx of [-.30,.30]) {
      b('charcoal',dx,1.0,.69,.075,1.70,.10);
      b('steel',dx,.33,1.02,.10,.07,.87);
    }
    b('trim',0,.88,.69,.66,.10,.13);
    b('wood',0,.48,1.19,.87,.14,.74);
    crate(0,.56,1.19,.79,.54,.70,2);
  });
  parent=root;
  // Safety bollards, traffic barriers, external piping and plant.
  for(const x of [-12.02,10.67]) for(const z of [-6.22,-3.02,.06]) {
    c('yellow',x,.32,z,.14,.62,.14);c('charcoal',x,.4,z,.142,.13,.142);
  }
  for(const x of [-11.71,10.08]){
    for(let z=-7.24;z<-5.35;z+=.58) c('trim',x,.24,z,.16,.46,.16);
    rod('yellow',[x,.47,-7.26],[x,.47,-5.49],.08);
  }
  // Selective yellow corner markers on the plinth.
  for(const [x,z] of [[-12.99,8.71],[12.99,8.71],[-12.99,-8.71],[12.99,-8.71]]) {
    b('yellow',x-Math.sign(x)*.32,.03,z,.70,.02,.045);
    b('yellow',x,.03,z-Math.sign(z)*.32,.045,.02,.70);
  }
  for(const {shape,mat,parent: target,items} of pools.values()) {
    const mesh=new T.InstancedMesh(shape,mat,items.length);
    items.forEach((m,i)=>mesh.setMatrixAt(i,m));
    mesh.castShadow=true;
    mesh.receiveShadow=true;
    target.add(mesh);
  }
  return {root,moving};
}
