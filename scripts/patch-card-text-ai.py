from pathlib import Path
import re


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'missing patch target: {label}')
    return text.replace(old, new, 1)

# --- Card text / source-of-truth sync ---
p = Path('data.js')
s = p.read_text()
s = replace_once(s,
    "founding: B('stonecap_root_cellar','Stonecap Root Cellar','Founding Production',{},4,1,{production:true,harvestChoice:['root','pebble'],text:'Harvest: gain 🫚 or 🪨. First attack damage to another Building each round is reduced by 1.',manual:'Founding prevention remains manual'}),",
    "founding: B('stonecap_root_cellar','Stonecap Root Cellar','Founding Production',{},4,1,{production:true,harvestChoice:['root','pebble'],text:'Harvest: gain 🫚 or 🪨. The first time each round another Building you control would take attack damage, prevent 1 of it.',manual:'Founding prevention remains manual'}),",
    'Stonecap Root Cellar printed text')
s = replace_once(s,
    "C('meadow_mouse_scout','Meadow Mouse Scout',['Lantern'],1,3,3,'When this is recruited, Shield a Building you control.',{shieldBuildingOnRecruit:true},['Mouse','Scout']),",
    "C('meadow_mouse_scout','Meadow Mouse Scout',['Lantern'],1,3,3,'When this is recruited, Shield a Building you control. Shield prevents its next single damage instance, then is removed.',{shieldBuildingOnRecruit:true},['Mouse','Scout']),",
    'Meadow Mouse Scout reminder')
s = replace_once(s,
    "S('bramble_climbing_kit','Bramble Climbing Kit','Tool',3,{sap:1,provision:1},'The attached Critter gains Eager.',{eager:true}),",
    "S('bramble_climbing_kit','Bramble Climbing Kit','Tool',3,{sap:1,provision:1},'The attached Critter gains Eager — it may attack the turn it is recruited.',{eager:true}),",
    'Bramble Climbing Kit reminder')
s = replace_once(s,
    "C('stone_toad_bruiser','Stone Toad Bruiser',['Gatewatch'],5,4,3,'Guard. This cannot attack the Hearthseed unless you have at least 5 active ✨. Crushing Blow 2.',{guard:true,hearthseedProsperityGate:5,crushingBlow:2},['Toad','Guard']),",
    "C('stone_toad_bruiser','Stone Toad Bruiser',['Gatewatch'],5,4,3,'Guard. This cannot attack the enemy Hearthseed unless you have at least 5 active ✨. Crushing Blow 2 — when this defeats a blocker, deal 2 damage to the original target.',{guard:true,hearthseedProsperityGate:5,crushingBlow:2},['Toad','Guard']),",
    'Stone Toad Bruiser keyword reminder')
s = replace_once(s,
    "C('flintcap_siege_badger','Flintcap Siege Badger',['Handwork','Gatewatch','Burrow'],5,2,2,'On the Move! — Cannot Block. Trample 3.',{cannotBlock:true,trample:3},['Badger','Siege']),",
    "C('flintcap_siege_badger','Flintcap Siege Badger',['Handwork','Gatewatch','Burrow'],5,2,2,'On the Move! — Cannot Block. Trample 3 — up to 3 excess combat damage carries over to the original target.',{cannotBlock:true,trample:3},['Badger','Siege']),",
    'Flintcap keyword reminder')
old_stocked = """  const stocked=byId('AS','stocked_squirrel_armory');
  clean(stocked,{text:'Muster — Scurry. Recruit: pay 🥜. Squirrels housed here get +1 💪.',squirrelMightBonus:1});
  delete stocked.upgradeGain;"""
new_stocked = """  const stocked=byId('AS','stocked_squirrel_armory');
  clean(stocked,{text:'Muster — Scurry. Recruit: pay 🥜. When you upgrade to this, gain 📦.',upgradeGain:{provision:1}});
  delete stocked.squirrelMightBonus;"""
s = replace_once(s, old_stocked, new_stocked, 'Stocked Squirrel Armory latest editable text')
p.write_text(s)

