/**
 * Casa Amar Experience Engine 2.0
 * A progressive-enhancement layer for the public website.
 * No personal data, cookies or persistent identifiers are used.
 */
(() => {
  'use strict';

  const root = document.documentElement;
  const body = document.body;
  const header = document.querySelector('[data-header]');
  const progress = document.querySelector('[data-experience-progress]');
  const progressBar = progress?.querySelector('[data-experience-progress-bar]');
  const backToTop = document.querySelector('[data-back-to-top]');
  const chapterLabel = document.querySelector('[data-current-chapter]');
  const navLinks = [...document.querySelectorAll('.main-nav a[href^="#"]')];
  const sections = [...document.querySelectorAll('main section[id], main[id]')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover:hover) and (pointer:fine)').matches;

  let scheduled = false;
  let lastScrollY = window.scrollY;
  let activeId = 'top';

  const chapterNames = new Map([
    ['top', 'Forside'],
    ['huset', 'Huset'],
    ['udeliv', 'Udeliv'],
    ['beliggenhed', 'Beliggenhed'],
    ['din-ferie', 'Din ferie'],
    ['omraadet', 'Området'],
    ['galleri', 'Galleri'],
    ['praktisk', 'Praktisk'],
    ['kontakt', 'Kontakt']
  ]);

  function setActiveNavigation(id) {
    if (!id || id === activeId) return;
    activeId = id;
    root.dataset.experienceChapter = id;
    navLinks.forEach((link) => {
      const isActive = link.getAttribute('href') === `#${id}`;
      link.classList.toggle('active', isActive);
      if (isActive) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    if (chapterLabel) chapterLabel.textContent = chapterNames.get(id) || 'Casa Amar';
  }

  function updateScrollState() {
    const y = window.scrollY;
    const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const ratio = Math.min(1, Math.max(0, y / scrollable));

    if (progressBar) progressBar.style.transform = `scaleX(${ratio})`;
    if (progress) progress.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));

    header?.classList.toggle('is-compact', y > 36);
    body.classList.toggle('has-scrolled', y > 36);
    backToTop?.classList.toggle('is-visible', y > Math.max(600, window.innerHeight * 0.9));

    if (header) {
      const direction = y > lastScrollY ? 'down' : 'up';
      header.dataset.scrollDirection = direction;
    }
    lastScrollY = y;
    scheduled = false;
  }

  function scheduleScrollUpdate() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(updateScrollState);
  }

  function setupSectionObserver() {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible?.target?.id) setActiveNavigation(visible.target.id);
    }, { rootMargin: '-28% 0px -58% 0px', threshold: [0.02, 0.15, 0.35, 0.6] });
    sections.forEach((section) => observer.observe(section));
  }

  function setupRevealSystem() {
    const revealTargets = [...document.querySelectorAll('.reveal, .bedroom-card, .area-card, .season-grid article, .practical-grid article, .gallery-item')];
    revealTargets.forEach((element, index) => {
      element.dataset.experienceReveal = '';
      element.style.setProperty('--reveal-order', String(index % 4));
    });

    if (reducedMotion || !('IntersectionObserver' in window)) {
      revealTargets.forEach((element) => element.classList.add('experience-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries, revealObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('experience-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealTargets.forEach((element) => observer.observe(element));
  }

  function setupImages() {
    document.querySelectorAll('main img').forEach((image) => {
      image.classList.add('experience-image');
      const markReady = () => image.classList.add('is-ready');
      if (image.complete && image.naturalWidth > 0) markReady();
      else {
        image.addEventListener('load', markReady, { once: true });
        image.addEventListener('error', () => image.classList.add('is-error'), { once: true });
      }
    });
  }

  function setupAnchorNavigation() {
    document.addEventListener('click', (event) => {
      const link = event.target.closest('a[href^="#"]');
      if (!link) return;
      const id = link.getAttribute('href').slice(1) || 'top';
      const target = document.getElementById(id);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(null, '', `#${id}`);
      window.setTimeout(() => {
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
        target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
      }, reducedMotion ? 0 : 480);
    });

    backToTop?.addEventListener('click', () => {
      document.getElementById('top')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    });
  }

  function setupCardDepth() {
    if (!finePointer || reducedMotion) return;
    const cards = document.querySelectorAll('.bedroom-card, .area-card, .gallery-item, .season-grid article');
    cards.forEach((card) => {
      card.classList.add('experience-depth');
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        card.style.setProperty('--depth-x', `${(-y * 2.2).toFixed(2)}deg`);
        card.style.setProperty('--depth-y', `${(x * 2.2).toFixed(2)}deg`);
      });
      card.addEventListener('pointerleave', () => {
        card.style.removeProperty('--depth-x');
        card.style.removeProperty('--depth-y');
      });
    });
  }

  function exposeHealth() {
    const snapshot = {
      version: '2.0.0',
      activeChapter: activeId,
      sections: sections.length,
      navLinks: navLinks.length,
      reducedMotion,
      initializedAt: new Date().toISOString()
    };
    window.CasaExperienceEngine = Object.freeze({
      version: snapshot.version,
      snapshot: () => ({ ...snapshot, activeChapter: activeId })
    });
    root.dataset.experienceEngine = snapshot.version;
  }

  setupSectionObserver();
  setupRevealSystem();
  setupImages();
  setupAnchorNavigation();
  setupCardDepth();
  exposeHealth();
  updateScrollState();
  window.addEventListener('scroll', scheduleScrollUpdate, { passive: true });
  window.addEventListener('resize', scheduleScrollUpdate, { passive: true });
})();
