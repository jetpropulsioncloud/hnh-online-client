from pathlib import Path
import re


def replace_func(text, name, next_name, new_body):
    pattern = rf"  function {re.escape(name)}\(.*?\n  \}}\n\n  function {re.escape(next_name)}"
    repl = new_body + f"\n\n  function {next_name}"
    out, n = re.subn(pattern, repl, text, count=1, flags=re.S)
    if n != 1:
        raise SystemExit(f'failed replacing {name}')
    return out

client_path = Path('client.js')
client = client_path.read_text()

player_banner = r'''  function playerBanner(p,pi,top=false){
    const active=pi===game.active,pros=E.prosperity(p);
    const exposed=p.exposed?'<span class="statusDanger">EXPOSED</span>':p.exposurePendingOwnTurn!==null?'<span class="statusWarn">Response turn</span>':'';
    const pending=pros>=15&&!game.winner?`<span class="dawnHold">✨ ${pros} — hold until Dawn</span>`:'';
    return `<section class="playerBanner ${top?'opponentBanner':'homeBanner'} ${active?'turnActive':''}"><div class="identity"><span class="sideLabel">${top?'OPPONENT':'YOU'}${active?' · ACTIVE':''}</span><b>${esc(faction(p).hearthkeeper)}</b><button class="keeperChip" onclick="UI.drawer('hearthkeeper:${pi}')">🔥 View Hearthkeeper card</button><small>${esc(faction(p).short)}</small></div><div class="bannerResources">${resources(p)}</div><div class="bannerStats"><div class="hearthMedallion" data-hearthseed-player="${pi}"><span>🔥</span><b>${p.hearthseed}</b><small>HP</small>${exposed}</div>${prosperityBadge(p)}${pending}</div></section>`;
  }'''
client = replace_func(client, 'playerBanner', 'laneTitle', player_banner)

building_card = r'''  function buildingCard(p,pi,b){
    const ruined=E.isRuined(b),used=b.muster?E.housingUsed(p,b.uid):0;
    return `<article class="gameCard building ${ruined?'ruined':''}" data-building-uid="${b.uid}" data-player-index="${pi}" ${b.muster?`data-muster-uid="${b.uid}"`:''} data-attack-building="${b.uid}"><div class="artWindow buildingArt"><span>${buildingIcon(b)}</span><small>${esc(b.subtype)}</small></div><div class="cardFrame"><div class="cardTop"><div><b>${esc(b.name)}</b><small>${ruined?'RUINED · ':''}${esc(b.subtype)}</small></div>${b.shield?'<span class="shield">🛡</span>':''}</div><div class="badgeRow"><span>🧱 ${b.damage}/${b.durability}</span><span>✨ ${ruined?0:b.prosperity||0}</span>${b.muster?`<span>🏠 ${used}/${b.housing}</span>`:''}</div>${b.muster?`<div class="musterLine"><b>${esc(b.musterClass)}</b> Muster · Recruit ${costText(b.recruitCost)}</div>`:''}<p>${esc(b.text||'')}</p>${b.manual?`<span class="manualTag">Manual: ${esc(b.manual)}</span>`:''}${b.rehousingDueOwnTurn!==null&&ruined?'<span class="warnTag">Residents inactive · rehouse by deadline</span>':''}${workshopAction(p,pi,b)}</div></article>`;
  }'''
client = replace_func(client, 'buildingCard', 'workshopAction', building_card)

