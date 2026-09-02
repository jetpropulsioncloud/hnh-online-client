from pathlib import Path

p=Path('client.js')
s=p.read_text()
s=s.replace("let game=null,toast='',aiTimer=null,drawer=null,aiDifficulty='beginner';","let game=null,toast='',aiTimer=null,drawer=null,aiDifficulty='beginner',resourceCoachVisible=true;")
s=s.replace("clearTimeout(aiTimer);drawer=null;aiDifficulty=AI_PROFILES[difficulty]?difficulty:'beginner';","clearTimeout(aiTimer);drawer=null;resourceCoachVisible=true;aiDifficulty=AI_PROFILES[difficulty]?difficulty:'beginner';")

old="""  function handPanel(){
    const pi=humanIndex(),p=game.players[pi];
    if(game.mode==='ai'&&game.active===game.aiIndex)return `<section class=\"handDock\">${tableFidgets()}<div class=\"handHeader\"><div><span class=\"eyebrow\">YOUR HAND</span><b>${p.hand.length} cards</b></div><div class=\"handResourceStrip\">${resources(p)}</div><span class=\"locked\">Opponent turn</span></div><div class=\"handRow\">${p.hand.map(c=>handCard(p,pi,c,false)).join('')}</div></section>`;
    const owner=game.mode==='ai'?p:game.players[game.active],ownerPi=game.mode==='ai'?pi:game.active;
    return `<section class=\"handDock\">${tableFidgets()}<div class=\"handHeader\"><div><span class=\"eyebrow\">${game.mode==='ai'?'YOUR HAND':'ACTIVE HAND'}</span><b>${owner.hand.length} cards</b></div><div class=\"handResourceStrip\">${resources(owner)}</div><div class=\"deckCounters\"><span>🎴 ${owner.fieldDeck.length}</span><span>🍂 ${owner.compost.length}</span></div></div>${game.phase==='Discard'?`<div class=\"discardNotice\">Rest: discard down to 7 · choose ${owner.hand.length-7} more.</div>`:''}<div class=\"handRow\">${owner.hand.map(c=>handCard(owner,ownerPi,c,true)).join('')}</div></section>`;
  }
"""
new="""  function resourceCoach(){
    return resourceCoachVisible?`<div class=\"resourceCoach\"><b>Your Resources</b><span>Spend these to build, recruit, and play cards.</span><button type=\"button\" onclick=\"UI.dismissResourceCoach()\" aria-label=\"Dismiss resource tip\">Got it</button></div>`:'';
  }

  function handPanel(){
    const pi=humanIndex(),p=game.players[pi];
    if(game.mode==='ai'&&game.active===game.aiIndex)return `<section class=\"handDock\">${tableFidgets()}<div class=\"handHeader\"><div><span class=\"eyebrow\">YOUR HAND</span><b>${p.hand.length} cards</b></div><div class=\"handResourceWrap ${resourceCoachVisible?'resourceCoachActive':''}\">${resourceCoach()}<div class=\"handResourceStrip\" onclick=\"UI.dismissResourceCoach()\">${resources(p)}</div></div><span class=\"locked\">Opponent turn</span></div><div class=\"handRow\">${p.hand.map(c=>handCard(p,pi,c,false)).join('')}</div></section>`;
    const owner=game.mode==='ai'?p:game.players[game.active],ownerPi=game.mode==='ai'?pi:game.active;
    return `<section class=\"handDock\">${tableFidgets()}<div class=\"handHeader\"><div><span class=\"eyebrow\">${game.mode==='ai'?'YOUR HAND':'ACTIVE HAND'}</span><b>${owner.hand.length} cards</b></div><div class=\"handResourceWrap ${resourceCoachVisible?'resourceCoachActive':''}\">${resourceCoach()}<div class=\"handResourceStrip\" onclick=\"UI.dismissResourceCoach()\">${resources(owner)}</div></div><div class=\"deckCounters\"><span>🎴 ${owner.fieldDeck.length}</span><span>🍂 ${owner.compost.length}</span></div></div>${game.phase==='Discard'?`<div class=\"discardNotice\">Rest: discard down to 7 · choose ${owner.hand.length-7} more.</div>`:''}<div class=\"handRow\">${owner.hand.map(c=>handCard(owner,ownerPi,c,true)).join('')}</div></section>`;
  }
"""
assert old in s, 'handPanel hook not found'
s=s.replace(old,new,1)

