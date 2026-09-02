from pathlib import Path

p=Path('client.js')
s=p.read_text()
old="""    return `<section class=\"playerBanner ${top?'opponentBanner':'homeBanner'} ${active?'turnActive':''}\"><div class=\"identity\"><span class=\"sideLabel\">${top?'OPPONENT':'YOU'}${active?' · ACTIVE':''}</span><b>${esc(faction(p).hearthkeeper)}</b><button class=\"keeperChip\" onclick=\"UI.drawer('hearthkeeper:${pi}')\">🔥 View Hearthkeeper card</button><small>${esc(faction(p).short)}</small></div><div class=\"bannerResources\">${resources(p)}</div><div class=\"bannerStats\"><div class=\"hearthMedallion\" data-hearthseed-player=\"${pi}\"><span>🔥</span><b>${p.hearthseed}</b><small>HP</small>${exposed}</div>${prosperityBadge(p)}${pending}</div></section>`;
"""
new="""    return `<section class=\"playerBanner ${top?'opponentBanner':'homeBanner'} ${active?'turnActive':''}\"><div class=\"identity\"><span class=\"sideLabel\">${top?'OPPONENT':'YOU'}${active?' · ACTIVE':''}</span><b>${esc(faction(p).hearthkeeper)}</b><button class=\"keeperChip\" onclick=\"UI.drawer('hearthkeeper:${pi}')\">🔥 View Hearthkeeper card</button><small>${esc(faction(p).short)}</small></div><div class=\"bannerResources\">${top?resources(p):''}</div><div class=\"bannerStats\"><div class=\"hearthMedallion\" data-hearthseed-player=\"${pi}\"><span>🔥</span><b>${p.hearthseed}</b><small>HP</small>${exposed}</div>${prosperityBadge(p)}${pending}</div></section>`;
"""
assert old in s, 'player banner hook not found'
s=s.replace(old,new,1)
old="""    if(game.mode==='ai'&&game.active===game.aiIndex)return `<section class=\"handDock\">${tableFidgets()}<div class=\"handHeader\"><div><span class=\"eyebrow\">YOUR HAND</span><b>${p.hand.length} cards</b></div><span class=\"locked\">Opponent turn</span></div><div class=\"handRow\">${p.hand.map(c=>handCard(p,pi,c,false)).join('')}</div></section>`;
    const owner=game.mode==='ai'?p:game.players[game.active],ownerPi=game.mode==='ai'?pi:game.active;
    return `<section class=\"handDock\">${tableFidgets()}<div class=\"handHeader\"><div><span class=\"eyebrow\">${game.mode==='ai'?'YOUR HAND':'ACTIVE HAND'}</span><b>${owner.hand.length} cards</b></div><div class=\"deckCounters\"><span>🎴 ${owner.fieldDeck.length}</span><span>🍂 ${owner.compost.length}</span></div></div>${game.phase==='Discard'?`<div class=\"discardNotice\">Rest: discard down to 7 · choose ${owner.hand.length-7} more.</div>`:''}<div class=\"handRow\">${owner.hand.map(c=>handCard(owner,ownerPi,c,true)).join('')}</div></section>`;
"""
new="""    if(game.mode==='ai'&&game.active===game.aiIndex)return `<section class=\"handDock\">${tableFidgets()}<div class=\"handHeader\"><div><span class=\"eyebrow\">YOUR HAND</span><b>${p.hand.length} cards</b></div><div class=\"handResourceStrip\">${resources(p)}</div><span class=\"locked\">Opponent turn</span></div><div class=\"handRow\">${p.hand.map(c=>handCard(p,pi,c,false)).join('')}</div></section>`;
    const owner=game.mode==='ai'?p:game.players[game.active],ownerPi=game.mode==='ai'?pi:game.active;
    return `<section class=\"handDock\">${tableFidgets()}<div class=\"handHeader\"><div><span class=\"eyebrow\">${game.mode==='ai'?'YOUR HAND':'ACTIVE HAND'}</span><b>${owner.hand.length} cards</b></div><div class=\"handResourceStrip\">${resources(owner)}</div><div class=\"deckCounters\"><span>🎴 ${owner.fieldDeck.length}</span><span>🍂 ${owner.compost.length}</span></div></div>${game.phase==='Discard'?`<div class=\"discardNotice\">Rest: discard down to 7 · choose ${owner.hand.length-7} more.</div>`:''}<div class=\"handRow\">${owner.hand.map(c=>handCard(owner,ownerPi,c,true)).join('')}</div></section>`;
"""
assert old in s, 'hand panel hook not found'
s=s.replace(old,new,1)
p.write_text(s)

p=Path('styles.css')
s=p.read_text()
s += """

/* ===== persistent hand + resource HUD ===== */
.client{padding-bottom:258px}
.handDock{position:fixed;left:50%;transform:translateX(-50%);bottom:0;width:min(1552px,calc(100vw - 28px));margin:0;z-index:52;box-shadow:0 -10px 26px rgba(18,18,14,.28)}
.handHeader{align-items:center;gap:10px}
.handResourceStrip{margin-left:auto;display:flex;align-items:center}
.handResourceStrip .resourceRow{gap:5px;flex-wrap:nowrap}
.handResourceStrip .resourceChip{min-width:42px;padding:4px 7px;background:rgba(255,246,223,.96)}
.handResourceStrip .resourceChip span{font-size:14px}.handResourceStrip .resourceChip b{font-size:12px}
.homeBanner .bannerResources:empty{display:none}
@media (max-height:760px){.client{padding-bottom:225px}.handCard{height:192px;flex-basis:154px}.handDock{padding-top:7px}.handRow{padding-bottom:8px}}
"""
p.write_text(s)

p=Path('tests/ui-coordinator-test.js')
s=p.read_text()
s += """
assert(client.includes('handResourceStrip')&&client.includes('${resources(owner)}'),'hand HUD resource strip missing');
assert(styles.includes('.handDock{position:fixed'),'hand dock should stay attached to the viewport');
assert(styles.includes('.handResourceStrip'),'hand resource HUD styling missing');
assert(client.includes("${top?resources(p):''}"),'home banner should not duplicate the hand resource HUD');
console.log('✓ resources stay visible with the fixed hand HUD');
"""
p.write_text(s)
