// The fixed camera lets lightweight devices reuse the lit building and depth buffer.
// Only actors are projected and rasterized again when their pose changes.
import * as T from './three.module.js';

const width=600, height=380;
const sun=new T.Vector3(-.65,1.3,1).normalize();
const fill=new T.Vector3(.91,.78,-.84).normalize();

function collect(model) {
  const joints=[model.truck,model.passing,model.fork,model.lift,model.cargo,
    model.delivered,model.gate,...model.workers.flatMap(w=>[w.g,...w.limbs])];
  const batches=new Map([model.root,...joints].map(node=>[node,{
    node,positions:[],triangles:[],normals:[],shades:[],vertices:new Map()
  }]));
  const colors=new Map(), color=new T.Color(), vector=new T.Vector3();
  const transform=new T.Matrix4(), instance=new T.Matrix4();
  model.root.updateMatrixWorld(true);
  model.root.traverse(mesh=>{
    if (!mesh.isMesh) return;
    let joint=mesh;
    while (!batches.has(joint)) joint=joint.parent;
    const batch=batches.get(joint), g=mesh.geometry;
    const base=new T.Matrix4().copy(joint.matrixWorld).invert().multiply(mesh.matrixWorld);
    const position=g.attributes.position;
    let palette=colors.get(mesh.material);
    if (!palette) {
      palette=new Uint32Array(64);
      for (let i=0;i<64;i++) {
        color.copy(mesh.material.color).multiplyScalar(.45+i/42).convertLinearToSRGB();
        const byte=k=>Math.min(255,Math.round(k*255));
        palette[i]=(255<<24)|(byte(color.b)<<16)|(byte(color.g)<<8)|byte(color.r);
      }
      colors.set(mesh.material,palette);
    }
    for (let k=0;k<(mesh.isInstancedMesh?mesh.count:1);k++) {
      transform.copy(base);
      if (mesh.isInstancedMesh) {mesh.getMatrixAt(k,instance);transform.multiply(instance);}
      const indices=[];
      for (let j=0;j<position.count;j++) {
        vector.fromBufferAttribute(position,j).applyMatrix4(transform);
        const key=[vector.x,vector.y,vector.z].map(v=>Math.round(v*10000)).join('/');
        let index=batch.vertices.get(key);
        if (index===undefined) {
          index=batch.positions.length;
          batch.positions.push(vector.x,vector.y,vector.z);batch.vertices.set(key,index);
        }
        indices.push(index);
      }
      const count=g.index?.count??position.count;
      for (let j=0;j<count;j+=3) {
        const [a,b,c]=[j,j+1,j+2].map(n=>indices[g.index?g.index.getX(n):n]);
        batch.triangles.push(a,b,c);
        const p=batch.positions;
        const ux=p[b]-p[a],uy=p[b+1]-p[a+1],uz=p[b+2]-p[a+2];
        const vx=p[c]-p[a],vy=p[c+1]-p[a+1],vz=p[c+2]-p[a+2];
        vector.set(uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx).normalize();
        batch.normals.push(vector.x,vector.y,vector.z);
        batch.shades.push(palette);
      }
    }
  });
  for (const b of batches.values()) {
    b.positions=Float32Array.from(b.positions); b.normals=Float32Array.from(b.normals);
    b.triangles=Uint32Array.from(b.triangles); b.screen=new Float32Array(b.positions.length);
    delete b.vertices;
  }
  return {building:batches.get(model.root),actors:joints.map(node=>batches.get(node))};
}

