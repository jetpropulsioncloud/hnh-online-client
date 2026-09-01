(() => {
  const E=window.HNH_ENGINE;
  if(!E)return;
  let choiceSeq=1;
  const clone=v=>JSON.parse(JSON.stringify(v));
  const active=p=>E.activeBuildings(p);
  const round=g=>E.currentRound(g);
  const log=(g,msg)=>{g.log.unshift(msg);g.log=g.log.slice(0,160);};
  const cardValue=c=>c?.type==='Critter'?(c.might||0)*2+(c.grit||0)+(c.advanced?2:0):c?.subtype==='Tool'?4:c?.subtype==='Reaction'?3:1;
  const isBird=c=>(c?.traits||[]).some(t=>['Bird','Wren','Jay','Crow','Sparrow'].includes(t));
  const isMouseOrBird=c=>(c?.traits||[]).includes('Mouse')||isBird(c);
  const isMoleOrCrow=c=>(c?.traits||[]).some(t=>t==='Mole'||t==='Crow');
  const isSquirrel=c=>(c?.traits||[]).includes('Squirrel');
  const ensure=g=>{if(!Array.isArray(g.pendingAbilityChoices))g.pendingAbilityChoices=[];return g.pendingAbilityChoices;};
  const firstChoice=g=>ensure(g)[0]||null;
  const playerIsAI=(g,pi)=>g.mode==='ai'&&g.aiIndex===pi;
  const triggerKey=(prefix,uid)=>`${prefix}:${uid}`;

  function stripResident(card){
    const out={...card};
    ['musterUid','damage','tired','attacking','blocking','tool','shield','tempPrevent','recruitedTurn','_hhStockedSquirrel'].forEach(k=>delete out[k]);
    return out;
  }

  function refreshHomeMarkers(g){
    g.players.forEach(p=>p.residents.forEach(r=>{
      const home=p.village.find(b=>b.uid===r.musterUid);
      r._hhStockedSquirrel=!!(home&&!E.isRuined(home)&&home.id==='stocked_squirrel_armory'&&isSquirrel(r));
    }));
  }

  function repairDirect(g,pi,buildingUid,amount,source){
    const p=g.players[pi],b=p.village.find(x=>x.uid===Number(buildingUid));
    if(!b||b.damage<=0)return false;
    const wasRuined=E.isRuined(b),before=b.damage;
    b.damage=Math.max(0,b.damage-amount);
    const repaired=before-b.damage;
    if(!repaired)return false;
    log(g,`${source} repairs ${b.name} by ${repaired}.`);
    if(wasRuined&&!E.isRuined(b)){
      b.rehousingDueOwnTurn=null;
      p.exposed=false;p.exposurePendingOwnTurn=null;
      log(g,`${b.name} is active again.`);
    }
    triggerHearthroot(g,pi);
    return true;
  }

  function triggerHearthroot(g,pi){
    const p=g.players[pi];
    const tree=active(p).find(b=>b.id==='hearthroot_tree');
    if(!tree)return;
    const key=triggerKey('hearthroot',tree.uid);
    if(p.triggerRoundUsed[key]===round(g))return;
    p.triggerRoundUsed[key]=round(g);
    E.draw(g,p,1,true);
    if(!p.hand.length){log(g,'Hearthroot Tree has no card to put on the bottom of the Field Deck.');return;}
    queueChoice(g,{
      kind:'hearthroot-bottom',playerIndex:pi,title:'Hearthroot Tree',prompt:'A Building was repaired. Choose one card from your hand to put on the bottom of your Field Deck.',
      options:p.hand.map(c=>({id:String(c.uid),label:c.name,card:clone(c)}))
    });
  }

  function queueChoice(g,choice){
    const q=ensure(g);
    const item={id:`ability-${choiceSeq++}`,...choice};
    q.push(item);
    if(playerIsAI(g,item.playerIndex))autoResolve(g);
    return item;
  }

  function bestAIChoice(choice){
    if(choice.optional&&choice.options.some(o=>o.id==='skip')){
      const real=choice.options.filter(o=>o.id!=='skip');
      if(!real.length)return 'skip';
    }
    const opts=choice.options.filter(o=>o.id!=='skip');
    if(!opts.length)return choice.optional?'skip':null;
    if(['repair-building','shield-building'].includes(choice.kind))return opts.slice().sort((a,b)=>(b.meta?.damage||0)-(a.meta?.damage||0))[0].id;
    if(['crow-salvage','deep-wormturn','clover-save'].includes(choice.kind))return opts.slice().sort((a,b)=>cardValue(b.card)-cardValue(a.card))[0].id;
    if(choice.kind==='hearthroot-bottom')return opts.slice().sort((a,b)=>cardValue(a.card)-cardValue(b.card))[0].id;
    if(choice.kind==='lantern-scry')return opts.slice().sort((a,b)=>cardValue(b.card)-cardValue(a.card))[0].id;
    return opts[0].id;
  }

  function autoResolve(g){
    let safety=20;
    while(safety--){
      const choice=firstChoice(g);
      if(!choice||!playerIsAI(g,choice.playerIndex))break;
      const selection=bestAIChoice(choice);
      if(selection===null)break;
      resolveAbilityChoice(g,choice.playerIndex,choice.id,selection);
    }
  }

  function resolveAbilityChoice(g,pi,choiceId,selection){
    const q=ensure(g),choice=q[0];
    if(!choice||choice.id!==choiceId)return {ok:false,reason:'That card choice is no longer pending.'};
    if(choice.playerIndex!==pi)return {ok:false,reason:'That choice belongs to the other player.'};
    const p=g.players[pi];
    const opt=choice.options.find(o=>o.id===String(selection));
    if(!opt)return {ok:false,reason:'Choose one of the shown options.'};
    q.shift();

    if(choice.kind==='shield-building'){
      const b=p.village.find(x=>String(x.uid)===opt.id&&!E.isRuined(x));
      if(b){b.shield=true;log(g,`${choice.sourceName} gives Shield to ${b.name}.`);}
    }else if(choice.kind==='repair-building'){
      repairDirect(g,pi,opt.id,choice.amount||1,choice.sourceName||'Patchwork');
    }else if(choice.kind==='lantern-scry'){
      const shown=choice.cards.map(x=>x.uid),topUid=Number(opt.id);
      const current=p.fieldDeck.filter(c=>shown.includes(c.uid));
      const top=current.find(c=>c.uid===topUid),bottom=current.find(c=>c.uid!==topUid);
      p.fieldDeck=p.fieldDeck.filter(c=>!shown.includes(c.uid));
      if(top)p.fieldDeck.unshift(top);
      if(bottom)p.fieldDeck.push(bottom);
      log(g,`${choice.sourceName}: one looked-at card stays on top and one goes to the bottom of the Field Deck.`);
    }else if(choice.kind==='crow-salvage'){
      const i=p.compost.findIndex(c=>String(c.uid)===opt.id&&(c.type==='Critter'||c.subtype==='Tool'));
      if(i>=0){const [c]=p.compost.splice(i,1);p.hand.push(c);log(g,`${choice.sourceName} returns ${c.name} from Compost to hand.`);}
    }else if(choice.kind==='deep-wormturn'){
      if(opt.id!=='skip'){
        const i=p.compost.findIndex(c=>String(c.uid)===opt.id&&c.type==='Critter');
        if(i>=0){const [c]=p.compost.splice(i,1);p.fieldDeck.unshift(c);log(g,`${choice.sourceName} puts ${c.name} from Compost on top of the Field Deck.`);}
      }else log(g,`${choice.sourceName}: no Critter was moved from Compost.`);
    }else if(choice.kind==='hearthroot-bottom'){
      const i=p.hand.findIndex(c=>String(c.uid)===opt.id);
      if(i>=0){const [c]=p.hand.splice(i,1);p.fieldDeck.push(c);log(g,`Hearthroot Tree puts ${c.name} on the bottom of the Field Deck.`);}
    }else if(choice.kind==='clover-save'){
      if(opt.id!=='skip')restoreSavedResident(g,pi,choice.snapshots.find(s=>String(s.uid)===opt.id),choice.sourceUid);
      else log(g,'Great Clover Hearthring is held for a later defeat this round.');
    }
    autoResolve(g);
    return {ok:true};
  }

  function restoreSavedResident(g,pi,snap,sourceUid){
    if(!snap)return;
    const p=g.players[pi],source=p.village.find(b=>b.uid===sourceUid);
    if(!source||E.isRuined(source))return;
    p.compost=p.compost.filter(c=>c.uid!==snap.uid&&(!snap.tool||c.uid!==snap.tool.uid));
    const restored=clone(snap);
    const grit=E.residentGrit(g,p,restored,false);
    restored.damage=Math.max(0,grit-1);restored.tired=true;restored.attacking=false;restored.blocking=false;restored.shield=false;restored.tempPrevent=0;
    p.residents.push(restored);
    p.triggerRoundUsed[triggerKey('clover-save',source.uid)]=round(g);
    log(g,`Great Clover Hearthring saves ${restored.name} in its Muster, tired at ❤️−1 damage.`);
    refreshHomeMarkers(g);
  }

  const baseCreateGame=E.createGame;
  E.createGame=(opts={})=>{
    const g=baseCreateGame(opts);ensure(g);window.HNH_CURRENT_GAME=g;refreshHomeMarkers(g);return g;
  };

  const baseBuild=E.build;
  E.build=(g,pi,id)=>{
    const result=baseBuild(g,pi,id);
    if(result?.ok)refreshHomeMarkers(g);
    return result;
  };

  const baseCanAttack=E.canAttack;
  E.canAttack=(g,pi,r)=>{
    if(baseCanAttack(g,pi,r))return true;
    return !g.combat.committed&&pi===g.active&&(g.phase==='Build'||g.phase==='Attack')&&E.residentReady(g,g.players[pi],r)&&r.recruitedTurn===g.turnNo&&!!r.tool?.flags?.eager&&!g.players[pi].attackedThisStep.includes(r.uid);
  };

  const baseDeclareAttack=E.declareAttack;
  E.declareAttack=(g,pi,residentUid,target)=>{
    const r=g.players[pi]?.residents.find(x=>x.uid===residentUid);
    if(r?.recruitedTurn===g.turnNo&&r.tool?.flags?.eager){
      const saved=r.recruitedTurn;r.recruitedTurn=-1;
      const result=baseDeclareAttack(g,pi,residentUid,target);r.recruitedTurn=saved;return result;
    }
    return baseDeclareAttack(g,pi,residentUid,target);
  };

  const baseResidentMight=E.residentMight;
  E.residentMight=(r,target)=>baseResidentMight(r,target)+(r?._hhStockedSquirrel?1:0);

  const baseCanBlock=E.canBlock;
  E.canBlock=(g,pi,r,attack)=>{
    if(!r?._hhStockedSquirrel)return baseCanBlock(g,pi,r,attack);
    r.might++;try{return baseCanBlock(g,pi,r,attack);}finally{r.might--;}
  };

  const baseRecruit=E.recruit;
  E.recruit=(g,pi,cardUid,musterUid,options={})=>{
    const p=g.players[pi],card=p.hand.find(c=>c.uid===cardUid),m=p.village.find(b=>b.uid===musterUid);
    if(!card)return baseRecruit(g,pi,cardUid,musterUid,options);
    const originalFlags=clone(card.flags||{}),shield=!!card.flags?.shieldBuildingOnRecruit,repair=card.flags?.repairOnRecruit||0;
    if(shield)card.flags.shieldBuildingOnRecruit=false;
    if(repair)card.flags.repairOnRecruit=0;
    const result=baseRecruit(g,pi,cardUid,musterUid,options);
    card.flags=originalFlags;
    if(!result?.ok)return result;
    result.resident.flags=originalFlags;
    refreshHomeMarkers(g);

    if(shield){
      const opts=active(p).filter(b=>!b.shield).map(b=>({id:String(b.uid),label:b.name,meta:{damage:b.damage}}));
      if(opts.length)queueChoice(g,{kind:'shield-building',playerIndex:pi,title:card.name,prompt:'Choose a Building you control to Shield.',sourceName:card.name,options:opts});
    }
    if(repair){
      const opts=p.village.filter(b=>b.damage>0).map(b=>({id:String(b.uid),label:`${b.name} · ${b.damage} damage`,meta:{damage:b.damage}}));
      if(opts.length)queueChoice(g,{kind:'repair-building',playerIndex:pi,title:card.name,prompt:`Choose a Building to repair ${repair} damage.`,sourceName:card.name,amount:repair,options:opts});
    }

    if(m?.id==='lantern_scout_nook'&&isMouseOrBird(card)){
      const key=triggerKey('lantern-scry',m.uid);
      if(p.triggerRoundUsed[key]!==round(g)){
        p.triggerRoundUsed[key]=round(g);
        const cards=p.fieldDeck.slice(0,2);
        if(cards.length===2)queueChoice(g,{kind:'lantern-scry',playerIndex:pi,title:'Lantern Scout Nook',prompt:'Look at the top 2 cards. Choose the card that stays on top; the other goes to the bottom.',sourceName:'Lantern Scout Nook',cards:cards.map(c=>({uid:c.uid})),options:cards.map(c=>({id:String(c.uid),label:c.name,card:clone(c)}))});
        else if(cards.length===1)log(g,'Lantern Scout Nook looks at the only card remaining in the Field Deck.');
        else log(g,'Lantern Scout Nook finds the Field Deck empty.');
      }
    }

    if(card.flags?.salvageOnRecruit){
      const opts=p.compost.filter(c=>c.type==='Critter'||c.subtype==='Tool').map(c=>({id:String(c.uid),label:c.name,card:clone(c)}));
      if(opts.length)queueChoice(g,{kind:'crow-salvage',playerIndex:pi,title:card.name,prompt:'Choose a Tool or Critter from Compost to return to your hand.',sourceName:card.name,options:opts});
    }

    if(m?.id==='deep_wormturn_den'&&isMoleOrCrow(card)){
      const key=triggerKey('deep-wormturn',m.uid);
      if(p.triggerRoundUsed[key]!==round(g)){
        p.triggerRoundUsed[key]=round(g);
        const critters=p.compost.filter(c=>c.type==='Critter');
        const opts=[...critters.map(c=>({id:String(c.uid),label:c.name,card:clone(c)})),{id:'skip',label:'Do not move a Critter'}];
        queueChoice(g,{kind:'deep-wormturn',playerIndex:pi,title:'Deep Wormturn Den',prompt:'You may put one Critter from Compost on top of your Field Deck.',sourceName:'Deep Wormturn Den',optional:true,options:opts});
      }
    }
    return result;
  };

  const baseUseWorkshop=E.useWorkshop;
  E.useWorkshop=(g,pi,buildingUid,targetUid,resource)=>{
    const p=g.players[pi],before=p.village.find(b=>b.uid===targetUid)?.damage;
    const result=baseUseWorkshop(g,pi,buildingUid,targetUid,resource);
    const after=p.village.find(b=>b.uid===targetUid)?.damage;
    if(result?.ok&&Number.isFinite(before)&&after<before)triggerHearthroot(g,pi);
    return result;
  };

  const baseResolveCombat=E.resolveCombat;
  E.resolveCombat=(g)=>{
    const snapshots=g.players.map(p=>p.residents.map(r=>clone(r)));
    const buildingBefore=g.players.map(p=>new Map(p.village.map(b=>[b.uid,b.damage])));
    const attackerPi=g.active,atkP=g.players[attackerPi];

    const boosted=[];
    atkP.residents.forEach(r=>{if(r._hhStockedSquirrel){r.might++;boosted.push(r);}});
    const result=baseResolveCombat(g);
    boosted.forEach(r=>r.might--);
    if(!result?.ok)return result;

    refreshHomeMarkers(g);

    // Shared Satchel: each attached Satchel can trigger once per round when its carrier damages a Building.
    for(const a of g.combat.attacks){
      if(a.target.kind!=='building')continue;
      const snap=snapshots[attackerPi].find(r=>r.uid===a.attackerUid);
      const tool=snap?.tool;if(tool?.id!=='shared_satchel')continue;
      const defenderPi=1-attackerPi,b=g.players[defenderPi].village.find(x=>x.uid===a.target.uid);
      const before=buildingBefore[defenderPi].get(a.target.uid);
      if(!b||!Number.isFinite(before)||b.damage<=before)continue;
      const key=triggerKey('shared-satchel',tool.uid);
      if(atkP.triggerRoundUsed[key]===round(g))continue;
      atkP.triggerRoundUsed[key]=round(g);atkP.resources.provision=(atkP.resources.provision||0)+1;
      log(g,`${snap.name}'s Shared Satchel gains 1 Provision after damaging a Building.`);
    }

    for(let pi=0;pi<g.players.length;pi++){
      const p=g.players[pi],before=snapshots[pi];
      let missing=before.filter(s=>!p.residents.some(r=>r.uid===s.uid));

      // Hearthbound replaces Nell's first blocking defeat each game with a return to hand.
      for(const snap of missing.filter(s=>s.id==='nell_rootwatch'&&s.blocking&&s.flags?.hearthbound)){
        if(p._nellHearthboundUsed)continue;
        const ci=p.compost.findIndex(c=>c.uid===snap.uid);if(ci<0)continue;
        const [card]=p.compost.splice(ci,1);p.hand.push(card);p._nellHearthboundUsed=true;
        log(g,`${snap.name}'s Hearthbound returns it to hand instead of Compost.`);
      }
      missing=before.filter(s=>!p.residents.some(r=>r.uid===s.uid)&&!p.hand.some(c=>c.uid===s.uid));

      // Tunnel Beetle Patchwork triggers for every defeat and requires a Building choice.
      for(const snap of missing.filter(s=>s.flags?.repairOnDefeat)){
        const opts=p.village.filter(b=>b.damage>0).map(b=>({id:String(b.uid),label:`${b.name} · ${b.damage} damage`,meta:{damage:b.damage}}));
        if(opts.length)queueChoice(g,{kind:'repair-building',playerIndex:pi,title:snap.name,prompt:'Patchwork — choose a Building to repair 1 damage.',sourceName:snap.name,amount:snap.flags.repairOnDefeat,options:opts});
      }

      // Great Clover Hearthring can save one defeated Critter each round. Let the player choose or hold it.
      const clover=active(p).find(b=>b.id==='great_clover_hearthring');
      const ckey=clover&&triggerKey('clover-save',clover.uid);
      const eligible=clover&&p.triggerRoundUsed[ckey]!==round(g)?missing.filter(s=>p.compost.some(c=>c.uid===s.uid)):[];
      if(clover&&eligible.length){
        queueChoice(g,{kind:'clover-save',playerIndex:pi,title:'Great Clover Hearthring',prompt:'Choose a defeated Critter to save in its Muster, tired at ❤️−1 damage, or hold the once-per-round save.',sourceUid:clover.uid,optional:true,snapshots:eligible.map(clone),options:[...eligible.map(s=>({id:String(s.uid),label:s.name,card:stripResident(s)})),{id:'skip',label:'Hold the save for later this round'}]});
      }
    }
    autoResolve(g);
    return result;
  };

  const baseRequestEndTurn=E.requestEndTurn;
  E.requestEndTurn=(g,pi)=>{
    if(firstChoice(g))return {ok:false,reason:'Resolve the pending card ability first.'};
    const result=baseRequestEndTurn(g,pi);refreshHomeMarkers(g);return result;
  };

  E.pendingAbilityChoice=g=>firstChoice(g);
  E.resolveAbilityChoice=resolveAbilityChoice;
  E.autoResolveAbilityChoices=autoResolve;
  E.refreshAbilityMarkers=refreshHomeMarkers;
})();
