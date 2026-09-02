from pathlib import Path

# --- engine: allow withdrawing draft attackers before declaration is committed ---
p=Path('engine.js')
s=p.read_text()
old="""  function commitAttacks(g,pi){
    if(pi!==g.active||g.phase!=='Attack'||!g.combat.attacks.length)return {ok:false,reason:'Declare at least one attacker first.'};
    g.combat.committed=true;g.phase='Block';
    log(g,`${g.players[pi].name} commits ${g.combat.attacks.length} attacker${g.combat.attacks.length===1?'':'s'}. Defender may block.`);
    return {ok:true};
  }
"""
new="""  function cancelAttack(g,pi,residentUid){
    if(pi!==g.active||g.phase!=='Attack'||g.combat.committed)return {ok:false,reason:'Attackers can only be changed before the attack is declared.'};
    const p=g.players[pi],index=g.combat.attacks.findIndex(a=>a.attackerUid===residentUid);
    if(index<0)return {ok:false,reason:'That Critter is not in the current attack.'};
    g.combat.attacks.splice(index,1);
    const r=p.residents.find(x=>x.uid===residentUid);
    if(r){r.attacking=false;r.tired=false;}
    p.attackedThisStep=p.attackedThisStep.filter(uid=>uid!==residentUid);
    log(g,`${r?.name||'A Critter'} is withdrawn from the attack.`);
    return {ok:true};
  }

  function commitAttacks(g,pi){
    if(pi!==g.active||g.phase!=='Attack'||!g.combat.attacks.length)return {ok:false,reason:'Declare at least one attacker first.'};
    g.combat.committed=true;g.phase='Block';
    log(g,`${g.players[pi].name} declares ${g.combat.attacks.length} attacker${g.combat.attacks.length===1?'':'s'}. Defender may block.`);
    return {ok:true};
  }
"""
assert old in s, 'commitAttacks block not found'
s=s.replace(old,new,1)
old="""    declareAttack,commitAttacks,assignBlock,canBlock,playReaction,resolveCombat,requestEndTurn,discard,"""
new="""    declareAttack,cancelAttack,commitAttacks,assignBlock,canBlock,playReaction,resolveCombat,requestEndTurn,discard,"""
assert old in s, 'engine export hook not found'
s=s.replace(old,new,1)
p.write_text(s)

# --- client: one Declare Attack action, X to edit selected attackers, auto-resolve vs AI when no reaction decision exists ---
p=Path('client.js')
s=p.read_text()
old="""    const incomingAttackIndex=game.phase==='Block'?game.combat.attacks.findIndex(a=>a.attackerUid===r.uid):-1;
    const incomingAttackAttr=incomingAttackIndex>=0?` data-block-attack-index=\"${incomingAttackIndex}\"`:'';
    return `<article class=\"gameCard critter ${!ready?'inactive':''} ${r.tired?'tired':''} ${r.attacking?'attacking':''} ${r.blocking?'blocking':''}${directClass}\" data-resident-uid=\"${r.uid}\" data-player-index=\"${pi}\"${directAttrs}${incomingAttackAttr}><div class=\"artWindow critterArt\"><span>${critterIcon(r)}</span><small>${r.advanced?'ADVANCED · ':''}${(r.musterClasses||[]).join(' · ')}</small></div>"""
new="""    const incomingAttackIndex=game.phase==='Block'?game.combat.attacks.findIndex(a=>a.attackerUid===r.uid):-1;
    const incomingAttackAttr=incomingAttackIndex>=0?` data-block-attack-index=\"${incomingAttackIndex}\"`:'';
    const canCancelDraft=pi===game.active&&isHuman(pi)&&game.phase==='Attack'&&!game.combat.committed&&game.combat.attacks.some(a=>a.attackerUid===r.uid);
    const cancelDraft=canCancelDraft?`<button class=\"cancelAttackDraft\" title=\"Remove from attack\" aria-label=\"Remove ${esc(r.name)} from attack\" onclick=\"event.stopPropagation();UI.cancelAttack(${r.uid})\">×</button>`:'';
    return `<article class=\"gameCard critter ${!ready?'inactive':''} ${r.tired?'tired':''} ${r.attacking?'attacking':''} ${r.blocking?'blocking':''}${directClass}\" data-resident-uid=\"${r.uid}\" data-player-index=\"${pi}\"${directAttrs}${incomingAttackAttr}>${cancelDraft}<div class=\"artWindow critterArt\"><span>${critterIcon(r)}</span><small>${r.advanced?'ADVANCED · ':''}${(r.musterClasses||[]).join(' · ')}</small></div>"""
