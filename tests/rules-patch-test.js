const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
global.window=global;
for(const f of ['data.js','engine.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const E=global.HNH_ENGINE;
const rng=()=>0.01;

function prep(){
  const g=E.createGame({mode:'hotseat',rng});
  E.startGame(g);
  if(g.phase==='Harvest')E.chooseHarvest(g,g.pendingHarvest[0].options[0]);
  return g;
}
function addMusterAndCritter(g,pi){
  const p=g.players[pi],f=global.HNH_DATA.decks[p.factionKey];
  const musterClass=p.factionKey==='AS'?'Scurry':'Handwork';
  p.village.push({uid:8000+pi,id:`test_muster_${pi}`,name:'Test Muster',type:'Building',subtype:'Muster',muster:true,musterClass,housing:3,recruitCost:{},durability:5,damage:0,prosperity:0});
  const card=f.field.find(c=>(c.musterClasses||[]).includes(musterClass)&&!c.advanced);
  p.residents.push({...JSON.parse(JSON.stringify(card)),uid:8100+pi,musterUid:8000+pi,damage:0,tired:false,attacking:false,blocking:false,tool:null,shield:false,tempPrevent:0,recruitedTurn:-1});
}

{
  const g=prep(),pi=g.active;
  addMusterAndCritter(g,pi);
  const r=g.players[pi].residents[0];
  assert(E.declareAttack(g,pi,r.uid,'hearthseed').ok);
  assert(E.commitAttacks(g,pi).ok);
  assert.equal(E.canAttack(g,pi,r),false);
  const another={...r,uid:9999,tired:false,attacking:false};g.players[pi].residents.push(another);
  const result=E.declareAttack(g,pi,another.uid,'hearthseed');
  assert.equal(result.ok,false,'cannot declare a second attack wave after commit');
  console.log('✓ one committed attack declaration per Attack step');
}

{
  const g=prep(),pi=g.active;
  addMusterAndCritter(g,pi);
  const r=g.players[pi].residents[0];
  assert(E.declareAttack(g,pi,r.uid,'hearthseed').ok);
  const result=E.requestEndTurn(g,pi);
  assert.equal(result.ok,false,'cannot skip unresolved declared combat by ending turn');
  console.log('✓ unresolved attack cannot be skipped with End turn');
}

console.log('\nSequencing patch tests passed.');