export async function loadSoftwareYard(model, camera) {
  const still=new Image();
  still.src=new URL('./yard/empty-smooth.webp',import.meta.url).href;
  await still.decode();
  const canvas=document.createElement('canvas');
  canvas.width=width; canvas.height=height; canvas.setAttribute('aria-hidden','true');
  const ctx=canvas.getContext('2d');
  if (!ctx) throw Error('Canvas unavailable');
  ctx.drawImage(still,0,0,width,height);
  const backdrop=ctx.getImageData(0,0,width,height);
  const frame=ctx.createImageData(width,height), pixels=new Uint32Array(frame.data.buffer);
  const depth=new Float32Array(width*height).fill(Infinity);
  const {building,actors}=collect(model);
  const screenMatrix=new T.Matrix4().makeScale(width/2,-height/2,1);
  screenMatrix.setPosition(width/2,height/2,0);
  screenMatrix.multiply(camera.projectionMatrix).multiply(camera.matrixWorldInverse);
  const transform=new T.Matrix4(), rotation=new T.Quaternion();
  const light=new T.Vector3(), rim=new T.Vector3();

  function drawBatch(batch, depthOnly) {
    for (let node=batch.node;node;node=node.parent) if (!node.visible) return;
    const m=transform.multiplyMatrices(screenMatrix,batch.node.matrixWorld).elements;
    const p=batch.positions,s=batch.screen;
    for (let i=0;i<p.length;i+=3) {
      const x=p[i],y=p[i+1],z=p[i+2];
      s[i]=m[0]*x+m[4]*y+m[8]*z+m[12];
      s[i+1]=m[1]*x+m[5]*y+m[9]*z+m[13];
      s[i+2]=m[2]*x+m[6]*y+m[10]*z+m[14];
    }
    batch.node.getWorldQuaternion(rotation).invert();
    light.copy(sun).applyQuaternion(rotation);rim.copy(fill).applyQuaternion(rotation);
    const tris=batch.triangles,n=batch.normals;
    for (let i=0;i<tris.length;i+=3) {
      const a=tris[i],b=tris[i+1],c=tris[i+2];
      const ax=s[a],ay=s[a+1],az=s[a+2],bx=s[b],by=s[b+1],cx=s[c],cy=s[c+1];
      const ex=bx-ax,ey=by-ay,fx=cx-ax,fy=cy-ay,area=ex*fy-ey*fx;
      if (Math.abs(area)<.001 || (!depthOnly && area>=0)) continue;
      const x0=Math.max(0,Math.ceil(Math.min(ax,bx,cx)-.5)),x1=Math.min(width-1,Math.floor(Math.max(ax,bx,cx)-.5));
      const y0=Math.max(0,Math.ceil(Math.min(ay,by,cy)-.5)),y1=Math.min(height-1,Math.floor(Math.max(ay,by,cy)-.5));
      const nx=n[i],ny=n[i+1],nz=n[i+2];
      const level=Math.min(63,Math.round(41*Math.max(0,nx*light.x+ny*light.y+nz*light.z)+18*Math.max(0,nx*rim.x+ny*rim.y+nz*rim.z)));
      const shade=batch.shades[i/3][level];
      const dzB=s[b+2]-az,dzC=s[c+2]-az,du=fy/area,dv=-ey/area;
      for (let y=y0;y<=y1;y++) {
        let u=((x0+.5-ax)*fy-(y+.5-ay)*fx)/area;
        let v=(ex*(y+.5-ay)-ey*(x0+.5-ax))/area;
        let dest=y*width+x0;
        for (let x=x0;x<=x1;x++,dest++,u+=du,v+=dv) {
          if (u<0 || v<0 || u+v>1) continue;
          const z=az+u*dzB+v*dzC;
          if (z>=depth[dest]) continue;
          depth[dest]=z;
          if (!depthOnly) pixels[dest]=shade;
        }
      }
    }
  }
  // Contact shadows sit on the road plane. The building depth masks hidden actors.
  const origin=new T.Vector3(),side=new T.Vector3(),front=new T.Vector3();
  function contact(node,halfWidth,halfLength,floor) {
    const {x,z}=node.position,heading=node.rotation.y;
    const sin=Math.sin(heading),cos=Math.cos(heading);
    origin.set(x+.13,floor,z-.12).applyMatrix4(screenMatrix);
    side.set(x+.13+cos*halfWidth,floor,z-.12-sin*halfWidth).applyMatrix4(screenMatrix).sub(origin);
    front.set(x+.13+sin*halfLength,floor,z-.12+cos*halfLength).applyMatrix4(screenMatrix).sub(origin);
    const det=side.x*front.y-side.y*front.x;
    const rx=Math.abs(side.x)+Math.abs(front.x),ry=Math.abs(side.y)+Math.abs(front.y);
    for(let py=Math.max(0,Math.floor(origin.y-ry));py<Math.min(height,origin.y+ry);py++){
      for(let px=Math.max(0,Math.floor(origin.x-rx));px<Math.min(width,origin.x+rx);px++){
        const dx=px+.5-origin.x,dy=py+.5-origin.y;
        const u=(dx*front.y-dy*front.x)/det,v=(side.x*dy-side.y*dx)/det;
        const r=u*u+v*v,index=py*width+px;
        if(r>=1 || origin.z+u*side.z+v*front.z>depth[index]+.0007)continue;
        const strength=1-.32*(1-r);
        for(let c=0;c<3;c++)frame.data[index*4+c]*=strength;
      }
    }
  }
  drawBatch(building,true);
  const staticDepth=depth.slice();
  return {canvas,paint(){
    model.root.updateMatrixWorld(true);
    depth.set(staticDepth); frame.data.set(backdrop.data);
    contact(model.truck,1.15,2.85,.07);
    contact(model.passing,1,2.45,.07);
    contact(model.fork,.61,1.12,.85);
    for(const worker of model.workers) contact(worker.g,.30,.40,.09);
    for (const actor of actors) drawBatch(actor,false);
    ctx.putImageData(frame,0,0);
  }};
}
