const SITE_VERSION = 'v2026.07.21.01';
const SITE_BUILD = '2026-07-21 18:30';

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

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.querySelectorAll('[data-slider]').forEach((slider) => {
  const slides = Array.from(slider.children).filter((child) =>
    child.matches('.hero-slide, .story-slide, .patio-slide, .roof-slide')
  );
  const dotsHost = slider.querySelector('[data-dots]');
  const status = slider.querySelector('[data-slider-status]');
  if (slides.length < 2) return;

  let current = Math.max(0, slides.findIndex((slide) => slide.classList.contains('active')));
  let timer = null;
  const interval = Number(slider.dataset.interval || 7000);

  const dots = slides.map((_, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', `Vis billede ${index + 1} af ${slides.length}`);
    button.addEventListener('click', () => show(index, true));
    dotsHost?.appendChild(button);
    return button;
  });

  function updateStatus() {
    if (status) status.textContent = `Billede ${current + 1} / ${slides.length}`;
  }

  function show(index, manual = false) {
    slides[current].classList.remove('active');
    dots[current]?.classList.remove('active');
    current = (index + slides.length) % slides.length;
    slides[current].classList.add('active');
    dots[current]?.classList.add('active');
    updateStatus();
    if (manual) restart();
  }

  function start() {
    if (reducedMotion) return;
    clearInterval(timer);
    timer = setInterval(() => show(current + 1), interval);
  }

  function restart() {
    start();
  }

  slides.forEach((slide, index) => slide.classList.toggle('active', index === current));
  dots[current]?.classList.add('active');
  updateStatus();
  start();

  slider.addEventListener('mouseenter', () => clearInterval(timer));
  slider.addEventListener('mouseleave', start);
  slider.addEventListener('focusin', () => clearInterval(timer));
  slider.addEventListener('focusout', start);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearInterval(timer);
    else start();
  });
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
