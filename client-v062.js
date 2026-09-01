(() => {
  const E=window.HNH_ENGINE,{decks}=window.HNH_DATA;
  const app=document.getElementById('app');
  const ICON={acorn:'🥜',sap:'💦',root:'🫚',pebble:'🪨',provision:'📦'};
  const RLABEL={acorn:'Acorn',sap:'Sap',root:'Root',pebble:'Pebble',provision:'Provision'};
  let game=null,toast='',aiTimer=null,drawer=null;

  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m]));
  const costText=cost=>!cost||!Object.keys(cost).length?'Free':Object.entries(cost).map(([r,n])=>`${n>1?n:''}${ICON[r]||r}`).join(' + ');
  const isHuman=pi=>!game||game.mode!=='ai'||pi!==game.aiIndex;
  const humanIndex=()=>game?.mode==='ai'?1-game.aiIndex:game?.active??0;
  const faction=p=>decks[p.factionKey];
  const setToast=msg=>{toast=msg;clearTimeout(setToast.t);setToast.t=setTimeout(()=>{toast='';render();},2400);};

  function newMatch(mode,key='AS'){
    clearTimeout(aiTimer);drawer=null;
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
    return `<main class="setupShell"><section class="setupCard"><div class="setupSeal">🔥</div><div class="eyebrow">DIGITAL TABLETOP · RULES v0.6.2</div><h1>Hearth & Hollow</h1><p class="lead">Build a tiny woodland village, gather your Critters, and keep the last warm Hearthseed glowing through winter.</p><div class="factionGrid"><button class="factionChoice porch" onclick="UI.newMatch('ai','AS')"><span class="bigIcon">🥜💦</span><span><b>Porchlight</b><small>Hazel Underleaf · Acorn / Sap</small></span></button><button class="factionChoice stone" onclick="UI.newMatch('ai','RP')"><span class="bigIcon">🫚🪨</span><span><b>Stonecap</b><small>Mosswick Grubroot · Root / Pebble</small></span></button></div><button class="textButton" onclick="UI.newMatch('hotseat','AS')">Hot-seat two player</button><div class="ruleCallout"><b>Prosperity:</b> reaching 15 is not immediate victory. Hold 15+ active Prosperity until the start of your Dawn.</div></section></main>`;
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
    return `<section class="playerBanner ${top?'opponentBanner':'homeBanner'} ${active?'turnActive':''}"><div class="identity"><span class="sideLabel">${top?'OPPONENT':'YOU'}${active?' · ACTIVE':''}</span><b>${esc(p.name)}</b><small>${esc(faction(p).short)} · ${esc(faction(p).hearthkeeper)}</small></div><div class="bannerResources">${resources(p)}</div><div class="bannerStats"><div class="hearthMedallion"><span>🔥</span><b>${p.hearthseed}</b><small>HP</small>${exposed}</div>${prosperityBadge(p)}${pending}</div></section>`;
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
    return `<div class="drawerHeader"><div><span class="eyebrow">BUILD BOOK</span><h2>Blueprints <small>${12-p.usedBlueprints.length}/12</small></h2></div><button class="closeButton" onclick="UI.drawer(null)">×</button></div><p class="drawerLead">Your twelve known village plans. Build from here during Build.</p><div class="blueprintGrid">${f.blueprints.map(bp=>{
      const used=p.usedBlueprints.includes(bp.id),why=interactive?E.buildReason(game,pi,bp):'Not your Build';
      return `<article class="blueprintCard ${used?'used':''}"><div class="blueprintIcon">${buildingIcon(bp)}</div><div><b>${esc(bp.name)}</b><small>${esc(bp.subtype)}</small></div><div class="blueprintStats"><span>${costText(bp.cost)}</span><span>🧱 ${bp.durability}</span><span>✨ ${bp.prosperity}</span>${bp.housing?`<span>🏠 ${bp.housing}</span>`:''}</div><p>${esc(bp.text||'')}</p><button ${used||why?'disabled':''} title="${esc(used?'Used':why)}" onclick="UI.build('${bp.id}')">${used?'Used':bp.upgradeFrom?'Upgrade':'Build'}</button></article>`;
    }).join('')}</div>`;
  }

  function rulesPanel(){
    return `<div class="drawerHeader"><div><span class="eyebrow">QUICK REFERENCE</span><h2>v0.6.2 rules</h2></div><button class="closeButton" onclick="UI.drawer(null)">×</button></div><div class="ruleCards"><div><b>✨ Prosperity</b><p>15+ wins only at the start of your Dawn.</p></div><div><b>📦 Provision</b><p>Each Provision cost may use a Provision or any one core resource.</p></div><div><b>🏠 Musters</b><p>Every Critter uses exactly 1 Housing. Advanced Critters need an upgraded matching Muster.</p></div><div><b>🧱 Damage</b><p>Building damage stays. Surviving Critter damage clears at Rest.</p></div><div><b>⚔ Combat</b><p>Declare the whole attack before blockers. Same-target unblocked damage combines.</p></div></div>`;
  }

  function logPanel(){
    return `<div class="drawerHeader"><div><span class="eyebrow">TABLE HISTORY</span><h2>Game log</h2></div><button class="closeButton" onclick="UI.drawer(null)">×</button></div><div class="log">${game.log.map(x=>`<div>${esc(x)}</div>`).join('')}</div>`;
  }

  function drawerPanel(){
    if(!drawer)return '';
    const body=drawer==='blueprints'?blueprintPanel():drawer==='rules'?rulesPanel():logPanel();
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
    app.innerHTML=`<div class="client"><header class="tableTopbar"><div class="brandBlock"><div class="brand">Hearth & Hollow</div><span>Client v0.6.1 · Rules v0.6.2</span></div>${phaseStrip()}<div class="turnBlock"><small>Round ${E.currentRound(game)} · Turn ${game.turnNo}</small><b>${esc(game.players[game.active].name)} · ${game.phase}</b></div><div class="topControls">${utilityButtons()}${controls()}<button class="resetButton" onclick="UI.reset()">↺</button></div></header>${toast?`<div class="toast">${esc(toast)}</div>`:''}<main class="tableSurface">${playerBanner(enemy,top,true)}${villageZone(enemy,top,true)}${fieldZone(enemy,top,true)}<div class="trialDivider"><i></i><span>❄ FROST TRIAL ❄</span><i></i></div>${combatPanel()}${fieldZone(home,bottom,false)}${villageZone(home,bottom,false)}${playerBanner(home,bottom,false)}</main>${handPanel()}${drawerPanel()}${harvestOverlay()}${winnerOverlay()}</div>`;
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