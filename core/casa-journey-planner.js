/** Generic Journey Planner Engine 2.0 — editable time blocks, travel, locks and stable replacements. */
(() => {
  'use strict';

  const root = document.querySelector('[data-stay-planner]');
  const source = window.CasaJourneyContent;
  if (!root || !source?.items?.length) return;

  const items = source.items;
  const byId = new Map(items.map(item => [item.id, item]));
  const timeline = root.querySelector('[data-plan-timeline]');
  const labels = {
    rolig: 'Rolig', balanceret: 'Balanceret', aktiv: 'Aktiv',
    mad: 'Mad', strand: 'Strand', familie: 'Familie', golf: 'Golf', kultur: 'Kultur'
  };
  const paceEnergy = {rolig: 1, balanceret: 2, aktiv: 4};
  const DAY_START = 7 * 60;
  const DAY_END = 23 * 60;

  const state = {
    pace: 'rolig',
    interest: 'mad',
    anchor: null,
    plan: [],
    locks: new Map(),
    history: [],
    replacements: 0
  };

  const minutesToClock = value => {
    const minutes = Math.max(0, Math.round(value));
    const h = Math.floor(minutes / 60) % 24;
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}.${String(m).padStart(2, '0')}`;
  };

  const duration = item => Number(item.duration?.typical ?? item.duration ?? 90);
  const minDuration = item => Number(item.duration?.min ?? Math.min(duration(item), 45));
  const windows = item => item.windows?.length ? item.windows : [{start: DAY_START, end: DAY_END}];
  const isWindowFit = (item, start, length = duration(item)) => windows(item).some(window => start >= window.start && start + length <= window.end);

  const travelMinutes = (from, to) => {
    if (!from || !to || from === to) return 0;
    const direct = source.travel?.[from]?.[to];
    const reverse = source.travel?.[to]?.[from];
    return Number(direct ?? reverse ?? source.defaultTravelMinutes ?? 25);
  };

  const score = (item, context = {}) => {
    let value = 0;
    if (item.tags?.includes(state.interest)) value += 8;
    value -= Math.abs((item.energy ?? 1) - paceEnergy[state.pace]) * 1.3;
    if (context.previous?.pairs?.includes(item.id) || item.pairs?.includes(context.previous?.id)) value += 3;
    if (context.anchor && item.id === context.anchor.id) value += 1000;
    if (item.priority) value += item.priority;
    return value;
  };

  const overlaps = (a, b) => a.start < b.end && b.start < a.end;
  const intervalFree = (candidate, blocks) => !blocks.some(block => overlaps(candidate, block));

  function earliestFit(item, blocks, preferredStart = DAY_START) {
    const sorted = [...blocks].sort((a, b) => a.start - b.start);
    const itemDuration = duration(item);
    for (const window of windows(item)) {
      let cursor = Math.max(window.start, preferredStart);
      for (const block of sorted) {
        if (block.end <= cursor) continue;
        const transit = travelMinutes(block.item.location, item.location);
        if (cursor + transit + itemDuration <= block.start && isWindowFit(item, cursor + transit)) {
          return cursor + transit;
        }
        cursor = Math.max(cursor, block.end + travelMinutes(block.item.location, item.location));
      }
      if (cursor + itemDuration <= window.end && cursor + itemDuration <= DAY_END) return cursor;
    }
    return null;
  }

  function createBlock(item, start, options = {}) {
    const length = options.duration ?? duration(item);
    return {
      uid: options.uid ?? `block-${item.id}-${Math.random().toString(36).slice(2, 8)}`,
      item,
      start,
      end: start + length,
      duration: length,
      locked: Boolean(options.locked),
      source: options.source ?? 'generated',
      participants: options.participants ?? ['all']
    };
  }

  function buildAnchorBlock(anchor) {
    const preferred = anchor.preferredStart ?? windows(anchor)[0].start;
    return createBlock(anchor, preferred, {locked: true, source: 'anchor'});
  }

  function snapshotForUndo() {
    state.history.push({
      anchor: state.anchor,
      locks: [...state.locks.entries()],
      plan: state.plan.map(block => ({
        id: block.item.id, uid: block.uid, start: block.start, duration: block.duration,
        locked: block.locked, source: block.source, participants: [...block.participants]
      }))
    });
    if (state.history.length > 12) state.history.shift();
  }

  function hydratePlan(snapshot) {
    state.anchor = snapshot.anchor;
    state.locks = new Map(snapshot.locks);
    state.plan = snapshot.plan.map(block => createBlock(byId.get(block.id), block.start, block)).filter(block => block.item);
  }

  function candidates(excludedIds = new Set()) {
    return items.filter(item => !excludedIds.has(item.id) && !item.hiddenFromSuggestions);
  }

  function compose() {
    const blocks = [];
    const used = new Set();
    const anchor = state.anchor ? byId.get(state.anchor) : null;

    if (anchor) {
      const block = buildAnchorBlock(anchor);
      blocks.push(block);
      used.add(anchor.id);
    }

    for (const [uid, lock] of state.locks.entries()) {
      const item = byId.get(lock.itemId);
      if (!item || used.has(item.id)) continue;
      const start = lock.start ?? earliestFit(item, blocks, item.preferredStart ?? DAY_START);
      if (start == null) continue;
      const block = createBlock(item, start, {uid, locked: true, source: 'user', duration: lock.duration});
      if (intervalFree(block, blocks)) {
        blocks.push(block);
        used.add(item.id);
      }
    }

    const targetCount = anchor?.dayWeight === 'full' ? 3 : state.pace === 'aktiv' ? 6 : state.pace === 'balanceret' ? 5 : 4;
    while (blocks.length < targetCount) {
      const previous = [...blocks].sort((a, b) => a.end - b.end).at(-1)?.item;
      const ranked = candidates(used)
        .map(item => ({item, value: score(item, {previous, anchor})}))
        .sort((a, b) => b.value - a.value);
      let placed = false;
      for (const entry of ranked) {
        const preferred = entry.item.preferredStart ?? DAY_START;
        const start = earliestFit(entry.item, blocks, preferred);
        if (start == null) continue;
        const block = createBlock(entry.item, start);
        if (!intervalFree(block, blocks)) continue;
        blocks.push(block);
        used.add(entry.item.id);
        placed = true;
        break;
      }
      if (!placed) break;
    }

    state.plan = blocks.sort((a, b) => a.start - b.start);
  }

  function alternatives(block) {
    return items
      .filter(candidate => candidate.id !== block.item.id && candidate.type === block.item.type)
      .map(candidate => {
        const travelBefore = travelMinutes(previousBlock(block)?.item.location, candidate.location);
        const start = block.start + travelBefore;
        const fit = isWindowFit(candidate, start, Math.min(duration(candidate), block.duration + 60));
        return {candidate, fit, value: score(candidate, {previous: previousBlock(block)?.item}) + (fit ? 5 : -20)};
      })
      .filter(entry => entry.fit)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map(entry => entry.candidate);
  }

  function previousBlock(block) {
    const index = state.plan.findIndex(candidate => candidate.uid === block.uid);
    return index > 0 ? state.plan[index - 1] : null;
  }

  function nextBlock(block) {
    const index = state.plan.findIndex(candidate => candidate.uid === block.uid);
    return index >= 0 ? state.plan[index + 1] : null;
  }

  function replaceBlock(uid, itemId) {
    const current = state.plan.find(block => block.uid === uid);
    const replacement = byId.get(itemId);
    if (!current || !replacement) return;

    snapshotForUndo();
    const previous = previousBlock(current);
    const next = nextBlock(current);
    const earliest = Math.max(
      windows(replacement)[0].start,
      previous ? previous.end + travelMinutes(previous.item.location, replacement.location) : DAY_START
    );
    const latest = next
      ? next.start - travelMinutes(replacement.location, next.item.location)
      : DAY_END;
    const chosenDuration = Math.min(duration(replacement), Math.max(minDuration(replacement), latest - earliest));
    const validStart = isWindowFit(replacement, earliest, chosenDuration) ? earliest : current.start;

    state.locks.set(uid, {
      itemId: replacement.id,
      start: validStart,
      duration: chosenDuration
    });
    if (current.source === 'anchor') state.anchor = replacement.id;
    state.replacements += 1;
    compose();
  }

  function toggleLock(uid) {
    const block = state.plan.find(candidate => candidate.uid === uid);
    if (!block) return;
    snapshotForUndo();
    if (state.locks.has(uid)) state.locks.delete(uid);
    else state.locks.set(uid, {itemId: block.item.id, start: block.start, duration: block.duration});
    compose();
  }

  function transportLabel(block, index) {
    if (!index) return '';
    const previous = state.plan[index - 1];
    const minutes = travelMinutes(previous.item.location, block.item.location);
    if (!minutes) return '';
    return `<span class="journey-travel" aria-label="Transporttid">↳ ca. ${minutes} min. transport</span>`;
  }

  function render() {
    compose();
    root.querySelector('[data-plan-profile]').textContent = `${labels[state.pace]} dag · ${labels[state.interest]}`;
    timeline.innerHTML = state.plan.map((block, index) => {
      const locked = state.locks.has(block.uid) || block.source === 'anchor';
      return `<li data-journey-block="${block.uid}" data-journey-item="${block.item.id}">
        <time><strong>${minutesToClock(block.start)}</strong><span>${minutesToClock(block.end)}</span></time>
        <div class="journey-item-copy">
          ${transportLabel(block, index)}
          <strong>${block.item.title}</strong>
          <p>${block.item.summary}</p>
          <div class="journey-meta"><span>${block.duration} min.</span><span>${block.item.locationLabel ?? block.item.location}</span>${block.participants.includes('all') ? '<span>Hele gruppen</span>' : ''}</div>
          <div class="journey-item-actions">
            <button type="button" class="journey-replace" data-replace-block="${block.uid}">Vis alternativer</button>
            <button type="button" class="journey-lock" data-lock-block="${block.uid}" aria-pressed="${locked}">${locked ? 'Fast i planen' : 'Lås tidspunkt'}</button>
          </div>
          <div class="journey-alternatives" data-alternatives="${block.uid}" hidden></div>
        </div>
      </li>`;
    }).join('');

    const anchor = state.anchor ? byId.get(state.anchor) : null;
    root.querySelector('[data-plan-summary]').textContent = anchor?.dayWeight === 'full'
      ? 'Hovedoplevelsen er fastholdt. Kortere aktiviteter placeres omkring den, når åbningstid, transport og varighed tillader det.'
      : 'Planen bruger fleksible tidsblokke, estimeret varighed og transport mellem steder.';
    const undo = root.querySelector('[data-plan-undo]');
    if (undo) undo.disabled = state.history.length === 0;
  }

  function showAlternatives(uid) {
    const host = root.querySelector(`[data-alternatives="${uid}"]`);
    const block = state.plan.find(candidate => candidate.uid === uid);
    if (!host || !block) return;
    host.innerHTML = alternatives(block).map(item => `<button type="button" data-use-alternative="${item.id}" data-target-block="${uid}"><strong>${item.title}</strong><span>${item.summary}</span><small>${duration(item)} min. · ${item.locationLabel ?? item.location}</small></button>`).join('') || '<p>Der er endnu ingen alternativer, der passer i dette tidsrum.</p>';
    host.hidden = !host.hidden;
  }

  root.addEventListener('click', event => {
    const pace = event.target.closest('[data-planner-pace]');
    const interest = event.target.closest('[data-planner-interest]');
    const replace = event.target.closest('[data-replace-block]');
    const alternative = event.target.closest('[data-use-alternative]');
    const destination = event.target.closest('[data-journey-anchor]');
    const lock = event.target.closest('[data-lock-block]');

    if (pace) {
      snapshotForUndo();
      state.pace = pace.dataset.plannerPace;
      root.querySelectorAll('[data-planner-pace]').forEach(button => {
        const on = button === pace;
        button.classList.toggle('active', on);
        button.setAttribute('aria-pressed', String(on));
      });
      render();
    }
    if (interest) {
      snapshotForUndo();
      state.interest = interest.dataset.plannerInterest;
      root.querySelectorAll('[data-planner-interest]').forEach(button => {
        const on = button === interest;
        button.classList.toggle('active', on);
        button.setAttribute('aria-pressed', String(on));
      });
      render();
    }
    if (destination) {
      snapshotForUndo();
      state.anchor = destination.dataset.journeyAnchor || null;
      root.querySelectorAll('[data-journey-anchor]').forEach(button => button.classList.toggle('active', button === destination));
      render();
    }
    if (replace) showAlternatives(replace.dataset.replaceBlock);
    if (alternative) {
      replaceBlock(alternative.dataset.targetBlock, alternative.dataset.useAlternative);
      render();
      root.querySelector('[data-plan-feedback]').textContent = 'Kun den valgte byggeklods og nødvendige tider er opdateret.';
    }
    if (lock) {
      toggleLock(lock.dataset.lockBlock);
      render();
    }
  });

  root.querySelector('[data-plan-undo]')?.addEventListener('click', () => {
    const previous = state.history.pop();
    if (!previous) return;
    hydratePlan(previous);
    render();
    root.querySelector('[data-plan-feedback]').textContent = 'Den seneste ændring er fortrudt.';
  });

  root.querySelector('[data-plan-copy]')?.addEventListener('click', async () => {
    const text = [
      `${labels[state.pace]} dag · ${labels[state.interest]}`,
      ...state.plan.map(block => `${minutesToClock(block.start)}–${minutesToClock(block.end)} – ${block.item.title}: ${block.item.summary}`)
    ].join('\n');
    const feedback = root.querySelector('[data-plan-feedback]');
    try {
      await navigator.clipboard.writeText(text);
      feedback.textContent = 'Dagsplanen er kopieret.';
    } catch {
      feedback.textContent = 'Markér og kopiér planen manuelt.';
    }
  });

  render();
  window.CasaJourneyPlanner = Object.freeze({
    version: '2.0.0',
    domain: source.domain,
    snapshot: () => ({
      pace: state.pace,
      interest: state.interest,
      anchor: state.anchor,
      replacements: state.replacements,
      plan: state.plan.map(block => ({
        id: block.item.id,
        uid: block.uid,
        start: block.start,
        end: block.end,
        duration: block.duration,
        locked: state.locks.has(block.uid) || block.source === 'anchor',
        participants: [...block.participants]
      })),
      contentItems: items.length
    })
  });
  document.documentElement.dataset.journeyPlanner = '2.0.0';
})();