critter_card = r'''  function critterCard(p,pi,r){
    const ready=E.residentReady(game,p,r),grit=E.residentGrit(game,p,r,r.blocking),fresh=r.recruitedTurn===game.turnNo&&pi===game.active;
    const canDragAttack=pi===game.active&&isHuman(pi)&&E.canAttack(game,pi,r);
    return `<article class="gameCard critter ${!ready?'inactive':''} ${r.tired?'tired':''} ${r.attacking?'attacking':''} ${r.blocking?'blocking':''} ${canDragAttack?'attackDraggable':''}" data-resident-uid="${r.uid}" ${canDragAttack?'title="Drag this Critter to an enemy target"':''}><div class="artWindow critterArt"><span>${critterIcon(r)}</span><small>${r.advanced?'ADVANCED · ':''}${(r.musterClasses||[]).join(' · ')}</small></div><div class="cardFrame"><div class="cardTop"><b>${esc(r.name)}</b>${r.shield?'<span class="shield">🛡</span>':''}</div><div class="badgeRow critterStats"><span>💪 ${r.might}</span><span>❤️ ${r.damage}/${grit}</span></div><div class="homeLine">🏡 ${esc(p.village.find(b=>b.uid===r.musterUid)?.name||'No home')}</div>${r.tool?`<div class="toolLine">🧰 ${esc(r.tool.name)}</div>`:''}${fresh?'<span class="freshTag">New · can block</span>':''}${canDragAttack?'<span class="dragHint attackHint">Drag to attack</span>':''}</div></article>`;
  }'''
# Replace critterCard through attackAction, then remove attackAction by anchoring to handPanel.
pattern = r"  function critterCard\(.*?\n  \}\n\n  function attackAction\(.*?\n  \}\n\n  function handPanel"
client, n = re.subn(pattern, critter_card + "\n\n  function handPanel", client, count=1, flags=re.S)
if n != 1:
    raise SystemExit('failed replacing critterCard/attackAction')

hand_panel = r'''  function handPanel(){
    const pi=humanIndex(),p=game.players[pi];
    if(game.mode==='ai'&&game.active===game.aiIndex)return `<section class="handDock">${tableFidgets()}<div class="handHeader"><div><span class="eyebrow">YOUR HAND</span><b>${p.hand.length} cards</b></div><span class="locked">Opponent turn</span></div><div class="handRow">${p.hand.map(c=>handCard(p,pi,c,false)).join('')}</div></section>`;
    const owner=game.mode==='ai'?p:game.players[game.active],ownerPi=game.mode==='ai'?pi:game.active;
    return `<section class="handDock">${tableFidgets()}<div class="handHeader"><div><span class="eyebrow">${game.mode==='ai'?'YOUR HAND':'ACTIVE HAND'}</span><b>${owner.hand.length} cards</b></div><div class="deckCounters"><span>🎴 ${owner.fieldDeck.length}</span><span>🍂 ${owner.compost.length}</span></div></div>${game.phase==='Discard'?`<div class="discardNotice">Rest: discard down to 7 · choose ${owner.hand.length-7} more.</div>`:''}<div class="handRow">${owner.hand.map(c=>handCard(owner,ownerPi,c,true)).join('')}</div></section>`;
  }'''
client = replace_func(client, 'handPanel', 'handArt', hand_panel)

