from pathlib import Path
p=Path('engine.js')
s=p.read_text()

def rep(old,new,label):
    global s
    if old not in s:
        raise SystemExit(f'missing engine patch target: {label}')
    s=s.replace(old,new,1)

rep("""  const isSquirrel=c=>(c?.traits||[]).includes('Squirrel');
""","",'unused squirrel helper')
rep("""  function refreshHomeMarkers(g){
    g.players.forEach(p=>p.residents.forEach(r=>{
      const home=p.village.find(b=>b.uid===r.musterUid);
      r._hhStockedSquirrel=!!(home&&!E.isRuined(home)&&home.id==='stocked_squirrel_armory'&&isSquirrel(r));
    }));
  }
""","""  function refreshHomeMarkers(g){
    // Retained as the shared post-action refresh hook. Stocked Squirrel Armory
    // no longer grants a resident Might bonus in the latest editable card set.
    g.players.forEach(p=>p.residents.forEach(r=>{delete r._hhStockedSquirrel;}));
  }
""",'home marker refresh')
rep("""  const baseResidentMight=E.residentMight;
  E.residentMight=(r,target)=>baseResidentMight(r,target)+(r?._hhStockedSquirrel?1:0);

  const baseCanBlock=E.canBlock;
  E.canBlock=(g,pi,r,attack)=>{
    if(!r?._hhStockedSquirrel)return baseCanBlock(g,pi,r,attack);
    r.might++;try{return baseCanBlock(g,pi,r,attack);}finally{r.might--;}
  };

""","",'Stocked public combat overrides')
rep("""    const boosted=[];
    atkP.residents.forEach(r=>{if(r._hhStockedSquirrel){r.might++;boosted.push(r);}});
    const result=baseResolveCombat(g);
    boosted.forEach(r=>r.might--);
""","""    const result=baseResolveCombat(g);
""",'Stocked attacker combat boost')
rep("""  // The core combat resolver closes over its original residentMight helper.
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
      // do not offer a \"hold\" option that is not present on the card.
      (g.pendingAbilityChoices||[]).forEach(choice=>{
        if(choice.kind==='clover-save'){
          choice.optional=false;
          choice.options=choice.options.filter(o=>o.id!=='skip');
        }
      });
      return result;
    }finally{boosted.forEach(r=>r.might--);}
  };
""","""  const baseResolveCombat=E.resolveCombat;
  E.resolveCombat=g=>{
    const result=baseResolveCombat(g);
    // Great Clover Hearthring's printed save is mandatory when it triggers.
    // If multiple Critters were defeated simultaneously, choose which one;
    // do not offer a \"hold\" option that is not present on the card.
    (g.pendingAbilityChoices||[]).forEach(choice=>{
      if(choice.kind==='clover-save'){
        choice.optional=false;
        choice.options=choice.options.filter(o=>o.id!=='skip');
      }
    });
    return result;
  };
""",'Stocked defender edge wrapper')
p.write_text(s)
print('stale Stocked Squirrel Armory Might behavior removed')
