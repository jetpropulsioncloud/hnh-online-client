const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
global.window=global;
for(const file of ['data.js','engine.js'])vm.runInThisContext(fs.readFileSync(file,'utf8'),{filename:file});
const E=global.HNH_ENGINE,D=global.HNH_DATA.decks;
const rng=()=>0.01;
let uid=980000;
const ok=(name,fn)=>{fn();console.log(`✓ ${name}`);};
const fresh=(mode='hotseat',humanFaction='AS')=>E.createGame({mode,humanFaction,rng});
const card=(key,id)=>({...JSON.parse(JSON.stringify(D[key].field.find(c=>c.id===id))),uid:uid++});
const building=(key,id,damage=0)=>({...JSON.parse(JSON.stringify(D[key].blueprints.find(b=>b.id===id))),uid:uid++,damage,shield:false,tempPrevent:0,rehousingDueOwnTurn:null});
const resident=(key,id,musterUid,extra={})=>({...card(key,id),musterUid,damage:0,tired:false,attacking:false,blocking:false,tool:null,shield:false,tempPrevent:0,recruitedTurn:-1,...extra});
const setup=(g,pi)=>{g.started=true;g.active=pi;g.phase='Build';g.combat={attacks:[],committed:false,resolved:false};const p=g.players[pi];p.resources={acorn:9,sap:9,root:9,pebble:9,provision:9};return p;};
const resolve=(g,selection)=>{const ch=E.pendingAbilityChoice(g);assert(ch,'expected pending choice');const r=E.resolveAbilityChoice(g,ch.playerIndex,ch.id,String(selection));assert(r.ok,r.reason);return ch;};

ok('runtime card data has no stale manual flags for completed starter abilities',()=>{
  for(const deck of Object.values(D)){
    const cards=[deck.founding,...deck.field,...deck.blueprints];
    for(const c of cards){
      assert.equal(c.manual,undefined,`${c.name} still has card.manual`);
      assert.equal(c.flags?.manual,undefined,`${c.name} still has flags.manual`);
    }
  }
});

ok('Lantern Scout Nook triggers only for the first Mouse/Bird recruited there each round',()=>{
  const g=fresh(),p=setup(g,0),m=building('AS','lantern_scout_nook');p.village.push(m);
  const a=card('AS','tilly_thimbletail'),b=card('AS','tilly_thimbletail');p.hand.push(a,b);
  assert(E.recruit(g,0,a.uid,m.uid).ok);assert.equal(E.pendingAbilityChoice(g)?.kind,'lantern-scry');resolve(g,E.pendingAbilityChoice(g).options[0].id);
  assert(E.recruit(g,0,b.uid,m.uid).ok);assert.equal(E.pendingAbilityChoice(g),null,'second Bird in the same round must not scry again');
});

ok('Lantern Scout Nook does not open a choice when the Field Deck is empty',()=>{
  const g=fresh(),p=setup(g,0),m=building('AS','lantern_scout_nook');p.village.push(m);p.fieldDeck=[];
  const a=card('AS','tilly_thimbletail');p.hand.push(a);assert(E.recruit(g,0,a.uid,m.uid).ok);assert.equal(E.pendingAbilityChoice(g),null);
});

ok('Deep Wormturn Den consumes its first trigger without a pointless modal when Compost has no Critter',()=>{
  const g=fresh(),p=setup(g,1),m=building('RP','deep_wormturn_den');p.village.push(m);
  const a=card('RP','rootling_mole');p.hand.push(a);assert(E.recruit(g,1,a.uid,m.uid).ok);assert.equal(E.pendingAbilityChoice(g),null);
});

