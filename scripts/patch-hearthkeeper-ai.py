from pathlib import Path

def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'missing anchor: {label}')
    return text.replace(old, new, 1)

# --- data.js ---
p=Path('data.js'); s=p.read_text()
s=replace_once(s,
"      key:'AS', name:'Porchlight — Acorn / Sap', short:'Acorn / Sap', hearthkeeper:'Hazel Underleaf',\n      resources:['acorn','sap','provision'],",
"      key:'AS', name:'Hazel Underleaf', short:'Porchlight · Acorn / Sap', hearthkeeper:'Hazel Underleaf', tradition:'Porchlight', archetype:'Fast, scrappy pressure',\n      hearthkeeperCard:{id:'hazel_underleaf',name:'Hazel Underleaf',type:'Hearthkeeper',subtitle:'Porchlight Hearthkeeper',text:'By dusk, Hazel has counted every lantern twice and every neighbor at least once.',reference:'Flavor/reference only — no gameplay ability in v0.6.2.'},\n      resources:['acorn','sap','provision'],",
'AS deck identity')
s=replace_once(s,
"      key:'RP', name:'Stonecap — Root / Pebble', short:'Root / Pebble', hearthkeeper:'Mosswick Grubroot',\n      resources:['root','pebble','provision'],",
"      key:'RP', name:'Mosswick Grubroot', short:'Stonecap · Root / Pebble', hearthkeeper:'Mosswick Grubroot', tradition:'Stonecap', archetype:'Sturdy, recursive defense',\n      hearthkeeperCard:{id:'mosswick_grubroot',name:'Mosswick Grubroot',type:'Hearthkeeper',subtitle:'Stonecap Hearthkeeper',text:'When the mornings turn chilly, Mosswick starts stuffing the burrow with leaves until there’s barely room for himself!',reference:'Flavor/reference only — no gameplay ability in v0.6.2.'},\n      resources:['root','pebble','provision'],",
'RP deck identity')
s=replace_once(s,
"        B('stocked_squirrel_armory','Stocked Squirrel Armory','Muster Upgrade',{acorn:1,sap:1},5,3,{upgradeFrom:'squirrel_armory',muster:true,musterClass:'Scurry',housing:5,recruitCost:{acorn:1},upgradeGain:{provision:1},text:'Muster — Scurry. Recruit: pay 🥜. When you upgrade to this, gain 📦.'}),",
"        B('stocked_squirrel_armory','Stocked Squirrel Armory','Muster Upgrade',{acorn:1,sap:1},5,3,{upgradeFrom:'squirrel_armory',muster:true,musterClass:'Scurry',housing:5,recruitCost:{acorn:1},squirrelMightBonus:1,text:'Muster — Scurry. Recruit: pay 🥜. Squirrels housed here get +1 💪.'}),",
'Stocked base card')
s=replace_once(s,
"  const stocked=byId('AS','stocked_squirrel_armory');\n  clean(stocked,{text:'Muster — Scurry. Recruit: pay 🥜. When you upgrade to this, gain 📦.',upgradeGain:{provision:1}});\n  delete stocked.squirrelMightBonus;",
"  const stocked=byId('AS','stocked_squirrel_armory');\n  clean(stocked,{text:'Muster — Scurry. Recruit: pay 🥜. Squirrels housed here get +1 💪.',squirrelMightBonus:1});\n  delete stocked.upgradeGain;",
'Stocked completion card')
p.write_text(s)

