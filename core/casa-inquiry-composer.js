(() => {
  const dialog = document.querySelector('[data-inquiry-dialog]');
  if (!dialog) return;

  const openers = document.querySelectorAll('[data-inquiry-open]');
  const closeButtons = dialog.querySelectorAll('[data-inquiry-close]');
  const form = dialog.querySelector('[data-inquiry-form]');
  const formView = dialog.querySelector('[data-inquiry-form-view]');
  const completionView = dialog.querySelector('[data-inquiry-completion]');
  const completionTitle = dialog.querySelector('[data-inquiry-completion-title]');
  const completionText = dialog.querySelector('[data-inquiry-completion-text]');
  const completionClose = dialog.querySelector('[data-inquiry-completion-close]');
  const copyButton = dialog.querySelector('[data-inquiry-copy]');
  const status = dialog.querySelector('[data-inquiry-status]');
  const email = 'Larsenmichael@hotmail.com';
  let lastFocused = null;

  const fields = {
    arrival: form?.elements.namedItem('arrival'),
    departure: form?.elements.namedItem('departure'),
    guests: form?.elements.namedItem('guests'),
    stay: form?.elements.namedItem('stay'),
    name: form?.elements.namedItem('name')
  };

  const setStatus = (message, kind = '') => {
    if (!status) return;
    status.textContent = message;
    status.dataset.state = kind;
  };

  const setView = (view = 'form') => {
    const complete = view === 'completion';
    formView?.toggleAttribute('hidden', complete);
    completionView?.toggleAttribute('hidden', !complete);
    dialog.dataset.view = view;
  };

  const showCompletion = ({ title, text }) => {
    if (completionTitle) completionTitle.textContent = title;
    if (completionText) completionText.textContent = text;
    setView('completion');
    window.setTimeout(() => completionClose?.focus(), 0);
  };

  const formatDate = (value) => {
    if (!value) return 'Ikke angivet';
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat('da-DK', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
  };

  const validateDates = () => {
    const arrival = fields.arrival?.value;
    const departure = fields.departure?.value;
    if (!arrival || !departure) return true;
    return new Date(departure) > new Date(arrival);
  };

  const buildMessage = () => {
    const name = fields.name?.value.trim() || 'Ikke angivet';
    const guests = fields.guests?.value || 'Ikke angivet';
    const stay = fields.stay?.value.trim() || 'Ikke angivet';

    return [
      'Hej Michael',
      '',
      'Vi vil gerne høre, om Casa Amar er ledigt.',
      '',
      `Ankomst: ${formatDate(fields.arrival?.value)}`,
      `Afrejse: ${formatDate(fields.departure?.value)}`,
      `Antal gæster: ${guests}`,
      `Navn: ${name}`,
      `Kort om opholdet: ${stay}`,
      '',
      'Venlig hilsen'
    ].join('\n');
  };

  const open = () => {
    lastFocused = document.activeElement;
    setStatus('');
    setView('form');
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    document.documentElement.classList.add('inquiry-open');
    window.setTimeout(() => fields.arrival?.focus(), 0);
  };

  const close = () => {
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
    document.documentElement.classList.remove('inquiry-open');
    setView('form');
    lastFocused?.focus?.();
  };

  const createMailto = () => {
    const subject = 'Forespørgsel om Casa Amar';
    return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(buildMessage())}`;
  };

  openers.forEach((button) => button.addEventListener('click', (event) => {
    event.preventDefault();
    open();
  }));

  closeButtons.forEach((button) => button.addEventListener('click', close));

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) close();
  });

  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  });

  form?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.target?.tagName !== 'TEXTAREA') event.preventDefault();
  });

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!validateDates()) {
      setStatus('Afrejsedatoen skal ligge efter ankomstdatoen.', 'error');
      fields.departure?.focus();
      return;
    }

    window.location.href = createMailto();
    showCompletion({
      title: 'Din forespørgsel er klar i dit mailprogram',
      text: 'Send mailen derfra for at afslutte. Hjemmesiden kan ikke se, om mailen bliver sendt.'
    });
  });

  copyButton?.addEventListener('click', async () => {
    if (!validateDates()) {
      setStatus('Afrejsedatoen skal ligge efter ankomstdatoen.', 'error');
      fields.departure?.focus();
      return;
    }
    try {
      await navigator.clipboard.writeText(buildMessage());
      showCompletion({
        title: 'Forespørgslen er kopieret',
        text: 'Du kan nu indsætte den i en mail, WhatsApp eller en anden besked.'
      });
    } catch (_) {
      setStatus('Kunne ikke kopiere automatisk. Brug knappen “Åbn mailprogram”.', 'error');
    }
  });
})();
