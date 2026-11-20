'use strict';
const menuButton = document.querySelector('.menu-toggle');
const nav = document.getElementById('hlavni-nav');
function setMenu(open) {
  nav.classList.toggle('is-open', open);
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Zavřít menu' : 'Otevřít menu');
  menuButton.querySelector('use').setAttribute('href', open ? '#close' : '#bars');
}
menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
nav.addEventListener('click', () => setMenu(false));
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
    setMenu(false);
    menuButton.focus();
  }
});

const services = [...document.querySelectorAll('details[data-image]')];
const photo = document.getElementById('service-photo');
const caption = document.getElementById('service-caption');
for (const detail of services) {
  detail.addEventListener('toggle', () => {
    if (!detail.open) return;
    for (const other of services) if (other !== detail && other.open) other.open = false;
    photo.src = 'assets/' + detail.dataset.image + '.webp';
    photo.alt = detail.dataset.caption;
    caption.textContent = detail.dataset.caption;
  });
}

const dialog = document.getElementById('inquiry');
const form = document.getElementById('inquiry-form');
const statusLine = document.getElementById('form-status');
for (const link of document.querySelectorAll('[data-inquiry]')) {
  link.addEventListener('click', e => {
    if (typeof dialog.showModal !== 'function') return;
    e.preventDefault();
    const open = services.find(detail => detail.open);
    if (open) form.elements.service.value = open.querySelector('summary').textContent.trim();
    statusLine.textContent = '';
    dialog.showModal();
  });
}
document.getElementById('close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', e => {
  if (e.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) dialog.close();
});
function draft() {
  const fields = new FormData(form);
  return {
    subject: 'Poptávka – ' + fields.get('service'),
    body: ['Dobrý den,', '', 'mám zájem o službu: ' + fields.get('service') + '.', '', String(fields.get('message')).trim(), '', String(fields.get('company')).trim()].join('\n')
  };
}
form.addEventListener('submit', e => {
  e.preventDefault();
  const {subject, body} = draft();
  location.href = 'mailto:logistika@rtk.cz?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  statusLine.textContent = 'E-mail odešlete ve své poštovní aplikaci. Pokud se neotevřela, zkopírujte text a pošlete ho na logistika@rtk.cz.';
});
document.getElementById('copy-inquiry').addEventListener('click', async () => {
  if (!form.reportValidity()) return;
  const {subject, body} = draft();
  const text = subject + '\n\n' + body;
  try {
    await navigator.clipboard.writeText(text);
    statusLine.textContent = 'Zkopírováno. Poptávku můžete poslat na logistika@rtk.cz.';
  } catch {
    statusLine.textContent = 'Text pro ruční zkopírování:';
    const field = document.createElement('textarea');
    field.readOnly = true;
    field.value = text;
    statusLine.append(field);
    field.focus();
    field.select();
  }
});

const filmLink = document.querySelector('.film-link');
const filmDialog = document.getElementById('orbit-film');
const orbitVideo = filmDialog.querySelector('video');
filmLink.addEventListener('click', event => {
  if (typeof filmDialog.showModal !== 'function') return;
  event.preventDefault();
  if (!orbitVideo.hasAttribute('src')) orbitVideo.src = filmLink.href;
  filmDialog.showModal();
  orbitVideo.play().catch(() => {});
});
filmDialog.addEventListener('close', () => orbitVideo.pause());

const modelDialog = document.getElementById('model-dialog');
const modelFigure = document.querySelector('.model');
const expandModel = document.querySelector('[data-expand-model]');
const modelAnchor = document.createComment('3D model');
modelFigure.before(modelAnchor);
expandModel.addEventListener('click', () => {
  if (modelDialog.open) {
    modelDialog.close();
    return;
  }
  modelDialog.append(modelFigure);
  modelDialog.showModal();
  expandModel.querySelector('span').textContent = 'Zavřít náhled';
  expandModel.setAttribute('aria-label','Zavřít velký model');
  document.getElementById('warehouse').focus({preventScroll:true});
});
modelDialog.addEventListener('close', () => {
  modelAnchor.after(modelFigure);
  expandModel.querySelector('span').textContent = 'Zvětšit náhled';
  expandModel.setAttribute('aria-label','Otevřít velký model');
  expandModel.focus({preventScroll:true});
});