old="""    drawer:name=>{drawer=name;render();},
    fidget:el=>{if(!el)return;el.classList.remove('fidgetPop');void el.offsetWidth;el.classList.add('fidgetPop');setTimeout(()=>el.classList.remove('fidgetPop'),520);},
"""
new="""    drawer:name=>{drawer=name;render();},
    dismissResourceCoach:()=>{if(!resourceCoachVisible)return;resourceCoachVisible=false;render();},
    fidget:el=>{if(!el)return;el.classList.remove('fidgetPop');void el.offsetWidth;el.classList.add('fidgetPop');setTimeout(()=>el.classList.remove('fidgetPop'),520);},
"""
assert old in s, 'UI export hook not found'
s=s.replace(old,new,1)
p.write_text(s)

p=Path('styles.css')
s=p.read_text()
s += """

/* ===== resource HUD readability + new-player coach ===== */
.handResourceStrip .resourceChip,.handResourceStrip .resourceChip b,.handResourceStrip .resourceChip span{color:#17140f!important}
.handResourceWrap{position:relative;margin-left:auto;display:flex;align-items:center}
.handResourceWrap.resourceCoachActive .handResourceStrip{border-radius:999px;box-shadow:0 0 0 2px #f3c75f,0 0 0 6px rgba(243,199,95,.22),0 0 18px rgba(255,213,99,.46);animation:resourceCoachPulse 1.7s ease-in-out infinite}
.resourceCoach{position:absolute;z-index:70;left:50%;bottom:calc(100% + 12px);transform:translateX(-50%);width:max-content;max-width:260px;padding:9px 11px;border:1px solid #d4aa4f;border-radius:10px;background:#fff3cf;color:#17140f;box-shadow:0 8px 22px rgba(20,18,14,.3);display:grid;grid-template-columns:1fr auto;column-gap:10px;row-gap:2px;align-items:center}
.resourceCoach:after{content:'';position:absolute;left:50%;bottom:-7px;width:12px;height:12px;background:#fff3cf;border-right:1px solid #d4aa4f;border-bottom:1px solid #d4aa4f;transform:translateX(-50%) rotate(45deg)}
.resourceCoach b{font-size:12px;color:#17140f}.resourceCoach span{grid-column:1/2;font-size:10px;line-height:1.25;color:#3c3426}.resourceCoach button{grid-column:2;grid-row:1/3;padding:4px 7px;border-radius:7px;border:1px solid #b98c34;background:#f8dfa0;color:#17140f;font-size:10px;font-weight:800;cursor:pointer}
@keyframes resourceCoachPulse{0%,100%{filter:none}50%{filter:brightness(1.08)}}
"""
p.write_text(s)

p=Path('tests/ui-coordinator-test.js')
s=p.read_text()
s += """
assert(client.includes('resourceCoachVisible')&&client.includes('Your Resources'),'new-player resource coach missing');
assert(client.includes('dismissResourceCoach'),'resource coach dismissal missing');
assert(styles.includes('.handResourceStrip .resourceChip b')&&styles.includes('color:#17140f!important'),'resource numbers should be black');
assert(styles.includes('.resourceCoach')&&styles.includes('@keyframes resourceCoachPulse'),'resource coach highlight styling missing');
console.log('✓ resource HUD uses black text and a dismissible new-player highlight');
"""
p.write_text(s)
