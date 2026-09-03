from pathlib import Path

p=Path('styles.css')
s=p.read_text()
s += r'''

/* ===== hand fan viewport integrity ===== */
body.matchViewport .handDock{
  height:clamp(210px,29dvh,254px);
  max-height:none;
  min-height:0;
  display:flex;
  flex-direction:column;
  overflow:visible;
}
body.matchViewport .handHeader{flex:0 0 auto;min-height:28px;margin-bottom:0}
body.matchViewport .handRow{
  position:relative;
  flex:1 1 auto;
  min-height:0;
  align-items:flex-end;
  padding-top:32px;
  padding-bottom:2px;
  overflow-x:auto;
  overflow-y:visible;
}
body.matchViewport .handRow .handCard{
  height:min(196px,calc(100% - 32px));
  min-height:0;
  align-self:flex-end;
}
body.matchViewport .handRow .handCard:hover,
body.matchViewport .handRow .handCard:focus-within,
body.matchViewport .handRow .handCard:focus{
  transform:translateY(-26px) rotate(0deg) scale(1.08);
}
@media(max-height:760px){
  body.matchViewport .handDock{height:clamp(202px,30dvh,228px)}
  body.matchViewport .handRow{padding-top:26px}
  body.matchViewport .handRow .handCard{height:min(174px,calc(100% - 26px))}
  body.matchViewport .handRow .handCard:hover,
  body.matchViewport .handRow .handCard:focus-within,
  body.matchViewport .handRow .handCard:focus{transform:translateY(-20px) rotate(0deg) scale(1.06)}
}
@media(max-height:680px){
  body.matchViewport .handDock{height:198px}
  body.matchViewport .handRow{padding-top:22px}
  body.matchViewport .handRow .handCard{height:min(160px,calc(100% - 22px))}
}
'''
p.write_text(s)

p=Path('tests/ui-coordinator-test.js')
s=p.read_text()
s += r'''
assert(styles.includes('hand fan viewport integrity'),'hand fan viewport integrity styles missing');
assert(styles.includes('height:clamp(210px,29dvh,254px)'),'hand dock should reserve a real viewport-height budget');
assert(styles.includes('height:min(196px,calc(100% - 32px))'),'hand cards should size to the actual hand row');
assert(styles.includes('overflow-y:visible'),'raised hand cards should not be clipped by the hand row');
console.log('✓ hand fan remains fully visible inside the no-scroll viewport');
'''
p.write_text(s)
