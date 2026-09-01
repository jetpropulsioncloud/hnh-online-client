const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

global.window=global;
vm.runInThisContext(fs.readFileSync('data.js','utf8'),{filename:'data.js'});
vm.runInThisContext(fs.readFileSync('engine.js','utf8'),{filename:'engine.js'});
const E=global.HNH_ENGINE;

const ok=(name,fn)=>{fn();console.log(`✓ ${name}`);};
const fixedRng=()=>0.01;

ok('Prosperity wins at the start of Dawn at 15+',()=>{
  const g=E.createGame({mode:'hotseat',rng:fixedRng});
  const p=g.players[g.active];
  p.village.push({id:'test_pros',name:'Test Prosperity',durability:99,damage:0,prosperity:14});
  E.startGame(g);
  assert(g.winner,'expected a winner');
  assert.equal(g.winner.reason,'Prosperity');
  assert.equal(g.winner.playerIndex,g.active);
});

ok('Reaching 15 during a turn does not win until that player next begins Dawn',()=>{
  const g=E.createGame({mode:'hotseat',rng:fixedRng});
  E.startGame(g);
  if(g.phase==='Harvest')E.chooseHarvest(g,g.pendingHarvest[0].options[0]);
  const first=g.active,p=g.players[first];
  p.village.push({id:'test_pros',name:'Test Prosperity',durability:99,damage:0,prosperity:14});
  assert.equal(E.prosperity(p),15);
  assert.equal(g.winner,null,'15 during Build must not win immediately');
  E._test.finishTurn(g);
  assert.equal(g.winner,null,'opponent Dawn must not award the first player Prosperity');
  E._test.finishTurn(g);
  assert(g.winner,'first player should win on their next Dawn');
  assert.equal(g.winner.reason,'Prosperity');
  assert.equal(g.winner.playerIndex,first);
});

ok('Empty Field Deck does not silently recycle Compost',()=>{
  const g=E.createGame({mode:'hotseat',rng:fixedRng});
  const p=g.players[0];
  p.fieldDeck=[];p.hand=[];p.compost=[{id:'spent',name:'Spent card'}];
  const drawn=E.draw(g,p,1,true);
  assert.equal(drawn,0);
  assert.equal(p.hand.length,0);
  assert.equal(p.compost.length,1);
});

ok('Provision slots accept core resources but exact core costs remain exact',()=>{
  const g=E.createGame({mode:'hotseat',rng:fixedRng}),p=g.players[0];
  p.resources={acorn:1,sap:1,root:0,pebble:0,provision:0};
  assert(E.canAfford(p,{provision:2}));
  const plan=E.paymentPlan(p,{provision:2});
  assert.equal((plan.acorn||0)+(plan.sap||0),2);
  p.resources={acorn:0,sap:0,root:0,pebble:0,provision:2};
  assert.equal(E.canAfford(p,{acorn:1}),false,'Provision cannot pay an Acorn symbol');
});

ok('Every starter Field Deck has 45 cards',()=>{
  for(const key of ['AS','RP']){
    const g=E.createGame({mode:'hotseat',rng:fixedRng});
    const p=g.players.find(x=>x.factionKey===key);
    assert.equal(p.fieldDeck.length+p.hand.length,45);
  }
});

ok('Advanced Critters require upgraded matching Musters',()=>{
  const g=E.createGame({mode:'hotseat',rng:fixedRng});
  const pi=g.active,p=g.players[pi];
  g.started=true;g.phase='Build';
  const f=global.HNH_DATA.decks[p.factionKey];
  if(p.factionKey!=='AS')throw new Error('fixed setup expected AS active for this test');
  p.resources.acorn=5;p.resources.sap=5;p.resources.provision=5;
  assert(E.build(g,pi,'squirrel_armory').ok);
  const juniper=JSON.parse(JSON.stringify(f.field.find(c=>c.id==='juniper_jay')));juniper.uid=999001;
  p.hand.push(juniper);
  assert.equal(E.legalMusters(g,pi,juniper).length,0,'basic Scurry Muster must not accept Advanced Juniper');
  assert(E.build(g,pi,'stocked_squirrel_armory').ok);
  assert(E.legalMusters(g,pi,juniper).some(m=>m.id==='stocked_squirrel_armory'));
});

ok('Ruined base Buildings can still be upgraded and keep damage',()=>{
  const g=E.createGame({mode:'hotseat',rng:fixedRng});
  const pi=g.active,p=g.players[pi];g.started=true;g.phase='Build';
  if(p.factionKey!=='AS')throw new Error('fixed setup expected AS active for this test');
  p.resources.acorn=5;p.resources.sap=5;p.resources.provision=5;
  assert(E.build(g,pi,'squirrel_armory').ok);
  const base=p.village.find(b=>b.id==='squirrel_armory');base.damage=4;
  assert(E.isRuined(base));
  const result=E.build(g,pi,'stocked_squirrel_armory');
  assert(result.ok,result.reason);
  const upgraded=p.village.find(b=>b.id==='stocked_squirrel_armory');
  assert.equal(upgraded.damage,4,'upgrade must preserve damage');
  assert.equal(E.isRuined(upgraded),false,'5 durability upgrade should reactivate at 4 damage');
});

ok('Surviving Critter damage clears at its controller Rest, not at Dawn',()=>{
  const g=E.createGame({mode:'hotseat',rng:fixedRng});
  const pi=g.active,p=g.players[pi],other=g.players[1-pi];
  p.residents.push({uid:7001,name:'Active survivor',grit:4,damage:2,musterUid:-1,tired:false});
  other.residents.push({uid:7002,name:'Defending survivor',grit:4,damage:2,musterUid:-1,tired:false});
  g.started=true;g.phase='Build';
  E._test.finishTurn(g);
  assert.equal(p.residents[0].damage,0);
  assert.equal(other.residents[0].damage,2,'opponent survivor damage remains until opponent Rest');
});

ok('Consolidated client parses and contains the UI export',()=>{
  const source=fs.readFileSync('client.js','utf8');
  new vm.Script(source,{filename:'client.js'});
  assert(/window\.UI\s*=/.test(source),'client UI export missing');
});

console.log('\nAll v0.6.2 rule regression tests passed.');
