from pathlib import Path

p=Path('client.js')
s=p.read_text()

old="""    const directAttrs=canDragBlock?` data-block-indices=\"${legalBlockIndices.join(',')}\" title=\"Drag this Critter onto an attacker to block\"`:canDragAttack?' title=\"Drag this Critter to an enemy target\"':'';
    return `<article class=\"gameCard critter ${!ready?'inactive':''} ${r.tired?'tired':''} ${r.attacking?'attacking':''} ${r.blocking?'blocking':''}${directClass}\" data-resident-uid=\"${r.uid}\" data-player-index=\"${pi}\"${directAttrs}>"""
new="""    const directAttrs=canDragBlock?` data-block-indices=\"${legalBlockIndices.join(',')}\" title=\"Drag this Critter onto an attacker to block\"`:canDragAttack?' title=\"Drag this Critter to an enemy target\"':'';
    const incomingAttackIndex=game.phase==='Block'?game.combat.attacks.findIndex(a=>a.attackerUid===r.uid):-1;
    const incomingAttackAttr=incomingAttackIndex>=0?` data-block-attack-index=\"${incomingAttackIndex}\"`:'';
    return `<article class=\"gameCard critter ${!ready?'inactive':''} ${r.tired?'tired':''} ${r.attacking?'attacking':''} ${r.blocking?'blocking':''}${directClass}\" data-resident-uid=\"${r.uid}\" data-player-index=\"${pi}\"${directAttrs}${incomingAttackAttr}>"""
assert old in s, 'critter card hook not found'
s=s.replace(old,new,1)

repls=[
("blockTarget=el=>el?.closest?.('.gameCard.critter[data-resident-uid]')||null;","blockTarget=el=>el?.closest?.('.gameCard.critter[data-block-attack-index]')||null;"),
("else document.querySelectorAll('.gameCard.critter[data-resident-uid]').forEach(el=>{if(legal.has(String(el.dataset.residentUid)))el.classList.add('directDropTarget');});","else document.querySelectorAll('.gameCard.critter[data-block-attack-index]').forEach(el=>{if(legal.has(String(el.dataset.blockAttackIndex)))el.classList.add('directDropTarget');});"),
("const legalMap=new Map();game.combat.attacks.forEach((a,i)=>{if(E.canBlock(game,defenderIndex,resident,a))legalMap.set(String(a.attackerUid),i);});if(!legalMap.size)return;gesture={kind:'block',uid,defenderIndex,source:block,startX:event.clientX,startY:event.clientY,pointerId:event.pointerId,legal:new Set(legalMap.keys()),legalMap,dragging:false};","const legalMap=new Map();game.combat.attacks.forEach((a,i)=>{if(E.canBlock(game,defenderIndex,resident,a))legalMap.set(String(i),i);});if(!legalMap.size)return;gesture={kind:'block',uid,defenderIndex,source:block,startX:event.clientX,startY:event.clientY,pointerId:event.pointerId,legal:new Set(legalMap.keys()),legalMap,dragging:false};"),
("const target=blockTarget(el),key=target?.dataset?.residentUid,valid=target&&gesture.legal.has(String(key));","const target=blockTarget(el),key=target?.dataset?.blockAttackIndex,valid=target&&gesture.legal.has(String(key));"),
("const target=blockTarget(el),key=String(target?.dataset?.residentUid||'');if(target&&g.legal.has(key)){const attackIndex=g.legalMap.get(key);cleanup();doAction(()=>E.assignBlock(game,g.defenderIndex,g.uid,attackIndex));return;}","const target=blockTarget(el),key=String(target?.dataset?.blockAttackIndex??'');if(target&&g.legal.has(key)){const attackIndex=g.legalMap.get(key);cleanup();doAction(()=>E.assignBlock(game,g.defenderIndex,g.uid,attackIndex));return;}"),
("gesture={kind:'attack',uid,source:attack,startX:event.clientX,startY:event.clientY,pointerId:event.pointerId,legal:new Set(legalTargets.map(t=>t.kind==='hearthseed'?`hearthseed:${opponent}`:`building:${t.uid}`)),dragging:false};}}","gesture={kind:'attack',uid,source:attack,startX:event.clientX,startY:event.clientY,pointerId:event.pointerId,legal:new Set(legalTargets.map(t=>t.kind==='hearthseed'?`hearthseed:${opponent}`:`building:${t.uid}`)),dragging:false};}gesture?.source?.setPointerCapture?.(event.pointerId);}"),
]
for old,new in repls:
    assert old in s, f'missing patch hook: {old[:70]}'
    s=s.replace(old,new,1)

p.write_text(s)

css=Path('styles.css')
c=css.read_text()
c += "\n/* ===== blocking reliability ===== */\n.blockDraggable{touch-action:none;user-select:none;cursor:grab}.blockDraggable:active{cursor:grabbing}\n.gameCard.critter[data-block-attack-index].directDropTarget{outline-color:#58a9df!important;box-shadow:0 0 0 5px rgba(88,169,223,.14),0 0 26px rgba(88,169,223,.34)!important}\n"
css.write_text(c)

tp=Path('tests/ui-coordinator-test.js')
t=tp.read_text()+"\nassert(client.includes('data-block-attack-index'),'explicit block attack index missing');\nassert(client.includes('setPointerCapture'),'pointer capture missing for direct manipulation');\nassert(css.includes('.blockDraggable{touch-action:none'),'block drag touch-action guard missing');\nconsole.log('✓ human blocking uses explicit attack targets and stable pointer capture');\n"
tp.write_text(t)
