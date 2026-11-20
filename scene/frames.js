const asset = file => new URL('./yard/' + file, import.meta.url);
async function image(file) {
  const img = new Image();
  img.src = asset(file);
  await img.decode();
  return img;
}

export async function loadYardFrames() {
  const [cover, frames, ...sheets] = await Promise.all([
    image('cover.webp'),
    fetch(asset('tiles.json')).then(response => {
      if (!response.ok) throw Error('Missing truck frames');
      return response.json();
    }),
    ...[0,1,2,3].map(i => image('motion-' + i + '.webp'))
  ]);
  const canvas = document.createElement('canvas');
  canvas.width = cover.width;
  canvas.height = cover.height;
  canvas.setAttribute('aria-hidden','true');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw Error('Canvas unavailable');
  let previous = -1;
  function paint(time) {
    const frame = Math.min(frames.length-1, Math.floor(time*4));
    if (frame === previous) return;
    previous = frame;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(cover, 0, 0);
    // Only the 16px tiles changed by a truck, worker or shadow need another draw.
    const cells = frames[frame];
    const sheet = sheets[Math.floor(frame/42)];
    const columns = Math.ceil(canvas.width/16);
    const sourceColumns = sheet.width/16;
    for (let i=0; i<cells.length; i+=2) {
      const destination = cells[i], source = cells[i+1];
      const x = destination%columns*16, y = Math.floor(destination/columns)*16;
      ctx.clearRect(x,y,16,16);
      ctx.drawImage(sheet,source%sourceColumns*16,Math.floor(source/sourceColumns)*16,16,16,x,y,16,16);
    }
  }
  return {canvas, paint};
}
