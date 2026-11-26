(() => {
  'use strict';
  const yard = document.getElementById('warehouse');
  const video = yard.querySelector('video');
  const image = yard.querySelector('img');
  const control = yard.querySelector('.yard-play');
  const symbol = control.querySelector('use');
  const animation = image.src;
  const poster = new URL('zacatek.webp', animation).href;
  let playing = true;
  let seekTimer;

  function showFrame() {
    if (video.readyState >= 2 && video.currentTime > 0 && !video.error) yard.dataset.surface = 'film';
  }

  function showPicture() {
    clearInterval(seekTimer);
    yard.dataset.surface = 'image';
    image.src = playing ? animation : poster;
  }

  // If inline autoplay is denied, advance the muted film using its seekable timeline.
  // Keeping the same timeline lets pause and play work at the current frame.
  function playBySeeking() {
    if (!playing || !video.paused || video.error) return;
    clearInterval(seekTimer);
    const start = performance.now() - video.currentTime * 1000;
    seekTimer = setInterval(() => {
      if (!document.hidden && !video.seeking && video.seekable.length && video.seekable.end(0) > 0 && Number.isFinite(video.duration)) {
        video.currentTime = ((performance.now() - start) / 1000) % video.duration;
      }
    }, 80);
  }

  function play() {
    if (yard.dataset.surface !== 'film' && image.src !== animation) image.src = animation;
    if (video.error) {
      showPicture();
      return;
    }
    video.play().catch(error => {
      if (error.name === 'NotAllowedError') playBySeeking();
    });
  }

  video.addEventListener('timeupdate', showFrame);
  video.addEventListener('seeked', showFrame);
  video.addEventListener('playing', () => {
    clearInterval(seekTimer);
    showFrame();
  });
  video.addEventListener('error', showPicture);

  control.addEventListener('click', () => {
    playing = !playing;
    control.setAttribute('aria-label', playing ? 'Pozastavit animaci' : 'Přehrát animaci');
    symbol.setAttribute('href', playing ? '#pause' : '#play');
    if (playing) {
      play();
    } else {
      clearInterval(seekTimer);
      video.pause();
      if (yard.dataset.surface !== 'film') showPicture();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && playing && video.paused) play();
  });
  control.hidden = false;
  video.preload = 'auto';
  play();
})();
