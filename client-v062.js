(() => {
  const E=window.HNH_ENGINE,{decks}=window.HNH_DATA;
  const app=document.getElementById('app');
  const ICON={acorn:'🥜',sap:'💦',root:'🫚',pebble:'🪨',provision:'📦'};
  const RLABEL={acorn:'Acorn',sap:'Sap',root:'Root',pebble:'Pebble',provision:'Provision'};
  let game=null,toast='',aiTimer=null;

  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const costText=cost=>!cost||!Object.keys(cost).length?'Free':Object.entries(cost).map(([r,n])=>`${n>1?n:''}${ICON[r]||r}`).join(' + ');
  const isHuman=pi=>!game||game.mode!=='ai'||pi!==game.aiIndex;
  const humanIndex=()=>game?.mode==='ai'?1-game.aiIndex:game?.active??0;
  const faction=p=>decks[p.factionKey];
  const setToast=msg=>{toast=msg;clearTimeout(setToast.t);setToast.t=setTimeout(()=>{toast='';render();},2400);};

  function newMatch(mode,key='AS'){
    clearTimeout(aiTimer);
    game=E.createGame({mode,humanFaction:key});
    E.startGame(game);
    render();scheduleAI();
  }

  function doAction(fn,{quiet=false}={}){
    const result=fn();
    if(result&&result.ok===false&&!quiet)setToast(result.reason||'That action is not legal.');
    postAction();
    return result;
  }

  function postAction(){
    if(game?.mode==='ai'&&game.phase==='Block'&&game.active!==game.aiIndex&&1-game.active===game.aiIndex)autoAssignAIBlocks();
    render();scheduleAI();
  }

  function scheduleAI(){
    clearTimeout(aiTimer);
    if(!game||game.winner||game.mode!=='ai'||game.active!==game.aiIndex)return;
    if(game.phase==='Block')return;
    aiTimer=setTimeout(runAI,420);
  }

  function runAI(){
    if(!game||game.winner||game.active!==game.aiIndex)return;
    const pi=game.aiIndex,p=game.players[pi];
    if(game.phase==='Harvest'&&game.pendingHarvest.length){
      const item=game.pendingHarvest[0];
      const choice=[...item.options].sort((a,b)=>(p.resources[a]||0)-(p.resources[b]||0))[0];
      E.chooseHarvest(game,choice);render();scheduleAI();return;
    }
    if(game.phase==='Build'){
      game._aiSteps=game._aiTurnNo===game.turnNo?(game._aiSteps||0):0;game._aiTurnNo=game.turnNo;
      if(game._aiSteps<8){
        const free=E.legalBuilds(game,pi).filter(b=>b.production&&!b.upgradeFrom&&!Object.keys(b.cost||{}).length);
        if(!p.freeProductionBuilt&&free.length){game._aiSteps++;E.build(game,pi,chooseAIProduction(p,free).id);render();scheduleAI();return;}
        const critters=p.hand.filter(c=>c.type==='Critter').map(c=>({c,ms:E.legalMusters(game,pi,c)})).filter(x=>x.ms.length);
        if(critters.length&&game._aiSteps<6){
          critters.sort((a,b)=>(b.c.might+b.c.grit)-(a.c.might+a.c.grit));game._aiSteps++;
          E.recruit(game,pi,critters[0].c.uid,critters[0].ms[0].uid);render();scheduleAI();return;
        }
        const builds=E.legalBuilds(game,pi).filter(b=>Object.keys(b.cost||{}).length);
        if(builds.length&&game._aiSteps<5){
          builds.sort((a,b)=>aiBlueprintScore(game,p,b)-aiBlueprintScore(game,p,a));game._aiSteps++;
          E.build(game,pi,builds[0].id);render();scheduleAI();return;
        }
      }
      aiDeclareAttacks();return;
    }
    if(game.phase==='Attack'){
      if(game.combat.attacks.length&&!game.combat.committed){E.commitAttacks(game,pi);render();return;}
      if(game.combat.resolved){E.requestEndTurn(game,pi);render();scheduleAI();return;}
      E.requestEndTurn(game,pi);render();scheduleAI();return;
    }
    if(game.phase==='Discard'){
      const lowest=[...p.hand].sort((a,b)=>cardValue(a)-cardValue(b))[0];
      if(lowest)E.discard(game,pi,lowest.uid);render();scheduleAI();return;
    }
    render();
  }

  function chooseAIProduction(p,opts){
    const prov=opts.find(b=>b.harvest?.provision||b.firstYield?.provision);
    if(prov&&!E.activeBuildings(p).some(b=>b.production&&(b.harvest?.provision||b.firstYield?.provision)))return prov;
    return [...opts].sort((a,b)=>{
      const ar=Object.keys(a.harvest||{})[0],br=Object.keys(b.harvest||{})[0];return (p.resources[ar]||0)-(p.resources[br]||0);
    })[0];
  }
  function aiBlueprintScore(g,p,b){
    let s=(b.prosperity||0)*2+(b.muster?3:0)+(b.reactionAccess?1:0)+(b.toolAccess?1:0);
    if(b.peaceful&&E.prosperity(p)+(b.prosperity||0)>=15)s+=30;
    if(b.upgradeFrom)s+=2;return s;
  }
  function cardValue(c){return c.type==='Critter'?(c.might||0)*2+(c.grit||0):(c.subtype==='Tool'?3:1);}

  function aiDeclareAttacks(){
    const pi=game.aiIndex,p=game.players[pi],o=game.players[1-pi];
    const ready=p.residents.filter(r=>E.canAttack(game,pi,r));
    if(!ready.length){E.requestEndTurn(game,pi);render();scheduleAI();return;}
    ready.slice(0,4).forEach(r=>{
      const buildings=E.activeBuildings(o).sort((a,b)=>(a.durability-a.damage)-(b.durability-b.damage));
      const target=o.exposed||o.hearthseed<=E.residentMight(r,{kind:'hearthseed'})?'hearthseed':(buildings[0]?.uid??'hearthseed');
      E.declareAttack(game,pi,r.uid,target);
    });
    if(game.combat.attacks.length)E.commitAttacks(game,pi);else E.requestEndTurn(game,pi);
    render();
  }

  function autoAssignAIBlocks(){
    if(game.mode!=='ai'||game.phase!=='Block')return;
    const di=1-game.active;if(di!==game.aiIndex)return;
    const d=game.players[di];
    game.combat.attacks.forEach((a,i)=>{
      if(a.blockerUid)return;
      const legal=d.residents.filter(r=>E.canBlock(game,di,r,a));
      if(!legal.length)return;
      legal.sort((x,y)=>E.residentGrit(game,d,y,true)-E.residentGrit(game,d,x,true));
      E.assignBlock(game,di,legal[0].uid,i);
    });
  }

  function setupScreen(){
    return `<main class="setupShell"><section class="setupCard"><div class="eyebrow">RULES-FIRST CLIENT · v0.6.2</div><h1>Hearth & Hollow</h1><p class="lead">A cleaner client pass built around the actual v0.6.2 turn structure instead of debug controls.</p><div class="factionGrid"><button class="factionChoice" onclick="UI.newMatch('ai','AS')"><span class="bigIcon">🥜💦</span><span><b>Porchlight</b><small>Hazel Underleaf · Acorn / Sap</small></span></button><button class="factionChoice" onclick="UI.newMatch('ai','RP')"><span class="bigIcon">🫚🪨</span><span><b>Stonecap</b><small>Mosswick Grubroot · Root / Pebble</small></span></button></div><button class="textButton" onclick="UI.newMatch('hotseat','AS')">Hot-seat two player</button><div class="ruleCallout"><b>Prosperity reminder:</b> reaching 15 does not win immediately. You win only if you still have 15+ active Prosperity at the <em>start of your Dawn</em>.</div></section></main>`;
  }

  function phaseStrip(){
    const labels=['Dawn','Harvest','Build','Attack','Rest'];
    const active=game.phase==='Block'?'Attack':game.phase==='Discard'?'Rest':game.phase;
    return `<div class="phaseStrip">${labels.map(l=>`<span class="phasePip ${l===active?'on':''}">${l}</span>`).join('')}</div>`;
  }

  function prosperityBadge(p){
    const n=E.prosperity(p),ready=n>=15&&!game.winner;
    return `<div class="prosperityStat ${ready?'prosReady':''}"><span>✨</span><b>${n}<small>/15</small></b><span class="prosLabel">${ready?'Hold until Dawn':'Prosperity'}</span></div>`;
  }

  function resources(p){
    const visible=['acorn','sap','root','pebble','provision'].filter(r=>faction(p).resources.includes(r)||(p.resources[r]||0)>0);
    return `<div class="resourceRow">${visible.map(r=>`<div class="resourceChip"><span>${ICON[r]}</span><b>${p.resources[r]||0}</b><small>${RLABEL[r]}</small></div>`).join('')}</div>`;
  }

  function playerBoard(p,pi,top=false){
    const active=pi===game.active;
    const pros=E.prosperity(p);
    const pending=pros>=15&&!game.winner?`<div class="prosNotice">✨ ${esc(p.name)} has ${pros} active Prosperity. This becomes a win only at the start of that player's next Dawn if it stays at 15+.</div>`:'';
    const exposed=p.exposed?'<span class="statusDanger">EXPOSED</span>':p.exposurePendingOwnTurn!==null?'<span class="statusWarn">response turn</span>':'';
    return `<section class="playerBoard ${active?'turnActive':''} ${top?'opponentBoard':''}"><header class="playerTitle"><div><span class="eyebrow">${top?'OPPONENT':'YOUR VILLAGE'} ${active?'· ACTIVE':''}</span><h2>${esc(p.name)} <small>${esc(faction(p).short)}</small></h2><div class="keeper">Hearthkeeper: ${esc(faction(p).hearthkeeper)} · reference only</div></div><div class="headlineStats"><div class="hearthStat"><span>🔥</span><b>${p.hearthseed}<small> HP</small></b>${exposed}</div>${prosperityBadge(p)}</div></header>${resources(p)}${pending}${villageZone(p,pi)}${fieldZone(p,pi)}</section>`;
  }

  function villageZone(p,pi){
    return `<div class="zone"><div class="zoneTitle"><span>VILLAGE</span><small>Buildings · damage persists</small></div><div class="buildingGrid">${p.village.map(b=>buildingCard(p,pi,b)).join('')}</div></div>`;
  }

  function buildingCard(p,pi,b){
    const ruined=E.isRuined(b),used=b.muster?E.housingUsed(p,b.uid):0;
    return `<article class="building ${ruined?'ruined':''}"><div class="cardTop"><div><b>${esc(b.name)}</b><small>${esc(b.subtype)}${ruined?' · RUINED':''}</small></div>${b.shield?'<span class="shield">🛡 Shield</span>':''}</div><div class="statLine"><span>🧱 ${b.damage}/${b.durability}</span><span>✨ ${ruined?0:b.prosperity||0}</span>${b.muster?`<span>🏠 ${used}/${b.housing}</span>`:''}</div>${b.muster?`<div class="musterLine">${esc(b.musterClass)} Muster · Recruit ${costText(b.recruitCost)}</div>`:''}<p>${esc(b.text||'')}</p>${b.manual?`<span class="manualTag">Card effect still manual: ${esc(b.manual)}</span>`:''}${b.rehousingDueOwnTurn!==null&&ruined?'<span class="warnTag">Residents inactive · rehousing deadline set</span>':''}${workshopAction(p,pi,b)}</article>`;
  }

  function workshopAction(p,pi,b){
    if(pi!==game.active||game.phase!=='Build'||!isHuman(pi)||!b.repairAbility||E.isRuined(b)||p.workshopRepairUsed)return '';
    const damaged=p.village.filter(x=>x.damage>0),available=Object.entries(p.resources).filter(([,n])=>n>0);
    if(!damaged.length||!available.length)return '';
    const tid=`wrk-t-${b.uid}`,rid=`wrk-r-${b.uid}`;
    return `<div class="miniAction"><select id="${tid}">${damaged.map(x=>`<option value="${x.uid}">${esc(x.name)} (${x.damage} dmg)</option>`).join('')}</select><select id="${rid}">${available.map(([r])=>`<option value="${r}">${ICON[r]} ${RLABEL[r]}</option>`).join('')}</select><button onclick="UI.workshop(${b.uid},'${tid}','${rid}')">Repair 1</button></div>`;
  }

  function fieldZone(p,pi){
    return `<div class="zone fieldZone"><div class="zoneTitle"><span>FIELD</span><small>Critters · survivor damage clears at their controller's Rest</small></div><div class="critterRow">${p.residents.length?p.residents.map(r=>critterCard(p,pi,r)).join(''):'<div class="emptyZone">No Critters in the Field.</div>'}</div></div>`;
  }

  function critterCard(p,pi,r){
    const ready=E.residentReady(game,p,r),grit=E.residentGrit(game,p,r,r.blocking),fresh=r.recruitedTurn===game.turnNo&&pi===game.active;
    const attack=pi===game.active&&isHuman(pi)&&E.canAttack(game,pi,r)?attackAction(pi,r):'';
    return `<article class="critter ${!ready?'inactive':''} ${r.tired?'tired':''} ${r.attacking?'attacking':''} ${r.blocking?'blocking':''}"><div class="cardTop"><b>${esc(r.name)}</b>${r.shield?'<span class="shield">🛡</span>':''}</div><small class="classLine">${(r.musterClasses||[]).join(' · ')}${r.advanced?' · ADVANCED':''}</small><div class="statLine"><span>💪 ${r.might}</span><span>❤️ ${r.damage}/${grit}</span></div><div class="homeLine">🏡 ${esc(p.village.find(b=>b.uid===r.musterUid)?.name||'No home')}</div>${r.tool?`<div class="toolLine">🧰 ${esc(r.tool.name)}</div>`:''}${fresh?'<span class="freshTag">New · can block, cannot attack</span>':''}${attack}</article>`;
  }

  function attackAction(pi,r){
    const targets=E.legalAttackTargets(game,pi,r);if(!targets.length)return '';
    const sid=`atk-${r.uid}`;
    return `<div class="miniAction attackAction"><select id="${sid}">${targets.map(t=>`<option value="${t.kind==='hearthseed'?'hearthseed':t.uid}">${t.kind==='hearthseed'?'🔥 Hearthseed':esc(t.label)}</option>`).join('')}</select><button onclick="UI.attack(${r.uid},'${sid}')">Declare</button></div>`;
  }

  function handPanel(){
    const pi=humanIndex(),p=game.players[pi];
    if(game.mode==='ai'&&game.active===game.aiIndex)return `<section class="handPanel panel"><div class="sectionHead"><h3>Your hand <small>${p.hand.length}</small></h3><span class="locked">Opponent turn · Reactions appear below when legal</span></div><div class="handRow">${p.hand.map(c=>handCard(p,pi,c,false)).join('')}</div></section>`;
    const owner=game.mode==='ai'?p:game.players[game.active],ownerPi=game.mode==='ai'?pi:game.active;
    return `<section class="handPanel panel"><div class="sectionHead"><h3>${game.mode==='ai'?'Your hand':'Active hand'} <small>${owner.hand.length}</small></h3><span>Field Deck ${owner.fieldDeck.length} · Compost ${owner.compost.length}</span></div>${game.phase==='Discard'?`<div class="discardNotice">Rest: discard down to 7. Choose ${owner.hand.length-7} more card${owner.hand.length-7===1?'':'s'}.</div>`:''}<div class="handRow">${owner.hand.map(c=>handCard(owner,ownerPi,c,true)).join('')}</div></section>`;
  }

  function handCard(p,pi,c,interactive){
    let action='';
    if(interactive&&game.phase==='Discard'&&pi===game.active)action=`<button class="dangerBtn" onclick="UI.discard(${c.uid})">Discard</button>`;
    else if(interactive&&c.type==='Critter'&&game.phase==='Build'&&pi===game.active){
      const ms=E.legalMusters(game,pi,c);const sid=`rec-${c.uid}`;
      action=ms.length?`<div class="miniAction"><select id="${sid}">${ms.map(m=>`<option value="${m.uid}">${esc(m.name)} · ${E.housingUsed(p,m.uid)}/${m.housing}</option>`).join('')}</select><button onclick="UI.recruit(${c.uid},'${sid}')">Recruit</button></div>`:'<span class="whyDisabled">No legal Muster right now</span>';
    }else if(interactive&&c.subtype==='Tool'&&game.phase==='Build'&&pi===game.active){
      const rs=p.residents.filter(r=>!r.tool);const sid=`tool-${c.uid}`;
      action=rs.length?`<div class="miniAction"><select id="${sid}">${rs.map(r=>`<option value="${r.uid}">${esc(r.name)}</option>`).join('')}</select><button onclick="UI.tool(${c.uid},'${sid}')">Equip</button></div>`:'<span class="whyDisabled">No Critter can carry this</span>';
    }else if(interactive&&c.id==='burrow_stores'&&game.phase==='Build'&&pi===game.active){
      const spend=Object.entries(p.resources).filter(([,n])=>n>0),sid1=`supply-spend-${c.uid}`,sid2=`supply-gain-${c.uid}`;
      action=spend.length?`<div class="miniAction"><select id="${sid1}">${spend.map(([r])=>`<option value="${r}">${ICON[r]} ${RLABEL[r]}</option>`).join('')}</select><select id="${sid2}"><option value="root">🫚 Root</option><option value="pebble">🪨 Pebble</option></select><button onclick="UI.supply(${c.uid},'${sid1}','${sid2}')">Exchange</button></div>`:'<span class="whyDisabled">No resource to exchange</span>';
    }
    const subtype=c.type==='Critter'?`Muster — ${(c.musterClasses||[]).join(' | ')}`:c.subtype;
    const stats=c.type==='Critter'?`<div class="statLine"><span>💪 ${c.might}</span><span>❤️ ${c.grit}</span></div>`:`<div class="costLine">Cost ${costText(c.cost)}</div>`;
    return `<article class="handCard ${interactive?'':'lockedCard'}"><div class="cardTop"><b>${esc(c.name)}</b>${c.advanced?'<span class="advancedTag">ADV</span>':''}</div><small>${esc(subtype)}</small>${stats}<p>${esc(c.text||'')}</p>${c.flags?.manual&&c.id!=='burrow_stores'?`<span class="manualTag">Manual: ${esc(c.flags.manual)}</span>`:''}${action}</article>`;
  }

  function blueprintsPanel(){
    const pi=game.mode==='ai'?humanIndex():game.active,p=game.players[pi],f=faction(p),interactive=isHuman(pi)&&pi===game.active&&game.phase==='Build';
    return `<section class="panel bluePanel"><div class="sectionHead"><h3>Blueprints <small>${12-p.usedBlueprints.length}/12</small></h3><span>Known build menu</span></div><div class="blueList">${f.blueprints.map(bp=>{
      const used=p.usedBlueprints.includes(bp.id),why=interactive?E.buildReason(game,pi,bp):'Not your Build';
      return `<div class="blueRow ${used?'used':''}"><div><b>${esc(bp.name)}</b><small>${esc(bp.subtype)} · ${costText(bp.cost)} · 🧱${bp.durability} · ✨${bp.prosperity}${bp.housing?` · 🏠${bp.housing}`:''}</small></div><button ${used||why?'disabled':''} title="${esc(used?'Used':why)}" onclick="UI.build('${bp.id}')">${bp.upgradeFrom?'Upgrade':'Build'}</button></div>`;
    }).join('')}</div></section>`;
  }

  function combatPanel(){
    if(!game.combat.attacks.length&&game.phase!=='Block')return `<section class="panel combatPanel"><div class="sectionHead"><h3>Attack</h3><span>Declare any number of ready Critters, then commit the whole attack.</span></div></section>`;
    const attacker=game.players[game.active],defIndex=1-game.active,defender=game.players[defIndex];
    const humanDefender=isHuman(defIndex),humanAttacker=isHuman(game.active);
    const canResolve=game.phase==='Block'&&(humanAttacker||humanDefender);
    return `<section class="panel combatPanel"><div class="sectionHead"><h3>Attack declaration</h3><span>${game.combat.committed?'Committed · blockers/reactions before damage':'Still declaring attackers'}</span></div><div class="attackList">${game.combat.attacks.map((a,i)=>{
      const atk=attacker.residents.find(r=>r.uid===a.attackerUid),blk=defender.residents.find(r=>r.uid===a.blockerUid);
      const blockers=game.phase==='Block'&&humanDefender&&!blk?defender.residents.filter(r=>E.canBlock(game,defIndex,r,a)):[];
      return `<div class="attackEntry"><div><b>${esc(atk?.name||'Attacker')}</b><span>→ ${a.target.kind==='hearthseed'?'🔥 Hearthseed':esc(a.target.name)}</span>${a.zeroDamage?'<small>Rootsnared · deals 0</small>':''}${blk?`<small>Blocked by ${esc(blk.name)}</small>`:''}</div>${blockers.length?`<div class="miniAction"><select id="blk-${i}">${blockers.map(r=>`<option value="${r.uid}">${esc(r.name)}</option>`).join('')}</select><button onclick="UI.block(${i})">Block</button></div>`:''}</div>`;
    }).join('')}</div><div class="combatButtons">${!game.combat.committed&&humanAttacker?'<button onclick="UI.commitAttacks()">Commit attackers</button>':''}${canResolve?'<button class="primaryBtn" onclick="UI.resolveCombat()">Resolve combat</button>':''}</div>${game.phase==='Block'?reactionTray(humanIndex()):''}</section>`;
  }

  function reactionTray(pi){
    if(!game||game.phase!=='Block'||!isHuman(pi))return '';
    const p=game.players[pi],cards=p.hand.filter(c=>c.subtype==='Reaction');if(!cards.length)return '';
    return `<div class="reactionTray"><div class="reactionTitle">⚡ Reaction window <small>At most one Reaction per round; requires active Reaction Access.</small></div>${cards.map(c=>reactionCard(p,pi,c)).join('')}</div>`;
  }

  function reactionCard(p,pi,c){
    let opts=[];
    if(c.id==='rootsnare'&&pi!==game.active)opts=game.combat.attacks.map((a,i)=>({v:String(i),l:`${game.players[game.active].residents.find(r=>r.uid===a.attackerUid)?.name||'Attacker'} → deals 0`}));
    if(c.id==='hide_in_ferns'&&pi===game.active)opts=game.combat.attacks.map((a,i)=>a.blockerUid?({v:String(i),l:`Slip ${game.players[game.active].residents.find(r=>r.uid===a.attackerUid)?.name||'attacker'} past blocker`}):null).filter(Boolean);
    if(c.id==='sap_bandage')opts=[...p.residents.map(r=>({v:`resident:${r.uid}`,l:r.name})),...E.activeBuildings(p).map(b=>({v:`building:${b.uid}`,l:b.name}))];
    if(c.id==='brace_the_burrow')opts=[{v:'hearthseed',l:'Hearthseed'},...E.activeBuildings(p).map(b=>({v:`building:${b.uid}`,l:b.name}))];
    const sid=`rx-${c.uid}`;
    return `<div class="reactionCard"><div><b>${esc(c.name)}</b><small>${costText(c.cost)} · ${esc(c.text)}</small></div>${opts.length?`<div class="miniAction"><select id="${sid}">${opts.map(o=>`<option value="${o.v}">${esc(o.l)}</option>`).join('')}</select><button onclick="UI.reaction(${pi},${c.uid},'${sid}')">Play</button></div>`:'<span class="whyDisabled">No legal target in this window</span>'}</div>`;
  }

  function rulesPanel(){
    return `<section class="panel rulesPanel"><h3>v0.6.2 rules truth</h3><ul><li><b>Prosperity:</b> 15+ wins only at the start of your Dawn.</li><li><b>Provision:</b> each 📦 cost slot may use 📦 or any one core resource.</li><li><b>Musters:</b> every Critter uses exactly 1 Housing; Advanced needs an upgraded matching Muster.</li><li><b>Damage:</b> Building damage stays; surviving Critter damage clears at Rest.</li><li><b>Combat:</b> all attackers are declared before blockers; same-target unblocked damage is combined.</li></ul></section>`;
  }

  function controls(){
    if(game.winner)return '';
    const human=game.mode==='ai'?humanIndex():game.active;
    if(game.mode==='ai'&&game.active===game.aiIndex)return '<span class="aiThinking">🍂 Opponent is taking its turn…</span>';
    if(game.phase==='Harvest')return '<span class="phaseHelp">Choose Harvest below.</span>';
    if(game.phase==='Block'&&game.active!==human)return '<span class="phaseHelp">Choose blockers / Reactions, then resolve combat.</span>';
    return `<button onclick="UI.endTurn()" ${game.phase==='Block'&&!game.combat.resolved?'disabled':''}>End turn</button>`;
  }

  function harvestOverlay(){
    if(!game||game.phase!=='Harvest'||!game.pendingHarvest.length||!isHuman(game.active))return '';
    const item=game.pendingHarvest[0],p=game.players[game.active],b=p.village.find(x=>x.uid===item.buildingUid);
    return `<div class="modalBack"><div class="modal"><span class="eyebrow">HARVEST</span><h2>${esc(b?.name||'Production')}</h2><p>Choose what this active Production Building gives you.</p><div class="harvestChoices">${item.options.map(r=>`<button onclick="UI.harvest('${r}')"><span>${ICON[r]}</span><b>+1 ${RLABEL[r]}</b></button>`).join('')}</div></div></div>`;
  }

  function winnerOverlay(){
    if(!game?.winner)return '';
    const p=game.players[game.winner.playerIndex];
    return `<div class="modalBack"><div class="modal winnerModal"><span class="eyebrow">FROST TRIAL COMPLETE</span><h1>🏆 ${esc(p.name)} wins</h1><p>${game.winner.reason==='Prosperity'?'They began Dawn with at least 15 active Prosperity.':game.winner.reason==='Exposed'?'An unblocked attack reached an Exposed Hearthseed.':'The opposing Hearthseed reached 0 HP.'}</p><button onclick="UI.reset()">Return to setup</button></div></div>`;
  }

  function render(){
    if(!game){app.innerHTML=setupScreen();return;}
    const top=game.mode==='ai'?game.aiIndex:1-game.active,bottom=game.mode==='ai'?humanIndex():game.active;
    app.innerHTML=`<div class="client"><header class="topbar"><div><div class="brand">Hearth & Hollow <span>Client v0.6.0</span></div><div class="turnMeta">Round ${E.currentRound(game)} · Turn ${game.turnNo} · ${esc(game.players[game.active].name)} · ${game.phase}</div></div>${phaseStrip()}<div class="topControls">${controls()}<button class="textButton" onclick="UI.reset()">Reset</button></div></header>${toast?`<div class="toast">${esc(toast)}</div>`:''}<div class="shell"><main class="boardColumn">${playerBoard(game.players[top],top,true)}<div class="trialDivider"><span>❄ FROST TRIAL ❄</span></div>${playerBoard(game.players[bottom],bottom,false)}${combatPanel()}${handPanel()}</main><aside class="sideColumn">${blueprintsPanel()}${rulesPanel()}<section class="panel logPanel"><div class="sectionHead"><h3>Game log</h3><span>Newest first</span></div><div class="log">${game.log.map(x=>`<div>${esc(x)}</div>`).join('')}</div></section></aside></div>${harvestOverlay()}${winnerOverlay()}</div>`;
  }

  window.UI={
    newMatch,reset:()=>{clearTimeout(aiTimer);game=null;toast='';render();},
    harvest:r=>doAction(()=>E.chooseHarvest(game,r)),
    build:id=>doAction(()=>E.build(game,game.active,id)),
    recruit:(uid,sid)=>doAction(()=>E.recruit(game,game.active,uid,+document.getElementById(sid).value)),
    tool:(uid,sid)=>doAction(()=>E.playTool(game,game.active,uid,+document.getElementById(sid).value)),
    supply:(uid,sid1,sid2)=>doAction(()=>E.playSupply(game,game.active,uid,document.getElementById(sid1).value,document.getElementById(sid2).value)),
    workshop:(buid,tid,rid)=>doAction(()=>E.useWorkshop(game,game.active,buid,+document.getElementById(tid).value,document.getElementById(rid).value)),
    attack:(uid,sid)=>doAction(()=>E.declareAttack(game,game.active,uid,document.getElementById(sid).value==='hearthseed'?'hearthseed':+document.getElementById(sid).value)),
    commitAttacks:()=>doAction(()=>E.commitAttacks(game,game.active)),
    block:i=>{const sid=`blk-${i}`;doAction(()=>E.assignBlock(game,1-game.active,+document.getElementById(sid).value,i));},
    reaction:(pi,uid,sid)=>doAction(()=>E.playReaction(game,pi,uid,document.getElementById(sid).value)),
    resolveCombat:()=>doAction(()=>E.resolveCombat(game)),
    discard:uid=>doAction(()=>E.discard(game,game.active,uid)),
    endTurn:()=>doAction(()=>E.requestEndTurn(game,game.active)),
  };
  render();
})();