ok('Deep Wormturn Den triggers at most once per round',()=>{
  const g=fresh(),p=setup(g,1),m=building('RP','deep_wormturn_den');p.village.push(m);
  const x=card('RP','tunnel_beetle'),y=card('RP','rabbit_helper');p.compost.push(x,y);
  const a=card('RP','rootling_mole'),b=card('RP','rootling_mole');p.hand.push(a,b);
  assert(E.recruit(g,1,a.uid,m.uid).ok);assert.equal(E.pendingAbilityChoice(g)?.kind,'deep-wormturn');resolve(g,x.uid);
  assert(E.recruit(g,1,b.uid,m.uid).ok);assert.equal(E.pendingAbilityChoice(g),null);
});

ok('Hearthroot Tree triggers once per round even if multiple Buildings are repaired',()=>{
  const g=fresh(),p=setup(g,1),tree=building('RP','hearthroot_tree'),work=building('RP','burrow_workshop'),warren=building('RP','rabbit_warren'),a=building('RP','root_hollow',2),b=building('RP','pebble_yard',2);p.village.push(tree,work,warren,a,b);
  assert(E.useWorkshop(g,1,work.uid,a.uid,'root').ok);assert.equal(E.pendingAbilityChoice(g)?.kind,'hearthroot-bottom');resolve(g,p.hand[0].uid);
  const rabbit=card('RP','rabbit_helper');p.hand.push(rabbit);assert(E.recruit(g,1,rabbit.uid,warren.uid).ok);assert.equal(E.pendingAbilityChoice(g)?.kind,'repair-building');resolve(g,b.uid);assert.equal(E.pendingAbilityChoice(g),null,'second repair in round must not trigger Hearthroot again');
});

ok('Hearthroot Tree still bottoms a hand card if its draw finds an empty Field Deck',()=>{
  const g=fresh(),p=setup(g,1),tree=building('RP','hearthroot_tree'),work=building('RP','burrow_workshop'),damaged=building('RP','root_hollow',1);p.village.push(tree,work,damaged);p.fieldDeck=[];p.hand=[card('RP','pebble_plating')];
  assert(E.useWorkshop(g,1,work.uid,damaged.uid,'root').ok);assert.equal(E.pendingAbilityChoice(g)?.kind,'hearthroot-bottom');const chosen=p.hand[0];resolve(g,chosen.uid);assert.equal(p.hand.length,0);assert.equal(p.fieldDeck.length,1);assert.equal(p.fieldDeck[0].uid,chosen.uid);
});

ok('AI resolves printed card choices deterministically instead of leaving a modal pending',()=>{
  const g=fresh('ai','AS'),pi=g.aiIndex,p=setup(g,pi),m=building('RP','wormturn_den');p.village.push(m);
  const low=card('RP','pebble_plating'),high=card('RP','stone_toad_bruiser');p.compost.push(low,high);const crow=card('RP','crow_salvager');p.hand.push(crow);
  assert(E.recruit(g,pi,crow.uid,m.uid).ok);assert.equal(E.pendingAbilityChoice(g),null);assert(p.hand.some(c=>c.uid===high.uid),'AI should recover the higher-valued legal card');
});

function firstNellDefeat(){
  const g=fresh();setup(g,0);const atkP=g.players[0],defP=g.players[1],am=building('AS','brambleworks_hideout'),dm=building('RP','rabbit_warren');atkP.village.push(am);defP.village.push(dm);const atk=resident('AS','ant_rush_team',am.uid),nell=resident('RP','nell_rootwatch',dm.uid);atkP.residents.push(atk);defP.residents.push(nell);E.refreshAbilityMarkers(g);g.phase='Attack';assert(E.declareAttack(g,0,atk.uid,'hearthseed').ok);assert(E.commitAttacks(g,0).ok);assert(E.assignBlock(g,1,nell.uid,0).ok);assert(E.resolveCombat(g).ok);return {g,atkP,defP,am,dm,nell};
}