# --- engine.js: restore current printed Stocked Squirrel Armory behavior ---
p=Path('engine.js'); s=p.read_text()
s=replace_once(s,
"  const isMoleOrCrow=c=>(c?.traits||[]).some(t=>t==='Mole'||t==='Crow');",
"  const isMoleOrCrow=c=>(c?.traits||[]).some(t=>t==='Mole'||t==='Crow');\n  const isSquirrel=c=>(c?.traits||[]).includes('Squirrel');",
'isSquirrel helper')
s=replace_once(s,
"  function refreshHomeMarkers(g){\n    // Retained as the shared post-action refresh hook. Stocked Squirrel Armory\n    // no longer grants a resident Might bonus in the latest editable card set.\n    g.players.forEach(p=>p.residents.forEach(r=>{delete r._hhStockedSquirrel;}));\n  }",
"  function refreshHomeMarkers(g){\n    g.players.forEach(p=>p.residents.forEach(r=>{\n      const home=p.village.find(b=>b.uid===r.musterUid);\n      r._hhStockedSquirrel=!!(home&&!E.isRuined(home)&&home.id==='stocked_squirrel_armory'&&isSquirrel(r));\n    }));\n  }",
'Stocked marker refresh')
s=replace_once(s,
"  const baseRecruit=E.recruit;\n  E.recruit=(g,pi,cardUid,musterUid,options={})=>{",
"  const baseResidentMight=E.residentMight;\n  E.residentMight=(r,target)=>baseResidentMight(r,target)+(r?._hhStockedSquirrel?1:0);\n\n  const baseCanBlock=E.canBlock;\n  E.canBlock=(g,pi,r,attack)=>{\n    if(!r?._hhStockedSquirrel)return baseCanBlock(g,pi,r,attack);\n    r.might++;try{return baseCanBlock(g,pi,r,attack);}finally{r.might--;}\n  };\n\n  const baseRecruit=E.recruit;\n  E.recruit=(g,pi,cardUid,musterUid,options={})=>{",
'Stocked exported combat stats')
s=replace_once(s,
"    const attackerPi=g.active,atkP=g.players[attackerPi];\n\n    const result=baseResolveCombat(g);",
"    const attackerPi=g.active,atkP=g.players[attackerPi];\n\n    const boosted=[];\n    atkP.residents.forEach(r=>{if(r._hhStockedSquirrel){r.might++;boosted.push(r);}});\n    const result=baseResolveCombat(g);\n    boosted.forEach(r=>r.might--);",
'Stocked attacking combat bonus')
s=replace_once(s,
"  const baseResolveCombat=E.resolveCombat;\n  E.resolveCombat=g=>{\n    const result=baseResolveCombat(g);",
"  const baseResolveCombat=E.resolveCombat;\n  E.resolveCombat=g=>{\n    const defender=g?.players?.[1-g.active];\n    const boosted=(defender?.residents||[]).filter(r=>r._hhStockedSquirrel);\n    boosted.forEach(r=>r.might++);\n    let result;\n    try{result=baseResolveCombat(g);}finally{boosted.forEach(r=>r.might--);}",
'Stocked blocker combat bonus')
p.write_text(s)