assert old in s, 'critter draft hook not found'
s=s.replace(old,new,1)

old="""    if(!game.combat.committed&&humanAttacker){const n=game.combat.attacks.length;return `<section class=\"combatRibbon activeCombat combatDraft\"><div class=\"combatHeading\"><span>⚔</span><div><b>${n} attacker${n===1?'':'s'} ready</b><small>Orange arrows show every declared attack. Drag more Critters or commit.</small></div></div><div class=\"combatButtons\"><button class=\"primaryBtn\" onclick=\"UI.commitAttacks()\">Commit attack${n>1?` (${n})`:''}</button></div></section>`;}
    const blocks=game.combat.attacks.filter(a=>a.blockerUid).length;
    const canResolve=game.phase==='Block'&&(humanAttacker||humanDefender);
    const blockHelp=humanDefender?'Drag a ready Critter onto an attacking Critter to block. Blue arrows show blocks.':`${blocks} block${blocks===1?'':'s'} assigned · blue arrows show blockers.`;
    return `<section class=\"combatRibbon activeCombat compactCombat\"><div class=\"combatHeading\"><span>⚔</span><div><b>${game.combat.attacks.length} attack${game.combat.attacks.length===1?'':'s'} · ${blocks} block${blocks===1?'':'s'}</b><small>${blockHelp}</small></div></div><div class=\"combatButtons\">${canResolve?'<button class=\"primaryBtn\" onclick=\"UI.resolveCombat()\">Resolve combat</button>':''}</div>${game.phase==='Block'?reactionTray(humanIndex()):''}</section>`;
"""
new="""    if(!game.combat.committed&&humanAttacker){const n=game.combat.attacks.length;return `<section class=\"combatRibbon activeCombat combatDraft\"><div class=\"combatHeading\"><span>⚔</span><div><b>${n} attacker${n===1?'':'s'} selected</b><small>Drag more Critters to targets, or use × on a selected Critter to change your attack.</small></div></div><div class=\"combatButtons\"><button class=\"primaryBtn\" onclick=\"UI.commitAttacks()\">Declare Attack</button></div></section>`;}
    const blocks=game.combat.attacks.filter(a=>a.blockerUid).length;
    const attackerReactionReady=humanAttacker&&game.phase==='Block'&&game.players[game.active].reactionRoundUsed!==E.currentRound(game)&&game.players[game.active].hand.some(c=>c.subtype==='Reaction')&&E.activeBuildings(game.players[game.active]).some(b=>b.reactionAccess);
    const canResolve=game.phase==='Block'&&(humanDefender||attackerReactionReady);
    const resolveLabel=humanDefender?'Done Blocking':'Resolve Combat';
    const blockHelp=humanDefender?'Drag a ready Critter onto an attacking Critter to block. Blue arrows show blocks.':attackerReactionReady?'AI blocks are set. Play a Reaction if you want, then resolve.':`${blocks} block${blocks===1?'':'s'} assigned.`;
    return `<section class=\"combatRibbon activeCombat compactCombat\"><div class=\"combatHeading\"><span>⚔</span><div><b>${game.combat.attacks.length} attack${game.combat.attacks.length===1?'':'s'} · ${blocks} block${blocks===1?'':'s'}</b><small>${blockHelp}</small></div></div><div class=\"combatButtons\">${canResolve?`<button class=\"primaryBtn\" onclick=\"UI.resolveCombat()\">${resolveLabel}</button>`:''}</div>${game.phase==='Block'?reactionTray(humanIndex()):''}</section>`;
"""
assert old in s, 'combat panel hook not found'
s=s.replace(old,new,1)

old="""  function postAction(){
    if(game?.mode==='ai'&&game.phase==='Block'&&game.active!==game.aiIndex&&1-game.active===game.aiIndex)autoAssignAIBlocks();
    render();scheduleAI();
  }
"""
new="""  function postAction(){
    if(game?.mode==='ai'&&game.phase==='Block'&&game.active!==game.aiIndex&&1-game.active===game.aiIndex){
      autoAssignAIBlocks();
      const attacker=game.players[game.active];
      const reactionReady=attacker.reactionRoundUsed!==E.currentRound(game)&&attacker.hand.some(c=>c.subtype==='Reaction')&&E.activeBuildings(attacker).some(b=>b.reactionAccess);
      if(!reactionReady&&!game.combat.resolved){
        clearTimeout(postAction.combatTimer);
        postAction.combatTimer=setTimeout(()=>{if(game&&game.phase==='Block'&&!game.combat.resolved&&game.active!==game.aiIndex){E.resolveCombat(game);render();scheduleAI();}},900);
      }
    }
    render();scheduleAI();
  }
"""
assert old in s, 'postAction hook not found'
s=s.replace(old,new,1)