hand_card = r'''  function handCard(p,pi,c,interactive){
    let action='',dragClass='',dragAttrs='';
    if(interactive&&game.phase==='Discard'&&pi===game.active)action=`<button class="dangerBtn cardAction" onclick="UI.discard(${c.uid})">Discard</button>`;
    else if(interactive&&c.type==='Critter'&&game.phase==='Build'&&pi===game.active){
      const ms=E.legalMusters(game,pi,c);
      if(ms.length){dragClass=' recruitDraggable';dragAttrs=` data-hand-uid="${c.uid}" title="Drag this Critter to a glowing Muster"`;action='<span class="dragHint recruitHint">Drag to a Muster</span>';}
      else action='<span class="whyDisabled">No legal Muster</span>';
    }else if(interactive&&c.subtype==='Tool'&&game.phase==='Build'&&pi===game.active){
      const rs=p.residents.filter(r=>!r.tool);const sid=`tool-${c.uid}`;
      action=rs.length?`<div class="miniAction"><select id="${sid}">${rs.map(r=>`<option value="${r.uid}">${esc(r.name)}</option>`).join('')}</select><button onclick="UI.tool(${c.uid},'${sid}')">Equip</button></div>`:'<span class="whyDisabled">No carrier</span>';
    }else if(interactive&&c.id==='burrow_stores'&&game.phase==='Build'&&pi===game.active){
      const spend=Object.entries(p.resources).filter(([,n])=>n>0),sid1=`supply-spend-${c.uid}`,sid2=`supply-gain-${c.uid}`;
      action=spend.length?`<div class="miniAction"><select id="${sid1}">${spend.map(([r])=>`<option value="${r}">${ICON[r]} ${RLABEL[r]}</option>`).join('')}</select><select id="${sid2}"><option value="root">🫚</option><option value="pebble">🪨</option></select><button onclick="UI.supply(${c.uid},'${sid1}','${sid2}')">Trade</button></div>`:'<span class="whyDisabled">No resource to exchange</span>';
    }
    const subtype=c.type==='Critter'?`Muster — ${(c.musterClasses||[]).join(' · ')}`:c.subtype;
    const stats=c.type==='Critter'?`<div class="badgeRow handStats"><span>💪 ${c.might}</span><span>❤️ ${c.grit}</span></div>`:`<div class="costLine">${costText(c.cost)}</div>`;
    return `<article class="gameCard handCard ${interactive?'':'lockedCard'}${dragClass}"${dragAttrs}><div class="artWindow handArt"><span>${handArt(c)}</span><small>${esc(subtype)}</small></div><div class="cardFrame"><div class="cardTop"><b>${esc(c.name)}</b>${c.advanced?'<span class="advancedTag">ADV</span>':''}</div>${stats}<p>${esc(c.text||'')}</p>${c.flags?.manual&&c.id!=='burrow_stores'?`<span class="manualTag">Manual: ${esc(c.flags.manual)}</span>`:''}${action}</div></article>`;
  }'''
client = replace_func(client, 'handCard', 'blueprintPanel', hand_card)

combat_panel = r'''  function combatPanel(){
    if(!game.combat.attacks.length&&game.phase!=='Block')return `<section class="combatRibbon quiet compactTrial"><span>⚔</span><b>Frost Trial</b><small>Drag a ready Critter to an enemy target.</small></section>`;
    const attacker=game.players[game.active],defIndex=1-game.active,defender=game.players[defIndex];
    const humanDefender=isHuman(defIndex),humanAttacker=isHuman(game.active),canResolve=game.phase==='Block'&&(humanAttacker||humanDefender);
    if(!game.combat.committed&&humanAttacker){
      const n=game.combat.attacks.length;
      return `<section class="combatRibbon activeCombat combatDraft"><div class="combatHeading"><span>⚔</span><div><b>${n} attacker${n===1?'':'s'} ready</b><small>Drag another Critter or commit the whole attack.</small></div></div><div class="combatButtons"><button class="primaryBtn" onclick="UI.commitAttacks()">Commit attack${n>1?` (${n})`:''}</button></div></section>`;
    }
    return `<section class="combatRibbon activeCombat"><div class="combatHeading"><span>⚔</span><div><b>${game.combat.committed?'Block & React':'Declare Attackers'}</b><small>${game.combat.committed?'Attack committed · respond before damage':'Choose all attackers before committing'}</small></div></div><div class="attackList">${game.combat.attacks.map((a,i)=>{
      const atk=attacker.residents.find(r=>r.uid===a.attackerUid),blk=defender.residents.find(r=>r.uid===a.blockerUid);
      const blockers=game.phase==='Block'&&humanDefender&&!blk?defender.residents.filter(r=>E.canBlock(game,defIndex,r,a)):[];
      return `<div class="attackEntry"><div><b>${esc(atk?.name||'Attacker')}</b><span>→ ${a.target.kind==='hearthseed'?'🔥 Hearthseed':esc(a.target.name)}</span>${a.zeroDamage?'<small>Rootsnared · deals 0</small>':''}${blk?`<small>Blocked by ${esc(blk.name)}</small>`:''}</div>${blockers.length?`<div class="miniAction"><select id="blk-${i}">${blockers.map(r=>`<option value="${r.uid}">${esc(r.name)}</option>`).join('')}</select><button onclick="UI.block(${i})">Block</button></div>`:''}</div>`;
    }).join('')}</div><div class="combatButtons">${canResolve?'<button class="primaryBtn" onclick="UI.resolveCombat()">Resolve combat</button>':''}</div>${game.phase==='Block'?reactionTray(humanIndex()):''}</section>`;
  }'''
