(() => {
  const E=window.HNH_ENGINE,{decks}=window.HNH_DATA;
  const app=document.getElementById('app');
  const ICON={acorn:'🥜',sap:'💦',root:'🫚',pebble:'🪨',provision:'📦'};
  const RLABEL={acorn:'Acorn',sap:'Sap',root:'Root',pebble:'Pebble',provision:'Provision'};
  const AI_PROFILES={
    beginner:{label:'Beginner',skill:'beginner',maxSteps:6,recruitUntil:6,buildUntil:5,attackers:4},
    standard:{label:'Standard',skill:'standard',maxSteps:6,recruitUntil:6,buildUntil:5,attackers:4},
    hard:{label:'Hard',skill:'hard',maxSteps:6,recruitUntil:6,buildUntil:5,attackers:4}
  };
  const AI_PACES={slow:{label:'Deliberate',delay:1250},normal:{label:'Normal',delay:800}};
  let game=null,toast='',aiTimer=null,drawer=null,aiDifficulty='beginner',aiPace='slow';
  const aiProfile=()=>AI_PROFILES[aiDifficulty]||AI_PROFILES.beginner;
  const aiPaceProfile=()=>AI_PACES[aiPace]||AI_PACES.slow;

  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m]));
  const costText=cost=>!cost||!Object.keys(cost).length?'Free':Object.entries(cost).map(([r,n])=>`${n>1?n:''}${ICON[r]||r}`).join(' + ');
  const isHuman=pi=>!game||game.mode!=='ai'||pi!==game.aiIndex;
  const humanIndex=()=>game?.mode==='ai'?1-game.aiIndex:game?.active??0;
  const faction=p=>decks[p.factionKey];
  const setToast=msg=>{toast=msg;clearTimeout(setToast.t);setToast.t=setTimeout(()=>{toast='';render();},2400);};
  const aiNote=msg=>{toast=msg;clearTimeout(setToast.t);setToast.t=setTimeout(()=>{toast='';render();},Math.max(1700,aiPaceProfile().delay+450));};

  function newMatch(mode,key='AS',difficulty='beginner',pace='slow'){
    clearTimeout(aiTimer);drawer=null;aiDifficulty=AI_PROFILES[difficulty]?difficulty:'beginner';aiPace=AI_PACES[pace]?pace:'slow';
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
    aiTimer=setTimeout(runAI,aiPaceProfile().delay);
  }

  function runAI(){
    if(!game||game.winner||game.active!==game.aiIndex)return;
    const pi=game.aiIndex,p=game.players[pi];
    if(game.phase==='Harvest'&&game.pendingHarvest.length){
      const item=game.pendingHarvest[0];
      const choice=[...item.options].sort((a,b)=>(p.resources[a]||0)-(p.resources[b]||0))[0];
      E.chooseHarvest(game,choice);aiNote(`AI harvests ${RLABEL[choice]}.`);render();scheduleAI();return;
    }
    if(game.phase==='Build'){
      game._aiSteps=game._aiTurnNo===game.turnNo?(game._aiSteps||0):0;game._aiTurnNo=game.turnNo;
      if(game._aiSteps<aiProfile().maxSteps){
        const free=E.legalBuilds(game,pi).filter(b=>b.production&&!b.upgradeFrom&&!Object.keys(b.cost||{}).length);
        if(!p.freeProductionBuilt&&free.length){game._aiSteps++;const pick=chooseAIProduction(p,free);E.build(game,pi,pick.id);aiNote(`AI builds ${pick.name}.`);render();scheduleAI();return;}
        const critters=p.hand.filter(c=>c.type==='Critter').map(c=>({c,ms:E.legalMusters(game,pi,c)})).filter(x=>x.ms.length);
        if(critters.length&&game._aiSteps<aiProfile().recruitUntil){
          game._aiSteps++;
          const pick=chooseAICritter(critters,p);E.recruit(game,pi,pick.c.uid,pick.ms[0].uid);aiNote(`AI recruits ${pick.c.name}.`);render();scheduleAI();return;
        }
        const builds=E.legalBuilds(game,pi).filter(b=>Object.keys(b.cost||{}).length);
        if(builds.length&&game._aiSteps<aiProfile().buildUntil){
          game._aiSteps++;
          const pick=chooseAIBuild(game,p,builds);E.build(game,pi,pick.id);aiNote(`AI builds ${pick.name}.`);render();scheduleAI();return;
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
      if(lowest){E.discard(game,pi,lowest.uid);aiNote(`AI discards ${lowest.name}.`);}render();scheduleAI();return;
    }
    render();
  }

  function chooseAIProduction(p,opts){
    if(aiProfile().skill==='beginner')return opts[0];
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
  function chooseAICritter(options,p){
    const skill=aiProfile().skill;
    if(skill==='beginner')return [...options].sort((a,b)=>cardValue(a.c)-cardValue(b.c))[0];
    if(skill==='standard')return [...options].sort((a,b)=>(b.c.might+b.c.grit)-(a.c.might+a.c.grit))[0];
    return [...options].sort((a,b)=>{
      const score=x=>cardValue(x.c)+(x.c.advanced?4:0)+(x.ms[0]?.upgradeFrom?2:0);
      return score(b)-score(a);
    })[0];
  }
  function chooseAIBuild(g,p,builds){
    const skill=aiProfile().skill;
    if(skill==='beginner')return [...builds].sort((a,b)=>aiBlueprintScore(g,p,a)-aiBlueprintScore(g,p,b))[0];
    if(skill==='standard')return [...builds].sort((a,b)=>aiBlueprintScore(g,p,b)-aiBlueprintScore(g,p,a))[0];
    const score=b=>{
      let s=aiBlueprintScore(g,p,b);
      if(b.upgradeFrom)s+=4;
      if(b.muster&&p.hand.some(c=>c.type==='Critter'&&(c.musterClasses||[]).includes(b.musterClass)))s+=6;
      if(b.production&&Object.values(p.resources).reduce((n,v)=>n+v,0)<4)s+=4;
      return s;
    };
    return [...builds].sort((a,b)=>score(b)-score(a))[0];
  }
  function chooseAITarget(r,o){
    const buildings=E.activeBuildings(o);
    if(o.exposed||!buildings.length)return 'hearthseed';
    const skill=aiProfile().skill;
    if(skill==='beginner')return buildings[0].uid;
    const might=E.residentMight(r,{kind:'building'});
    if(skill==='standard'){
      const weak=[...buildings].sort((a,b)=>(a.durability-a.damage)-(b.durability-b.damage));
      return o.hearthseed<=E.residentMight(r,{kind:'hearthseed'})?'hearthseed':weak[0].uid;
    }
    const scored=[...buildings].map(b=>({b,score:(b.production?6:0)+(b.muster?5:0)+(b.prosperity||0)*2+((b.durability-b.damage)<=might?12:0)})).sort((a,b)=>b.score-a.score);
    if(o.hearthseed<=E.residentMight(r,{kind:'hearthseed'}))return 'hearthseed';
    return scored[0].b.uid;
  }

  function aiDeclareAttacks(){
    const pi=game.aiIndex,p=game.players[pi],o=game.players[1-pi];
    const ready=p.residents.filter(r=>E.canAttack(game,pi,r));
    if(!ready.length){E.requestEndTurn(game,pi);render();scheduleAI();return;}
    ready.slice(0,aiProfile().attackers).forEach(r=>{
      E.declareAttack(game,pi,r.uid,chooseAITarget(r,o));
    });
    if(game.combat.attacks.length){E.commitAttacks(game,pi);aiNote(`AI declares ${game.combat.attacks.length} attacker${game.combat.attacks.length===1?'':'s'}.`);}else E.requestEndTurn(game,pi);
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
      if(aiProfile().skill==='standard')legal.sort((x,y)=>E.residentGrit(game,d,y,true)-E.residentGrit(game,d,x,true));
      else if(aiProfile().skill==='hard'){
        const atk=game.players[game.active].residents.find(r=>r.uid===a.attackerUid);
        const score=r=>(E.residentGrit(game,d,r,true)>(atk?.might||0)?10:0)+((r.might||0)>=(atk?.grit||99)?8:0)+E.residentGrit(game,d,r,true);
        legal.sort((x,y)=>score(y)-score(x));
      }
      E.assignBlock(game,di,legal[0].uid,i);
    });
  }

  function setupScreen(){
    return `<main class="setupShell"><section class="setupCard"><div class="setupSeal">🔥</div><div class="eyebrow">DIGITAL TABLETOP · RULES v0.6.2</div><h1>Hearth & Hollow</h1><p class="lead">Build a tiny woodland village, gather your Critters, and keep the last warm Hearthseed glowing through winter.</p><h2 class="setupPrompt">Choose your Hearthkeeper</h2><div class="factionGrid"><button class="factionChoice porch" onclick="UI.newMatch('ai','AS',document.getElementById('aiDifficulty').value,document.getElementById('aiPace').value)"><span class="bigIcon">🥜💦</span><span><b>Hazel Underleaf</b><small>Porchlight Tradition · Acorn / Sap</small><em class="deckArchetype">⚡ Fast, scrappy pressure</em><span class="deckExplain">Attack Buildings early, disrupt production, and keep the tempo moving.</span></span></button><button class="factionChoice stone" onclick="UI.newMatch('ai','RP',document.getElementById('aiDifficulty').value,document.getElementById('aiPace').value)"><span class="bigIcon">🫚🪨</span><span><b>Mosswick Grubroot</b><small>Stonecap Tradition · Root / Pebble</small><em class="deckArchetype">🛡️ Sturdy, recursive defense</em><span class="deckExplain">Block, repair, recycle Critters, and grow into a strong late village.</span></span></button></div><div class="aiDifficultyBox"><label for="aiDifficulty"><b>AI Difficulty</b><select id="aiDifficulty"><option value="beginner" selected>Beginner — forgiving priorities</option><option value="standard">Standard — sensible priorities</option><option value="hard">Hard — sharp priorities</option></select></label><small>Difficulty changes what the AI values and targets, not how many legal actions it is allowed to take.</small><label for="aiPace"><b>AI Pace</b><select id="aiPace"><option value="slow" selected>Deliberate — easy to follow</option><option value="normal">Normal</option></select></label><small>Pace is separate from difficulty. Deliberate pauses between visible actions so you can read the opponent turn.</small></div><button class="textButton" onclick="UI.newMatch('hotseat','AS')">Hot-seat two player</button><div class="ruleCallout"><b>Prosperity:</b> reaching 15 is not immediate victory. Hold 15+ active Prosperity until the start of your Dawn.</div></section></main>`;
  }

  function phaseStrip(){
    const labels=['Dawn','Harvest','Build','Attack','Rest'];
    const active=game.phase==='Block'?'Attack':game.phase==='Discard'?'Rest':game.phase;
    return `<div class="phaseStrip">${labels.map(l=>`<span class="phasePip ${l===active?'on':''}">${l}</span>`).join('')}</div>`;
  }

  function prosperityBadge(p){
    const n=E.prosperity(p),ready=n>=15&&!game.winner;
    return `<div class="prosperityStat ${ready?'prosReady':''}"><span>✨</span><b>${n}<small>/15</small></b><em>${ready?'Hold for Dawn':'Prosperity'}</em></div>`;
  }

  function resources(p){
    const visible=['acorn','sap','root','pebble','provision'].filter(r=>faction(p).resources.includes(r)||(p.resources[r]||0)>0);
    return `<div class="resourceRow">${visible.map(r=>`<div class="resourceChip" title="${RLABEL[r]}"><span>${ICON[r]}</span><b>${p.resources[r]||0}</b></div>`).join('')}</div>`;
  }

  function playerBanner(p,pi,top=false){
    const active=pi===game.active,pros=E.prosperity(p);
    const exposed=p.exposed?'<span class="statusDanger">EXPOSED</span>':p.exposurePendingOwnTurn!==null?'<span class="statusWarn">Response turn</span>':'';
    const pending=pros>=15&&!game.winner?`<span class="dawnHold">✨ ${pros} — hold until Dawn</span>`:'';
    return `<section class="playerBanner ${top?'opponentBanner':'homeBanner'} ${active?'turnActive':''}"><div class="identity"><span class="sideLabel">${top?'OPPONENT':'YOU'}${active?' · ACTIVE':''}</span><b>${esc(faction(p).hearthkeeper)}</b><button class="keeperChip" onclick="UI.drawer('hearthkeeper:${pi}')">🔥 View Hearthkeeper card</button><small>${esc(faction(p).short)}</small></div><div class="bannerResources">${resources(p)}</div><div class="bannerStats"><div class="hearthMedallion"><span>🔥</span><b>${p.hearthseed}</b><small>HP</small>${exposed}</div>${prosperityBadge(p)}${pending}</div></section>`;
  }

  function laneTitle(icon,title,note){return `<div class="laneTitle"><span>${icon}</span><b>${title}</b><small>${note}</small></div>`;}

  function villageZone(p,pi,top=false){
    return `<section class="boardLane villageLane ${top?'enemyLane':''}">${laneTitle('🏡','Village','Buildings · damage persists')}<div class="buildingGrid">${p.village.map(b=>buildingCard(p,pi,b)).join('')}</div></section>`;
  }

  function buildingIcon(b){
    if(b.peaceful)return '🌿';if(b.muster)return '🏠';if(b.production)return '🧺';if(b.repairAbility)return '🛠';if(b.reactionAccess)return '🛡';if(b.toolAccess)return '🧰';return '🏡';
  }

  function buildingCard(p,pi,b){
    const ruined=E.isRuined(b),used=b.muster?E.housingUsed(p,b.uid):0;
    return `<article class="gameCard building ${ruined?'ruined':''}"><div class="artWindow buildingArt"><span>${buildingIcon(b)}</span><small>${esc(b.subtype)}</small></div><div class="cardFrame"><div class="cardTop"><div><b>${esc(b.name)}</b><small>${ruined?'RUINED · ':''}${esc(b.subtype)}</small></div>${b.shield?'<span class="shield">🛡</span>':''}</div><div class="badgeRow"><span>🧱 ${b.damage}/${b.durability}</span><span>✨ ${ruined?0:b.prosperity||0}</span>${b.muster?`<span>🏠 ${used}/${b.housing}</span>`:''}</div>${b.muster?`<div class="musterLine"><b>${esc(b.musterClass)}</b> Muster · Recruit ${costText(b.recruitCost)}</div>`:''}<p>${esc(b.text||'')}</p>${b.manual?`<span class="manualTag">Manual: ${esc(b.manual)}</span>`:''}${b.rehousingDueOwnTurn!==null&&ruined?'<span class="warnTag">Residents inactive · rehouse by deadline</span>':''}${workshopAction(p,pi,b)}</div></article>`;
  }

  function workshopAction(p,pi,b){
    if(pi!==game.active||game.phase!=='Build'||!isHuman(pi)||!b.repairAbility||E.isRuined(b)||p.workshopRepairUsed)return '';
    const damaged=p.village.filter(x=>x.damage>0),available=Object.entries(p.resources).filter(([,n])=>n>0);
    if(!damaged.length||!available.length)return '';
    const tid=`wrk-t-${b.uid}`,rid=`wrk-r-${b.uid}`;
    return `<div class="miniAction"><select id="${tid}">${damaged.map(x=>`<option value="${x.uid}">${esc(x.name)} (${x.damage} dmg)</option>`).join('')}</select><select id="${rid}">${available.map(([r])=>`<option value="${r}">${ICON[r]} ${RLABEL[r]}</option>`).join('')}</select><button onclick="UI.workshop(${b.uid},'${tid}','${rid}')">Repair</button></div>`;
  }

  function fieldZone(p,pi,top=false){
    return `<section class="boardLane fieldLane ${top?'enemyLane':''}">${laneTitle('🐾','Field',"Critters · survivor damage clears at their controller's Rest")}<div class="critterRow">${p.residents.length?p.residents.map(r=>critterCard(p,pi,r)).join(''):'<div class="emptyZone"><span>🍂</span>No Critters in the Field</div>'}</div></section>`;
  }

  function critterIcon(r){
    const t=(r.traits||[]).join(' ').toLowerCase();
    if(t.includes('bird')||t.includes('wren')||t.includes('jay')||t.includes('crow'))return '🐦';
    if(t.includes('mouse')||t.includes('vole'))return '🐭';if(t.includes('rabbit'))return '🐇';if(t.includes('badger'))return '🦡';if(t.includes('mole'))return '🐾';if(t.includes('beetle')||t.includes('ant'))return '🐜';if(t.includes('frog')||t.includes('toad'))return '🐸';return '🐾';
  }

  function critterCard(p,pi,r){
    const ready=E.residentReady(game,p,r),grit=E.residentGrit(game,p,r,r.blocking),fresh=r.recruitedTurn===game.turnNo&&pi===game.active;
    const attack=pi===game.active&&isHuman(pi)&&E.canAttack(game,pi,r)?attackAction(pi,r):'';
    return `<article class="gameCard critter ${!ready?'inactive':''} ${r.tired?'tired':''} ${r.attacking?'attacking':''} ${r.blocking?'blocking':''}"><div class="artWindow critterArt"><span>${critterIcon(r)}</span><small>${r.advanced?'ADVANCED · ':''}${(r.musterClasses||[]).join(' · ')}</small></div><div class="cardFrame"><div class="cardTop"><b>${esc(r.name)}</b>${r.shield?'<span class="shield">🛡</span>':''}</div><div class="badgeRow critterStats"><span>💪 ${r.might}</span><span>❤️ ${r.damage}/${grit}</span></div><div class="homeLine">🏡 ${esc(p.village.find(b=>b.uid===r.musterUid)?.name||'No home')}</div>${r.tool?`<div class="toolLine">🧰 ${esc(r.tool.name)}</div>`:''}${fresh?'<span class="freshTag">New · can block</span>':''}${attack}</div></article>`;
  }

  function attackAction(pi,r){
    const targets=E.legalAttackTargets(game,pi,r);if(!targets.length)return '';
    const sid=`atk-${r.uid}`;
    return `<div class="miniAction attackAction"><select id="${sid}">${targets.map(t=>`<option value="${t.kind==='hearthseed'?'hearthseed':t.uid}">${t.kind==='hearthseed'?'🔥 Hearthseed':esc(t.label)}</option>`).join('')}</select><button onclick="UI.attack(${r.uid},'${sid}')">Attack</button></div>`;
  }

  function handPanel(){
    const pi=humanIndex(),p=game.players[pi];
    if(game.mode==='ai'&&game.active===game.aiIndex)return `<section class="handDock"><div class="handHeader"><div><span class="eyebrow">YOUR HAND</span><b>${p.hand.length} cards</b></div><span class="locked">Opponent turn</span></div><div class="handRow">${p.hand.map(c=>handCard(p,pi,c,false)).join('')}</div></section>`;
    const owner=game.mode==='ai'?p:game.players[game.active],ownerPi=game.mode==='ai'?pi:game.active;
    return `<section class="handDock"><div class="handHeader"><div><span class="eyebrow">${game.mode==='ai'?'YOUR HAND':'ACTIVE HAND'}</span><b>${owner.hand.length} cards</b></div><div class="deckCounters"><span>🎴 ${owner.fieldDeck.length}</span><span>🍂 ${owner.compost.length}</span></div></div>${game.phase==='Discard'?`<div class="discardNotice">Rest: discard down to 7 · choose ${owner.hand.length-7} more.</div>`:''}<div class="handRow">${owner.hand.map(c=>handCard(owner,ownerPi,c,true)).join('')}</div></section>`;
  }

  function handArt(c){
    if(c.type==='Critter')return critterIcon(c);
    if(c.subtype==='Tool')return '🧰';if(c.subtype==='Reaction')return '⚡';if(c.subtype==='Supply')return '🎒';return '🍃';
  }

  function handCard(p,pi,c,interactive){
    let action='';
    if(interactive&&game.phase==='Discard'&&pi===game.active)action=`<button class="dangerBtn cardAction" onclick="UI.discard(${c.uid})">Discard</button>`;
    else if(interactive&&c.type==='Critter'&&game.phase==='Build'&&pi===game.active){
      const ms=E.legalMusters(game,pi,c);const sid=`rec-${c.uid}`;
      action=ms.length?`<div class="miniAction"><select id="${sid}">${ms.map(m=>`<option value="${m.uid}">${esc(m.name)} · ${E.housingUsed(p,m.uid)}/${m.housing}</option>`).join('')}</select><button onclick="UI.recruit(${c.uid},'${sid}')">Recruit</button></div>`:'<span class="whyDisabled">No legal Muster</span>';
    }else if(interactive&&c.subtype==='Tool'&&game.phase==='Build'&&pi===game.active){
      const rs=p.residents.filter(r=>!r.tool);const sid=`tool-${c.uid}`;
      action=rs.length?`<div class="miniAction"><select id="${sid}">${rs.map(r=>`<option value="${r.uid}">${esc(r.name)}</option>`).join('')}</select><button onclick="UI.tool(${c.uid},'${sid}')">Equip</button></div>`:'<span class="whyDisabled">No carrier</span>';
    }else if(interactive&&c.id==='burrow_stores'&&game.phase==='Build'&&pi===game.active){
      const spend=Object.entries(p.resources).filter(([,n])=>n>0),sid1=`supply-spend-${c.uid}`,sid2=`supply-gain-${c.uid}`;
      action=spend.length?`<div class="miniAction"><select id="${sid1}">${spend.map(([r])=>`<option value="${r}">${ICON[r]} ${RLABEL[r]}</option>`).join('')}</select><select id="${sid2}"><option value="root">🫚</option><option value="pebble">🪨</option></select><button onclick="UI.supply(${c.uid},'${sid1}','${sid2}')">Trade</button></div>`:'<span class="whyDisabled">No resource to exchange</span>';
    }
    const subtype=c.type==='Critter'?`Muster — ${(c.musterClasses||[]).join(' · ')}`:c.subtype;
    const stats=c.type==='Critter'?`<div class="badgeRow handStats"><span>💪 ${c.might}</span><span>❤️ ${c.grit}</span></div>`:`<div class="costLine">${costText(c.cost)}</div>`;
    return `<article class="gameCard handCard ${interactive?'':'lockedCard'}"><div class="artWindow handArt"><span>${handArt(c)}</span><small>${esc(subtype)}</small></div><div class="cardFrame"><div class="cardTop"><b>${esc(c.name)}</b>${c.advanced?'<span class="advancedTag">ADV</span>':''}</div>${stats}<p>${esc(c.text||'')}</p>${c.flags?.manual&&c.id!=='burrow_stores'?`<span class="manualTag">Manual: ${esc(c.flags.manual)}</span>`:''}${action}</div></article>`;
  }

  function blueprintPanel(){
    const pi=game.mode==='ai'?humanIndex():game.active,p=game.players[pi],f=faction(p),interactive=isHuman(pi)&&pi===game.active&&game.phase==='Build';
    return `<div class="drawerHeader"><div><span class="eyebrow">BUILD BOOK</span><h2>Blueprints <small>${12-p.usedBlueprints.length}/12</small></h2></div><button class="closeButton" onclick="UI.drawer(null)">×</button></div><p class="drawerLead">Your twelve known village plans. Build from here during Build.</p><div class="buildWallet"><span class="buildWalletLabel">YOUR RESOURCES</span>${resources(p)}</div><div class="blueprintGrid">${f.blueprints.map(bp=>{
      const used=p.usedBlueprints.includes(bp.id),why=interactive?E.buildReason(game,pi,bp):'Not your Build';
      return `<article class="blueprintCard ${used?'used':''}"><div class="blueprintIcon">${buildingIcon(bp)}</div><div><b>${esc(bp.name)}</b><small>${esc(bp.subtype)}</small></div><div class="blueprintStats"><span>${costText(bp.cost)}</span><span>🧱 ${bp.durability}</span><span>✨ ${bp.prosperity}</span>${bp.housing?`<span>🏠 ${bp.housing}</span>`:''}</div><p>${esc(bp.text||'')}</p><button ${used||why?'disabled':''} title="${esc(used?'Used':why)}" onclick="UI.build('${bp.id}')">${used?'Used':bp.upgradeFrom?'Upgrade':'Build'}</button></article>`;
    }).join('')}</div>`;
  }

  function rulesPanel(){
    return `<div class="drawerHeader"><div><span class="eyebrow">QUICK REFERENCE</span><h2>v0.6.2 rules</h2></div><button class="closeButton" onclick="UI.drawer(null)">×</button></div><div class="ruleCards"><div><b>✨ Prosperity</b><p>15+ wins only at the start of your Dawn.</p></div><div><b>📦 Provision</b><p>Each Provision cost may use a Provision or any one core resource.</p></div><div><b>🏠 Musters</b><p>Every Critter uses exactly 1 Housing. Advanced Critters need an upgraded matching Muster.</p></div><div><b>🧱 Damage</b><p>Building damage stays. Surviving Critter damage clears at Rest.</p></div><div><b>⚔ Combat</b><p>Declare the whole attack before blockers. Same-target unblocked damage combines.</p></div></div>`;
  }

  function hearthkeeperPanel(pi){
    const p=game.players[pi],f=faction(p),h=f.hearthkeeperCard;
    return `<div class="drawerHeader"><div><span class="eyebrow">HEARTHKEEPER REFERENCE</span><h2>${esc(h.name)}</h2></div><button class="closeButton" onclick="UI.drawer(null)">×</button></div><article class="hearthkeeperReferenceCard"><div class="hearthkeeperPortrait"><span>🔥</span><small>ART PLACEHOLDER</small></div><div><span class="eyebrow">${esc(h.subtitle)}</span><h3>${esc(h.name)}</h3><p class="hearthkeeperFlavor">${esc(h.text)}</p><div class="referenceOnly">${esc(h.reference)}</div><small>${esc(f.tradition)} Tradition · ${esc(f.short.split('·').pop().trim())}</small></div></article>`;
  }

  function logPanel(){
    return `<div class="drawerHeader"><div><span class="eyebrow">TABLE HISTORY</span><h2>Game log</h2></div><button class="closeButton" onclick="UI.drawer(null)">×</button></div><div class="log">${game.log.map(x=>`<div>${esc(x)}</div>`).join('')}</div>`;
  }

  function drawerPanel(){
    if(!drawer)return '';
    const keeperMatch=String(drawer).match(/^hearthkeeper:(\d)$/);
    const body=keeperMatch?hearthkeeperPanel(+keeperMatch[1]):drawer==='blueprints'?blueprintPanel():drawer==='rules'?rulesPanel():logPanel();
    return `<div class="drawerBackdrop" onclick="UI.drawer(null)"></div><aside class="gameDrawer">${body}</aside>`;
  }

  function combatPanel(){
    if(!game.combat.attacks.length&&game.phase!=='Block')return `<section class="combatRibbon quiet"><span>⚔</span><b>Frost Trial</b><small>Declare ready Critters when you want to attack.</small></section>`;
    const attacker=game.players[game.active],defIndex=1-game.active,defender=game.players[defIndex];
    const humanDefender=isHuman(defIndex),humanAttacker=isHuman(game.active),canResolve=game.phase==='Block'&&(humanAttacker||humanDefender);
    return `<section class="combatRibbon activeCombat"><div class="combatHeading"><span>⚔</span><div><b>${game.combat.committed?'Block & React':'Declare Attackers'}</b><small>${game.combat.committed?'Attack committed · respond before damage':'Choose all attackers before committing'}</small></div></div><div class="attackList">${game.combat.attacks.map((a,i)=>{
      const atk=attacker.residents.find(r=>r.uid===a.attackerUid),blk=defender.residents.find(r=>r.uid===a.blockerUid);
      const blockers=game.phase==='Block'&&humanDefender&&!blk?defender.residents.filter(r=>E.canBlock(game,defIndex,r,a)):[];
      return `<div class="attackEntry"><div><b>${esc(atk?.name||'Attacker')}</b><span>→ ${a.target.kind==='hearthseed'?'🔥 Hearthseed':esc(a.target.name)}</span>${a.zeroDamage?'<small>Rootsnared · deals 0</small>':''}${blk?`<small>Blocked by ${esc(blk.name)}</small>`:''}</div>${blockers.length?`<div class="miniAction"><select id="blk-${i}">${blockers.map(r=>`<option value="${r.uid}">${esc(r.name)}</option>`).join('')}</select><button onclick="UI.block(${i})">Block</button></div>`:''}</div>`;
    }).join('')}</div><div class="combatButtons">${!game.combat.committed&&humanAttacker?'<button onclick="UI.commitAttacks()">Commit attackers</button>':''}${canResolve?'<button class="primaryBtn" onclick="UI.resolveCombat()">Resolve combat</button>':''}</div>${game.phase==='Block'?reactionTray(humanIndex()):''}</section>`;
  }

  function reactionTray(pi){
    if(!game||game.phase!=='Block'||!isHuman(pi))return '';
    const p=game.players[pi],cards=p.hand.filter(c=>c.subtype==='Reaction');if(!cards.length)return '';
    return `<div class="reactionTray"><div class="reactionTitle">⚡ Reaction window <small>At most one Reaction per round; active Reaction Access required.</small></div>${cards.map(c=>reactionCard(p,pi,c)).join('')}</div>`;
  }

  function reactionCard(p,pi,c){
    let opts=[];
    if(c.id==='rootsnare'&&pi!==game.active)opts=game.combat.attacks.map((a,i)=>({v:String(i),l:`${game.players[game.active].residents.find(r=>r.uid===a.attackerUid)?.name||'Attacker'} → deals 0`}));
    if(c.id==='hide_in_ferns'&&pi===game.active)opts=game.combat.attacks.map((a,i)=>a.blockerUid?({v:String(i),l:`Slip ${game.players[game.active].residents.find(r=>r.uid===a.attackerUid)?.name||'attacker'} past blocker`}):null).filter(Boolean);
    if(c.id==='sap_bandage')opts=[...p.residents.map(r=>({v:`resident:${r.uid}`,l:r.name})),...E.activeBuildings(p).map(b=>({v:`building:${b.uid}`,l:b.name}))];
    if(c.id==='brace_the_burrow')opts=[{v:'hearthseed',l:'Hearthseed'},...E.activeBuildings(p).map(b=>({v:`building:${b.uid}`,l:b.name}))];
    const sid=`rx-${c.uid}`;
    return `<div class="reactionCard"><div><b>${esc(c.name)}</b><small>${costText(c.cost)} · ${esc(c.text)}</small></div>${opts.length?`<div class="miniAction"><select id="${sid}">${opts.map(o=>`<option value="${o.v}">${esc(o.l)}</option>`).join('')}</select><button onclick="UI.reaction(${pi},${c.uid},'${sid}')">Play</button></div>`:'<span class="whyDisabled">No legal target</span>'}</div>`;
  }

  function controls(){
    if(game.winner)return '';
    const human=game.mode==='ai'?humanIndex():game.active;
    if(game.mode==='ai'&&game.active===game.aiIndex)return '<span class="aiThinking">🍂 Opponent thinking…</span>';
    if(game.phase==='Harvest')return '<span class="phaseHelp">Choose Harvest</span>';
    if(game.phase==='Block'&&game.active!==human)return '<span class="phaseHelp">Block / react, then resolve</span>';
    return `<button class="endTurnButton" onclick="UI.endTurn()" ${game.phase==='Block'&&!game.combat.resolved?'disabled':''}>End Turn</button>`;
  }

  function utilityButtons(){return `<div class="utilityButtons"><button onclick="UI.drawer('blueprints')">📖 <span>Blueprints</span></button><button onclick="UI.drawer('log')">🍂 <span>Log</span></button><button onclick="UI.drawer('rules')">❄ <span>Rules</span></button></div>`;}

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
    const enemy=game.players[top],home=game.players[bottom];
    app.innerHTML=`<div class="client"><header class="tableTopbar"><div class="brandBlock"><div class="brand">Hearth & Hollow</div><span>Client v0.7.7 · Rules v0.6.2</span></div>${phaseStrip()}<div class="turnBlock"><small>Round ${E.currentRound(game)} · Turn ${game.turnNo}</small><b>${esc(game.players[game.active].name)} · ${game.phase}</b></div><div class="topControls">${utilityButtons()}${controls()}<button class="resetButton" onclick="UI.reset()">↺</button></div></header>${toast?`<div class="toast">${esc(toast)}</div>`:''}<main class="tableSurface">${playerBanner(enemy,top,true)}${villageZone(enemy,top,true)}${fieldZone(enemy,top,true)}<div class="trialDivider"><i></i><span>❄ FROST TRIAL ❄</span><i></i></div>${combatPanel()}${fieldZone(home,bottom,false)}${villageZone(home,bottom,false)}${playerBanner(home,bottom,false)}</main>${handPanel()}${drawerPanel()}${harvestOverlay()}${winnerOverlay()}</div>`;
  }

  window.UI={
    newMatch,reset:()=>{clearTimeout(aiTimer);game=null;toast='';drawer=null;render();},
    drawer:name=>{drawer=name;render();},
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

/* ===== coordinated render notifications ===== */
(() => {
  const app=document.getElementById('app');
  if(!app)return;

  const NativeMutationObserver=window.MutationObserver;
  const appObservers=new Set();

  class CoordinatedMutationObserver {
    constructor(callback){
      this.callback=callback;
      this.native=null;
      this.appObserved=false;
    }
    observe(target,options){
      if(target===app){
        this.appObserved=true;
        appObservers.add(this.callback);
        return;
      }
      this.native=new NativeMutationObserver(this.callback);
      this.native.observe(target,options);
    }
    disconnect(){
      if(this.appObserved){appObservers.delete(this.callback);this.appObserved=false;}
      this.native?.disconnect();
    }
    takeRecords(){return this.native?.takeRecords?.()||[];}
  }

  // Enhancement scripts used to each watch the entire app subtree. Several of
  // them also mutated that same subtree, which could repeatedly wake every
  // other observer. Route app-render notifications through one coordinator
  // instead. Non-app observers still use the browser's native implementation.
  window.MutationObserver=CoordinatedMutationObserver;

  const descriptor=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');
  let flushQueued=false;

  function syncVersion(){
    const el=document.querySelector('.brandBlock > span');
    if(el&&el.textContent!=='Client v0.7.7 · Rules v0.6.2')el.textContent='Client v0.7.7 · Rules v0.6.2';
  }

  function flushAppObservers(){
    flushQueued=false;
    for(const callback of [...appObservers]){
      try{callback([],null);}catch(error){console.error('H&H UI observer error',error);}
    }
    // Existing enhancement callbacks use requestAnimationFrame/setTimeout.
    // Set the presentation version after those one-shot syncs settle.
    requestAnimationFrame(()=>setTimeout(syncVersion,0));
  }

  function queueFlush(){
    if(flushQueued)return;
    flushQueued=true;
    queueMicrotask(flushAppObservers);
  }

  if(descriptor?.get&&descriptor?.set){
    Object.defineProperty(app,'innerHTML',{
      configurable:true,
      enumerable:false,
      get(){return descriptor.get.call(this);},
      set(value){descriptor.set.call(this,value);queueFlush();}
    });
  }else{
    // Extremely old-browser fallback: one native observer, still avoiding the
    // many competing subtree observers that caused the original churn.
    const fallback=new NativeMutationObserver(queueFlush);
    fallback.observe(app,{childList:true,subtree:false});
  }

  window.HNH_UI_COORDINATOR={flush:queueFlush,version:'0.7.7'};
  syncVersion();
})();


/* ===== tabletop interaction layer ===== */
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
    <span class="deckStack fieldStack"></span>
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
    if (brandVersion) brandVersion.textContent = 'Client v0.7.7 · Rules v0.6.2';
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


/* ===== tabletop deck polish ===== */
(() => {
  const fieldRail=document.querySelector('.fieldDeckRail');
  const blueprintRail=document.querySelector('.blueprintDeckRail');
  if(!fieldRail||!blueprintRail)return;

  const STORAGE_PREFIX='hnh.deckRail.v2.';
  const DRAG_THRESHOLD=6;
  const EDGE_PAD=8;
  let tutorialDone=false;
  let wasInGame=false;
  let syncTimer=null;
  let activeDrag=null;
  const suppressClickUntil=new WeakMap();

  [fieldRail,blueprintRail].forEach(rail=>{
    rail.draggable=false;
    rail.setAttribute('aria-describedby','deck-drag-help');
    if(!rail.querySelector('.deckDragHandle')){
      const hint=document.createElement('span');
      hint.className='deckDragHandle';
      hint.textContent='↕ drag';
      rail.appendChild(hint);
    }
  });

  const blueprintSmall=blueprintRail.querySelector('.sideDeckLabel small');
  if(blueprintSmall)blueprintSmall.textContent='plans remaining';
  const buildCallout=blueprintRail.querySelector('.buildBookCallout');
  if(buildCallout)buildCallout.textContent='CLICK TO OPEN';

  const dragHelp=document.createElement('span');
  dragHelp.id='deck-drag-help';
  dragHelp.className='srOnlyDeckHelp';
  dragHelp.textContent='Drag this deck pile to move it. Right-click or double-click to reset its position.';
  document.body.appendChild(dragHelp);

  const coach=document.createElement('div');
  coach.className='blueprintCoach';
  coach.innerHTML='<strong>Start here ✨</strong><span>Open your Blueprint Deck to build your village.</span>';
  document.body.appendChild(coach);

  function phase(){return document.querySelector('.phasePip.on')?.textContent?.trim()||'';}
  function inGame(){return Boolean(document.querySelector('.client'));}
  function playerCanAct(){return !document.querySelector('.aiThinking');}
  function keyFor(rail){return `${STORAGE_PREFIX}${rail===fieldRail?'field':'blueprint'}`;}

  function readStored(rail){
    try{
      const raw=localStorage.getItem(keyFor(rail));
      if(!raw)return null;
      const pos=JSON.parse(raw);
      if(!Number.isFinite(pos?.x)||!Number.isFinite(pos?.y))return null;
      return pos;
    }catch{return null;}
  }

  function saveStored(rail,x,y){
    try{localStorage.setItem(keyFor(rail),JSON.stringify({x:Math.round(x),y:Math.round(y)}));}catch{}
  }

  function clearStored(rail){
    try{localStorage.removeItem(keyFor(rail));}catch{}
  }

  function clampPoint(rail,x,y){
    const r=rail.getBoundingClientRect();
    const width=r.width||150,height=r.height||236;
    return {
      x:Math.max(EDGE_PAD,Math.min(Math.max(EDGE_PAD,window.innerWidth-width-EDGE_PAD),x)),
      y:Math.max(EDGE_PAD,Math.min(Math.max(EDGE_PAD,window.innerHeight-height-EDGE_PAD),y))
    };
  }

  function setUserPosition(rail,x,y,{save=false}={}){
    const p=clampPoint(rail,x,y);
    rail.classList.add('deckRailUserPositioned');
    rail.style.left=`${Math.round(p.x)}px`;
    rail.style.top=`${Math.round(p.y)}px`;
    rail.style.right='auto';
    rail.style.bottom='auto';
    if(save)saveStored(rail,p.x,p.y);
    if(rail===blueprintRail)positionCoach();
  }

  function restoreStoredPosition(rail){
    const stored=readStored(rail);
    if(!stored)return false;
    setUserPosition(rail,stored.x,stored.y);
    return true;
  }

  function resetRail(rail){
    clearStored(rail);
    rail.classList.remove('deckRailUserPositioned','deckRailDragging','deckRailPressed');
    rail.style.left='';
    rail.style.top='';
    rail.style.right='';
    rail.style.bottom='';
    positionRails();
    if(rail===blueprintRail)positionCoach();
  }

  function positionRails(){
    if(!inGame())return;
    const table=document.querySelector('.tableSurface');
    if(!table)return;
    const rect=table.getBoundingClientRect();
    const gap=16;

    if(!fieldRail.classList.contains('deckRailUserPositioned')){
      const fw=fieldRail.getBoundingClientRect().width||150;
      fieldRail.style.left=`${Math.round(Math.max(EDGE_PAD,rect.left-fw-gap))}px`;
      fieldRail.style.right='auto';
    }

    if(!blueprintRail.classList.contains('deckRailUserPositioned')){
      const bw=blueprintRail.getBoundingClientRect().width||150;
      blueprintRail.style.left=`${Math.round(Math.min(window.innerWidth-bw-EDGE_PAD,rect.right+gap))}px`;
      blueprintRail.style.right='auto';
    }
  }

  function clampUserRails(){
    [fieldRail,blueprintRail].forEach(rail=>{
      if(!rail.classList.contains('deckRailUserPositioned'))return;
      const r=rail.getBoundingClientRect();
      setUserPosition(rail,r.left,r.top,{save:true});
    });
  }

  function positionCoach(){
    if(!coach.classList.contains('show'))return;
    const r=blueprintRail.getBoundingClientRect();
    const cr=coach.getBoundingClientRect();
    const w=cr.width||230,h=cr.height||62;
    let left=r.left+r.width/2-w/2;
    left=Math.max(EDGE_PAD,Math.min(window.innerWidth-w-EDGE_PAD,left));
    let top=r.top-h-15;
    if(top<EDGE_PAD)top=Math.min(window.innerHeight-h-EDGE_PAD,r.bottom+15);
    coach.style.left=`${Math.round(left)}px`;
    coach.style.top=`${Math.round(top)}px`;
  }

  function syncTutorial(){
    const playing=inGame();
    if(playing&&!wasInGame)tutorialDone=false;
    if(!playing)tutorialDone=false;
    if(document.querySelector('.blueprintGrid'))tutorialDone=true;
    const show=playing&&!tutorialDone&&phase()==='Build'&&playerCanAct();
    blueprintRail.classList.toggle('newPlayerGuide',show);
    coach.classList.toggle('show',show);
    if(show)positionCoach();
    wasInGame=playing;
  }

  function beginDrag(event,rail){
    if(event.button!==0||!inGame())return;
    const r=rail.getBoundingClientRect();
    activeDrag={
      rail,
      pointerId:event.pointerId,
      startX:event.clientX,
      startY:event.clientY,
      offsetX:event.clientX-r.left,
      offsetY:event.clientY-r.top,
      dragging:false
    };
    rail.classList.add('deckRailPressed');
    try{rail.setPointerCapture(event.pointerId);}catch{}
    event.preventDefault();
  }

  function moveDrag(event){
    const d=activeDrag;
    if(!d||event.pointerId!==d.pointerId)return;
    const distance=Math.hypot(event.clientX-d.startX,event.clientY-d.startY);
    if(!d.dragging&&distance<DRAG_THRESHOLD)return;

    if(!d.dragging){
      d.dragging=true;
      const r=d.rail.getBoundingClientRect();
      d.rail.classList.add('deckRailUserPositioned','deckRailDragging');
      d.rail.classList.remove('deckRailPressed');
      d.rail.style.left=`${Math.round(r.left)}px`;
      d.rail.style.top=`${Math.round(r.top)}px`;
      d.rail.style.right='auto';
      d.rail.style.bottom='auto';
      document.body.classList.add('deckRailDragActive');
    }

    event.preventDefault();
    setUserPosition(d.rail,event.clientX-d.offsetX,event.clientY-d.offsetY);
  }

  function endDrag(event){
    const d=activeDrag;
    if(!d)return;
    if(event&&event.pointerId!==undefined&&event.pointerId!==d.pointerId)return;

    if(d.dragging){
      const r=d.rail.getBoundingClientRect();
      setUserPosition(d.rail,r.left,r.top,{save:true});
      suppressClickUntil.set(d.rail,Date.now()+450);
    }

    d.rail.classList.remove('deckRailDragging','deckRailPressed');
    try{d.rail.releasePointerCapture(d.pointerId);}catch{}
    document.body.classList.remove('deckRailDragActive');
    activeDrag=null;
  }

  function installDrag(rail){
    rail.title='Drag to move · right-click or double-click to reset';
    rail.addEventListener('pointerdown',event=>beginDrag(event,rail));

    rail.addEventListener('click',event=>{
      if(Date.now()<(suppressClickUntil.get(rail)||0)){
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },true);

    const resetEvent=event=>{
      event.preventDefault();
      event.stopImmediatePropagation();
      suppressClickUntil.set(rail,Date.now()+450);
      resetRail(rail);
    };
    rail.addEventListener('dblclick',resetEvent,true);
    rail.addEventListener('contextmenu',resetEvent,true);
  }

  document.addEventListener('pointermove',moveDrag,{capture:true,passive:false});
  document.addEventListener('pointerup',endDrag,true);
  document.addEventListener('pointercancel',endDrag,true);
  window.addEventListener('blur',()=>endDrag());

  function sync(){
    positionRails();
    syncTutorial();
    const brandVersion=document.querySelector('.brandBlock > span');
    if(brandVersion)brandVersion.textContent='Client v0.7.7 · Rules v0.6.2';
  }

  installDrag(fieldRail);
  installDrag(blueprintRail);
  restoreStoredPosition(fieldRail);
  restoreStoredPosition(blueprintRail);

  blueprintRail.addEventListener('click',()=>{
    if(Date.now()<(suppressClickUntil.get(blueprintRail)||0))return;
    tutorialDone=true;
    blueprintRail.classList.remove('newPlayerGuide');
    coach.classList.remove('show');
  },true);

  document.addEventListener('click',event=>{
    const btn=event.target.closest('.utilityButtons button');
    if(btn&&btn.textContent.includes('Blueprints')){
      tutorialDone=true;
      blueprintRail.classList.remove('newPlayerGuide');
      coach.classList.remove('show');
    }
  },true);

  const observer=new MutationObserver(()=>{
    clearTimeout(syncTimer);
    syncTimer=setTimeout(sync,0);
  });
  observer.observe(document.getElementById('app'),{childList:true,subtree:true});

  window.addEventListener('resize',()=>requestAnimationFrame(()=>{
    clampUserRails();
    positionRails();
    positionCoach();
  }));
  window.addEventListener('scroll',()=>requestAnimationFrame(()=>{positionRails();positionCoach();}),{passive:true});

  sync();
})();


/* ===== community links ===== */
(() => {
  const LINKS = [
    {site:'reddit', label:'Reddit', handle:'r/HearthAndHollow', url:'https://www.reddit.com/r/HearthAndHollow/'},
    {site:'bluesky', label:'Bluesky', handle:'@hearth-n-hollow.bsky.social', url:'https://bsky.app/profile/hearth-n-hollow.bsky.social'},
    {site:'itch', label:'itch.io', handle:'hearth-and-hollow.itch.io', url:'https://hearth-and-hollow.itch.io/hearth-hollow'}
  ];

  function anchor(link, compact=false){
    const a=document.createElement('a');
    a.href=link.url;
    a.target='_blank';
    a.rel='noopener noreferrer';
    a.dataset.site=link.site;
    a.setAttribute('aria-label',`${link.label}: ${link.handle}`);
    if(compact){
      a.textContent=link.label;
      a.title=`${link.label} · ${link.handle}`;
    }else{
      const b=document.createElement('b');b.textContent=link.label;
      const span=document.createElement('span');span.textContent=link.handle;
      a.append(b,span);
    }
    return a;
  }

  function ensureSetupLinks(){
    const card=document.querySelector('.setupCard');
    if(!card)return;
    if(card.querySelector('.communitySetup'))return;
    const wrap=document.createElement('div');
    wrap.className='communitySetup';
    const title=document.createElement('small');
    title.textContent='Follow Hearth & Hollow';
    const row=document.createElement('div');
    row.className='communitySetupLinks';
    LINKS.forEach(link=>row.appendChild(anchor(link,false)));
    wrap.append(title,row);
    card.appendChild(wrap);
  }

  function ensureGameLinks(){
    const utilities=document.querySelector('.utilityButtons');
    if(!utilities)return;
    const topbar=utilities.closest('.tableTopbar')||utilities.parentElement;
    if(topbar?.querySelector('.communityMini'))return;
    const mini=document.createElement('div');
    mini.className='communityMini';
    mini.setAttribute('aria-label','Hearth & Hollow community links');
    LINKS.forEach(link=>mini.appendChild(anchor(link,true)));
    utilities.prepend(mini);
  }

  function sync(){
    ensureSetupLinks();
    ensureGameLinks();
    const brandVersion=document.querySelector('.brandBlock > span');
    if(brandVersion)brandVersion.textContent='Client v0.7.7 · Rules v0.6.2';
  }

  const app=document.getElementById('app');
  if(app){
    const observer=new MutationObserver(()=>requestAnimationFrame(sync));
    observer.observe(app,{childList:true,subtree:true});
  }
  sync();
})();


/* ===== ability choice UI ===== */
(() => {
  const E=window.HNH_ENGINE;
  const app=document.getElementById('app');
  if(!E||!app)return;
  let overlay=null;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const icon=c=>c?.type==='Critter'?'🐾':c?.subtype==='Tool'?'🧰':c?.subtype==='Reaction'?'⚡':c?.subtype==='Supply'?'🎒':'🏡';

  function game(){return window.HNH_CURRENT_GAME||null;}
  function cardHTML(card){
    if(!card)return '';
    const type=card.type==='Critter'?`Muster — ${(card.musterClasses||[]).join(' · ')}`:(card.subtype||card.type||'Card');
    const stats=card.type==='Critter'?`<div class="abilityCardStats"><span>💪 ${card.might??'-'}</span><span>❤️ ${card.grit??'-'}</span>${card.advanced?'<span>ADVANCED</span>':''}</div>`:'';
    return `<div class="abilityCardArt">${icon(card)}</div><div class="abilityCardBody"><b>${esc(card.name)}</b><small>${esc(type)}</small>${stats}<p>${esc(card.text||'')}</p></div>`;
  }

  function choose(id,selection){
    const g=game(),choice=g&&E.pendingAbilityChoice?.(g);if(!g||!choice)return;
    const result=E.resolveAbilityChoice(g,choice.playerIndex,id,String(selection));
    if(result?.ok===false){console.warn(result.reason);return;}
    if(window.UI?.drawer)window.UI.drawer(null);
    else sync();
  }

  function syncVersion(){
    const el=document.querySelector('.brandBlock > span');
    if(el)el.textContent='Client v0.7.7 · Rules v0.6.2';
  }

  function sync(){
    syncVersion();
    const g=game(),choice=g&&E.pendingAbilityChoice?.(g);
    const humanChoice=choice&&!(g.mode==='ai'&&choice.playerIndex===g.aiIndex)?choice:null;
    if(!humanChoice){
      if(overlay){overlay.remove();overlay=null;document.body.classList.remove('abilityChoiceOpen');}
      return;
    }
    if(overlay?.dataset.choiceId===humanChoice.id)return;
    overlay?.remove();
    overlay=document.createElement('div');overlay.className='abilityChoiceBack';overlay.dataset.choiceId=humanChoice.id;
    const options=humanChoice.options.map(o=>{
      if(o.id==='skip')return `<button class="abilityOption abilityOptionSkip" data-choice="${esc(o.id)}">${esc(o.label)}</button>`;
      if(o.card)return `<button class="abilityOption abilityOptionCard" data-choice="${esc(o.id)}">${cardHTML(o.card)}</button>`;
      return `<button class="abilityOption" data-choice="${esc(o.id)}"><b>${esc(o.label)}</b></button>`;
    }).join('');
    overlay.innerHTML=`<section class="abilityChoicePanel" role="dialog" aria-modal="true" aria-labelledby="ability-choice-title"><span class="abilityChoiceEyebrow">CARD ABILITY · CHOOSE</span><h2 id="ability-choice-title">${esc(humanChoice.title)}</h2><p>${esc(humanChoice.prompt)}</p><div class="abilityOptions">${options}</div><div class="abilityChoiceHint">The game is paused until this printed choice is resolved.</div></section>`;
    overlay.addEventListener('click',e=>{
      const btn=e.target.closest('[data-choice]');if(btn)choose(humanChoice.id,btn.dataset.choice);
    });
    document.body.appendChild(overlay);document.body.classList.add('abilityChoiceOpen');
  }

  document.addEventListener('keydown',e=>{
    if(e.key!=='Escape'||!overlay)return;
    const g=game(),choice=g&&E.pendingAbilityChoice?.(g),skip=choice?.options?.find(o=>o.id==='skip');
    if(skip){e.preventDefault();choose(choice.id,'skip');}
  },true);

  const observer=new MutationObserver(()=>requestAnimationFrame(sync));
  observer.observe(app,{childList:true,subtree:true});
  window.HNH_ABILITY_UI={sync,choose};
  sync();
})();


/* ===== Hearthstep tabletop fidget ===== */
(() => {
  const app=document.getElementById('app');
  if(!app)return;

  const trail=document.createElement('div');
  trail.className='hearthstepTrail';
  trail.setAttribute('aria-label','Hearthstep fidget. No gameplay effect.');
  trail.innerHTML=`
    <div class="hearthstepTitle"><b>Hearthstep</b><small>fidget · no game effect</small></div>
    <div class="hearthstepCourse" role="group" aria-label="Hearthstep trail">
      <button class="hearthstepStep" type="button" aria-label="Hop to stump">🪵</button>
      <button class="hearthstepStep" type="button" aria-label="Hop to stone">🪨</button>
      <button class="hearthstepStep" type="button" aria-label="Hop to mushroom">🍄</button>
      <button class="hearthstepStep" type="button" aria-label="Hop to moss">🌿</button>
      <span class="hearthstepAcorn" role="button" tabindex="0" aria-label="Little acorn. Drag it or use arrow keys.">🌰</span>
    </div>`;
  document.body.appendChild(trail);

  const course=trail.querySelector('.hearthstepCourse');
  const acorn=trail.querySelector('.hearthstepAcorn');
  const steps=[...trail.querySelectorAll('.hearthstepStep')];
  let position=0;
  let dragging=false;

  function stepCenter(index){
    const step=steps[index],cr=course.getBoundingClientRect(),sr=step.getBoundingClientRect();
    return {x:sr.left-cr.left+sr.width/2,y:sr.top-cr.top+sr.height/2};
  }

  function place(index,{hop=true}={}){
    position=Math.max(0,Math.min(steps.length-1,index));
    const {x,y}=stepCenter(position);
    acorn.style.left=`${x}px`;
    acorn.style.top=`${y}px`;
    steps.forEach((step,i)=>step.classList.toggle('landed',i===position));
    if(hop){
      acorn.classList.remove('hop');
      void acorn.offsetWidth;
      acorn.classList.add('hop');
      steps[position].classList.remove('tap');
      void steps[position].offsetWidth;
      steps[position].classList.add('tap');
    }
  }

  steps.forEach((step,index)=>step.addEventListener('click',()=>place(index)));

  acorn.addEventListener('pointerdown',event=>{
    dragging=true;
    acorn.classList.add('dragging');
    event.preventDefault();
  });

  document.addEventListener('pointermove',event=>{
    if(!dragging)return;
    const r=course.getBoundingClientRect();
    const x=Math.max(12,Math.min(r.width-12,event.clientX-r.left));
    const y=Math.max(10,Math.min(r.height-10,event.clientY-r.top));
    acorn.style.left=`${x}px`;
    acorn.style.top=`${y}px`;
  });

  function finishDrag(event){
    if(!dragging)return;
    dragging=false;
    acorn.classList.remove('dragging');
    const r=course.getBoundingClientRect();
    const x=event.clientX-r.left;
    let best=0,bestDist=Infinity;
    steps.forEach((_,i)=>{
      const d=Math.abs(stepCenter(i).x-x);
      if(d<bestDist){bestDist=d;best=i;}
    });
    place(best);
  }
  document.addEventListener('pointerup',finishDrag);
  document.addEventListener('pointercancel',finishDrag);

  acorn.addEventListener('keydown',event=>{
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
      event.preventDefault();
      place(position+(event.key==='ArrowRight'?1:-1));
    }else if(event.key==='Enter'||event.key===' '){
      event.preventDefault();
      place(position);
    }
  });

  function sync(){
    const inGame=Boolean(document.querySelector('.client'));
    trail.classList.toggle('visible',inGame);
    if(inGame)requestAnimationFrame(()=>place(position,{hop:false}));
  }
  window.addEventListener('resize',()=>{if(trail.classList.contains('visible'))place(position,{hop:false});});
  new MutationObserver(sync).observe(app,{childList:true,subtree:true});
  sync();
})();