ok('Nell Rootwatch Hearthbound works only the first time each game',()=>{
  const {g,atkP,defP,am,dm,nell}=firstNellDefeat();const returned=defP.hand.find(c=>c.uid===nell.uid);assert(returned);defP.hand=defP.hand.filter(c=>c.uid!==returned.uid);const second={...returned,musterUid:dm.uid,damage:0,tired:false,attacking:false,blocking:false,tool:null,shield:false,tempPrevent:0,recruitedTurn:-1};defP.residents.push(second);
  const atk2=resident('AS','ant_rush_team',am.uid);atkP.residents.push(atk2);g.phase='Attack';g.combat={attacks:[],committed:false,resolved:false};atkP.attackedThisStep=[];assert(E.declareAttack(g,0,atk2.uid,'hearthseed').ok);assert(E.commitAttacks(g,0).ok);assert(E.assignBlock(g,1,second.uid,0).ok);assert(E.resolveCombat(g).ok);assert(!defP.hand.some(c=>c.uid===nell.uid),'second defeat must not return Nell to hand');assert(defP.compost.some(c=>c.uid===nell.uid),'second defeat should go to Compost');
});

ok('Great Clover Hearthring save is mandatory when a Critter is defeated and only once per round',()=>{
  const g=fresh();setup(g,0);const p=g.players[0],o=g.players[1],clover=building('AS','great_clover_hearthring'),am=building('AS','squirrel_armory'),dm=building('RP','snail_gate');p.village.push(clover,am);o.village.push(dm);const victim=resident('AS','squirrel_raider',am.uid),blocker=resident('RP','stone_toad_bruiser',dm.uid);p.residents.push(victim);o.residents.push(blocker);E.refreshAbilityMarkers(g);g.phase='Attack';assert(E.declareAttack(g,0,victim.uid,'hearthseed').ok);assert(E.commitAttacks(g,0).ok);assert(E.assignBlock(g,1,blocker.uid,0).ok);assert(E.resolveCombat(g).ok);const ch=E.pendingAbilityChoice(g);assert.equal(ch.kind,'clover-save');assert(!ch.options.some(o=>o.id==='skip'),'printed Clover save does not say may');resolve(g,victim.uid);
  const victim2=resident('AS','squirrel_raider',am.uid),blocker2=resident('RP','stone_toad_bruiser',dm.uid);p.residents.push(victim2);o.residents.push(blocker2);g.phase='Attack';g.combat={attacks:[],committed:false,resolved:false};p.attackedThisStep=[];assert(E.declareAttack(g,0,victim2.uid,'hearthseed').ok);assert(E.commitAttacks(g,0).ok);assert(E.assignBlock(g,1,blocker2.uid,0).ok);assert(E.resolveCombat(g).ok);assert.equal(E.pendingAbilityChoice(g),null,'Clover must not save a second Critter in the same round');assert(p.compost.some(c=>c.uid===victim2.uid));
});

ok('Shared Satchel Provision trigger cannot fire twice in the same round for the same Satchel',()=>{
  const g=fresh(),p=setup(g,0),o=g.players[1],m=building('AS','squirrel_armory');p.village.push(m);const tool=card('AS','shared_satchel'),r=resident('AS','squirrel_raider',m.uid,{tool});p.residents.push(r);E.refreshAbilityMarkers(g);const target=o.village[0],start=p.resources.provision;
  g.phase='Attack';assert(E.declareAttack(g,0,r.uid,target.uid).ok);assert(E.commitAttacks(g,0).ok);assert(E.resolveCombat(g).ok);assert.equal(p.resources.provision,start+1);
  r.tired=false;r.attacking=false;g.phase='Attack';g.combat={attacks:[],committed:false,resolved:false};p.attackedThisStep=[];assert(E.declareAttack(g,0,r.uid,target.uid).ok);assert(E.commitAttacks(g,0).ok);assert(E.resolveCombat(g).ok);assert.equal(p.resources.provision,start+1,'same Satchel must not gain again in the same round');
});

console.log('\nAll v0.6.2 card ability edge/timing tests passed.');
