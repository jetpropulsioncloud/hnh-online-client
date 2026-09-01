const fs=require('fs');
const assert=require('assert');

const css=fs.readFileSync('viewport-lock.css','utf8');
const js=fs.readFileSync('viewport-lock.js','utf8');
const html=fs.readFileSync('index.html','utf8');

assert(css.includes('body:has(.cardInspector.peek) .sideDeckRail'),'deck fade override missing');
assert(css.includes('opacity:1!important'),'deck piles must stay fully colored during card preview');
assert(css.includes('overflow:hidden!important'),'match viewport must lock browser scrolling');
assert(css.includes('.hhViewportStage'),'viewport stage styles missing');
assert(css.includes('pointer-events:auto'),'scaled tabletop must remain clickable');
assert(!/\.hhViewportStage[^}]*pointer-events\s*:\s*none/s.test(css),'viewport stage must never disable pointer input');

assert(js.includes("stage.className='hhViewportStage'"),'viewport stage wrapper missing');
assert(js.includes('stage.scrollHeight'),'fit calculation must use natural tabletop height');
assert(js.includes('safeHeight/naturalHeight'),'height-fit scale missing');
assert(js.includes("window.dispatchEvent(new Event('scroll'))"),'deck rails must be re-anchored after scaling');
assert(!js.includes('preventDefault()'),'viewport locking must not steal click, pointer, wheel, or keyboard events');

assert(html.includes('viewport-lock.css?v=071'),'fixed tabletop stylesheet is not loaded');
assert(html.includes('viewport-lock.js?v=071'),'fixed tabletop script is not loaded');
assert(html.includes('Tabletop Client v0.7.1'),'client version was not bumped');

console.log('✓ fixed tabletop locks page scrolling without disabling interaction');
console.log('✓ deck piles remain fully colored during card hover/closeup');
