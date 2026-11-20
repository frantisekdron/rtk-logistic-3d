export const cycle = 42;
const halfTurn = Math.PI;
const quarterTurn = Math.PI/2;
export function smooth(value) {
  const t = Math.max(0, Math.min(1, value));
  return t*t*(3-2*t);
}

// Distance is measured along the road so the heading follows its tangent.
export function truckPoseAt(time) {
  const t = (time%cycle+cycle)%cycle;
  const dock = {x:10.5,z:4.45,heading:0};
  if (t < 10) {
    const straight = 16.5, radius = 3.6;
    const s = (straight+quarterTurn*radius)*smooth(t/10);
    if (s <= straight) return {x:-9.6+s,z:6.1,heading:quarterTurn};
    const a = (s-straight)/radius;
    return {x:6.9+radius*Math.sin(a),z:9.7-radius*Math.cos(a),heading:quarterTurn-a};
  }
  if (t < 15) return {...dock,z:9.7-5.25*smooth((t-10)/5)};
  if (t < 29) return dock;

  const exitStraight = 2.75, radius = 3.3, returnStraight = 16.8, turnRadius = 2.2;
  let s = (exitStraight+quarterTurn*radius+returnStraight+halfTurn*turnRadius)*smooth((t-29)/13);
  if (s <= exitStraight) return {...dock,z:4.45+s};
  s -= exitStraight;
  if (s <= quarterTurn*radius) {
    const a = s/radius;
    return {x:7.2+radius*Math.cos(a),z:7.2+radius*Math.sin(a),heading:-a};
  }
  s -= quarterTurn*radius;
  if (s <= returnStraight) return {x:7.2-s,z:10.5,heading:-quarterTurn};
  const a = (s-returnStraight)/turnRadius;
  return {x:-9.6-turnRadius*Math.sin(a),z:8.3+turnRadius*Math.cos(a),heading:-quarterTurn-a};
}

// A delivery van follows a closed service road around the building.
const corners = [
  [12.2,9.1,0], [12.2,-7.9,1], [-12.2,-7.9,2], [-12.2,9.1,3]
];
const straights = [24.4,17,24.4,17];
const radius = 3.15;
const lap = 2*(24.4+17)+2*Math.PI*radius;
export function vanPoseAt(time) {
  let d = ((time*1.72-19)%lap+lap)%lap;
  for (let i=0;i<4;i++) {
    const [cx,cz,k] = corners[i];
    const heading = (k+1)*quarterTurn;
    const tx = Math.sin(heading), tz = Math.cos(heading);
    const ex = cx-radius*Math.cos(heading), ez = cz+radius*Math.sin(heading);
    if (d <= straights[i]) return {x:ex-(straights[i]-d)*tx,z:ez-(straights[i]-d)*tz,heading};
    d -= straights[i];
    if (d <= radius*quarterTurn || i===3) {
      const a = heading+d/radius;
      return {x:cx-radius*Math.cos(a),z:cz+radius*Math.sin(a),heading:a};
    }
    d -= radius*quarterTurn;
  }
}
