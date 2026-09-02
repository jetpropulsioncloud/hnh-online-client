const fs=require('fs');
const assert=require('assert');

const html=fs.readFileSync('index.html','utf8');
const client=fs.readFileSync('client.js','utf8');
const styles=fs.readFileSync('styles.css','utf8');

assert(html.includes('styles.css?v=080'),'styles.css must be the single stylesheet');
assert(html.includes('data.js?v=080')&&html.includes('engine.js?v=080')&&html.includes('client.js?v=080'),'consolidated runtime files are not wired');
assert((html.match(/<script src=/g)||[]).length===3,'index.html should load exactly three runtime scripts');
assert((html.match(/rel="stylesheet"/g)||[]).length===1,'index.html should load exactly one stylesheet');
assert(client.includes('CoordinatedMutationObserver'),'coordinated observer shim missing from consolidated client');
assert(client.includes('appObservers'),'single app observer registry missing');
assert(html.includes('Tabletop Client v0.8.0'),'presentation version not bumped');

const retired=[
  'client-v062.js','ui-coordinator.js','tabletop-interactions.js','tabletop-deck-polish.js','social-links.js','ability-ui.js',
  'client-v062.css','tabletop-interactions.css','tabletop-deck-polish.css','social-links.css','ability-ui.css','deck-stability.css',
  'engine-v062.js','engine-rules-patches.js','ability-completion.js','ability-completion-fixes.js','data-v062-completion.js',
  'fixed-tabletop.js','fixed-tabletop.css','app.js','_stop'
];
for(const file of retired)assert(!fs.existsSync(file),`${file} should be retired after consolidation`);

assert(client.includes("beginner:{label:'Beginner',skill:'beginner'"),'Beginner AI skill profile missing');
assert(client.includes('Fast & scrappy'),'Hazel archetype onboarding copy missing');
assert(client.includes('Sturdy & recursive'),'Mosswick archetype onboarding copy missing');
assert(client.includes('AI harvests ${RLABEL[choice]}'),'AI action narration missing');
assert(client.includes('<option value="beginner" selected>Beginner</option>'),'simple Beginner label missing');
assert(client.includes('<option value="standard">Standard</option>'),'simple Standard label missing');
assert(client.includes('<option value="hard">Hard</option>'),'simple Hard label missing');
assert(!client.includes('forgiving priorities')&&!client.includes('sensible priorities')&&!client.includes('sharp priorities'),'priority copy should not appear in setup');
assert(!client.includes('AI Pace')&&!client.includes('aiPace'),'AI pace control/state should be removed');
assert(client.includes('View Hearthkeeper card'),'Hearthkeeper reference access missing');

assert(client.includes('buildWallet')&&client.includes('YOUR RESOURCES'),'Build Book must show the active player resource wallet');
assert(styles.includes('.buildWallet'),'Build Book resource wallet styling missing');
assert(client.includes('handFidgets')&&client.includes('fidgetAcorn')&&client.includes('fidgetMushroom'),'hand-area fidgets missing');
assert(styles.includes('.tableFidget')&&styles.includes('@keyframes tableFidgetBounce'),'ambient fidget styling/animation missing');
assert(!client.includes('hearthstepTrail')&&!styles.includes('.hearthstepTrail'),'old Hearthstep bar should be retired');
assert(client.includes('compactTrial'),'compact Frost Trial ribbon missing');
assert(!client.includes('trialDivider'),'duplicate Frost Trial divider should not render');

console.log('✓ runtime consolidation and observer coordination');
console.log('✓ simple Hearthkeeper + AI difficulty setup');
console.log('✓ Build Book wallet, ambient fidgets, and compact Frost Trial');

assert(!client.includes('aiPace'),'AI pace state should be removed');
assert(!client.includes('forgiving priorities')&&!client.includes('sensible priorities')&&!client.includes('sharp priorities'),'difficulty labels should stay simple');
assert(client.includes('<option value=\"beginner\" selected>Beginner</option>')&&client.includes('<option value=\"standard\">Standard</option>')&&client.includes('<option value=\"hard\">Hard</option>'),'simple AI difficulty choices missing');
assert(client.includes('handFidgets')&&!client.includes('hearthstepTrail'),'compact hand-area fidgets should replace the Hearthstep bar');
assert(!client.includes('trialDivider'),'duplicate Frost Trial divider should be removed from render');
console.log('✓ setup declutter, ambient fidgets, and compact Frost Trial');

assert(client.includes('installDirectManipulation'),'direct manipulation controller missing');
assert(client.includes('recruitDraggable')&&client.includes('data-muster-uid'),'drag-to-recruit hooks missing');
assert(client.includes('attackDraggable')&&client.includes('dragAttackArrow'),'drag-to-attack arrow hooks missing');
assert(!client.includes('function attackAction(')&&!client.includes('id=\"atk-${r.uid}'),'legacy attack dropdown UI should be removed');
assert(styles.includes('.dragCardGhost')&&styles.includes('.dragAttackArrow')&&styles.includes('.directDropTarget'),'direct manipulation styling missing');
assert(styles.includes('.handFidgets'),'Hearthstep pieces should live above the hand');
console.log('✓ drag-to-recruit, drag-arrow attack, and hand-area fidgets');

assert(client.includes('combatLinkOverlay'),'persistent combat arrow overlay missing');
assert(client.includes('combatBlockPath'),'blue block arrow path missing');
assert(client.includes('blockDraggable'),'direct block dragging missing');
assert(client.includes('musterIdentity')&&client.includes('musterRulesText'),'Muster identity cleanup missing');
assert(client.includes("version:'0.8.0'"),'v0.8.0 coordinator version missing');
console.log('✓ persistent attack/block arrows and clearer Muster identity');

assert(client.includes('data-block-attack-index'),'explicit block attack index missing');
assert(client.includes('setPointerCapture'),'pointer capture missing for direct manipulation');
assert(styles.includes('.blockDraggable{touch-action:none'),'block drag touch-action guard missing');
console.log('✓ human blocking uses explicit attack targets and stable pointer capture');
