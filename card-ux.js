(() => {
  const app = document.getElementById('app');
  if (!app) return;

  let firstSync = true;
  const seen = new Set();
  let raf = 0;

  function cardKey(card) {
    if (card.dataset.handUid) return `hand:${card.dataset.handUid}`;
    if (card.dataset.residentUid) return `resident:${card.dataset.residentUid}`;
    if (card.dataset.buildingUid) return `building:${card.dataset.buildingUid}`;
    return null;
  }

  function fanHand() {
    const hand = document.querySelector('.handRow');
    if (!hand) return;

    const cards = [...hand.querySelectorAll(':scope > .handCard')];
    const middle = (cards.length - 1) / 2;
    const spread = cards.length > 8 ? 1.05 : cards.length > 6 ? 1.35 : 1.7;

    cards.forEach((card, index) => {
      const distance = index - middle;
      const rotation = Math.max(-7, Math.min(7, distance * spread));
      const rise = Math.min(10, Math.abs(distance) * 1.35);
      const z = 30 - Math.round(Math.abs(distance));

      card.style.setProperty('--fan-rotate', `${rotation.toFixed(2)}deg`);
      card.style.setProperty('--fan-rise', `${rise.toFixed(1)}px`);
      card.style.setProperty('--fan-z', String(z));
    });
  }

  function animateNewCards() {
    const current = new Set();
    document.querySelectorAll('.gameCard[data-hand-uid], .gameCard[data-resident-uid], .gameCard[data-building-uid]').forEach(card => {
      const key = cardKey(card);
      if (!key) return;
      current.add(key);

      if (!firstSync && !seen.has(key)) {
        card.classList.add('uxCardEnter');
        card.addEventListener('animationend', () => card.classList.remove('uxCardEnter'), { once: true });
      }
    });

    seen.clear();
    current.forEach(key => seen.add(key));
  }

  function tuneAccessibility() {
    document.querySelectorAll('.handCard').forEach(card => {
      if (!card.hasAttribute('tabindex')) card.tabIndex = 0;
    });
  }

  function sync() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      document.body.classList.toggle('cardTableUX', Boolean(document.querySelector('.client')));
      fanHand();
      animateNewCards();
      tuneAccessibility();
      firstSync = false;
    });
  }

  const observer = new MutationObserver(sync);
  observer.observe(app, { childList: true, subtree: true });

  window.addEventListener('resize', sync, { passive: true });
  sync();
})();
