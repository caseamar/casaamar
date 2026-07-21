const SITE_VERSION = 'v2026.07.21.10';
const SITE_BUILD = '2026-07-21 22:10';

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
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));

document.querySelectorAll('[data-slider]').forEach((slider, sliderIndex) => {
  const slides = Array.from(slider.querySelectorAll('.hero-slide, .story-slide, .patio-slide, .roof-slide, .kitchen-slide, .location-slide'));
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

  function next() {
    show(current + 1);
  }

  function previous() {
    show(current - 1);
  }

  function stop() {
    if (timerId) window.clearInterval(timerId);
    timerId = null;
  }

  function start() {
    stop();
    timerId = window.setInterval(next, interval);
  }

  function restart() {
    start();
  }

  previousButton?.addEventListener('click', () => {
    previous();
    restart();
  });
  nextButton?.addEventListener('click', () => {
    next();
    restart();
  });

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

const lightbox = document.querySelector('[data-lightbox]');
const lightboxImg = lightbox?.querySelector('img');
document.querySelectorAll('[data-gallery] button').forEach((button) => {
  button.addEventListener('click', () => {
    const image = button.querySelector('img');
    if (!image || !lightboxImg || !lightbox) return;
    lightboxImg.src = image.src;
    lightboxImg.alt = image.alt;
    lightbox.hidden = false;
  });
});
lightbox?.querySelector('.lightbox-close')?.addEventListener('click', () => {
  lightbox.hidden = true;
});
lightbox?.addEventListener('click', (event) => {
  if (event.target === lightbox) lightbox.hidden = true;
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && lightbox && !lightbox.hidden) lightbox.hidden = true;
});

console.info(`Casa Amar ${SITE_VERSION} – ${SITE_BUILD}`);


window.addEventListener('load', () => {
  const sliders = Array.from(document.querySelectorAll('[data-slider]'));
  const qa = {
    version: SITE_VERSION,
    sliders: sliders.length,
    sliderImages: sliders.map((slider) =>
      slider.querySelectorAll('.hero-slide, .story-slide, .patio-slide, .roof-slide, .kitchen-slide, .location-slide').length
    ),
    missingImages: Array.from(document.images).filter((img) => !img.complete || img.naturalWidth === 0).map((img) => img.src)
  };
  document.documentElement.dataset.qaSliders = String(qa.sliders);
  document.documentElement.dataset.qaMissingImages = String(qa.missingImages.length);
  console.info('Casa Amar QA', qa);
});
