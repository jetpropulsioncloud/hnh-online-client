const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
global.window=global;
for(const file of ['data.js','data-v062-completion.js','engine-v062.js','engine-rules-patches.js','ability-completion.js'])vm.runInThisContext(fs.readFileSync(file,'utf8'),{filename:file});
const E=global.HNH_ENGINE,D=global.HNH_DATA.decks;
const rng=()=>0.01;
let uid=900000;
const ok=(name,fn)=>{fn();console.log(`✓ ${name}`);};
const fresh=()=>E.createGame({mode:'hotseat',rng});
const card=(key,id)=>{const c=D[key].field.find(x=>x.id===id);return {...JSON.parse(JSON.stringify(c)),uid:uid++};};
const building=(key,id,damage=0)=>{const b=D[key].blueprints.find(x=>x.id===id);return {...JSON.parse(JSON.stringify(b)),uid:uid++,damage,shield:false,tempPrevent:0,rehousingDueOwnTurn:null};};
const resident=(key,id,musterUid,extra={})=>({...card(key,id),musterUid,damage:0,tired:false,attacking:false,blocking:false,tool:null,shield:false,tempPrevent:0,recruitedTurn:-1,...extra});
const setupBuild=(g,pi)=>{g.started=true;g.active=pi;g.phase='Build';g.combat={attacks:[],committed:false,resolved:false};const p=g.players[pi];p.resources={acorn:9,sap:9,root:9,pebble:9,provision:9};return p;};
const resolveFirst=(g,selection)=>{const ch=E.pendingAbilityChoice(g);assert(ch,'expected pending choice');const r=E.resolveAbilityChoice(g,ch.playerIndex,ch.id,String(selection));assert(r.ok,r.reason);return ch;};

ok('data completion matches latest Stocked Squirrel Armory and clears stale manual labels',()=>{
  const stocked=D.AS.blueprints.find(b=>b.id==='stocked_squirrel_armory');
  assert(stocked.text.includes('Squirrels housed here get +1 💪'));
  assert.equal(stocked.upgradeGain,undefined);
  assert.equal(D.AS.blueprints.find(b=>b.id==='great_clover_hearthring').subtype,'Defense');
  assert.equal(D.RP.blueprints.find(b=>b.id==='hearthroot_tree').subtype,'Utility');
  const automated=['shared_satchel','hide_in_ferns','sap_bandage'];
  for(const id of automated)assert.equal(D.AS.field.find(c=>c.id===id).flags.manual,undefined);
});

ok('Meadow Mouse Scout requires a player Shield target choice',()=>{
  const g=fresh(),p=setupBuild(g,0);const m=building('AS','porchlight_scout_nook');p.village.push(m);const other=building('AS','acorn_cache');p.village.push(other);
  const c=card('AS','meadow_mouse_scout');p.hand.push(c);assert(E.recruit(g,0,c.uid,m.uid).ok);
  assert.equal(other.shield,false);const ch=E.pendingAbilityChoice(g);assert.equal(ch.kind,'shield-building');resolveFirst(g,other.uid);assert.equal(other.shield,true);
});

ok('Rabbit Helper and Pillbug Builder repair the Building the player chooses',()=>{
  for(const [id,amount] of [['rabbit_helper',1],['pillbug_builder',2]]){
    const g=fresh(),p=setupBuild(g,1);const m=building('RP','rabbit_warren');p.village.push(m);const a=building('RP','root_hollow',3),b=building('RP','pebble_yard',2);p.village.push(a,b);
    const c=card('RP',id);p.hand.push(c);assert(E.recruit(g,1,c.uid,m.uid).ok);assert.equal(a.damage,3);resolveFirst(g,b.uid);assert.equal(b.damage,Math.max(0,2-amount));assert.equal(a.damage,3);
  }
});