client = replace_func(client, 'combatPanel', 'reactionTray', combat_panel)

# Move the fidget pieces from the mat to a small row directly above the hand.
client = client.replace('''  function tableFidgets(){
    return `<div class="tableFidgets" aria-label="Tiny tabletop fidgets. No gameplay effect."><button type="button" class="tableFidget fidgetAcorn" data-fidget="bounce" title="Fidget · no game effect" onclick="UI.fidget(event.currentTarget)">🌰</button><button type="button" class="tableFidget fidgetLeaf" data-fidget="spin" title="Fidget · no game effect" onclick="UI.fidget(event.currentTarget)">🍂</button><button type="button" class="tableFidget fidgetPebble" data-fidget="wiggle" title="Fidget · no game effect" onclick="UI.fidget(event.currentTarget)">🪨</button><button type="button" class="tableFidget fidgetMushroom" data-fidget="squish" title="Fidget · no game effect" onclick="UI.fidget(event.currentTarget)">🍄</button></div>`;
  }''','''  function tableFidgets(){
    return `<div class="handFidgets" aria-label="Hearthstep fidgets. No gameplay effect."><button type="button" class="tableFidget fidgetAcorn" data-fidget="bounce" title="Fidget · no game effect" onclick="UI.fidget(event.currentTarget)">🌰</button><button type="button" class="tableFidget fidgetLeaf" data-fidget="spin" title="Fidget · no game effect" onclick="UI.fidget(event.currentTarget)">🍂</button><button type="button" class="tableFidget fidgetPebble" data-fidget="wiggle" title="Fidget · no game effect" onclick="UI.fidget(event.currentTarget)">🪨</button><button type="button" class="tableFidget fidgetMushroom" data-fidget="squish" title="Fidget · no game effect" onclick="UI.fidget(event.currentTarget)">🍄</button></div>`;
  }''')
client = client.replace('<main class="tableSurface">${tableFidgets()}','<main class="tableSurface">')

