from pathlib import Path
import re


def must_replace(text, old, new, label):
    if old not in text:
        raise SystemExit(f'missing {label}')
    return text.replace(old, new, 1)

client_path=Path('client.js')
client=client_path.read_text()

client=must_replace(client,
"  const AI_PACES={slow:{label:'Deliberate',delay:1250},normal:{label:'Normal',delay:800}};",
"  const AI_ACTION_DELAY=1100;",
'AI pace profile')
client=must_replace(client,
"  let game=null,toast='',aiTimer=null,drawer=null,aiDifficulty='beginner',aiPace='slow';",
"  let game=null,toast='',aiTimer=null,drawer=null,aiDifficulty='beginner';",
'AI state')
client=client.replace("  const aiPaceProfile=()=>AI_PACES[aiPace]||AI_PACES.slow;\n",'')
client=must_replace(client,
"  const aiNote=msg=>{toast=msg;clearTimeout(setToast.t);setToast.t=setTimeout(()=>{toast='';render();},Math.max(1700,aiPaceProfile().delay+450));};",
"  const aiNote=msg=>{toast=msg;clearTimeout(setToast.t);setToast.t=setTimeout(()=>{toast='';render();},1850);};",
'AI note timing')
client=must_replace(client,
"  function newMatch(mode,key='AS',difficulty='beginner',pace='slow'){\n    clearTimeout(aiTimer);drawer=null;aiDifficulty=AI_PROFILES[difficulty]?difficulty:'beginner';aiPace=AI_PACES[pace]?pace:'slow';",
"  function newMatch(mode,key='AS',difficulty='beginner'){\n    clearTimeout(aiTimer);drawer=null;aiDifficulty=AI_PROFILES[difficulty]?difficulty:'beginner';",
'newMatch pace removal')
client=must_replace(client,
"    aiTimer=setTimeout(runAI,aiPaceProfile().delay);",
"    aiTimer=setTimeout(runAI,AI_ACTION_DELAY);",
'AI schedule timing')

setup_re=re.compile(r"  function setupScreen\(\)\{.*?\n  \}\n\n  function phaseStrip",re.S)
setup_new="""  function setupScreen(){
    return `<main class=\"setupShell\"><section class=\"setupCard\"><div class=\"setupSeal\">🔥</div><div class=\"eyebrow\">DIGITAL TABLETOP · RULES v0.6.2</div><h1>Hearth & Hollow</h1><p class=\"lead\">Choose a Hearthkeeper and protect your village through winter.</p><h2 class=\"setupPrompt\">Choose your Hearthkeeper</h2><div class=\"factionGrid\"><button class=\"factionChoice porch\" onclick=\"UI.newMatch('ai','AS',document.getElementById('aiDifficulty').value)\"><span class=\"bigIcon\">🥜💦</span><span><b>Hazel Underleaf</b><small>Porchlight · Acorn / Sap</small><em class=\"deckArchetype\">⚡ Fast & scrappy</em></span></button><button class=\"factionChoice stone\" onclick=\"UI.newMatch('ai','RP',document.getElementById('aiDifficulty').value)\"><span class=\"bigIcon\">🫚🪨</span><span><b>Mosswick Grubroot</b><small>Stonecap · Root / Pebble</small><em class=\"deckArchetype\">🛡️ Sturdy & recursive</em></span></button></div><div class=\"aiDifficultyBox\"><label for=\"aiDifficulty\"><b>AI Difficulty</b><select id=\"aiDifficulty\"><option value=\"beginner\" selected>Beginner</option><option value=\"standard\">Standard</option><option value=\"hard\">Hard</option></select></label></div><button class=\"textButton\" onclick=\"UI.newMatch('hotseat','AS')\">Hot-seat two player</button></section></main>`;
  }

  function phaseStrip"""
client,n=setup_re.subn(setup_new,client,count=1)
if n!=1: raise SystemExit('setup screen replacement failed')

