const fs=require('fs');
const assert=require('assert');

const html=fs.readFileSync('index.html','utf8');
const coordinator=fs.readFileSync('ui-coordinator.js','utf8');

const clientPos=html.indexOf('client-v062.js');
const coordinatorPos=html.indexOf('ui-coordinator.js');
const interactionPos=html.indexOf('tabletop-interactions.js');
assert(clientPos>=0&&coordinatorPos>clientPos&&interactionPos>coordinatorPos,'UI coordinator must load after the core client and before enhancement scripts');
assert(coordinator.includes('CoordinatedMutationObserver'),'coordinated observer shim missing');
assert(coordinator.includes('appObservers'),'single app observer registry missing');
assert(coordinator.includes("version:'0.7.3'"),'coordinator version missing');
assert(html.includes('Tabletop Client v0.7.3'),'presentation version not bumped');
assert(!html.includes('fixed-tabletop'),'obsolete fixed tabletop must not be loaded');
assert(!fs.existsSync('fixed-tabletop.js')&&!fs.existsSync('fixed-tabletop.css'),'obsolete fixed-tabletop experiment should be removed');
assert(!fs.existsSync('app.js')&&!fs.existsSync('styles.css'),'unused legacy client files should be removed');
assert(!fs.existsSync('_stop'),'accidental placeholder file should be removed');

console.log('✓ UI enhancement observers are coordinated instead of competing on the app subtree');
console.log('✓ obsolete/accidental runtime files are removed');
