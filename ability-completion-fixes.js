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
    try{
      const result=baseResolveCombat(g);
      // Great Clover Hearthring's printed save is mandatory when it triggers.
      // If multiple Critters were defeated simultaneously, choose which one;
      // do not offer a "hold" option that is not present on the card.
      (g.pendingAbilityChoices||[]).forEach(choice=>{
        if(choice.kind==='clover-save'){
          choice.optional=false;
          choice.options=choice.options.filter(o=>o.id!=='skip');
        }
      });
      return result;
    }finally{boosted.forEach(r=>r.might--);}
  };

  // Deep Wormturn Den says "may". When Compost contains no Critter there is
  // nothing to decide, so consume the first-Mole/Crow trigger without opening
  // a pointless modal containing only "Do not move a Critter".
  const baseRecruit=E.recruit;
  E.recruit=(g,pi,cardUid,musterUid,options={})=>{
    const result=baseRecruit(g,pi,cardUid,musterUid,options);
    const q=g.pendingAbilityChoices||[];
    for(let i=q.length-1;i>=0;i--){
      const choice=q[i];
      if(choice.kind==='deep-wormturn'&&choice.options.length===1&&choice.options[0].id==='skip')q.splice(i,1);
    }
    return result;
  };
})();