# Insert direct pointer interactions immediately before render().
direct = r'''
  function installDirectManipulation(){
    const DRAG_THRESHOLD=7;
    let gesture=null,ghost=null,arrow=null,arrowLine=null;

    const clearTargets=()=>document.querySelectorAll('.directDropTarget,.directDropHover').forEach(el=>el.classList.remove('directDropTarget','directDropHover'));
    function cleanup(){
      clearTargets();ghost?.remove();arrow?.remove();ghost=null;arrow=null;arrowLine=null;
      document.body.classList.remove('directManipulating');
      gesture=null;
    }
    function cardGhost(source){
      const g=source.cloneNode(true);g.classList.add('dragCardGhost');g.removeAttribute('title');
      g.querySelectorAll('button,select').forEach(el=>el.remove());document.body.appendChild(g);return g;
    }
    function moveGhost(x,y){if(ghost){ghost.style.left=`${x}px`;ghost.style.top=`${y}px`;}}
    function attackArrow(source){
      const r=source.getBoundingClientRect();
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('dragAttackArrow');
      svg.innerHTML='<defs><marker id="hnhAttackHead" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" /></marker></defs><line marker-end="url(#hnhAttackHead)" />';
      document.body.appendChild(svg);const line=svg.querySelector('line');line.setAttribute('x1',String(r.left+r.width/2));line.setAttribute('y1',String(r.top+r.height/2));return {svg,line};
    }
    function elementTargetAt(x,y){return document.elementFromPoint(x,y);}
    function recruitTarget(el){return el?.closest?.('[data-muster-uid]')||null;}
    function attackTarget(el){return el?.closest?.('[data-attack-building],[data-hearthseed-player]')||null;}
    function attackKey(el){
      if(!el)return null;
      if(el.hasAttribute('data-attack-building'))return `building:${el.dataset.attackBuilding}`;
      if(el.hasAttribute('data-hearthseed-player'))return `hearthseed:${el.dataset.hearthseedPlayer}`;
      return null;
    }
    function markLegal(kind,legal){
      clearTargets();
      if(kind==='recruit')document.querySelectorAll('[data-muster-uid]').forEach(el=>{if(legal.has(String(el.dataset.musterUid)))el.classList.add('directDropTarget');});
      else{
        document.querySelectorAll('[data-attack-building]').forEach(el=>{if(legal.has(`building:${el.dataset.attackBuilding}`))el.classList.add('directDropTarget');});
        document.querySelectorAll('[data-hearthseed-player]').forEach(el=>{if(legal.has(`hearthseed:${el.dataset.hearthseedPlayer}`))el.classList.add('directDropTarget');});
      }
    }
    function begin(event){
      if(event.button!==0||event.target.closest('button,select,a'))return;
      const recruit=event.target.closest('.recruitDraggable'),attack=event.target.closest('.attackDraggable');
      if(!recruit&&!attack)return;
      if(recruit){
        const uid=+recruit.dataset.handUid,p=game.players[game.active],card=p.hand.find(c=>c.uid===uid);if(!card)return;
        const legalMusters=E.legalMusters(game,game.active,card);if(!legalMusters.length)return;
        gesture={kind:'recruit',uid,source:recruit,startX:event.clientX,startY:event.clientY,pointerId:event.pointerId,legal:new Set(legalMusters.map(m=>String(m.uid))),dragging:false};
      }else{
        const uid=+attack.dataset.residentUid,p=game.players[game.active],resident=p.residents.find(r=>r.uid===uid);if(!resident||!E.canAttack(game,game.active,resident))return;
        const legalTargets=E.legalAttackTargets(game,game.active,resident);if(!legalTargets.length)return;
        const opponent=1-game.active;
        gesture={kind:'attack',uid,source:attack,startX:event.clientX,startY:event.clientY,pointerId:event.pointerId,legal:new Set(legalTargets.map(t=>t.kind==='hearthseed'?`hearthseed:${opponent}`:`building:${t.uid}`)),dragging:false};
      }
    }
    function start(){
      if(!gesture||gesture.dragging)return;gesture.dragging=true;document.body.classList.add('directManipulating');markLegal(gesture.kind,gesture.legal);
      if(gesture.kind==='recruit'){ghost=cardGhost(gesture.source);moveGhost(gesture.startX,gesture.startY);}
      else{const a=attackArrow(gesture.source);arrow=a.svg;arrowLine=a.line;}
    }
    function move(event){
      if(!gesture||event.pointerId!==gesture.pointerId)return;
      if(!gesture.dragging&&Math.hypot(event.clientX-gesture.startX,event.clientY-gesture.startY)<DRAG_THRESHOLD)return;
      start();event.preventDefault();
      document.querySelectorAll('.directDropHover').forEach(el=>el.classList.remove('directDropHover'));
      const under=elementTargetAt(event.clientX,event.clientY);
      if(gesture.kind==='recruit'){
        moveGhost(event.clientX,event.clientY);const target=recruitTarget(under);if(target&&gesture.legal.has(String(target.dataset.musterUid)))target.classList.add('directDropHover');
      }else{
        const target=attackTarget(under),valid=target&&gesture.legal.has(attackKey(target));
        arrowLine?.setAttribute('x2',String(event.clientX));arrowLine?.setAttribute('y2',String(event.clientY));arrow?.classList.toggle('valid',Boolean(valid));if(valid)target.classList.add('directDropHover');
      }
    }
    function finish(event){
      if(!gesture||event.pointerId!==gesture.pointerId)return;
      const g=gesture;
      if(!g.dragging){cleanup();return;}
      event.preventDefault();const under=elementTargetAt(event.clientX,event.clientY);
      if(g.kind==='recruit'){
        const target=recruitTarget(under),musterUid=target?.dataset?.musterUid;
        if(target&&g.legal.has(String(musterUid))){cleanup();doAction(()=>E.recruit(game,game.active,g.uid,+musterUid));return;}
      }else{
        const target=attackTarget(under),key=attackKey(target);
        if(target&&g.legal.has(key)){
          const targetArg=key.startsWith('hearthseed:')?'hearthseed':+target.dataset.attackBuilding;
          cleanup();doAction(()=>E.declareAttack(game,game.active,g.uid,targetArg));return;
        }
      }
      cleanup();
    }
    document.addEventListener('pointerdown',begin,true);
    document.addEventListener('pointermove',move,{capture:true,passive:false});
    document.addEventListener('pointerup',finish,true);
    document.addEventListener('pointercancel',cleanup,true);
    window.addEventListener('blur',cleanup);
  }

'''
if '  function render(){' not in client:
    raise SystemExit('render anchor missing')
