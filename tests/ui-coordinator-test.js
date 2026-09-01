const fs=require('fs');
const assert=require('assert');

const html=fs.readFileSync('index.html','utf8');
const client=fs.readFileSync('client.js','utf8');

assert(html.includes('styles.css?v=076'),'styles.css must be the single stylesheet');
assert(html.includes('data.js?v=076')&&html.includes('engine.js?v=076')&&html.includes('client.js?v=076'),'consolidated runtime files are not wired');
assert((html.match(/<script src=/g)||[]).length===3,'index.html should load exactly three runtime scripts');
assert((html.match(/rel="stylesheet"/g)||[]).length===1,'index.html should load exactly one stylesheet');
assert(client.includes('CoordinatedMutationObserver'),'coordinated observer shim missing from consolidated client');
assert(client.includes('appObservers'),'single app observer registry missing');
assert(client.includes("version:'0.7.6'"),'coordinator version missing');
assert(html.includes('Tabletop Client v0.7.6'),'presentation version not bumped');

const retired=[
  'client-v062.js','ui-coordinator.js','tabletop-interactions.js','tabletop-deck-polish.js','social-links.js','ability-ui.js',
  'client-v062.css','tabletop-interactions.css','tabletop-deck-polish.css','social-links.css','ability-ui.css','deck-stability.css',
  'engine-v062.js','engine-rules-patches.js','ability-completion.js','ability-completion-fixes.js','data-v062-completion.js',
  'fixed-tabletop.js','fixed-tabletop.css','app.js','_stop'
];
for(const file of retired)assert(!fs.existsSync(file),`${file} should be retired after consolidation`);


assert(client.includes("beginner:{label:'Beginner',skill:'beginner'"),'Beginner AI skill profile missing');
assert(client.includes('Fast, scrappy pressure'),'Porchlight archetype onboarding copy missing');
assert(client.includes('Sturdy, recursive defense'),'Stonecap archetype onboarding copy missing');
assert(client.includes('AI harvests ${RLABEL[choice]}'),'AI action narration missing');

console.log('✓ runtime is consolidated to data.js + engine.js + client.js + styles.css');
console.log('✓ UI observer coordination survived consolidation');

assert(client.includes('Beginner — forgiving priorities'),'beginner AI should be defined by decision quality');
assert(client.includes('AI Pace'),'AI pace should be separate from difficulty');
assert(client.includes('View Hearthkeeper card'),'Hearthkeeper reference access missing');
console.log('✓ Hearthkeeper identity and AI skill/pacing controls');

assert(client.includes('AI Pace'),'AI pace should be separate from difficulty');
assert(client.includes('View Hearthkeeper card'),'Hearthkeeper reference access missing');
console.log('✓ Hearthkeeper identity and AI skill/pacing controls');