client=must_replace(client,
"if(!game.combat.attacks.length&&game.phase!=='Block')return `<section class=\"combatRibbon quiet\"><span>⚔</span><b>Frost Trial</b><small>Declare ready Critters when you want to attack.</small></section>`;",
"if(!game.combat.attacks.length&&game.phase!=='Block')return `<section class=\"combatRibbon quiet compactTrial\"><span>⚔</span><b>Frost Trial</b><small>Declare attackers when ready.</small></section>`;",
'quiet Frost Trial ribbon')
client=client.replace("<div class=\"trialDivider\"><i></i><span>❄ FROST TRIAL ❄</span><i></i></div>","")

fidget_function="""
  function tableFidgets(){
    return `<div class=\"tableFidgets\" aria-label=\"Tiny tabletop fidgets. No gameplay effect.\"><button type=\"button\" class=\"tableFidget fidgetAcorn\" data-fidget=\"bounce\" title=\"Fidget · no game effect\" onclick=\"UI.fidget(event.currentTarget)\">🌰</button><button type=\"button\" class=\"tableFidget fidgetLeaf\" data-fidget=\"spin\" title=\"Fidget · no game effect\" onclick=\"UI.fidget(event.currentTarget)\">🍂</button><button type=\"button\" class=\"tableFidget fidgetPebble\" data-fidget=\"wiggle\" title=\"Fidget · no game effect\" onclick=\"UI.fidget(event.currentTarget)\">🪨</button><button type=\"button\" class=\"tableFidget fidgetMushroom\" data-fidget=\"squish\" title=\"Fidget · no game effect\" onclick=\"UI.fidget(event.currentTarget)\">🍄</button></div>`;
  }

"""
client=must_replace(client,"  function render(){",fidget_function+"  function render(){",'render insertion')
client=must_replace(client,"<main class=\"tableSurface\">","<main class=\"tableSurface\">${tableFidgets()}",'table fidgets render')
client=must_replace(client,
"    drawer:name=>{drawer=name;render();},",
"    drawer:name=>{drawer=name;render();},\n    fidget:el=>{if(!el)return;el.classList.remove('fidgetPop');void el.offsetWidth;el.classList.add('fidgetPop');setTimeout(()=>el.classList.remove('fidgetPop'),520);},",
'UI fidget action')

client,n=re.subn(r"\n\n/\* ===== Hearthstep tabletop fidget ===== \*/.*\Z","",client,flags=re.S)
if n!=1: raise SystemExit('old Hearthstep block not removed')

client=client.replace('v0.7.7','v0.7.8')
client_path.write_text(client)

