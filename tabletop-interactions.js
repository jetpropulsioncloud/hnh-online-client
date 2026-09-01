(() => {
  const CARD_SELECTOR = '.gameCard, .blueprintCard';
  let hoveredCard = null;
  let focusedCard = null;
  let hoverTimer = null;
  let pinned = false;
  let spaceHeld = false;
  let lastFieldCount = null;
  let lastCompostCount = null;
  let blueprintRemaining = 12;

  const inspector = document.createElement('div');
  inspector.className = 'cardInspector';
  inspector.setAttribute('aria-hidden', 'true');
  inspector.innerHTML = `
    <div class="inspectorPanel" role="dialog" aria-label="Card closeup">
      <div class="inspectorTopline">
        <span class="inspectorHint">Card closeup · Hold Space for full view · Esc to close</span>
        <button class="inspectorClose" type="button" aria-label="Close card closeup">×</button>
      </div>
      <div class="inspectorBody"></div>
    </div>`;
  document.body.appendChild(inspector);

  const fieldRail = document.createElement('button');
  fieldRail.type = 'button';
  fieldRail.className = 'sideDeckRail fieldDeckRail';
  fieldRail.setAttribute('aria-label', 'Field Deck');
  fieldRail.innerHTML = `
    <span class="deckStack fieldStack"><i></i></span>
    <span class="sideDeckLabel"><b>Field Deck</b><strong class="fieldDeckCount">—</strong><small>cards remaining</small></span>
    <span class="compostCount">🍂 <b>0</b></span>`;
  document.body.appendChild(fieldRail);

  const blueprintRail = document.createElement('button');
  blueprintRail.type = 'button';
  blueprintRail.className = 'sideDeckRail blueprintDeckRail';
  blueprintRail.setAttribute('aria-label', 'Open Blueprint Deck');
  blueprintRail.innerHTML = `
    <span class="deckStack blueprintStack"><i>📐</i></span>
    <span class="sideDeckLabel"><b>Blueprint Deck</b><strong class="blueprintDeckCount">12</strong><small>known village plans</small></span>
    <span class="buildBookCallout">OPEN BUILD BOOK</span>`;
  document.body.appendChild(blueprintRail);

  const helper = document.createElement('div');
  helper.className = 'cardInspectHelper';
  helper.innerHTML = '<b>Card view</b><span>Hover any card · Hold Space for full closeup</span>';
  document.body.appendChild(helper);

  const deckNote = document.createElement('div');
  deckNote.className = 'deckRailNote';
  document.body.appendChild(deckNote);
  let deckNoteTimer = null;

  function showDeckNote(message) {
    clearTimeout(deckNoteTimer);
    deckNote.textContent = message;
    deckNote.classList.add('show');
    deckNoteTimer = setTimeout(() => deckNote.classList.remove('show'), 2200);
  }

  function cleanClone(source) {
    const clone = source.cloneNode(true);
    clone.classList.add('inspectorClone');
    clone.removeAttribute('id');
    clone.querySelectorAll('button, select, input, .miniAction, .cardAction, .whyDisabled').forEach(el => el.remove());
    clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
    clone.querySelectorAll('[onclick]').forEach(el => el.removeAttribute('onclick'));
    clone.tabIndex = -1;
    return clone;
  }

  function renderInspector(card, mode = 'peek') {
    if (!card || !document.body.contains(card)) return;
    const body = inspector.querySelector('.inspectorBody');
    body.replaceChildren(cleanClone(card));
    inspector.classList.remove('leftPeek', 'rightPeek', 'peek', 'pinned');

    if (mode === 'pinned') {
      pinned = true;
      inspector.classList.add('pinned');
    } else {
      pinned = false;
      const rect = card.getBoundingClientRect();
      inspector.classList.add('peek', rect.left < window.innerWidth / 2 ? 'rightPeek' : 'leftPeek');
    }
    inspector.setAttribute('aria-hidden', 'false');
  }

  function hideInspector(force = false) {
    if (pinned && !force) return;
    clearTimeout(hoverTimer);
    pinned = false;
    inspector.classList.remove('peek', 'pinned', 'leftPeek', 'rightPeek');
    inspector.setAttribute('aria-hidden', 'true');
  }

  function currentCard() {
    if (hoveredCard && document.body.contains(hoveredCard)) return hoveredCard;
    if (focusedCard && document.body.contains(focusedCard)) return focusedCard;
    return null;
  }

  function schedulePeek(card) {
    if (pinned || spaceHeld) return;
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => {
      if (!spaceHeld && (hoveredCard === card || focusedCard === card)) renderInspector(card, 'peek');
    }, 150);
  }

  function standardizeCategoryIcons() {
    document.querySelectorAll('.gameCard.critter .artWindow > span').forEach(icon => { icon.textContent = '🐾'; });
    document.querySelectorAll('.gameCard.building .artWindow > span').forEach(icon => { icon.textContent = '🏡'; });
    document.querySelectorAll('.blueprintCard .blueprintIcon').forEach(icon => { icon.textContent = '🏡'; });
    document.querySelectorAll('.gameCard.handCard .artWindow').forEach(art => {
      const icon = art.querySelector(':scope > span');
      const subtype = art.querySelector('small')?.textContent || '';
      if (!icon) return;
      if (/Muster/i.test(subtype)) icon.textContent = '🐾';
      else if (/Tool/i.test(subtype)) icon.textContent = '🧰';
      else if (/Reaction/i.test(subtype)) icon.textContent = '⚡';
      else if (/Supply/i.test(subtype)) icon.textContent = '🎒';
      else icon.textContent = '🍃';
    });
  }

  function makeCardsFocusable() {
    document.querySelectorAll(CARD_SELECTOR).forEach(card => {
      if (!card.hasAttribute('tabindex')) card.tabIndex = 0;
      card.setAttribute('data-card-inspectable', 'true');
      if (!card.getAttribute('aria-label')) {
        const name = card.querySelector('.cardTop b, :scope > div > b, :scope > b')?.textContent?.trim();
        if (name) card.setAttribute('aria-label', `${name}. Hold Space for card closeup.`);
      }
    });
  }

  function readDeckCounts() {
    const counters = document.querySelectorAll('.handDock .deckCounters span');
    if (counters.length) {
      const fieldMatch = counters[0].textContent.match(/(\d+)/);
      const compostMatch = counters[1]?.textContent.match(/(\d+)/);
      if (fieldMatch) lastFieldCount = Number(fieldMatch[1]);
      if (compostMatch) lastCompostCount = Number(compostMatch[1]);
    }

    const blueprints = document.querySelectorAll('.blueprintGrid .blueprintCard');
    if (blueprints.length) {
      blueprintRemaining = [...blueprints].filter(card => !card.classList.contains('used')).length;
    }

    fieldRail.querySelector('.fieldDeckCount').textContent = lastFieldCount ?? '—';
    fieldRail.querySelector('.compostCount b').textContent = lastCompostCount ?? 0;
    blueprintRail.querySelector('.blueprintDeckCount').textContent = blueprintRemaining;

    const activePhase = document.querySelector('.phasePip.on')?.textContent?.trim();
    blueprintRail.classList.toggle('buildActive', activePhase === 'Build');
    fieldRail.classList.toggle('drawLow', typeof lastFieldCount === 'number' && lastFieldCount <= 8);

    const brandVersion = document.querySelector('.brandBlock > span');
    if (brandVersion) brandVersion.textContent = 'Client v0.6.3 · Rules v0.6.2';
  }

  function syncEnhancements() {
    const inGame = Boolean(document.querySelector('.client'));
    fieldRail.classList.toggle('visible', inGame);
    blueprintRail.classList.toggle('visible', inGame);
    helper.classList.toggle('visible', inGame);
    if (!inGame) hideInspector(true);
    standardizeCategoryIcons();
    makeCardsFocusable();
    readDeckCounts();
  }

  document.addEventListener('pointerover', event => {
    if (event.target.closest('.cardInspector')) return;
    const card = event.target.closest(CARD_SELECTOR);
    if (!card || card.classList.contains('inspectorClone')) return;
    if (event.relatedTarget && card.contains(event.relatedTarget)) return;
    hoveredCard = card;
    schedulePeek(card);
  });

  document.addEventListener('pointerout', event => {
    const card = event.target.closest(CARD_SELECTOR);
    if (!card || card !== hoveredCard) return;
    if (event.relatedTarget && card.contains(event.relatedTarget)) return;
    hoveredCard = null;
    clearTimeout(hoverTimer);
    if (!pinned && focusedCard !== card) hideInspector();
  });

  document.addEventListener('focusin', event => {
    const card = event.target.closest(CARD_SELECTOR);
    if (!card || card.classList.contains('inspectorClone')) return;
    focusedCard = card;
    schedulePeek(card);
  });

  document.addEventListener('focusout', event => {
    const card = event.target.closest(CARD_SELECTOR);
    if (!card || card !== focusedCard) return;
    if (event.relatedTarget && card.contains(event.relatedTarget)) return;
    focusedCard = null;
    if (!pinned && hoveredCard !== card) hideInspector();
  });

  document.addEventListener('keydown', event => {
    const tag = event.target?.tagName?.toLowerCase();
    const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || event.target?.isContentEditable;
    if (event.key === 'Escape' && !typing) {
      spaceHeld = false;
      hideInspector(true);
      return;
    }
    if ((event.code === 'Space' || event.key === ' ') && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const card = currentCard();
      if (!card) return;
      event.preventDefault();
      if (event.repeat || spaceHeld) return;
      spaceHeld = true;
      renderInspector(card, 'pinned');
    }
  });

  document.addEventListener('keyup', event => {
    if (event.code !== 'Space' && event.key !== ' ') return;
    if (!spaceHeld) return;
    spaceHeld = false;
    hideInspector(true);
    const card = currentCard();
    if (card) schedulePeek(card);
  });

  window.addEventListener('blur', () => {
    if (!spaceHeld) return;
    spaceHeld = false;
    hideInspector(true);
  });

  inspector.querySelector('.inspectorClose').addEventListener('click', () => {
    spaceHeld = false;
    hideInspector(true);
  });

  blueprintRail.addEventListener('click', () => {
    if (window.UI?.drawer) window.UI.drawer('blueprints');
  });

  fieldRail.addEventListener('click', () => {
    const count = lastFieldCount == null ? 'The Field Deck is hidden during play.' : `${lastFieldCount} cards remain in your hidden Field Deck.`;
    showDeckNote(`${count} Draw from it at Dawn.`);
  });

  const observer = new MutationObserver(() => {
    clearTimeout(observer._syncTimer);
    observer._syncTimer = setTimeout(syncEnhancements, 0);
  });
  observer.observe(document.getElementById('app'), {childList: true, subtree: true});

  window.addEventListener('resize', () => {
    if (!pinned && inspector.classList.contains('peek') && currentCard()) renderInspector(currentCard(), 'peek');
  });

  syncEnhancements();
})();