# --- client.js ---
p=Path('client.js'); s=p.read_text()
s=replace_once(s,
"  const AI_PROFILES={\n    beginner:{label:'Beginner',delay:1250,maxSteps:4,recruitUntil:3,buildUntil:3,attackers:2},\n    standard:{label:'Standard',delay:750,maxSteps:6,recruitUntil:5,buildUntil:4,attackers:3},\n    hard:{label:'Hard',delay:450,maxSteps:8,recruitUntil:6,buildUntil:5,attackers:4}\n  };\n  let game=null,toast='',aiTimer=null,drawer=null,aiDifficulty='beginner';\n  const aiProfile=()=>AI_PROFILES[aiDifficulty]||AI_PROFILES.beginner;",
"  const AI_PROFILES={\n    beginner:{label:'Beginner',skill:'beginner',maxSteps:6,recruitUntil:6,buildUntil:5,attackers:4},\n    standard:{label:'Standard',skill:'standard',maxSteps:6,recruitUntil:6,buildUntil:5,attackers:4},\n    hard:{label:'Hard',skill:'hard',maxSteps:6,recruitUntil:6,buildUntil:5,attackers:4}\n  };\n  const AI_PACES={slow:{label:'Deliberate',delay:1250},normal:{label:'Normal',delay:800}};\n  let game=null,toast='',aiTimer=null,drawer=null,aiDifficulty='beginner',aiPace='slow';\n  const aiProfile=()=>AI_PROFILES[aiDifficulty]||AI_PROFILES.beginner;\n  const aiPaceProfile=()=>AI_PACES[aiPace]||AI_PACES.slow;",
'AI profile split')
s=replace_once(s,
"  const aiNote=msg=>{toast=msg;clearTimeout(setToast.t);setToast.t=setTimeout(()=>{toast='';render();},Math.max(1700,aiProfile().delay+450));};\n\n  function newMatch(mode,key='AS',difficulty='beginner'){\n    clearTimeout(aiTimer);drawer=null;aiDifficulty=AI_PROFILES[difficulty]?difficulty:'beginner';",
"  const aiNote=msg=>{toast=msg;clearTimeout(setToast.t);setToast.t=setTimeout(()=>{toast='';render();},Math.max(1700,aiPaceProfile().delay+450));};\n\n  function newMatch(mode,key='AS',difficulty='beginner',pace='slow'){\n    clearTimeout(aiTimer);drawer=null;aiDifficulty=AI_PROFILES[difficulty]?difficulty:'beginner';aiPace=AI_PACES[pace]?pace:'slow';",
'newMatch pace')
s=replace_once(s,"    aiTimer=setTimeout(runAI,aiProfile().delay);","    aiTimer=setTimeout(runAI,aiPaceProfile().delay);",'AI pace scheduling')
s=replace_once(s,
"          critters.sort((a,b)=>(b.c.might+b.c.grit)-(a.c.might+a.c.grit));game._aiSteps++;\n          const pick=critters[0];E.recruit(game,pi,pick.c.uid,pick.ms[0].uid);aiNote(`AI recruits ${pick.c.name}.`);render();scheduleAI();return;",
"          game._aiSteps++;\n          const pick=chooseAICritter(critters,p);E.recruit(game,pi,pick.c.uid,pick.ms[0].uid);aiNote(`AI recruits ${pick.c.name}.`);render();scheduleAI();return;",
'AI recruit choice')
s=replace_once(s,
"          builds.sort((a,b)=>aiBlueprintScore(game,p,b)-aiBlueprintScore(game,p,a));game._aiSteps++;\n          const pick=builds[0];E.build(game,pi,pick.id);aiNote(`AI builds ${pick.name}.`);render();scheduleAI();return;",
"          game._aiSteps++;\n          const pick=chooseAIBuild(game,p,builds);E.build(game,pi,pick.id);aiNote(`AI builds ${pick.name}.`);render();scheduleAI();return;",
'AI build choice')
s=replace_once(s,
"  function chooseAIProduction(p,opts){\n    const prov=opts.find(b=>b.harvest?.provision||b.firstYield?.provision);\n    if(prov&&!E.activeBuildings(p).some(b=>b.production&&(b.harvest?.provision||b.firstYield?.provision)))return prov;\n    return [...opts].sort((a,b)=>{\n      const ar=Object.keys(a.harvest||{})[0],br=Object.keys(b.harvest||{})[0];return (p.resources[ar]||0)-(p.resources[br]||0);\n    })[0];\n  }\n  function aiBlueprintScore(g,p,b){",
"  function chooseAIProduction(p,opts){\n    if(aiProfile().skill==='beginner')return opts[0];\n    const prov=opts.find(b=>b.harvest?.provision||b.firstYield?.provision);\n    if(prov&&!E.activeBuildings(p).some(b=>b.production&&(b.harvest?.provision||b.firstYield?.provision)))return prov;\n    return [...opts].sort((a,b)=>{\n      const ar=Object.keys(a.harvest||{})[0],br=Object.keys(b.harvest||{})[0];return (p.resources[ar]||0)-(p.resources[br]||0);\n    })[0];\n  }\n  function aiBlueprintScore(g,p,b){",
'AI production skill')
s=replace_once(s,
"    if(b.upgradeFrom)s+=2;return s;\n  }\n  function cardValue(c){return c.type==='Critter'?(c.might||0)*2+(c.grit||0):(c.subtype==='Tool'?3:1);}\n\n  function aiDeclareAttacks(){",
"    if(b.upgradeFrom)s+=2;return s;\n  }\n  function cardValue(c){return c.type==='Critter'?(c.might||0)*2+(c.grit||0):(c.subtype==='Tool'?3:1);}\n  function chooseAICritter(options,p){\n    const skill=aiProfile().skill;\n    if(skill==='beginner')return [...options].sort((a,b)=>cardValue(a.c)-cardValue(b.c))[0];\n    if(skill==='standard')return [...options].sort((a,b)=>(b.c.might+b.c.grit)-(a.c.might+a.c.grit))[0];\n    return [...options].sort((a,b)=>{\n      const score=x=>cardValue(x.c)+(x.c.advanced?4:0)+(x.ms[0]?.upgradeFrom?2:0);\n      return score(b)-score(a);\n    })[0];\n  }\n  function chooseAIBuild(g,p,builds){\n    const skill=aiProfile().skill;\n    if(skill==='beginner')return [...builds].sort((a,b)=>aiBlueprintScore(g,p,a)-aiBlueprintScore(g,p,b))[0];\n    if(skill==='standard')return [...builds].sort((a,b)=>aiBlueprintScore(g,p,b)-aiBlueprintScore(g,p,a))[0];\n    const score=b=>{\n      let s=aiBlueprintScore(g,p,b);\n      if(b.upgradeFrom)s+=4;\n      if(b.muster&&p.hand.some(c=>c.type==='Critter'&&(c.musterClasses||[]).includes(b.musterClass)))s+=6;\n      if(b.production&&Object.values(p.resources).reduce((n,v)=>n+v,0)<4)s+=4;\n      return s;\n    };\n    return [...builds].sort((a,b)=>score(b)-score(a))[0];\n  }\n  function chooseAITarget(r,o){\n    const buildings=E.activeBuildings(o);\n    if(o.exposed||!buildings.length)return 'hearthseed';\n    const skill=aiProfile().skill;\n    if(skill==='beginner')return buildings[0].uid;\n    const might=E.residentMight(r,{kind:'building'});\n    if(skill==='standard'){\n      const weak=[...buildings].sort((a,b)=>(a.durability-a.damage)-(b.durability-b.damage));\n      return o.hearthseed<=E.residentMight(r,{kind:'hearthseed'})?'hearthseed':weak[0].uid;\n    }\n    const scored=[...buildings].map(b=>({b,score:(b.production?6:0)+(b.muster?5:0)+(b.prosperity||0)*2+((b.durability-b.damage)<=might?12:0)})).sort((a,b)=>b.score-a.score);\n    if(o.hearthseed<=E.residentMight(r,{kind:'hearthseed'}))return 'hearthseed';\n    return scored[0].b.uid;\n  }\n\n  function aiDeclareAttacks(){",
'AI decision helpers')
s=replace_once(s,
"      const buildings=E.activeBuildings(o).sort((a,b)=>(a.durability-a.damage)-(b.durability-b.damage));\n      const target=o.exposed||o.hearthseed<=E.residentMight(r,{kind:'hearthseed'})?'hearthseed':(buildings[0]?.uid??'hearthseed');\n      E.declareAttack(game,pi,r.uid,target);",
"      E.declareAttack(game,pi,r.uid,chooseAITarget(r,o));",
'AI target choice')
s=replace_once(s,
"      legal.sort((x,y)=>E.residentGrit(game,d,y,true)-E.residentGrit(game,d,x,true));\n      E.assignBlock(game,di,legal[0].uid,i);",
"      if(aiProfile().skill==='standard')legal.sort((x,y)=>E.residentGrit(game,d,y,true)-E.residentGrit(game,d,x,true));\n      else if(aiProfile().skill==='hard'){\n        const atk=game.players[game.active].residents.find(r=>r.uid===a.attackerUid);\n        const score=r=>(E.residentGrit(game,d,r,true)>(atk?.might||0)?10:0)+((r.might||0)>=(atk?.grit||99)?8:0)+E.residentGrit(game,d,r,true);\n        legal.sort((x,y)=>score(y)-score(x));\n      }\n      E.assignBlock(game,di,legal[0].uid,i);",
'AI blocker choice')
old_setup="  function setupScreen(){\n    return `<main class=\"setupShell\"><section class=\"setupCard\"><div class=\"setupSeal\">🔥</div><div class=\"eyebrow\">DIGITAL TABLETOP · RULES v0.6.2</div><h1>Hearth & Hollow</h1><p class=\"lead\">Build a tiny woodland village, gather your Critters, and keep the last warm Hearthseed glowing through winter.</p><h2 class=\"setupPrompt\">Choose how your village plays</h2><div class=\"factionGrid\"><button class=\"factionChoice porch\" onclick=\"UI.newMatch('ai','AS',document.getElementById('aiDifficulty').value)\"><span class=\"bigIcon\">🥜💦</span><span><b>Porchlight</b><small>Hazel Underleaf · Acorn / Sap</small><em class=\"deckArchetype\">⚡ Fast, scrappy pressure</em><span class=\"deckExplain\">Attack Buildings early, disrupt production, and keep the tempo moving.</span></span></button><button class=\"factionChoice stone\" onclick=\"UI.newMatch('ai','RP',document.getElementById('aiDifficulty').value)\"><span class=\"bigIcon\">🫚🪨</span><span><b>Stonecap</b><small>Mosswick Grubroot · Root / Pebble</small><em class=\"deckArchetype\">🛡️ Sturdy, defensive value</em><span class=\"deckExplain\">Block, repair, recycle Critters, and grow into a strong late village.</span></span></button></div><div class=\"aiDifficultyBox\"><label for=\"aiDifficulty\"><b>AI Difficulty</b><select id=\"aiDifficulty\"><option value=\"beginner\" selected>Beginner — slow & gentle</option><option value=\"standard\">Standard — normal pace</option><option value=\"hard\">Hard — faster & more active</option></select></label><small>Beginner pauses between actions and takes fewer actions/attackers so you can follow what the opponent is doing.</small></div><button class=\"textButton\" onclick=\"UI.newMatch('hotseat','AS')\">Hot-seat two player</button><div class=\"ruleCallout\"><b>Prosperity:</b> reaching 15 is not immediate victory. Hold 15+ active Prosperity until the start of your Dawn.</div></section></main>`;\n  }"
new_setup="  function setupScreen(){\n    return `<main class=\"setupShell\"><section class=\"setupCard\"><div class=\"setupSeal\">🔥</div><div class=\"eyebrow\">DIGITAL TABLETOP · RULES v0.6.2</div><h1>Hearth & Hollow</h1><p class=\"lead\">Build a tiny woodland village, gather your Critters, and keep the last warm Hearthseed glowing through winter.</p><h2 class=\"setupPrompt\">Choose your Hearthkeeper</h2><div class=\"factionGrid\"><button class=\"factionChoice porch\" onclick=\"UI.newMatch('ai','AS',document.getElementById('aiDifficulty').value,document.getElementById('aiPace').value)\"><span class=\"bigIcon\">🥜💦</span><span><b>Hazel Underleaf</b><small>Porchlight Tradition · Acorn / Sap</small><em class=\"deckArchetype\">⚡ Fast, scrappy pressure</em><span class=\"deckExplain\">Attack Buildings early, disrupt production, and keep the tempo moving.</span></span></button><button class=\"factionChoice stone\" onclick=\"UI.newMatch('ai','RP',document.getElementById('aiDifficulty').value,document.getElementById('aiPace').value)\"><span class=\"bigIcon\">🫚🪨</span><span><b>Mosswick Grubroot</b><small>Stonecap Tradition · Root / Pebble</small><em class=\"deckArchetype\">🛡️ Sturdy, recursive defense</em><span class=\"deckExplain\">Block, repair, recycle Critters, and grow into a strong late village.</span></span></button></div><div class=\"aiDifficultyBox\"><label for=\"aiDifficulty\"><b>AI Difficulty</b><select id=\"aiDifficulty\"><option value=\"beginner\" selected>Beginner — forgiving priorities</option><option value=\"standard\">Standard — sensible priorities</option><option value=\"hard\">Hard — sharp priorities</option></select></label><small>Difficulty changes what the AI values and targets, not how many legal actions it is allowed to take.</small><label for=\"aiPace\"><b>AI Pace</b><select id=\"aiPace\"><option value=\"slow\" selected>Deliberate — easy to follow</option><option value=\"normal\">Normal</option></select></label><small>Pace is separate from difficulty. Deliberate pauses between visible actions so you can read the opponent turn.</small></div><button class=\"textButton\" onclick=\"UI.newMatch('hotseat','AS')\">Hot-seat two player</button><div class=\"ruleCallout\"><b>Prosperity:</b> reaching 15 is not immediate victory. Hold 15+ active Prosperity until the start of your Dawn.</div></section></main>`;\n  }"
s=replace_once(s,old_setup,new_setup,'setup Hearthkeepers and AI controls')
# Add Hearthkeeper drawer panel before logPanel
anchor="  function logPanel(){\n"
insert="  function hearthkeeperPanel(pi){\n    const p=game.players[pi],f=faction(p),h=f.hearthkeeperCard;\n    return `<div class=\"drawerHeader\"><div><span class=\"eyebrow\">HEARTHKEEPER REFERENCE</span><h2>${esc(h.name)}</h2></div><button class=\"closeButton\" onclick=\"UI.drawer(null)\">×</button></div><article class=\"hearthkeeperReferenceCard\"><div class=\"hearthkeeperPortrait\"><span>🔥</span><small>ART PLACEHOLDER</small></div><div><span class=\"eyebrow\">${esc(h.subtitle)}</span><h3>${esc(h.name)}</h3><p class=\"hearthkeeperFlavor\">${esc(h.text)}</p><div class=\"referenceOnly\">${esc(h.reference)}</div><small>${esc(f.tradition)} Tradition · ${esc(f.short.split('·').pop().trim())}</small></div></article>`;\n  }\n\n"
s=replace_once(s,anchor,insert+anchor,'Hearthkeeper drawer panel')
s=replace_once(s,
"    const body=drawer==='blueprints'?blueprintPanel():drawer==='rules'?rulesPanel():logPanel();",
"    const keeperMatch=String(drawer).match(/^hearthkeeper:(\\d)$/);\n    const body=keeperMatch?hearthkeeperPanel(+keeperMatch[1]):drawer==='blueprints'?blueprintPanel():drawer==='rules'?rulesPanel():logPanel();",
'Hearthkeeper drawer routing')
s=replace_once(s,
"    return `<section class=\"playerBanner ${top?'opponentBanner':'homeBanner'} ${active?'turnActive':''}\"><div class=\"identity\"><span class=\"sideLabel\">${top?'OPPONENT':'YOU'}${active?' · ACTIVE':''}</span><b>${esc(p.name)}</b><small>${esc(faction(p).short)} · ${esc(faction(p).hearthkeeper)}</small></div><div class=\"bannerResources\">${resources(p)}</div><div class=\"bannerStats\"><div class=\"hearthMedallion\"><span>🔥</span><b>${p.hearthseed}</b><small>HP</small>${exposed}</div>${prosperityBadge(p)}${pending}</div></section>`;",
"    return `<section class=\"playerBanner ${top?'opponentBanner':'homeBanner'} ${active?'turnActive':''}\"><div class=\"identity\"><span class=\"sideLabel\">${top?'OPPONENT':'YOU'}${active?' · ACTIVE':''}</span><b>${esc(faction(p).hearthkeeper)}</b><button class=\"keeperChip\" onclick=\"UI.drawer('hearthkeeper:${pi}')\">🔥 View Hearthkeeper card</button><small>${esc(faction(p).short)}</small></div><div class=\"bannerResources\">${resources(p)}</div><div class=\"bannerStats\"><div class=\"hearthMedallion\"><span>🔥</span><b>${p.hearthseed}</b><small>HP</small>${exposed}</div>${prosperityBadge(p)}${pending}</div></section>`;",
'player banner Hearthkeeper identity')
s=s.replace('Client v0.7.5 · Rules v0.6.2','Client v0.7.6 · Rules v0.6.2').replace("version:'0.7.4'","version:'0.7.6'")
p.write_text(s)

