from pathlib import Path

p=Path('client.js')
s=p.read_text()
s=s.replace("  function render(){\n    if(!game){app.innerHTML=setupScreen();return;}","  function render(){\n    document.body.classList.toggle('matchViewport',!!game);\n    if(!game){app.innerHTML=setupScreen();return;}",1)
s=s.replace('Client v0.8.0 · Rules v0.6.2','Client v0.8.1 · Rules v0.6.2')
s=s.replace("version:'0.8.0'","version:'0.8.1'")
p.write_text(s)

p=Path('styles.css')
s=p.read_text()
s += r'''

/* ===== one-screen tabletop viewport ===== */
body.matchViewport{height:100dvh;min-height:0;overflow:hidden;overscroll-behavior:none}
body.matchViewport #app{height:100dvh;min-height:0;overflow:hidden}
body.matchViewport .client{height:100dvh;min-height:0;max-width:1580px;margin:0 auto;padding:8px 14px 0;display:grid;grid-template-rows:auto minmax(0,1fr) auto;overflow:hidden}
body.matchViewport .tableTopbar{position:relative;top:auto;margin:0;min-height:0}
body.matchViewport .tableSurface{width:100%;height:100%;min-height:0;margin:6px auto 0;padding:7px 10px 8px;overflow:hidden;display:grid;grid-template-rows:auto minmax(58px,1fr) minmax(54px,.9fr) auto minmax(54px,.9fr) minmax(58px,1fr) auto;gap:4px}
body.matchViewport .tableSurface>.playerBanner{margin:0;min-height:0;padding:5px 9px;gap:10px}
body.matchViewport .tableSurface>.playerBanner .identity>b{font-size:15px}
body.matchViewport .tableSurface>.playerBanner .identity>small{font-size:8px}
body.matchViewport .tableSurface>.boardLane{min-height:0;margin:0;padding:4px 6px 5px;overflow:hidden;display:grid;grid-template-rows:auto minmax(0,1fr)}
body.matchViewport .tableSurface .laneTitle{min-height:0;margin:0 0 3px;line-height:1}
body.matchViewport .tableSurface .laneTitle>span{font-size:12px}
body.matchViewport .tableSurface .laneTitle>b{font-size:10px}
body.matchViewport .tableSurface .laneTitle>small{font-size:7px}
body.matchViewport .tableSurface .buildingGrid,body.matchViewport .tableSurface .critterRow{height:100%;min-height:0;align-items:stretch;overflow-x:auto;overflow-y:hidden;padding:1px 2px 3px;gap:7px}
body.matchViewport .tableSurface .gameCard{height:100%;min-height:0;flex-basis:158px;border-radius:9px;overflow:hidden}
body.matchViewport .tableSurface .building{flex-basis:166px}
body.matchViewport .tableSurface .critter{flex-basis:150px}
body.matchViewport .tableSurface .gameCard .artWindow{height:clamp(28px,4.4vh,46px);min-height:28px;gap:0}
body.matchViewport .tableSurface .gameCard .artWindow>span{font-size:clamp(18px,2.4vh,26px)}
body.matchViewport .tableSurface .gameCard .artWindow>small{font-size:6px}
body.matchViewport .tableSurface .gameCard .cardFrame{padding:4px 6px 5px}
body.matchViewport .tableSurface .gameCard .cardTop b{font-size:10px;line-height:1.08}
body.matchViewport .tableSurface .gameCard .badgeRow{margin:3px 0;gap:3px}
body.matchViewport .tableSurface .gameCard .badgeRow span{padding:1px 4px;font-size:7px}
body.matchViewport .tableSurface .gameCard p{min-height:0;max-height:2.5em;margin:3px 0;font-size:7.5px;line-height:1.22;overflow:hidden}
body.matchViewport .tableSurface .musterLine,body.matchViewport .tableSurface .homeLine,body.matchViewport .tableSurface .toolLine,body.matchViewport .tableSurface .costLine{margin:2px 0;font-size:7px;line-height:1.15}
body.matchViewport .combatRibbon{width:min(900px,94%);min-height:0;margin:0 auto;padding:5px 9px;gap:6px}
body.matchViewport .combatRibbon.quiet b{font-size:10px}
body.matchViewport .combatRibbon.quiet small{font-size:7px}
body.matchViewport .activeCombat{border-radius:10px}
body.matchViewport .combatHeading>span{font-size:15px}
body.matchViewport .combatHeading b{font-size:10px}
body.matchViewport .combatHeading small{font-size:7px}
body.matchViewport .combatButtons{margin-top:3px}
body.matchViewport .handDock{position:relative;bottom:auto;z-index:35;min-height:0;max-height:min(31dvh,270px);margin:4px auto 0;width:100%;padding:5px 10px 3px;overflow:hidden}
body.matchViewport .handHeader{margin-bottom:3px;align-items:center}
body.matchViewport .handRow{min-height:0;overflow-x:auto;overflow-y:hidden;padding:2px 3px 6px}
body.matchViewport .gameDrawer{position:fixed;max-height:calc(100dvh - 26px);overflow-y:auto}
body.matchViewport .drawerBackdrop{position:fixed}
body.matchViewport .winnerOverlay,body.matchViewport .harvestOverlay{position:fixed}

@media(max-height:850px){
  body.matchViewport .client{padding-top:5px}
  body.matchViewport .tableTopbar{padding:6px 10px;border-radius:11px}
  body.matchViewport .brand{font-size:18px}
  body.matchViewport .brandBlock>span{font-size:8px}
  body.matchViewport .phasePip{padding:3px 6px;font-size:8px}
  body.matchViewport .tableSurface{margin-top:4px;padding:5px 8px 6px;grid-template-rows:auto minmax(48px,1fr) minmax(44px,.9fr) auto minmax(44px,.9fr) minmax(48px,1fr) auto;gap:3px}
  body.matchViewport .tableSurface>.playerBanner{padding:3px 7px}
  body.matchViewport .tableSurface>.playerBanner .bannerStats{transform:scale(.88);transform-origin:right center}
  body.matchViewport .tableSurface .boardLane{padding:3px 5px 4px}
  body.matchViewport .tableSurface .gameCard .artWindow{height:30px}
  body.matchViewport .tableSurface .gameCard p{display:none}
  body.matchViewport .tableSurface .musterLine{padding:2px 4px}
  body.matchViewport .handDock{max-height:222px;padding-top:4px}
  body.matchViewport .handCard{height:194px;flex-basis:154px}
  body.matchViewport .handCard .artWindow{height:48px}
  body.matchViewport .handCard .cardFrame{padding:7px 8px 8px}
  body.matchViewport .handCard .cardTop b{font-size:11px;line-height:1.14}
  body.matchViewport .handCard p{font-size:8.5px;line-height:1.38;margin:5px 0}
  body.matchViewport .handFidgets{margin-bottom:1px;min-height:20px}
}

@media(max-height:700px){
  body.matchViewport .handDock{max-height:190px}
  body.matchViewport .handCard{height:164px;flex-basis:142px}
  body.matchViewport .handCard .artWindow{height:38px}
  body.matchViewport .handCard p{font-size:8px;line-height:1.28;max-height:3.85em;overflow:hidden}
  body.matchViewport .tableSurface .gameCard .artWindow{display:none}
  body.matchViewport .tableSurface{grid-template-rows:auto minmax(38px,1fr) minmax(36px,.9fr) auto minmax(36px,.9fr) minmax(38px,1fr) auto}
}
'''
p.write_text(s)

p=Path('index.html')
s=p.read_text().replace('v0.8.0','v0.8.1').replace('v=080','v=081')
p.write_text(s)

for tp in Path('tests').glob('*.js'):
    t=tp.read_text().replace('v0.8.0','v0.8.1').replace('v=080','v=081')
    tp.write_text(t)

p=Path('tests/ui-coordinator-test.js')
s=p.read_text()
s += r'''
assert(client.includes("document.body.classList.toggle('matchViewport',!!game)"),'match viewport body state missing');
assert(styles.includes('body.matchViewport{height:100dvh')&&styles.includes('overflow:hidden;overscroll-behavior:none'),'match page should not vertically scroll');
assert(styles.includes('grid-template-rows:auto minmax(0,1fr) auto'),'client should allocate viewport between topbar, table, and hand');
assert(styles.includes('body.matchViewport .tableSurface')&&styles.includes('overflow-x:auto;overflow-y:hidden'),'table should use horizontal lane overflow only');
assert(!styles.includes('body.matchViewport .tableSurface{transform:scale'),'one-screen tabletop must not use transform scaling');
console.log('✓ match viewport is one-screen, vertically fixed, and keeps cards as normal DOM elements');
'''
p.write_text(s)