# --- New-player deck identity + AI pacing/difficulty ---
p = Path('client.js')
s = p.read_text()
s = s.replace('v0.7.4', 'v0.7.5')
s = replace_once(s,
    "  let game=null,toast='',aiTimer=null,drawer=null;",
    """  const AI_PROFILES={
    beginner:{label:'Beginner',delay:1250,maxSteps:4,recruitUntil:3,buildUntil:3,attackers:2},
    standard:{label:'Standard',delay:750,maxSteps:6,recruitUntil:5,buildUntil:4,attackers:3},
    hard:{label:'Hard',delay:450,maxSteps:8,recruitUntil:6,buildUntil:5,attackers:4}
  };
  let game=null,toast='',aiTimer=null,drawer=null,aiDifficulty='beginner';
  const aiProfile=()=>AI_PROFILES[aiDifficulty]||AI_PROFILES.beginner;""",
    'AI profile declaration')
s = replace_once(s,
    "  const setToast=msg=>{toast=msg;clearTimeout(setToast.t);setToast.t=setTimeout(()=>{toast='';render();},2400);};",
    """  const setToast=msg=>{toast=msg;clearTimeout(setToast.t);setToast.t=setTimeout(()=>{toast='';render();},2400);};
  const aiNote=msg=>{toast=msg;clearTimeout(setToast.t);setToast.t=setTimeout(()=>{toast='';render();},Math.max(1700,aiProfile().delay+450));};""",
    'AI narration helper')
s = replace_once(s,
    "  function newMatch(mode,key='AS'){\n    clearTimeout(aiTimer);drawer=null;\n    game=E.createGame({mode,humanFaction:key});",
    "  function newMatch(mode,key='AS',difficulty='beginner'){\n    clearTimeout(aiTimer);drawer=null;aiDifficulty=AI_PROFILES[difficulty]?difficulty:'beginner';\n    game=E.createGame({mode,humanFaction:key});",
    'newMatch difficulty argument')
s = replace_once(s, "    aiTimer=setTimeout(runAI,420);", "    aiTimer=setTimeout(runAI,aiProfile().delay);", 'AI delay')
s = replace_once(s, "      if(game._aiSteps<8){", "      if(game._aiSteps<aiProfile().maxSteps){", 'AI max steps')
s = replace_once(s, "        if(critters.length&&game._aiSteps<6){", "        if(critters.length&&game._aiSteps<aiProfile().recruitUntil){", 'AI recruit cap')
s = replace_once(s, "        if(builds.length&&game._aiSteps<5){", "        if(builds.length&&game._aiSteps<aiProfile().buildUntil){", 'AI build cap')
s = replace_once(s, "    ready.slice(0,4).forEach(r=>{", "    ready.slice(0,aiProfile().attackers).forEach(r=>{", 'AI attacker cap')

s = replace_once(s,
    "      E.chooseHarvest(game,choice);render();scheduleAI();return;",
    "      E.chooseHarvest(game,choice);aiNote(`AI harvests ${RLABEL[choice]}.`);render();scheduleAI();return;",
    'AI harvest narration')
s = replace_once(s,
    "        if(!p.freeProductionBuilt&&free.length){game._aiSteps++;E.build(game,pi,chooseAIProduction(p,free).id);render();scheduleAI();return;}",
    "        if(!p.freeProductionBuilt&&free.length){game._aiSteps++;const pick=chooseAIProduction(p,free);E.build(game,pi,pick.id);aiNote(`AI builds ${pick.name}.`);render();scheduleAI();return;}",
    'AI production narration')
s = replace_once(s,
    "          E.recruit(game,pi,critters[0].c.uid,critters[0].ms[0].uid);render();scheduleAI();return;",
    "          const pick=critters[0];E.recruit(game,pi,pick.c.uid,pick.ms[0].uid);aiNote(`AI recruits ${pick.c.name}.`);render();scheduleAI();return;",
    'AI recruit narration')
s = replace_once(s,
    "          E.build(game,pi,builds[0].id);render();scheduleAI();return;",
    "          const pick=builds[0];E.build(game,pi,pick.id);aiNote(`AI builds ${pick.name}.`);render();scheduleAI();return;",
    'AI build narration')
s = replace_once(s,
    "      if(lowest)E.discard(game,pi,lowest.uid);render();scheduleAI();return;",
    "      if(lowest){E.discard(game,pi,lowest.uid);aiNote(`AI discards ${lowest.name}.`);}render();scheduleAI();return;",
    'AI discard narration')
s = replace_once(s,
    "    if(game.combat.attacks.length)E.commitAttacks(game,pi);else E.requestEndTurn(game,pi);\n    render();",
    "    if(game.combat.attacks.length){E.commitAttacks(game,pi);aiNote(`AI declares ${game.combat.attacks.length} attacker${game.combat.attacks.length===1?'':'s'}.`);}else E.requestEndTurn(game,pi);\n    render();",
    'AI attack narration')

