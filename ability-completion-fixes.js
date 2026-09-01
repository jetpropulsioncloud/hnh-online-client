(() => {
  const E=window.HNH_ENGINE;
  if(!E)return;

  // The core combat resolver closes over its original residentMight helper.
  // Boost defending Squirrels here so Stocked Squirrel Armory's +1 Might is
  // included in their simultaneous blocker damage as well as their attacks.
  const baseResolveCombat=E.resolveCombat;
  E.resolveCombat=g=>{
    const defender=g?.players?.[1-g.active];
    const boosted=(defender?.residents||[]).filter(r=>r._hhStockedSquirrel);
    boosted.forEach(r=>r.might++);
    try{return baseResolveCombat(g);}
    finally{boosted.forEach(r=>r.might--);}
  };
})();