old="""    commitAttacks:()=>doAction(()=>E.commitAttacks(game,game.active)),
"""
new="""    cancelAttack:uid=>doAction(()=>E.cancelAttack(game,game.active,uid)),
    commitAttacks:()=>doAction(()=>E.commitAttacks(game,game.active)),
"""
assert old in s, 'UI attack export hook not found'
s=s.replace(old,new,1)

s=s.replace('Client v0.8.0 · Rules v0.6.2','Client v0.8.1 · Rules v0.6.2')
s=s.replace("version:'0.8.0'","version:'0.8.1'")
p.write_text(s)

# --- style the small X directly on selected attackers ---
p=Path('styles.css')
s=p.read_text()
s += """

/* ===== v0.8.1 attack drafting ===== */
.cancelAttackDraft{position:absolute;z-index:8;top:5px;right:5px;width:24px;height:24px;padding:0;border-radius:999px;background:rgba(45,42,34,.88);border:1px solid rgba(255,245,220,.75);color:#fff4dc;font:900 17px/20px ui-sans-serif,system-ui;box-shadow:0 2px 8px rgba(25,22,18,.28)}
.cancelAttackDraft:hover{background:#8d5147;transform:scale(1.06)!important;filter:none!important}
"""
p.write_text(s)

# --- version/cache wiring ---
p=Path('index.html')
s=p.read_text().replace('v0.8.0','v0.8.1').replace('v=080','v=081')
p.write_text(s)

# --- tests ---
p=Path('tests/rules-patch-test.js')
s=p.read_text()
insert="""
{
  const g=prep(),pi=g.active;
  addMusterAndCritter(g,pi);
  const r=g.players[pi].residents[0];
  assert(E.declareAttack(g,pi,r.uid,'hearthseed').ok);
  assert.equal(r.tired,true,'normal attacker tires when drafted');
  assert(E.cancelAttack(g,pi,r.uid).ok,'draft attacker can be withdrawn before declaration');
  assert.equal(g.combat.attacks.length,0,'withdrawn attacker leaves attack draft');
  assert.equal(r.attacking,false,'withdrawn attacker is no longer attacking');
  assert.equal(r.tired,false,'withdrawn attacker becomes ready again');
  assert(!g.players[pi].attackedThisStep.includes(r.uid),'withdrawn attacker can be selected again');
  assert(E.declareAttack(g,pi,r.uid,'hearthseed').ok,'withdrawn attacker can be re-declared');
  assert(E.commitAttacks(g,pi).ok);
  assert.equal(E.cancelAttack(g,pi,r.uid).ok,false,'attackers cannot be changed after Declare Attack');
  console.log('✓ draft attackers can be removed and re-selected before Declare Attack');
}
"""
needle="\nconsole.log('\\nSequencing patch tests passed.');"
assert needle in s, 'sequencing test insertion hook not found'
s=s.replace(needle,insert+needle,1)
p.write_text(s)

p=Path('tests/ui-coordinator-test.js')
s=p.read_text().replace('v0.8.0','v0.8.1').replace('v=080','v=081')
s += """
assert(client.includes('cancelAttackDraft'),'selected attacker X control missing');
assert(client.includes('>Declare Attack</button>'),'single Declare Attack action missing');
assert(!client.includes('Commit attack'),'legacy Commit attack copy should be removed');
assert(client.includes("cancelAttack:uid=>doAction(()=>E.cancelAttack"),'cancel attack UI action missing');
assert(styles.includes('.cancelAttackDraft'),'selected attacker X styling missing');
console.log('✓ attack drafting uses one Declare Attack button with removable selections');
"""
p.write_text(s)

# Update any remaining presentation/cache expectations.
for tp in Path('tests').glob('*.js'):
    t=tp.read_text().replace('v0.8.0','v0.8.1').replace('v=080','v=081')
    tp.write_text(t)
