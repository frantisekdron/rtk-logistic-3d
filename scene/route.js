export const cycle = 42;
export const smooth = value => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

export function truckPoseAt(time) {
  const t = (time % cycle + cycle) % cycle;
  let x = 10.5, z = 4.45, heading = 0;
  if (t < 7) {
    x = -11 + 21.5 * smooth(t / 7);
    z = 9;
    heading = Math.PI / 2;
  } else if (t < 10) {
    z = 9;
    heading = (1 - smooth((t - 7) / 3)) * Math.PI / 2;
  } else if (t < 15) {
    z = 9 - 4.55 * smooth((t - 10) / 5);
  } else if (t >= 29 && t < 33) {
    z = 4.45 + 4.55 * smooth((t - 29) / 4);
  } else if (t >= 33 && t < 36) {
    z = 9;
    heading = -Math.PI / 2 * smooth((t - 33) / 3);
  } else if (t >= 36) {
    x = 10.5 - 21.5 * smooth((t - 36) / 6);
    z = 9;
    heading = -Math.PI / 2;
  }
  return {x, z, heading};
}