ok('Bramble Climbing Kit gives Eager and permits attacking the recruit turn',()=>{
  const g=fresh(),p=setupBuild(g,0);const m=building('AS','squirrel_armory');const shed=building('AS','acorn_tool_shed');p.village.push(m,shed);
  const c=card('AS','squirrel_raider'),tool=card('AS','bramble_climbing_kit');p.hand.push(c,tool);assert(E.recruit(g,0,c.uid,m.uid).ok);const r=p.residents.find(x=>x.uid===c.uid);assert.equal(E.canAttack(g,0,r),false);assert(E.playTool(g,0,tool.uid,r.uid).ok);assert(E.canAttack(g,0,r),'Eager carrier should be attack-ready');assert(E.declareAttack(g,0,r.uid,'hearthseed').ok);
});

ok('Stocked Squirrel Armory gives housed Squirrels +1 Might',()=>{
  const g=fresh(),p=setupBuild(g,0);const m=building('AS','stocked_squirrel_armory');p.village.push(m);const r=resident('AS','squirrel_raider',m.uid);p.residents.push(r);E.refreshAbilityMarkers(g);assert.equal(E.residentMight(r,{kind:'building'}),3,'1 base +1 Raider vs Building +1 Stocked Squirrel');
});

ok('Lantern Scout Nook shows top two Field Deck cards and lets player choose top/bottom order',()=>{
  const g=fresh(),p=setupBuild(g,0);const m=building('AS','lantern_scout_nook');p.village.push(m);const mouse=card('AS','meadow_mouse_scout');p.hand.push(mouse);const before=p.fieldDeck.slice(0,2).map(c=>c.uid);assert.equal(before.length,2);assert(E.recruit(g,0,mouse.uid,m.uid).ok);
  const shield=E.pendingAbilityChoice(g);assert.equal(shield.kind,'shield-building');resolveFirst(g,p.village[0].uid);const scry=E.pendingAbilityChoice(g);assert.equal(scry.kind,'lantern-scry');resolveFirst(g,before[1]);assert.equal(p.fieldDeck[0].uid,before[1]);assert.equal(p.fieldDeck[p.fieldDeck.length-1].uid,before[0]);
});

ok('Crow Salvager chooses a Tool or Critter from Compost and returns it to hand',()=>{
  const g=fresh(),p=setupBuild(g,1);const m=building('RP','wormturn_den');p.village.push(m);const recovered=card('RP','pebble_plating');p.compost.push(recovered);const crow=card('RP','crow_salvager');p.hand.push(crow);assert(E.recruit(g,1,crow.uid,m.uid).ok);const ch=E.pendingAbilityChoice(g);assert.equal(ch.kind,'crow-salvage');resolveFirst(g,recovered.uid);assert(p.hand.some(c=>c.uid===recovered.uid));assert(!p.compost.some(c=>c.uid===recovered.uid));
});

ok('Deep Wormturn Den can put a chosen Compost Critter on top of the Field Deck',()=>{
  const g=fresh(),p=setupBuild(g,1);const m=building('RP','deep_wormturn_den');p.village.push(m);const target=card('RP','tunnel_beetle');p.compost.push(target);const mole=card('RP','rootling_mole');p.hand.push(mole);assert(E.recruit(g,1,mole.uid,m.uid).ok);const ch=E.pendingAbilityChoice(g);assert.equal(ch.kind,'deep-wormturn');resolveFirst(g,target.uid);assert.equal(p.fieldDeck[0].uid,target.uid);assert(!p.compost.some(c=>c.uid===target.uid));
});

ok('Hearthroot Tree draws after a repair then lets player bottom-deck a hand card',()=>{
  const g=fresh(),p=setupBuild(g,1);const tree=building('RP','hearthroot_tree'),work=building('RP','burrow_workshop'),damaged=building('RP','root_hollow',2);p.village.push(tree,work,damaged);const handBefore=p.hand.length,deckBefore=p.fieldDeck.length;assert(E.useWorkshop(g,1,work.uid,damaged.uid,'root').ok);assert.equal(p.hand.length,handBefore+1);assert.equal(p.fieldDeck.length,deckBefore-1);const ch=E.pendingAbilityChoice(g);assert.equal(ch.kind,'hearthroot-bottom');const chosen=p.hand[0];resolveFirst(g,chosen.uid);assert.equal(p.fieldDeck[p.fieldDeck.length-1].uid,chosen.uid);
});