setup_pattern = re.compile(r"  function setupScreen\(\)\{.*?\n  \}\n\n  function phaseStrip", re.S)
setup_replacement = r'''  function setupScreen(){
    return `<main class="setupShell"><section class="setupCard"><div class="setupSeal">🔥</div><div class="eyebrow">DIGITAL TABLETOP · RULES v0.6.2</div><h1>Hearth & Hollow</h1><p class="lead">Build a tiny woodland village, gather your Critters, and keep the last warm Hearthseed glowing through winter.</p><h2 class="setupPrompt">Choose how your village plays</h2><div class="factionGrid"><button class="factionChoice porch" onclick="UI.newMatch('ai','AS',document.getElementById('aiDifficulty').value)"><span class="bigIcon">🥜💦</span><span><b>Porchlight</b><small>Hazel Underleaf · Acorn / Sap</small><em class="deckArchetype">⚡ Fast, scrappy pressure</em><span class="deckExplain">Attack Buildings early, disrupt production, and keep the tempo moving.</span></span></button><button class="factionChoice stone" onclick="UI.newMatch('ai','RP',document.getElementById('aiDifficulty').value)"><span class="bigIcon">🫚🪨</span><span><b>Stonecap</b><small>Mosswick Grubroot · Root / Pebble</small><em class="deckArchetype">🛡️ Sturdy, defensive value</em><span class="deckExplain">Block, repair, recycle Critters, and grow into a strong late village.</span></span></button></div><div class="aiDifficultyBox"><label for="aiDifficulty"><b>AI Difficulty</b><select id="aiDifficulty"><option value="beginner" selected>Beginner — slow & gentle</option><option value="standard">Standard — normal pace</option><option value="hard">Hard — faster & more active</option></select></label><small>Beginner pauses between actions and takes fewer actions/attackers so you can follow what the opponent is doing.</small></div><button class="textButton" onclick="UI.newMatch('hotseat','AS')">Hot-seat two player</button><div class="ruleCallout"><b>Prosperity:</b> reaching 15 is not immediate victory. Hold 15+ active Prosperity until the start of your Dawn.</div></section></main>`;
  }

  function phaseStrip'''
s, count = setup_pattern.subn(setup_replacement, s, count=1)
if count != 1:
    raise SystemExit('missing patch target: setup screen')
p.write_text(s)

# --- Setup styling ---
p = Path('styles.css')
s = p.read_text()
s += r'''

/* ===== v0.7.5 new-player deck identity + AI difficulty ===== */
.setupPrompt{margin:18px 0 10px;font-size:14px;letter-spacing:.02em;color:#58644d}
.factionChoice>span:nth-child(2){display:flex;flex-direction:column;align-items:flex-start;gap:3px;text-align:left}
.deckArchetype{display:block;margin-top:4px;font-style:normal;font-size:12px;font-weight:900;color:#384735}
.deckExplain{display:block;max-width:300px;font-size:10px;line-height:1.35;color:#6a725f;font-weight:650}
.aiDifficultyBox{margin:14px 0 10px;padding:11px 12px;border:1px solid rgba(83,101,72,.28);border-radius:12px;background:rgba(255,250,236,.58);text-align:left}
.aiDifficultyBox label{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:12px;color:#46533f}
.aiDifficultyBox select{min-width:220px;padding:7px 9px;border:1px solid rgba(83,101,72,.35);border-radius:9px;background:#fffaf0;color:#374334;font:inherit;font-weight:800}
.aiDifficultyBox small{display:block;margin-top:6px;color:#727964;line-height:1.35}
@media(max-width:700px){.aiDifficultyBox label{align-items:stretch;flex-direction:column}.aiDifficultyBox select{min-width:0;width:100%}}
'''
p.write_text(s)

