const fs=require('fs');
const assert=require('assert');

const html=fs.readFileSync('index.html','utf8');
const client=fs.readFileSync('client.js','utf8');
const styles=fs.readFileSync('styles.css','utf8');
const cardUx=fs.readFileSync('card-ux.js','utf8');
const cardStyles=fs.readFileSync('card-ux.css','utf8');

assert(html.includes('styles.css?v=080'),'styles.css must be loaded');
assert(html.includes('card-ux.css?v=081'),'v0.8.1 card UX stylesheet must be loaded');
assert(html.includes('data.js?v=080')&&html.includes('engine.js?v=080')&&html.includes('client.js?v=080'),'consolidated runtime files are not wired');
assert(html.includes('card-ux.js?v=081'),'v0.8.1 card UX behavior layer must be loaded');
assert((html.match(/<script src=/g)||[]).length===4,'index.html should load three core runtime scripts plus card-ux.js');
assert((html.match(/rel="stylesheet"/g)||[]).length===2,'index.html should load the core stylesheet plus card-ux.css');
assert(client.includes('CoordinatedMutationObserver'),'coordinated observer shim missing from consolidated client');
assert(client.includes('appObservers'),'single app observer registry missing');
assert(html.includes('Tabletop Client v0.8.1'),'presentation version not bumped');

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

assert(client.includes('cancelAttackDraft'),'selected attacker X control missing');
assert(client.includes('>Declare Attack</button>'),'single Declare Attack action missing');
assert(!client.includes('Commit attack'),'legacy Commit attack copy should be removed');
assert(client.includes("cancelAttack:uid=>doAction(()=>E.cancelAttack"),'cancel attack UI action missing');
assert(styles.includes('.cancelAttackDraft'),'selected attacker X styling missing');
console.log('✓ attack drafting uses one Declare Attack button with removable selections');

assert(client.includes('handResourceStrip')&&client.includes('${resources(owner)}'),'hand HUD resource strip missing');
assert(styles.includes('.handDock{position:fixed'),'hand dock should stay attached to the viewport');
assert(styles.includes('.handResourceStrip'),'hand resource HUD styling missing');
assert(client.includes("${top?resources(p):''}"),'home banner should not duplicate the hand resource HUD');
console.log('✓ resources stay visible with the fixed hand HUD');

assert(client.includes('resourceCoachVisible')&&client.includes('Your Resources'),'new-player resource coach missing');
assert(client.includes('dismissResourceCoach'),'resource coach dismissal missing');
assert(styles.includes('.handResourceStrip .resourceChip b')&&styles.includes('color:#17140f!important'),'resource numbers should be black');
assert(styles.includes('.resourceCoach')&&styles.includes('@keyframes resourceCoachPulse'),'resource coach highlight styling missing');
console.log('✓ resource HUD uses black text and a dismissible new-player highlight');

assert(styles.includes('card typography quality pass'),'card typography quality pass missing');
assert(styles.includes('.handCard p{min-height:0')&&styles.includes('line-height:1.48'),'hand card rules text needs comfortable line spacing');
assert(styles.includes('.handCard .cardTop b{font-size:12px')&&styles.includes('text-wrap:balance'),'hand card titles need balanced wrapping');
assert(styles.includes('.handCard .cardFrame{padding:9px 10px 10px}'),'hand cards need improved internal spacing');
console.log('✓ hand cards use relaxed, readable typography');

assert(client.includes('tactile SFX v1')&&client.includes('window.HNH_SFX'),'SFX manager missing');
assert(client.includes("pickup(){")&&client.includes("recruit(){")&&client.includes("build(){")&&client.includes("attack(){")&&client.includes("block(){")&&client.includes("resource(){")&&client.includes("hearth(){"),'core tactile SFX palette incomplete');
assert(client.includes("localStorage.getItem(STORAGE_KEY)")&&client.includes('sfxVolume'),'SFX persistence or volume controls missing');
assert(styles.includes('.audioControls')&&styles.includes('.sfxVolume'),'SFX control styling missing');
console.log('✓ tactile SFX manager, event hooks, mute and volume controls present');

assert(client.includes("document.body.classList.toggle('matchViewport',!!game)"),'match viewport body state missing');
assert(styles.includes('body.matchViewport{height:100dvh')&&styles.includes('overflow:hidden;overscroll-behavior:none'),'match page should not vertically scroll');
assert(styles.includes('grid-template-rows:auto minmax(0,1fr) auto'),'client should allocate viewport between topbar, table, and hand');
assert(styles.includes('body.matchViewport .tableSurface')&&styles.includes('overflow-x:auto;overflow-y:hidden'),'table should use horizontal lane overflow only');
assert(!styles.includes('body.matchViewport .tableSurface{transform:scale'),'one-screen tabletop must not use transform scaling');
console.log('✓ match viewport is one-screen, vertically fixed, and keeps cards as normal DOM elements');

assert(cardStyles.includes('Hearthstone-inspired hand tray'),'card-table hand tray styling missing');
assert(cardStyles.includes('.handCard:hover')&&cardStyles.includes('scale(1.30)'),'hand hover lift/zoom missing');
assert(cardStyles.includes('played cards collapse into readable board pieces'),'compact board-piece presentation missing');
assert(cardUx.includes('fanHand')&&cardUx.includes('--fan-rotate'),'dynamic hand fanning behavior missing');
assert(cardUx.includes("Client v0.8.1 · Rules v0.6.2"),'v0.8.1 chrome sync missing');
console.log('✓ v0.8.1 card-table hand, compact board pieces, and fan behavior');

assert(styles.includes('one-screen hand visibility correction'),'hand visibility correction missing');
assert(styles.includes('body.matchViewport .handRow{flex:1 1 auto'),'hand row should consume available dock height');
assert(styles.includes('height:min(190px,calc(100% - 2px))'),'hand cards should fit inside the visible dock instead of being clipped');
console.log('✓ one-screen hand cards stay fully visible inside the viewport');

assert(client.includes('handCard(p,pi,c,false,i,p.hand.length)')&&client.includes('--hand-offset'),'hand fan metadata missing');
assert(styles.includes('Hearthstone-inspired hand fan')&&styles.includes('rotate(calc(var(--hand-offset) * 1.45deg))'),'hand fan arc styling missing');
assert(styles.includes('translateY(-34px) rotate(0deg) scale(1.12)'),'hovered hand card should rise and enlarge');
assert(styles.includes('justify-content:center;align-items:flex-end'),'hand should be centered at the bottom of the tabletop');
console.log('✓ Hearthstone-inspired overlapping hand fan and hover prominence');