function combatWithBlock({attackerKey='AS',attackerId='ant_rush_team',defenderKey='RP',defenderId,defenderExtra=()=>{}}){
  const g=fresh();setupBuild(g,0);const atkP=g.players[0],defP=g.players[1];const am=building(attackerKey,attackerKey==='AS'?'brambleworks_hideout':'rabbit_warren');const dm=building(defenderKey,defenderKey==='RP'?'rabbit_warren':'squirrel_armory');atkP.village.push(am);defP.village.push(dm);const atk=resident(attackerKey,attackerId,am.uid),def=resident(defenderKey,defenderId,dm.uid);atkP.residents.push(atk);defP.residents.push(def);defenderExtra(g,defP,def,dm);E.refreshAbilityMarkers(g);g.phase='Attack';assert(E.declareAttack(g,0,atk.uid,'hearthseed').ok);assert(E.commitAttacks(g,0).ok);assert(E.assignBlock(g,1,def.uid,0).ok);assert(E.resolveCombat(g).ok);return {g,atkP,defP,atk,def,dm};
}

ok('Tunnel Beetle Patchwork repairs the chosen Building when defeated',()=>{
  const {g,defP}=combatWithBlock({defenderId:'tunnel_beetle',defenderExtra:(g,p)=>p.village.push(building('RP','root_hollow',2))});const damaged=defP.village.find(b=>b.id==='root_hollow');assert(!defP.residents.some(r=>r.id==='tunnel_beetle'));const ch=E.pendingAbilityChoice(g);assert.equal(ch.kind,'repair-building');resolveFirst(g,damaged.uid);assert.equal(damaged.damage,1);
});

ok('Nell Rootwatch Hearthbound returns it to hand the first time it is defeated while blocking',()=>{
  const {defP}=combatWithBlock({defenderId:'nell_rootwatch'});assert(defP.hand.some(c=>c.id==='nell_rootwatch'));assert(!defP.compost.some(c=>c.id==='nell_rootwatch'));assert.equal(defP._nellHearthboundUsed,true);
});

ok('Shared Satchel gains one Provision when its carrier damages a Building, once per round per Satchel',()=>{
  const g=fresh(),p=setupBuild(g,0),o=g.players[1];const m=building('AS','squirrel_armory');p.village.push(m);const r=resident('AS','squirrel_raider',m.uid,{tool:card('AS','shared_satchel')});p.residents.push(r);E.refreshAbilityMarkers(g);const target=o.village[0];const start=p.resources.provision;g.phase='Attack';assert(E.declareAttack(g,0,r.uid,target.uid).ok);assert(E.commitAttacks(g,0).ok);assert(E.resolveCombat(g).ok);assert.equal(p.resources.provision,start+1);
});

ok('Great Clover Hearthring can save a defeated Critter in its Muster at one health and tired',()=>{
  const g=fresh();setupBuild(g,0);const p=g.players[0],o=g.players[1];const clover=building('AS','great_clover_hearthring'),am=building('AS','squirrel_armory'),dm=building('RP','snail_gate');p.village.push(clover,am);o.village.push(dm);const atk=resident('AS','squirrel_raider',am.uid),blocker=resident('RP','stone_toad_bruiser',dm.uid);p.residents.push(atk);o.residents.push(blocker);E.refreshAbilityMarkers(g);g.phase='Attack';assert(E.declareAttack(g,0,atk.uid,'hearthseed').ok);assert(E.commitAttacks(g,0).ok);assert(E.assignBlock(g,1,blocker.uid,0).ok);assert(E.resolveCombat(g).ok);const ch=E.pendingAbilityChoice(g);assert.equal(ch.kind,'clover-save');resolveFirst(g,atk.uid);const saved=p.residents.find(r=>r.uid===atk.uid);assert(saved);assert.equal(saved.tired,true);assert.equal(saved.damage,E.residentGrit(g,p,saved,false)-1);
});

console.log('\nAll v0.6.2 card ability completion tests passed.');