client = client.replace('  function render(){', direct + '  function render(){', 1)

# Install after UI is exported, before first render.
client = client.replace('''  };
  render();
})();''','''  };
  installDirectManipulation();
  render();
})();''',1)

# Remove the obsolete attack UI method but keep commitAttacks.
client = re.sub(r"\n    attack:\(uid,sid\)=>doAction\(\(\)=>E\.declareAttack\(.*?\),",'',client,count=1)

client = client.replace('v0.7.8','v0.7.9')
client_path.write_text(client)

styles_path=Path('styles.css')
styles=styles_path.read_text()
# Replace the v0.7.8 ambient fidget block with hand-row positioning and direct manipulation styles.
styles=re.sub(r"\.tableFidgets\{.*?@media\(max-width:780px\)\{.*?\}\n",r'''.handFidgets{position:absolute;left:50%;top:-32px;z-index:39;transform:translateX(-50%);display:flex;gap:8px;align-items:center;justify-content:center;pointer-events:auto;padding:3px 8px;border-radius:999px;background:rgba(32,34,28,.32);backdrop-filter:blur(3px)}.tableFidget{width:25px;height:25px;padding:0;display:grid;place-items:center;border:0;border-radius:50%;background:rgba(246,238,220,.08);color:inherit;font-size:16px;line-height:1;box-shadow:none;opacity:.72;filter:saturate(.9);transition:opacity .12s ease,transform .12s ease,background .12s ease}.tableFidget:hover:not(:disabled){opacity:1;filter:none;background:rgba(246,238,220,.16);transform:scale(1.12)}.tableFidget.fidgetPop[data-fidget="bounce"]{animation:tableFidgetBounce .46s ease}.tableFidget.fidgetPop[data-fidget="spin"]{animation:tableFidgetSpin .48s ease}.tableFidget.fidgetPop[data-fidget="wiggle"]{animation:tableFidgetWiggle .42s ease}.tableFidget.fidgetPop[data-fidget="squish"]{animation:tableFidgetSquish .42s ease}@keyframes tableFidgetBounce{0%,100%{transform:translateY(0) scale(1)}42%{transform:translateY(-12px) scale(1.08,.94)}70%{transform:translateY(1px) scale(.94,1.06)}}@keyframes tableFidgetSpin{0%{transform:rotate(0)}70%{transform:rotate(330deg) scale(1.14)}100%{transform:rotate(360deg)}}@keyframes tableFidgetWiggle{0%,100%{transform:rotate(0)}25%{transform:rotate(-13deg)}55%{transform:rotate(11deg)}75%{transform:rotate(-6deg)}}@keyframes tableFidgetSquish{0%,100%{transform:scale(1)}45%{transform:scale(1.18,.76)}70%{transform:scale(.92,1.08)}}
.recruitDraggable,.attackDraggable{cursor:grab;touch-action:none}.recruitDraggable:active,.attackDraggable:active{cursor:grabbing}.dragHint{display:inline-flex;align-items:center;justify-content:center;margin-top:auto;padding:4px 7px;border-radius:7px;background:#e6ecd9;color:#526346;font-size:7px;font-weight:900;letter-spacing:.03em;text-transform:uppercase}.attackHint{background:#eee0c6;color:#725329}.dragCardGhost{position:fixed!important;z-index:160!important;left:0;top:0;width:178px!important;height:226px!important;pointer-events:none!important;opacity:.9!important;transform:translate(-50%,-54%) rotate(2deg) scale(.86)!important;box-shadow:0 22px 42px rgba(14,14,11,.42)!important;transition:none!important}.directDropTarget{outline:2px solid rgba(221,191,105,.78)!important;outline-offset:3px;box-shadow:0 0 0 5px rgba(221,191,105,.12),0 0 24px rgba(221,191,105,.28)!important}.directDropHover{outline-color:#e9cf78!important;box-shadow:0 0 0 6px rgba(233,207,120,.2),0 0 34px rgba(233,207,120,.5)!important;transform:translateY(-3px) scale(1.02)!important}.dragAttackArrow{position:fixed;inset:0;width:100vw;height:100vh;z-index:159;pointer-events:none;overflow:visible}.dragAttackArrow line{stroke:#d6ad58;stroke-width:5;stroke-linecap:round;filter:drop-shadow(0 2px 3px rgba(20,17,12,.55))}.dragAttackArrow marker path{fill:#d6ad58}.dragAttackArrow.valid line{stroke:#efd77f}.dragAttackArrow.valid marker path{fill:#efd77f}.combatDraft{width:max-content;max-width:74%;gap:12px}.combatDraft .combatButtons{margin-top:0}.combatDraft .primaryBtn{padding:6px 10px}body.directManipulating{cursor:grabbing!important;user-select:none}body.directManipulating .cardInspector{display:none!important}
@media(max-width:780px){.setupCard{padding:22px 18px}.setupCard h1{font-size:36px}.aiDifficultyBox label{grid-template-columns:1fr}.handFidgets{top:-29px;gap:5px}.tableFidget{width:22px;height:22px;font-size:14px}.combatRibbon.quiet.compactTrial,.combatDraft{max-width:92%}.dragCardGhost{width:155px!important;height:205px!important}}
''',styles,count=1,flags=re.S)
if '.handFidgets' not in styles:
    raise SystemExit('fidget CSS replacement failed')