# --- styles.css ---
p=Path('styles.css'); s=p.read_text(); s += """

/* ===== v0.7.6 Hearthkeeper identity + solo controls ===== */
.keeperChip{justify-self:start;margin-top:3px;padding:3px 7px;border-radius:999px;background:#e7dcc3;color:#4c5748;border:1px solid #bda77d;font-size:8px;box-shadow:none}.keeperChip:hover:not(:disabled){transform:none;background:#f2e7ce}.hearthkeeperReferenceCard{display:grid;grid-template-columns:180px minmax(0,1fr);gap:18px;align-items:stretch;padding:16px;border:1px solid #bba77f;border-radius:16px;background:#fff9e9;box-shadow:var(--cardShadow)}.hearthkeeperPortrait{min-height:240px;display:grid;place-items:center;align-content:center;gap:8px;border:1px solid #9b8966;border-radius:12px;background:radial-gradient(circle at 50% 30%,#e5edd4,#aebb88 74%)}.hearthkeeperPortrait span{font-size:58px}.hearthkeeperPortrait small{font-size:8px;font-weight:900;letter-spacing:.1em;color:#655943}.hearthkeeperReferenceCard h3{margin:4px 0 12px;font:800 26px/1 Georgia,serif}.hearthkeeperFlavor{font:italic 16px/1.45 Georgia,serif;color:#465044}.referenceOnly{margin:18px 0 8px;padding:8px 10px;border-radius:9px;background:#efe5cf;border:1px solid #c8b794;font-size:10px;font-weight:900;color:#6c624f}.aiDifficultyBox{display:grid;gap:7px}.aiDifficultyBox label{display:grid;grid-template-columns:120px minmax(190px,1fr);gap:9px;align-items:center}.aiDifficultyBox select{width:100%}@media(max-width:720px){.hearthkeeperReferenceCard{grid-template-columns:1fr}.hearthkeeperPortrait{min-height:160px}.aiDifficultyBox label{grid-template-columns:1fr}}
"""; p.write_text(s)

