const SITE_VERSION = 'v2026.07.21.14';
const SITE_BUILD = '2026-07-21 23:55';

const header = document.querySelector('[data-header]');
const menuButton = document.querySelector('[data-menu-button]');
const menu = document.querySelector('[data-menu]');

function updateHeader() {
  header?.classList.toggle('scrolled', window.scrollY > 40);
}
updateHeader();
window.addEventListener('scroll', updateHeader, { passive: true });

menuButton?.addEventListener('click', () => {
  const open = menu.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
});

menu?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    menu.classList.remove('open');
    menuButton?.setAttribute('aria-expanded', 'false');
  });
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));

document.querySelectorAll('[data-slider]').forEach((slider, sliderIndex) => {
  const slides = Array.from(slider.querySelectorAll(
    '.hero-slide, .story-slide, .patio-slide, .roof-slide, .kitchen-slide, .location-slide'
  ));
  const dotsHost = slider.querySelector('[data-dots]');
  const status = slider.querySelector('[data-slider-status]');
  const previousButton = slider.querySelector('[data-prev]');
  const nextButton = slider.querySelector('[data-next]');
  if (slides.length < 2) return;

  let current = 0;
  let timerId = null;
  const interval = Number(slider.dataset.interval || 6500);

  const dots = slides.map((_, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', `Vis billede ${index + 1} af ${slides.length}`);
    button.addEventListener('click', () => {
      show(index);
      restart();
    });
    dotsHost?.appendChild(button);
    return button;
  });

  function render() {
    slides.forEach((slide, index) => {
      const active = index === current;
      slide.classList.toggle('active', active);
      slide.setAttribute('aria-hidden', String(!active));
      slide.style.opacity = active ? '1' : '0';
      slide.style.visibility = active ? 'visible' : 'hidden';
    });
    dots.forEach((dot, index) => dot.classList.toggle('active', index === current));
    if (status) status.textContent = `Billede ${current + 1} / ${slides.length}`;
  }

  function show(index) {
    current = (index + slides.length) % slides.length;
    render();
  }
  function stop() {
    if (timerId) window.clearInterval(timerId);
    timerId = null;
  }
  function start() {
    stop();
    timerId = window.setInterval(() => show(current + 1), interval);
  }
  function restart() { start(); }

  previousButton?.addEventListener('click', () => { show(current - 1); restart(); });
  nextButton?.addEventListener('click', () => { show(current + 1); restart(); });
  slider.addEventListener('touchstart', stop, { passive: true });
  slider.addEventListener('touchend', start, { passive: true });

  render();
  start();
  console.info(`Slider ${sliderIndex + 1} started with ${slides.length} images`);
});

const sections = Array.from(document.querySelectorAll('main section[id], main[id]'));
const navLinks = Array.from(document.querySelectorAll('.main-nav a[href^="#"]'));
const navObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navLinks.forEach((link) => {
      link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`);
    });
  });
}, { rootMargin: '-35% 0px -55% 0px', threshold: 0 });
sections.forEach((section) => navObserver.observe(section));

const galleryItems = Array.from(document.querySelectorAll('[data-gallery] .gallery-item'));
const filterButtons = Array.from(document.querySelectorAll('[data-gallery-filter]'));

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const filter = button.dataset.galleryFilter;
    filterButtons.forEach((item) => item.classList.toggle('active', item === button));
    galleryItems.forEach((item) => {
      const categories = (item.dataset.category || '').split(' ');
      item.hidden = filter !== 'all' && !categories.includes(filter);
    });
  });
});

const lightbox = document.querySelector('[data-lightbox]');
const lightboxImg = lightbox?.querySelector('img');
const lightboxCaption = lightbox?.querySelector('[data-lightbox-caption]');
const lightboxCount = lightbox?.querySelector('[data-lightbox-count]');
const lightboxPrev = lightbox?.querySelector('[data-lightbox-prev]');
const lightboxNext = lightbox?.querySelector('[data-lightbox-next]');
let lightboxIndex = 0;
let touchStartX = 0;

function visibleGalleryItems() {
  return galleryItems.filter((item) => !item.hidden);
}

function renderLightbox(index) {
  const items = visibleGalleryItems();
  if (!items.length || !lightbox || !lightboxImg) return;
  lightboxIndex = (index + items.length) % items.length;
  const item = items[lightboxIndex];
  const image = item.querySelector('img');
  lightboxImg.src = image.currentSrc || image.src;
  lightboxImg.alt = image.alt;
  if (lightboxCaption) lightboxCaption.textContent = item.dataset.caption || image.alt;
  if (lightboxCount) lightboxCount.textContent = `${lightboxIndex + 1} / ${items.length}`;
}

function openLightbox(item) {
  const items = visibleGalleryItems();
  renderLightbox(items.indexOf(item));
  lightbox.hidden = false;
  document.body.style.overflow = 'hidden';
  lightbox.querySelector('.lightbox-close')?.focus();
}

function closeLightbox() {
  if (!lightbox) return;
  lightbox.hidden = true;
  document.body.style.overflow = '';
}

galleryItems.forEach((item) => item.addEventListener('click', () => openLightbox(item)));
lightboxPrev?.addEventListener('click', () => renderLightbox(lightboxIndex - 1));
lightboxNext?.addEventListener('click', () => renderLightbox(lightboxIndex + 1));
lightbox?.querySelector('.lightbox-close')?.addEventListener('click', closeLightbox);
lightbox?.addEventListener('click', (event) => {
  if (event.target === lightbox) closeLightbox();
});
lightbox?.addEventListener('touchstart', (event) => {
  touchStartX = event.changedTouches[0].clientX;
}, { passive: true });
lightbox?.addEventListener('touchend', (event) => {
  const delta = event.changedTouches[0].clientX - touchStartX;
  if (Math.abs(delta) < 50) return;
  renderLightbox(lightboxIndex + (delta < 0 ? 1 : -1));
}, { passive: true });

document.addEventListener('keydown', (event) => {
  if (!lightbox || lightbox.hidden) return;
  if (event.key === 'Escape') closeLightbox();
  if (event.key === 'ArrowLeft') renderLightbox(lightboxIndex - 1);
  if (event.key === 'ArrowRight') renderLightbox(lightboxIndex + 1);
});

window.addEventListener('load', () => {
  const sliders = Array.from(document.querySelectorAll('[data-slider]'));
  const missingImages = Array.from(document.images)
    .filter((img) => !img.complete || img.naturalWidth === 0)
    .map((img) => img.src);
  const qa = {
    version: SITE_VERSION,
    sliders: sliders.length,
    galleryItems: galleryItems.length,
    missingImages
  };
  document.documentElement.dataset.qaSliders = String(qa.sliders);
  document.documentElement.dataset.qaGalleryItems = String(qa.galleryItems);
  document.documentElement.dataset.qaMissingImages = String(qa.missingImages.length);
  console.info('Casa Amar QA', qa);
});

console.info(`Casa Amar ${SITE_VERSION} – ${SITE_BUILD}`);
