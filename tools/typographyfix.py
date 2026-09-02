from pathlib import Path

p=Path('styles.css')
s=p.read_text()
s += r'''

/* ===== card typography quality pass ===== */
.handCard{height:236px}
.handCard .artWindow{height:64px}
.handCard .cardFrame{padding:9px 10px 10px}
.handCard .cardTop{gap:5px;align-items:flex-start}
.handCard .cardTop b{font-size:12px;line-height:1.16;letter-spacing:-.01em;overflow-wrap:anywhere;text-wrap:balance}
.handCard .cardTop .advancedTag{flex:0 0 auto;margin-top:1px}
.handCard .badgeRow{margin:7px 0 6px;gap:5px}
.handCard .badgeRow span{font-size:9px;line-height:1.2;padding:2px 5px}
.handCard p{min-height:0;margin:7px 0 6px;font-size:9.25px;line-height:1.48;color:#454b43;overflow-wrap:break-word}
.handCard .musterLine,.handCard .homeLine,.handCard .toolLine,.handCard .costLine{margin:5px 0;font-size:8.25px;line-height:1.35}
.handCard .whyDisabled,.handCard .freshTag,.handCard .manualTag,.handCard .warnTag{line-height:1.25}
.handCard .dragHint{line-height:1.25}
.handCard .artWindow>small{line-height:1.25;padding:0 6px;text-align:center}
@media(max-height:760px){
  .handCard{height:205px;flex-basis:158px}
  .handCard .artWindow{height:55px}
  .handCard .cardFrame{padding:7px 8px 8px}
  .handCard .cardTop b{font-size:11px;line-height:1.15}
  .handCard p{font-size:8.6px;line-height:1.42;margin:5px 0}
}
'''
p.write_text(s)

p=Path('tests/ui-coordinator-test.js')
s=p.read_text()
s += r'''
assert(styles.includes('card typography quality pass'),'card typography quality pass missing');
assert(styles.includes('.handCard p{min-height:0')&&styles.includes('line-height:1.48'),'hand card rules text needs comfortable line spacing');
assert(styles.includes('.handCard .cardTop b{font-size:12px')&&styles.includes('text-wrap:balance'),'hand card titles need balanced wrapping');
assert(styles.includes('.handCard .cardFrame{padding:9px 10px 10px}'),'hand cards need improved internal spacing');
console.log('✓ hand cards use relaxed, readable typography');
'''
p.write_text(s)