# --- index version ---
p=Path('index.html'); s=p.read_text().replace('v0.7.5','v0.7.6').replace('?v=075','?v=076'); p.write_text(s)

# --- tests ---
p=Path('tests/ability-completion-test.js'); s=p.read_text()
s=replace_once(s,
"ok('data completion matches latest editable Stocked Squirrel Armory and clears stale manual labels',()=>{\n  const stocked=D.AS.blueprints.find(b=>b.id==='stocked_squirrel_armory');\n  assert(stocked.text.includes('When you upgrade to this, gain 📦'));\n  assert.equal(stocked.upgradeGain.provision,1);\n  assert.equal(stocked.squirrelMightBonus,undefined);",
"ok('data completion matches v0.6.2 latest Stocked Squirrel Armory and clears stale manual labels',()=>{\n  const stocked=D.AS.blueprints.find(b=>b.id==='stocked_squirrel_armory');\n  assert(stocked.text.includes('Squirrels housed here get +1 💪'));\n  assert.equal(stocked.upgradeGain,undefined);\n  assert.equal(stocked.squirrelMightBonus,1);",
'Stocked data test')
s=replace_once(s,
"ok('Stocked Squirrel Armory grants one Provision when upgraded and no static Might bonus',()=>{\n  const g=fresh(),p=setupBuild(g,0),start=p.resources.provision;\n  assert(E.build(g,0,'squirrel_armory').ok);\n  assert(E.build(g,0,'stocked_squirrel_armory').ok);\n  assert.equal(p.resources.provision,start+1,'upgrade should gain exactly one Provision');\n  const m=p.village.find(b=>b.id==='stocked_squirrel_armory'),r=resident('AS','squirrel_raider',m.uid);p.residents.push(r);E.refreshAbilityMarkers(g);\n  assert.equal(E.residentMight(r,{kind:'building'}),2,'Stocked Armory should not add a static Might bonus in the latest editable set');\n});",
"ok('Stocked Squirrel Armory gives housed Squirrels +1 Might',()=>{\n  const g=fresh(),p=setupBuild(g,0);const m=building('AS','stocked_squirrel_armory');p.village.push(m);const r=resident('AS','squirrel_raider',m.uid);p.residents.push(r);E.refreshAbilityMarkers(g);\n  assert.equal(E.residentMight(r,{kind:'building'}),3,'1 base +1 Raider vs Building +1 Stocked Squirrel');\n});\n\nok('Stocked Squirrel Armory Might bonus applies to blocker combat damage too',()=>{\n  const g=fresh();setupBuild(g,1);const atkP=g.players[1],defP=g.players[0];const am=building('RP','rabbit_warren'),dm=building('AS','stocked_squirrel_armory');atkP.village.push(am);defP.village.push(dm);const atk=resident('RP','rootling_mole',am.uid),block=resident('AS','squirrel_raider',dm.uid);atkP.residents.push(atk);defP.residents.push(block);E.refreshAbilityMarkers(g);g.phase='Attack';assert(E.declareAttack(g,1,atk.uid,'hearthseed').ok);assert(E.commitAttacks(g,1).ok);assert(E.assignBlock(g,0,block.uid,0).ok);assert(E.resolveCombat(g).ok);assert.equal(atk.damage,2,'Stocked Squirrel should counter for 2 Might');\n});",
'Stocked ability tests')
p.write_text(s)

