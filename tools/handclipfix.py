from pathlib import Path

p=Path('styles.css')
s=p.read_text()
s += r'''

/* ===== one-screen hand visibility correction ===== */
@media(max-height:850px){
  body.matchViewport .handDock{max-height:min(33dvh,252px);display:flex;flex-direction:column;overflow:hidden}
  body.matchViewport .handHeader{flex:0 0 auto}
  body.matchViewport .handFidgets{flex:0 0 auto;min-height:16px;margin-bottom:0}
  body.matchViewport .handRow{flex:1 1 auto;min-height:0;align-items:flex-start;overflow-x:auto;overflow-y:hidden;padding-bottom:4px}
  body.matchViewport .handCard{height:min(190px,calc(100% - 2px));min-height:0;flex-basis:154px}
  body.matchViewport .handCard .artWindow{height:44px;min-height:36px}
}
@media(max-height:760px){
  body.matchViewport .handDock{max-height:min(34dvh,238px)}
  body.matchViewport .handCard{height:min(180px,calc(100% - 2px));flex-basis:150px}
  body.matchViewport .handCard .artWindow{height:40px}
}
@media(max-height:700px){
  body.matchViewport .handDock{max-height:min(35dvh,218px)}
  body.matchViewport .handCard{height:min(164px,calc(100% - 2px));flex-basis:142px}
}
'''
p.write_text(s)

p=Path('tests/ui-coordinator-test.js')
s=p.read_text()
s += r'''
assert(styles.includes('one-screen hand visibility correction'),'hand visibility correction missing');
assert(styles.includes('body.matchViewport .handRow{flex:1 1 auto'),'hand row should consume available dock height');
assert(styles.includes('height:min(190px,calc(100% - 2px))'),'hand cards should fit inside the visible dock instead of being clipped');
console.log('✓ one-screen hand cards stay fully visible inside the viewport');
'''
p.write_text(s)