# --- Regression coverage ---
p = Path('tests/ability-completion-test.js')
s = p.read_text()
s = replace_once(s,
"""ok('data completion matches latest Stocked Squirrel Armory and clears stale manual labels',()=>{
  const stocked=D.AS.blueprints.find(b=>b.id==='stocked_squirrel_armory');
  assert(stocked.text.includes('Squirrels housed here get +1 💪'));
  assert.equal(stocked.upgradeGain,undefined);""",
"""ok('data completion matches latest editable Stocked Squirrel Armory and clears stale manual labels',()=>{
  const stocked=D.AS.blueprints.find(b=>b.id==='stocked_squirrel_armory');
  assert(stocked.text.includes('When you upgrade to this, gain 📦'));
  assert.equal(stocked.upgradeGain.provision,1);
  assert.equal(stocked.squirrelMightBonus,undefined);""",
'ability test Stocked source')
stock_tests = re.compile(r"ok\('Stocked Squirrel Armory gives housed Squirrels \+1 Might'.*?\n\}\);\n\nok\('Stocked Squirrel Armory Might bonus applies to blocker combat damage too'.*?\n\}\);", re.S)
replacement = """ok('Stocked Squirrel Armory grants one Provision when upgraded and no static Might bonus',()=>{
  const g=fresh(),p=setupBuild(g,0),start=p.resources.provision;
  assert(E.build(g,0,'squirrel_armory').ok);
  assert(E.build(g,0,'stocked_squirrel_armory').ok);
  assert.equal(p.resources.provision,start+1,'upgrade should gain exactly one Provision');
  const m=p.village.find(b=>b.id==='stocked_squirrel_armory'),r=resident('AS','squirrel_raider',m.uid);p.residents.push(r);E.refreshAbilityMarkers(g);
  assert.equal(E.residentMight(r,{kind:'building'}),2,'Stocked Armory should not add a static Might bonus in the latest editable set');
});"""
s, count = stock_tests.subn(replacement, s, count=1)
if count != 1:
    raise SystemExit('missing patch target: Stocked combat tests')
p.write_text(s)

p = Path('tests/smoke-test.js')
s = p.read_text()
insert = """
const stonecapFounding=decks.RP.founding;
assert(stonecapFounding.text.includes('The first time each round another Building you control would take attack damage, prevent 1 of it.'),'Stonecap Root Cellar text drifted from the current card');
const stocked=decks.AS.blueprints.find(b=>b.id==='stocked_squirrel_armory');
assert(stocked.upgradeGain?.provision===1&&!stocked.squirrelMightBonus,'Stocked Squirrel Armory must use the latest editable upgrade-gain text');
assert(decks.AS.field.find(c=>c.id==='bramble_climbing_kit').text.includes('may attack the turn it is recruited'),'Eager reminder text missing');
assert(decks.RP.field.find(c=>c.id==='stone_toad_bruiser').text.includes('when this defeats a blocker'),'Crushing Blow reminder text missing');
console.log('✓ current printed ability wording checkpoints');
"""
anchor = "console.log('✓ Advanced roster: Juniper, Briarhart, Clem');\n"
s = replace_once(s, anchor, anchor+insert, 'smoke card text audit')
p.write_text(s)

p = Path('tests/ui-coordinator-test.js')
s = p.read_text()
anchor = "assert(html.includes('Tabletop Client v0.7.4'),'presentation version not bumped');"
if anchor in s:
    s=s.replace(anchor,"assert(html.includes('Tabletop Client v0.7.5'),'presentation version not bumped');")
else:
    s=s.replace("assert(html.includes('Tabletop Client v0.7.5'),'presentation version not bumped');","assert(html.includes('Tabletop Client v0.7.5'),'presentation version not bumped');")
extra = """
assert(client.includes("beginner:{label:'Beginner',delay:1250"),'Beginner AI pacing profile missing');
assert(client.includes('Fast, scrappy pressure'),'Porchlight archetype onboarding copy missing');
assert(client.includes('Sturdy, defensive value'),'Stonecap archetype onboarding copy missing');
assert(client.includes('AI harvests ${RLABEL[choice]}'),'AI action narration missing');
"""
console_anchor = "console.log('✓ runtime is consolidated to data.js + engine.js + client.js + styles.css');"
s = replace_once(s, console_anchor, extra+"\n"+console_anchor, 'UI onboarding regression')
p.write_text(s)

# index + README version / documentation
p=Path('index.html'); s=p.read_text().replace('v0.7.4','v0.7.5').replace('?v=074','?v=075'); p.write_text(s)
p=Path('README.md'); s=p.read_text();
s += """

## Solo AI difficulty

Solo setup now explains each starter deck's play style and offers three AI profiles. Beginner is the default: it pauses longer between actions, takes fewer Build actions, and sends fewer attackers so first-time players can see the opponent's turn unfold. Standard restores a normal tempo, while Hard acts faster and uses the full action/attack caps.

Card-display wording is checked against the latest editable starter-card source while v0.6.2 rulebook rules remain authoritative when older card-layout text conflicts with the rules chassis.
"""
p.write_text(s)

# syntax verification before commit
print('patch complete')
