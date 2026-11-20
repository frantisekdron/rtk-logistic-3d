(() => {
  const page = document.querySelector('.historic-page');
  const frame = document.querySelector('.archive-window');
  const zoomButton = document.querySelector('.view-zoom');
  let enlarged = false;

  function resize() {
    const compact = frame.clientWidth < 990;
    const scale = compact && !enlarged ? frame.clientWidth / 990 : 1;
    page.style.zoom = String(scale);
    zoomButton.textContent = enlarged ? 'Celá šířka' : 'Zvětšit';
    zoomButton.setAttribute('aria-pressed', String(enlarged));
  }
  new ResizeObserver(resize).observe(frame);
  zoomButton.addEventListener('click', () => {
    enlarged = !enlarged;
    resize();
  });
  resize();

  document.querySelectorAll('[data-dialog], a[href="#jazyk"]').forEach(control => {
    const dialog = document.getElementById(control.dataset.dialog || 'jazyk');
    control.addEventListener('click', e => {
      e.preventDefault();
      dialog.showModal();
    });
  });
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right ||
          event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
  });
  if (document.body.dataset.page === 'skladovani' &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const photos = ['a','b','c'];
    const image = document.getElementById('motiv');
    let index = 0;
    setInterval(() => {
      if (document.hidden) return;
      index = (index + 1) % photos.length;
      image.src = 'img/header-motiv3' + photos[index] + '.jpg';
    }, 6000);
  }
})();