p=Path('tests/smoke-test.js'); s=p.read_text()
s=replace_once(s,
"assert(stocked.upgradeGain?.provision===1&&!stocked.squirrelMightBonus,'Stocked Squirrel Armory must use the latest editable upgrade-gain text');",
"assert(stocked.squirrelMightBonus===1&&!stocked.upgradeGain,'Stocked Squirrel Armory must match v0.6.2 latest: housed Squirrels get +1 Might');\nassert(decks.AS.hearthkeeperCard?.name==='Hazel Underleaf'&&decks.RP.hearthkeeperCard?.name==='Mosswick Grubroot','Hearthkeeper reference cards missing');\nassert(decks.AS.name==='Hazel Underleaf'&&decks.RP.name==='Mosswick Grubroot','starter deck display names should be Hearthkeeper names');",
'smoke identity and Stocked')
s=s.replace('?v=075','?v=076').replace('Tabletop Client v0.7.5','Tabletop Client v0.7.6')
p.write_text(s)

p=Path('tests/ui-coordinator-test.js'); s=p.read_text().replace('v0.7.5','v0.7.6')
if "forgiving priorities" not in s:
    s += "\nassert(client.includes('Beginner — forgiving priorities'),'beginner AI should be defined by decision quality');\nassert(client.includes('AI Pace'),'AI pace should be separate from difficulty');\nassert(client.includes('View Hearthkeeper card'),'Hearthkeeper reference access missing');\nconsole.log('✓ Hearthkeeper identity and AI skill/pacing controls');\n"
p.write_text(s)

print('v0.7.6 patch complete')