styles=styles.replace('v0.7.8','v0.7.9')
styles_path.write_text(styles)

for path in [Path('index.html'),Path('tests/smoke-test.js'),Path('tests/ui-coordinator-test.js')]:
    text=path.read_text().replace('v0.7.8','v0.7.9').replace('v=078','v=079')
    path.write_text(text)

ui_path=Path('tests/ui-coordinator-test.js')
ui=ui_path.read_text()
ui=ui.replace("assert(client.includes('tableFidgets')&&client.includes('fidgetAcorn')&&client.includes('fidgetMushroom'),'ambient table fidgets missing');","assert(client.includes('handFidgets')&&client.includes('fidgetAcorn')&&client.includes('fidgetMushroom'),'hand-area fidgets missing');")
ui=ui.replace("assert(client.includes('tableFidgets')&&!client.includes('hearthstepTrail'),'ambient table fidgets should replace the Hearthstep bar');","assert(client.includes('handFidgets')&&!client.includes('hearthstepTrail'),'compact hand-area fidgets should replace the Hearthstep bar');")
ui += "\nassert(client.includes('installDirectManipulation'),'direct manipulation controller missing');\nassert(client.includes('recruitDraggable')&&client.includes('data-muster-uid'),'drag-to-recruit hooks missing');\nassert(client.includes('attackDraggable')&&client.includes('dragAttackArrow'),'drag-to-attack arrow hooks missing');\nassert(!client.includes('function attackAction(')&&!client.includes('id=\\\"atk-${r.uid}'),'legacy attack dropdown UI should be removed');\nassert(styles.includes('.dragCardGhost')&&styles.includes('.dragAttackArrow')&&styles.includes('.directDropTarget'),'direct manipulation styling missing');\nassert(styles.includes('.handFidgets'),'Hearthstep pieces should live above the hand');\nconsole.log('✓ drag-to-recruit, drag-arrow attack, and hand-area fidgets');\n"
ui_path.write_text(ui)

print('v0.7.9 direct manipulation patch complete')
