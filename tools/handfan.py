from pathlib import Path

p=Path('client.js')
s=p.read_text()
s=s.replace("${p.hand.map(c=>handCard(p,pi,c,false)).join('')}","${p.hand.map((c,i)=>handCard(p,pi,c,false,i,p.hand.length)).join('')}")
s=s.replace("${owner.hand.map(c=>handCard(owner,ownerPi,c,true)).join('')}","${owner.hand.map((c,i)=>handCard(owner,ownerPi,c,true,i,owner.hand.length)).join('')}")
s=s.replace("function handCard(p,pi,c,interactive){","function handCard(p,pi,c,interactive,index=0,count=1){")
old="return `<article class=\"gameCard handCard ${interactive?'':'lockedCard'}${dragClass}\"${dragAttrs}>"
new="const mid=(count-1)/2,offset=index-mid,fanStyle=`--hand-i:${index};--hand-count:${count};--hand-offset:${offset};--hand-abs:${Math.abs(offset)};`;\n    return `<article class=\"gameCard handCard ${interactive?'':'lockedCard'}${dragClass}\" style=\"${fanStyle}\"${dragAttrs}>"
if old not in s: raise SystemExit('hand card return marker missing')
s=s.replace(old,new,1)
p.write_text(s)

p=Path('styles.css')
s=p.read_text()
s += r'''

/* ===== Hearthstone-inspired hand fan ===== */
body.matchViewport .handDock{perspective:1100px;isolation:isolate}
body.matchViewport .handRow{justify-content:center;align-items:flex-end;gap:0;padding-inline:clamp(36px,7vw,120px);overflow-x:auto;overflow-y:visible;scroll-padding-inline:80px}
body.matchViewport .handRow .handCard{position:relative;flex:0 0 clamp(146px,10.8vw,178px);margin-left:clamp(-54px,-3.4vw,-34px);transform-origin:50% 112%;transform:translateY(calc(var(--hand-abs) * 3.2px)) rotate(calc(var(--hand-offset) * 1.45deg));z-index:calc(30 - var(--hand-abs));transition:transform .18s cubic-bezier(.2,.8,.2,1),box-shadow .18s ease,filter .18s ease,margin .18s ease;will-change:transform}
body.matchViewport .handRow .handCard:first-child{margin-left:0}
body.matchViewport .handRow .handCard:hover,body.matchViewport .handRow .handCard:focus-within,body.matchViewport .handRow .handCard:focus{z-index:120;transform:translateY(-34px) rotate(0deg) scale(1.12);box-shadow:0 22px 36px rgba(15,14,11,.48);filter:brightness(1.02)}
body.matchViewport .handRow .handCard:hover+ .handCard{margin-left:clamp(-46px,-2.7vw,-28px)}
body.matchViewport .handRow .recruitDraggable,body.matchViewport .handRow .attackDraggable,body.matchViewport .handRow .blockDraggable{touch-action:none}
body.matchViewport .handHeader{position:relative;z-index:140}
body.matchViewport .handResourceWrap{position:relative;z-index:145}

@media(max-width:1200px){
  body.matchViewport .handRow{padding-inline:30px}
  body.matchViewport .handRow .handCard{flex-basis:150px;margin-left:-44px}
}
@media(max-height:760px){
  body.matchViewport .handRow .handCard{margin-left:-42px;transform:translateY(calc(var(--hand-abs) * 2.2px)) rotate(calc(var(--hand-offset) * 1.15deg))}
  body.matchViewport .handRow .handCard:hover,body.matchViewport .handRow .handCard:focus-within,body.matchViewport .handRow .handCard:focus{transform:translateY(-22px) rotate(0deg) scale(1.08)}
}
@media(max-height:700px){
  body.matchViewport .handRow .handCard{margin-left:-38px}
}
'''
p.write_text(s)

p=Path('tests/ui-coordinator-test.js')
s=p.read_text()
s += r'''
assert(client.includes('handCard(p,pi,c,false,i,p.hand.length)')&&client.includes('--hand-offset'),'hand fan metadata missing');
assert(styles.includes('Hearthstone-inspired hand fan')&&styles.includes('rotate(calc(var(--hand-offset) * 1.45deg))'),'hand fan arc styling missing');
assert(styles.includes('translateY(-34px) rotate(0deg) scale(1.12)'),'hovered hand card should rise and enlarge');
assert(styles.includes('justify-content:center;align-items:flex-end'),'hand should be centered at the bottom of the tabletop');
console.log('✓ Hearthstone-inspired overlapping hand fan and hover prominence');
'''
p.write_text(s)