styles_path=Path('styles.css')
styles=styles_path.read_text()
styles,n=re.subn(r"\n/\* ===== Hearthstep fidget ===== \*/.*\Z","",styles,flags=re.S)
if n!=1: raise SystemExit('old Hearthstep CSS not removed')
styles += r'''

/* ===== v0.7.8 setup declutter + ambient table fidgets ===== */
.setupCard{width:min(720px,100%);padding:26px 28px}.setupCard h1{font-size:42px}.setupSeal{width:54px;height:54px;font-size:25px}.lead{margin:8px auto 12px;font-size:12px}.setupPrompt{margin:12px 0 7px}.factionGrid{margin:9px 0 10px}.factionChoice{padding:12px 13px;gap:9px}.factionChoice .bigIcon{font-size:25px}.factionChoice b{font-size:16px}.factionChoice small{font-size:8px;margin-top:1px}.deckArchetype{margin-top:2px;font-size:10px}.deckExplain{display:none}.aiDifficultyBox{max-width:420px;margin:9px auto 8px;padding:8px 10px}.aiDifficultyBox label{grid-template-columns:105px minmax(170px,1fr);gap:8px}.aiDifficultyBox select{min-width:0;padding:6px 8px}.aiDifficultyBox small{display:none}
.combatRibbon.quiet.compactTrial{width:max-content;max-width:72%;margin:4px auto;padding:5px 10px;gap:6px}.combatRibbon.quiet.compactTrial b{font-size:10px}.combatRibbon.quiet.compactTrial small{font-size:7px}.trialDivider{display:none}
.tableFidgets{position:absolute;inset:0;z-index:3;pointer-events:none;overflow:hidden;border-radius:22px}.tableFidget{position:absolute;pointer-events:auto;width:27px;height:27px;padding:0;display:grid;place-items:center;border:0;border-radius:50%;background:rgba(246,238,220,.08);color:inherit;font-size:17px;line-height:1;box-shadow:none;opacity:.58;filter:saturate(.9);transition:opacity .12s ease,transform .12s ease,background .12s ease}.tableFidget:hover:not(:disabled){opacity:1;filter:none;background:rgba(246,238,220,.16);transform:scale(1.12)}.fidgetAcorn{left:7px;top:27%}.fidgetLeaf{right:8px;top:39%;transform:rotate(-18deg)}.fidgetPebble{left:8px;bottom:22%}.fidgetMushroom{right:7px;bottom:12%}.tableFidget.fidgetPop[data-fidget="bounce"]{animation:tableFidgetBounce .46s ease}.tableFidget.fidgetPop[data-fidget="spin"]{animation:tableFidgetSpin .48s ease}.tableFidget.fidgetPop[data-fidget="wiggle"]{animation:tableFidgetWiggle .42s ease}.tableFidget.fidgetPop[data-fidget="squish"]{animation:tableFidgetSquish .42s ease}@keyframes tableFidgetBounce{0%,100%{transform:translateY(0) scale(1)}42%{transform:translateY(-12px) scale(1.08,.94)}70%{transform:translateY(1px) scale(.94,1.06)}}@keyframes tableFidgetSpin{0%{transform:rotate(-18deg)}70%{transform:rotate(310deg) scale(1.14)}100%{transform:rotate(342deg)}}@keyframes tableFidgetWiggle{0%,100%{transform:rotate(0)}25%{transform:rotate(-13deg)}55%{transform:rotate(11deg)}75%{transform:rotate(-6deg)}}@keyframes tableFidgetSquish{0%,100%{transform:scale(1)}45%{transform:scale(1.18,.76)}70%{transform:scale(.92,1.08)}}
@media(max-width:780px){.setupCard{padding:22px 18px}.setupCard h1{font-size:36px}.aiDifficultyBox label{grid-template-columns:1fr}.tableFidget{width:24px;height:24px;font-size:15px}.combatRibbon.quiet.compactTrial{max-width:92%}}
'''
styles_path.write_text(styles)

for path in [Path('index.html'),Path('tests/smoke-test.js'),Path('tests/ui-coordinator-test.js')]:
    text=path.read_text().replace('v0.7.7','v0.7.8').replace('v=077','v=078')
    path.write_text(text)

ui_path=Path('tests/ui-coordinator-test.js')
ui=ui_path.read_text()
ui=ui.replace("assert(client.includes('Fast, scrappy pressure'),'Porchlight archetype onboarding copy missing');","assert(client.includes('Fast & scrappy'),'Hazel archetype onboarding copy missing');")
ui=ui.replace("assert(client.includes('Sturdy, recursive defense'),'Stonecap archetype onboarding copy missing');","assert(client.includes('Sturdy & recursive'),'Mosswick archetype onboarding copy missing');")
ui=ui.replace("assert(client.includes('AI Pace'),'AI pace should be separate from difficulty');","assert(!client.includes('AI Pace'),'AI pace control should be removed from setup');")
ui += "\nassert(!client.includes('aiPace'),'AI pace state should be removed');\nassert(!client.includes('forgiving priorities')&&!client.includes('sensible priorities')&&!client.includes('sharp priorities'),'difficulty labels should stay simple');\nassert(client.includes('<option value=\\\"beginner\\\" selected>Beginner</option>')&&client.includes('<option value=\\\"standard\\\">Standard</option>')&&client.includes('<option value=\\\"hard\\\">Hard</option>'),'simple AI difficulty choices missing');\nassert(client.includes('tableFidgets')&&!client.includes('hearthstepTrail'),'ambient table fidgets should replace the Hearthstep bar');\nassert(!client.includes('trialDivider'),'duplicate Frost Trial divider should be removed from render');\nconsole.log('✓ setup declutter, ambient fidgets, and compact Frost Trial');\n"
ui_path.write_text(ui)

print('v0.7.8 UI declutter patch complete')
