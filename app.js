(() => {
  const {decks} = window.HNH_DATA;
  const app = document.getElementById('app');
  const ICON = {acorn:'🥜',sap:'💦',root:'🫚',pebble:'🪨',provision:'📦'};
  const RLABEL = {acorn:'Acorn',sap:'Sap',root:'Root',pebble:'Pebble',provision:'Provision'};
  const PHASES = ['Dawn','Harvest','Build','Attack','Rest'];
  let uid = 1;
  let fxuid = 1;
  let state = null;
  let dragPayload = null;

  const clone = x => JSON.parse(JSON.stringify(x));
  const inst = card => ({...clone(card), uid:uid++});
  const shuffle = a => { a=[...a]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
  const esc = s => String(s ?? '').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const rname = r => ICON[r] || r;
  const costText = c => !c || Object.keys(c).length===0 ? 'Free' : Object.entries(c).map(([k,v])=>`${v>1?v:''}${rname(k)}`).join(' + ');

  function makeFieldDeck(faction){
    const cards=[];
    faction.field.forEach(card=>{for(let i=0;i<card.count;i++)cards.push(inst({...card,count:undefined}));});
    return shuffle(cards);
  }

  function makePlayer(name,key){
    const f=decks[key];
    const p={
      name,factionKey:key,hearthseed:20,resources:{acorn:0,sap:0,root:0,pebble:0,provision:0},
      fieldDeck:makeFieldDeck(f),hand:[],compost:[],village:[],residents:[],usedBlueprints:[],
      exposed:false,exposurePendingOwnTurn:null,sabotagedBuildings:{},
      freeProductionBuilt:false,toolPlayed:false,reactionRoundUsed:null,workshopRepairUsed:false,
      attackedThisStep:[],turnsTaken:0,buildReadySnapshot:null,
    };
    p.village.push({...inst(f.founding),damage:0,founding:true,shield:false,rehousingDueOwnTurn:null});
    draw(p,7,false);
    return p;
  }

  function draw(p,n=1,logIt=true){
    let actual=0;
    for(let i=0;i<n;i++){
      if(!p.fieldDeck.length){
        if(!p.compost.length) continue;
        p.fieldDeck=shuffle(p.compost.splice(0));
        if(logIt) log(`${p.name} recycled Compost into the Field Deck.`);
      }
      const c=p.fieldDeck.shift(); if(c){p.hand.push(c);actual++;}
    }
    if(logIt && actual) log(`${p.name} drew ${actual} card${actual===1?'':'s'}.`);
  }

  function log(msg){ if(!state)return; state.log.unshift(msg); state.log=state.log.slice(0,120); }
  function active(){return state.players[state.active];}
  function opponent(){return state.players[1-state.active];}
  function faction(p){return decks[p.factionKey];}
  function playerIndex(p){return state.players.indexOf(p);}
  function activeBuildings(p){return p.village.filter(b=>b.damage < b.durability);}
  function prosperity(p){return activeBuildings(p).reduce((s,b)=>s+(b.prosperity||0),0);}
  function isRuined(b){return b.damage>=b.durability;}
  function hasActive(p,pred){return activeBuildings(p).some(pred);}
  function musters(p){return activeBuildings(p).filter(b=>b.muster);}
  function controlledMusters(p){return p.village.filter(b=>b.muster);}
  function peacefulActive(p){return activeBuildings(p).some(b=>b.peaceful);}
  function housingUsed(p,musterUid){return p.residents.filter(r=>r.musterUid===musterUid && !r.defeated).length;}
  function residentGrit(r){return r.grit + (r.tool?.flags?.gritBonus||0);}
  function residentMight(r,target){return r.might + ((target?.kind==='building' && r.flags?.buildingMightBonus)||0);}
  function residentReady(p,r){
    const m=p.village.find(b=>b.uid===r.musterUid);
    return !r.tired && !r.defeated && m && !isRuined(m);
  }
  function readyCount(p){return p.residents.filter(r=>residentReady(p,r)).length;}
  function residentHasEager(r){return !!(r.flags?.eager||r.tool?.flags?.eager);}
  function residentCanAttack(p,r){
    if(!residentReady(p,r))return false;
    return r.recruitedTurn!==state.turnNo||residentHasEager(r);
  }
  function musterMatches(card,m){
    if(!m?.muster||isRuined(m))return false;
    if(card.advanced&&!m.upgradeFrom)return false;
    return (card.musterClasses||[]).includes(m.musterClass);
  }

  const CORE_RESOURCES=['acorn','sap','root','pebble'];
  function paymentPlan(p,cost,interactive=false){
    const virtual={...p.resources},plan={};
    for(const r of CORE_RESOURCES){
      const need=cost?.[r]||0;
      if((virtual[r]||0)<need)return null;
      if(need){virtual[r]-=need;plan[r]=(plan[r]||0)+need;}
    }
    let provisionNeed=cost?.provision||0;
    while(provisionNeed>0){
      const choices=['provision',...CORE_RESOURCES].filter(r=>(virtual[r]||0)>0);
      if(!choices.length)return null;
      let chosen;
      if(interactive&&!isAiTurn()&&choices.length>1){
        const fallback=choices.includes('provision')?'provision':[...choices].sort((a,b)=>virtual[b]-virtual[a])[0];
        const answer=prompt(`Pay this Provision slot with one of: ${choices.join(', ')}.`,fallback);
        if(answer===null)return null;
        chosen=choices.includes(answer.trim().toLowerCase())?answer.trim().toLowerCase():null;
        if(!chosen){alert('Choose one of the listed resources.');return null;}
      }else if(choices.includes('provision')) chosen='provision';
      else chosen=[...choices].sort((a,b)=>virtual[b]-virtual[a])[0];
      virtual[chosen]--;plan[chosen]=(plan[chosen]||0)+1;provisionNeed--;
    }
    return plan;
  }
  function canAfford(p,cost){return !!paymentPlan(p,cost,false);}
  function pay(p,cost,interactive=false){
    const plan=paymentPlan(p,cost,interactive);
    if(!plan)return false;
    Object.entries(plan).forEach(([k,v])=>p.resources[k]-=v);
    return true;
  }
  function gain(p,g){Object.entries(g||{}).forEach(([k,v])=>p.resources[k]=(p.resources[k]||0)+v);}
  function currentPhase(){return PHASES[state.phase];}
  function currentRound(){return Math.floor((state.turnNo-1)/2)+1;}
  function roundLeader(round){
    if(round<=1)return state.round1Opener;
    return round%2===0?state.round2Leader:1-state.round2Leader;
  }

  function isAiIndex(i){return !!state&&state.mode==='ai'&&state.aiIndex===i;}
  function isAiTurn(){return isAiIndex(state.active);}
  function humanIndex(){return state?.mode==='ai'?(1-state.aiIndex):state?.active??0;}
  function aiPlayer(){return state?.mode==='ai'?state.players[state.aiIndex]:null;}
  function aiDisplayName(){const p=aiPlayer();return p?`${faction(p).hearthkeeper} AI`:'AI';}
  function humanFactionKey(){return state?.mode==='ai'?state.players[humanIndex()].factionKey:'AS';}
  function aiDelay(ms,fn){
    if(!state||state.winner||!isAiTurn())return;
    clearTimeout(state.aiTimer);
    state.aiTimer=setTimeout(()=>{if(state&&isAiTurn()&&!state.winner)fn();},ms);
  }
  function cardValue(c){
    if(!c)return 0;
    if(c.type==='Critter')return (c.might||0)*1.6+(c.grit||0)+(c.advanced?1.1:0)+(c.flags?.guard?1.3:0)+(c.flags?.trample?1:0)+(c.flags?.crushingBlow?1:0);
    if(c.subtype==='Tool')return 2.5+(c.flags?.gritBonus||0);
    return 1.5;
  }
  function repairBuilding(p,b,amount,source){
    if(!b||b.damage<=0)return false;
    const wasRuined=isRuined(b);
    b.damage=Math.max(0,b.damage-amount);
    log(`${source} repaired ${b.name} by ${amount}.`);
    if(wasRuined&&!isRuined(b)){
      b.rehousingDueOwnTurn=null;
      p.exposurePendingOwnTurn=null;p.exposed=false;
      log(`${b.name} is active again.`);
    }
    return true;
  }
  function repairBest(p,amount,source){
    const damaged=p.village.filter(b=>b.damage>0).sort((a,b)=>{
      const ar=a.damage/a.durability,br=b.damage/b.durability;
      return br-ar||(b.prosperity||0)-(a.prosperity||0);
    });
    if(!damaged.length)return false;
    return repairBuilding(p,damaged[0],amount,source);
  }
  function aiHarvestChoice(p,options){
    const demand=r=>{
      let score=0;
      faction(p).blueprints.forEach(bp=>{
        if(canBuild(p,bp))return;
        const need=(bp.cost?.[r]||0)-(p.resources[r]||0);
        if(need>0)score+=Math.min(need,2)*(bp.muster?2.4:bp.peaceful?1.5:1);
      });
      p.hand.filter(c=>c.type==='Critter').forEach(c=>{
        musters(p).forEach(m=>{if(musterMatches(c,m))score+=(m.recruitCost?.[r]||0)*1.5;});
      });
      score+=Math.max(0,2-(p.resources[r]||0))*.8;
      return score+Math.random()*.2;
    };
    return [...options].sort((a,b)=>demand(b)-demand(a))[0]||options[0];
  }
  function aiChooseFreeProduction(p){
    const opts=faction(p).blueprints.filter(bp=>bp.production&&!bp.upgradeFrom&&Object.keys(bp.cost||{}).length===0&&canBuild(p,bp));
    if(!opts.length)return null;
    const hasProvision=activeBuildings(p).some(b=>b.production&&(b.harvest?.provision||b.firstYield?.provision));
    const scored=opts.map(bp=>{
      let score=1;
      if((bp.harvest?.provision||bp.firstYield?.provision)&&!hasProvision)score+=8;
      for(const r of ['acorn','sap','root','pebble'])if(bp.harvest?.[r])score+=Math.max(0,3-(p.resources[r]||0));
      if(p.village.some(b=>b.id===bp.id&&!isRuined(b)))score-=2.2;
      return {bp,score:score+Math.random()*.25};
    }).sort((a,b)=>b.score-a.score);
    return scored[0]?.bp||null;
  }
  function aiBlueprintScore(p,bp){
    let score=(bp.prosperity||0)*.7;
    if(bp.muster){
      const matches=p.hand.filter(c=>c.type==='Critter'&&(c.musterClasses||[]).includes(bp.musterClass)&&(!c.advanced||!!bp.upgradeFrom)).length;
      const activeSame=activeBuildings(p).filter(b=>b.id===bp.id||b.upgradeFrom===bp.id).length;
      score+=matches*3.4+(matches?4:0)-activeSame*2;
    }
    if(bp.upgradeFrom){
      const base=p.village.find(b=>b.id===bp.upgradeFrom&&!isRuined(b));
      if(!base)return -99;
      score+=housingUsed(p,base.uid)>=Math.max(1,(base.housing||0)-1)?5:1.5;
    }
    if(bp.repairAbility)score+=p.village.some(b=>b.damage>0)?5:2;
    if(bp.toolAccess&&p.hand.some(c=>c.subtype==='Tool'))score+=4;
    if(bp.reactionAccess)score+=1.5;
    if(bp.peaceful){
      score+=prosperity(p)>=8?9:-4;
      if(prosperity(p)+(bp.prosperity||0)>=15)score+=30;
    }
    return score+Math.random()*.45;
  }
  function aiChoosePaidBlueprint(p){
    const opts=faction(p).blueprints.filter(bp=>Object.keys(bp.cost||{}).length>0&&canBuild(p,bp));
    if(!opts.length)return null;
    const scored=opts.map(bp=>({bp,score:aiBlueprintScore(p,bp)})).sort((a,b)=>b.score-a.score);
    return scored[0]?.score>2.2?scored[0].bp:null;
  }
  function aiChooseRecruit(p){
    const options=[];
    p.hand.filter(c=>c.type==='Critter').forEach(card=>{
      legalMusters(p,card).forEach(m=>{
        const room=(m.housing-housingUsed(p,m.uid)-1);
        options.push({card,m,score:cardValue(card)+(m.prosperity||0)*.08-room*.05+Math.random()*.25});
      });
    });
    options.sort((a,b)=>b.score-a.score);
    return options[0]||null;
  }
  function aiChooseTool(p){
    if(p.toolPlayed||!hasActive(p,b=>b.toolAccess))return null;
    const tools=p.hand.filter(c=>c.subtype==='Tool'&&canAfford(p,c.cost));
    const residents=p.residents.filter(r=>!r.tool&&!r.defeated);
    if(!tools.length||!residents.length)return null;
    tools.sort((a,b)=>cardValue(b)-cardValue(a));
    residents.sort((a,b)=>cardValue(b)-cardValue(a));
    return {tool:tools[0],resident:residents[0]};
  }
  function aiChooseAttackTarget(attacker,defender){
    const might=residentMight(attacker,{kind:'hearthseed'});
    if(defender.exposed||defender.hearthseed<=might)return 'hearthseed:0';
    const buildings=activeBuildings(defender);
    if(!buildings.length)return 'hearthseed:0';
    const scored=buildings.map(b=>{
      const remain=Math.max(1,b.durability-b.damage);
      let score=(b.prosperity||0)*1.2+(b.production?2.2:0)+(b.muster?2.4:0)+(b.reactionAccess?1:0)+(b.toolAccess?1:0);
      score+=(attacker.might>=remain?4:0)+Math.max(0,4-remain)*.6;
      if(attacker.flags?.sabotageProduction&&b.production)score+=4;
      return {b,score:score+Math.random()*.4};
    }).sort((a,b)=>b.score-a.score);
    if(defender.hearthseed<=7&&Math.random()<.45)return 'hearthseed:0';
    return `building:${scored[0].b.uid}`;
  }
  function aiAutoAssignBlocks(){
    const defender=opponent();
    if(!isAiIndex(1-state.active))return;
    const used=new Set();
    const attacks=[...state.combat.attacks].map((a,i)=>({a,i})).sort((x,y)=>{
      const xs=x.a.target.kind==='hearthseed'?5:0,ys=y.a.target.kind==='hearthseed'?5:0;
      return ys-xs;
    });
    for(const {a} of attacks){
      const atk=active().residents.find(r=>r.uid===a.attackerUid);
      if(!atk||a.blockerUid)continue;
      const legal=defender.residents.filter(b=>!used.has(b.uid)&&canBlock(b,a));
      if(!legal.length)continue;
      const atkPower=residentMight(atk,a.target);
      legal.sort((x,y)=>{
        const sx=(residentGrit(x)>atkPower?5:0)+(x.might>=residentGrit(atk)?4:0)-cardValue(x)*.22;
        const sy=(residentGrit(y)>atkPower?5:0)+(y.might>=residentGrit(atk)?4:0)-cardValue(y)*.22;
        return sy-sx;
      });
      const b=legal[0];a.blockerUid=b.uid;b.blocking=true;used.add(b.uid);log(`${defender.name} blocks ${atk.name} with ${b.name}.`);
    }
  }
  function aiBeginCombat(){
    const p=active();
    let ready=p.residents.filter(r=>residentCanAttack(p,r)&&!p.attackedThisStep.includes(r.uid));
    if(!ready.length){log(`${p.name} has no attack this turn.`);aiDelay(650,finalizeEndTurn);return;}
    const nonGuards=ready.filter(r=>!r.flags?.guard);
    if(nonGuards.length>1&&opponent().hearthseed>7){
      const reserve=[...nonGuards].sort((a,b)=>residentGrit(b)-residentGrit(a))[0];
      ready=ready.filter(r=>r.uid!==reserve.uid);
    }
    if(!ready.length){aiDelay(650,finalizeEndTurn);return;}
    const queue=[...ready];
    const next=()=>{
      if(!queue.length){
        state.aiWaitingForHuman=state.combat.attacks.length>0;
        if(state.combat.attacks.length){log(`${p.name} has finished declaring attacks. Choose your blockers, then resolve combat.`);render();}
        else aiDelay(500,finalizeEndTurn);
        return;
      }
      const r=queue.shift();
      let target=aiChooseAttackTarget(r,opponent());
      if(target==='hearthseed:0'&&r.flags?.hearthseedProsperityGate&&prosperity(p)<r.flags.hearthseedProsperityGate){
        const b=activeBuildings(opponent())[0];target=b?`building:${b.uid}`:'hearthseed:0';
      }
      declareAttack(r.uid,target);
      aiDelay(330,next);
    };
    next();
  }
  function aiTakeTurn(){
    if(!isAiTurn()||state.winner||state.pendingHarvest||state.cleanup||currentPhase()!=='Build')return;
    const p=active();
    state.aiCounters=state.aiCounters||{paidBuilds:0,recruits:0,tool:false,repair:false};
    const free=aiChooseFreeProduction(p);
    if(free&&!p.freeProductionBuilt){buildBlueprint(free.id);aiDelay(520,aiTakeTurn);return;}
    const rec=state.aiCounters.recruits<4?aiChooseRecruit(p):null;
    if(rec){state.aiCounters.recruits++;recruit(rec.card.uid,rec.m.uid);aiDelay(520,aiTakeTurn);return;}
    if(state.aiCounters.paidBuilds<2){
      const bp=aiChoosePaidBlueprint(p);
      if(bp){state.aiCounters.paidBuilds++;buildBlueprint(bp.id);aiDelay(580,aiTakeTurn);return;}
    }
    if(!state.aiCounters.tool){
      const t=aiChooseTool(p);state.aiCounters.tool=true;
      if(t){playTool(t.tool.uid,t.resident.uid);aiDelay(480,aiTakeTurn);return;}
    }
    if(!state.aiCounters.repair){
      state.aiCounters.repair=true;
      const work=p.village.find(b=>b.repairAbility&&!isRuined(b));
      if(work&&p.village.some(b=>b.damage>0)&&Object.values(p.resources).some(v=>v>0)){
        const r=Object.entries(p.resources).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1])[0]?.[0];
        if(r){p.resources[r]--;p.workshopRepairUsed=true;repairBest(p,1,'Burrow Workshop');render();aiDelay(480,aiTakeTurn);return;}
      }
    }
    aiBeginCombat();
  }

  function addGainFx(playerIndex,buildingUid,gains,source='Harvest'){
    Object.entries(gains||{}).forEach(([resource,amount])=>{
      if(!amount)return;
      const id=fxuid++;
      state.fx.push({id,playerIndex,buildingUid,resource,amount,source});
      setTimeout(()=>{
        if(!state)return;
        state.fx=state.fx.filter(x=>x.id!==id);
        render();
      },1350);
    });
  }

  function gainWithFx(p,buildingUid,gains,source){
    gain(p,gains);
    addGainFx(state.players.indexOf(p),buildingUid,gains,source);
  }

  function offerStarterMulligan(p){
    if(!confirm(`${p.name}: take your free partial mulligan?`))return;
    const list=p.hand.map((c,i)=>`${i+1}. ${c.name}`).join('\n');
    const raw=prompt(`${p.name} — enter card numbers to shuffle back, separated by commas.\n\n${list}`,'');
    if(raw===null||!raw.trim())return;
    const picks=[...new Set(raw.split(',').map(x=>parseInt(x.trim(),10)-1).filter(i=>Number.isInteger(i)&&i>=0&&i<p.hand.length))].sort((a,b)=>b-a);
    if(!picks.length)return;
    const returned=[];
    for(const i of picks)returned.push(...p.hand.splice(i,1));
    p.fieldDeck=shuffle([...p.fieldDeck,...returned]);
    draw(p,returned.length,false);
    log(`${p.name} took a partial mulligan of ${returned.length} card${returned.length===1?'':'s'}.`);
  }

  function newGame(mode='ai',humanKey='AS'){
    const aiMode=mode==='ai';
    const validHumanKey=decks[humanKey]?humanKey:'AS';
    const otherKey=validHumanKey==='AS'?'RP':'AS';
    const aiFaction=decks[otherKey];
    const players=aiMode
      ?[makePlayer('You',validHumanKey),makePlayer(`${aiFaction.hearthkeeper} AI`,otherKey)]
      :[makePlayer('Player 1','AS'),makePlayer('Player 2','RP')];
    const setupRoll=Math.floor(Math.random()*4);
    const round1Opener=setupRoll<2?0:1;
    const round2Leader=setupRoll%2===0?0:1;
    state={
      players,active:round1Opener,round1Opener,round2Leader,setupRoll,
      phase:0,turnNo:1,log:[],mode:aiMode?'ai':'hotseat',aiIndex:aiMode?1:null,
      combat:{attacks:[],resolved:false},winner:null,pass:false,dev:true,
      pendingHarvest:null,cleanup:false,fx:[],aiTimer:null,aiCounters:null,aiWaitingForHuman:false
    };
    if(aiMode){
      offerStarterMulligan(players[humanIndex()]);
    }else{
      alert('Pass the device to Player 1 for the optional starter mulligan.');
      offerStarterMulligan(players[0]);
      alert('Pass the device to Player 2 for the optional starter mulligan.');
      offerStarterMulligan(players[1]);
    }
    log(`Setup result ${setupRoll+1}/4: ${players[round1Opener].name} opens round 1; ${players[round2Leader].name} leads round 2.`);
    log(`The Frost Trial begins. ${active().name} has initiative.`);
    if(aiMode)log(`${aiFaction.hearthkeeper} AI is piloting ${aiFaction.short} with a simple beta strategy.`);
    beginDawn();
  }

  function beginDawn(){
    if(state.winner)return;
    const p=active();
    state.phase=0; state.cleanup=false; state.combat={attacks:[],resolved:false};
    p.freeProductionBuilt=false;p.toolPlayed=false;p.workshopRepairUsed=false;p.attackedThisStep=[];
    state.aiCounters=isAiTurn()?{paidBuilds:0,recruits:0,tool:false,repair:false}:null;state.aiWaitingForHuman=false;
    p.residents.forEach(r=>{if(!r.defeated){r.tired=false;r.attacking=false;r.blocking=false;}});
    if(prosperity(p)>=15){state.winner=p.name;log(`${p.name} begins Dawn with ${prosperity(p)} Prosperity and wins!`);render();return;}
    draw(p,1,true);
    log(`${p.name}: Dawn resolved automatically — Critters ready, draw 1.`);
    beginHarvest();
  }

  function beginHarvest(){
    const p=active();
    state.phase=1;
    const choices=[];
    const summary={};
    activeBuildings(p).filter(b=>b.production).forEach(b=>{
      if(p.sabotagedBuildings[b.uid]){log(`${b.name} is sabotaged and produces nothing this Harvest.`);delete p.sabotagedBuildings[b.uid];return;}
      if(b.harvestChoice){
        choices.push({buildingUid:b.uid,buildingName:b.name,options:[...b.harvestChoice]});
      } else {
        const g=b.harvest||{};
        gainWithFx(p,b.uid,g,'Harvest');
        Object.entries(g).forEach(([k,v])=>summary[k]=(summary[k]||0)+v);
      }
    });
    state.pendingHarvest={choices,index:0,summary};
    if(!choices.length){finishHarvest();return;}
    render();
    if(isAiTurn())aiDelay(420,()=>chooseHarvest(aiHarvestChoice(active(),state.pendingHarvest.choices[state.pendingHarvest.index].options)));
  }

  function chooseHarvest(resource){
    if(!state.pendingHarvest)return;
    const item=state.pendingHarvest.choices[state.pendingHarvest.index];
    if(!item||!item.options.includes(resource))return;
    const p=active();
    gainWithFx(p,item.buildingUid,{[resource]:1},'Harvest');
    state.pendingHarvest.summary[resource]=(state.pendingHarvest.summary[resource]||0)+1;
    log(`${item.buildingName} produced +1 ${RLABEL[resource]}.`);
    state.pendingHarvest.index++;
    if(state.pendingHarvest.index>=state.pendingHarvest.choices.length)finishHarvest();
    else render();
  }

  function finishHarvest(){
    const p=active();
    const gains=state.pendingHarvest?.summary||{};
    log(`${p.name}: Harvest resolved automatically — ${Object.keys(gains).length?costText(gains):'no resources'} gained.`);
    state.pendingHarvest=null;
    state.phase=2;
    p.buildReadySnapshot={self:readyCount(p),opponent:readyCount(opponent())};
    render();
    if(isAiTurn())aiDelay(520,aiTakeTurn);
  }

  function requestEndTurn(){
    if(state.winner||state.pass||isAiTurn())return;
    if(currentPhase()==='Attack' && state.combat.attacks.length && !state.combat.resolved){
      alert('Resolve the declared combat before ending the turn.');return;
    }
    const p=active();
    if(p.hand.length>7){state.cleanup=true;state.phase=4;render();return;}
    finalizeEndTurn();
  }

  function exposureDueOwnTurn(p){
    return p.turnsTaken + (playerIndex(p)===state.active ? 2 : 1);
  }

  function markNoBuildingsResponse(p){
    if(activeBuildings(p).length!==0)return;
    if(p.exposurePendingOwnTurn===null){
      p.exposurePendingOwnTurn=exposureDueOwnTurn(p);
      log(`${p.name} has no active Buildings and receives one full response turn.`);
    }
  }

  function markMusterRuin(p,b){
    if(!b?.muster)return;
    if(b.rehousingDueOwnTurn===null||b.rehousingDueOwnTurn===undefined){
      b.rehousingDueOwnTurn=p.turnsTaken + (playerIndex(p)===state.active ? 2 : 1);
      log(`${b.name}'s residents are inactive. They must be rehoused by the end of ${p.name}'s next turn if it remains Ruined.`);
    }
  }

  function rehousingOptions(p,r,fromUid){
    return activeBuildings(p).filter(m=>
      m.muster&&m.uid!==fromUid&&musterMatches(r,m)&&housingUsed(p,m.uid)<m.housing
    );
  }

  function returnResidentToHand(p,r,reason){
    if(r.tool){p.compost.push(r.tool);r.tool=null;}
    const idx=p.residents.findIndex(x=>x.uid===r.uid);
    if(idx>=0)p.residents.splice(idx,1);
    const card={...r};
    ['musterUid','damage','tired','defeated','tool','attacking','blocking','recruitedTurn','shield'].forEach(k=>delete card[k]);
    p.hand.push(card);
    log(`${r.name} could not be rehoused and returned to ${p.name}'s hand${reason?` (${reason})`:''}.`);
  }

  function resolveRehousingAtEndTurn(p){
    const due=p.village.filter(b=>b.muster&&isRuined(b)&&b.rehousingDueOwnTurn!==null&&b.rehousingDueOwnTurn!==undefined&&b.rehousingDueOwnTurn<=p.turnsTaken);
    for(const ruined of due){
      const residents=[...p.residents.filter(r=>r.musterUid===ruined.uid)];
      for(const r of residents){
        const opts=rehousingOptions(p,r,ruined.uid);
        if(!opts.length){returnResidentToHand(p,r,'Ruined Muster');continue;}
        let chosen=opts[0];
        if(!isAiIndex(playerIndex(p))&&opts.length>1){
          const listing=opts.map((m,i)=>`${i+1}. ${m.name} — ${m.musterClass} (${housingUsed(p,m.uid)}/${m.housing})`).join('\n');
          const n=parseInt(prompt(`Rehouse ${r.name}.\n${listing}`,'1'),10)-1;
          if(Number.isInteger(n)&&opts[n])chosen=opts[n];
        }
        r.musterUid=chosen.uid;
        log(`${r.name} was rehoused in ${chosen.name}.`);
      }
      ruined.rehousingDueOwnTurn=null;
    }
  }

  function finalizeEndTurn(){
    const p=active();
    if(isAiTurn()&&p.hand.length>7){
      const ordered=[...p.hand].sort((a,b)=>cardValue(a)-cardValue(b));
      while(p.hand.length>7&&ordered.length){
        const c=ordered.shift(),i=p.hand.findIndex(x=>x.uid===c.uid);
        if(i>=0){p.hand.splice(i,1);p.compost.push(c);log(`${p.name} discards ${c.name} during Rest.`);}
      }
    }
    p.residents.forEach(r=>{if(!r.defeated)r.damage=0;r.attacking=false;r.blocking=false;});
    p.turnsTaken++;
    resolveRehousingAtEndTurn(p);

    if(activeBuildings(p).length===0){
      if(p.exposurePendingOwnTurn===null) p.exposurePendingOwnTurn=p.turnsTaken+1;
      if(p.turnsTaken>=p.exposurePendingOwnTurn){
        p.exposed=true;
        log(`${p.name}'s Hearthseed is now Exposed.`);
      }
    }else{
      p.exposed=false;
      p.exposurePendingOwnTurn=null;
    }

    log(`${p.name}: Rest resolved automatically.`);
    state.turnNo++;
    const newRound=currentRound();
    if((state.turnNo-1)%2===0) state.active=roundLeader(newRound);
    else state.active=1-roundLeader(newRound);
    state.phase=0;state.combat={attacks:[],resolved:false};state.pendingHarvest=null;state.cleanup=false;state.aiWaitingForHuman=false;

    if(state.mode==='ai'){
      state.pass=false;render();
      setTimeout(()=>{if(state&&!state.winner)beginDawn();},430);
    }else{state.pass=true;render();}
  }

  function buildBlueprint(id){
    const p=active(),f=faction(p),bp=f.blueprints.find(b=>b.id===id);if(!bp||currentPhase()!=='Build')return;
    if(!canBuild(p,bp)){alert(buildReason(p,bp));return;}
    if(bp.upgradeFrom){
      const old=p.village.find(b=>b.id===bp.upgradeFrom&&!isRuined(b));if(!old)return;
      if(!pay(p,bp.cost,!isAiTurn()))return;
      p.usedBlueprints.push(bp.id);
      const oldUid=old.uid,dmg=old.damage,shield=!!old.shield;
      Object.assign(old,inst(bp),{damage:dmg,shield,rehousingDueOwnTurn:null});
      p.residents.filter(r=>r.musterUid===oldUid).forEach(r=>r.musterUid=old.uid);
      if(bp.upgradeGain){gainWithFx(p,old.uid,bp.upgradeGain,'Upgrade');}
      log(`${p.name} upgraded to ${bp.name}${bp.upgradeGain?' and gained its upgrade bonus':''}.`);
    } else {
      if(!pay(p,bp.cost,!isAiTurn()))return;
      p.usedBlueprints.push(bp.id);
      const b={...inst(bp),damage:0,shield:false,rehousingDueOwnTurn:null};p.village.push(b);
      if(bp.production&&Object.keys(bp.cost||{}).length===0)p.freeProductionBuilt=true;
      if(bp.production){
        const g=bp.firstYield||bp.harvest||{};
        if(Object.keys(g).length)gainWithFx(p,b.uid,g,'First Yield');
      }
      log(`${p.name} built ${bp.name}${bp.production?' and gained First Yield':''}.`);
    }
    render();
  }

  function buildReason(p,bp){
    if(currentPhase()!=='Build')return 'Buildings can only be built before combat.';
    if(p.usedBlueprints?.includes(bp.id))return 'That Blueprint has already been used this game.';
    if(!canAfford(p,bp.cost))return 'Not enough resources.';
    if(bp.production&&Object.keys(bp.cost||{}).length===0&&p.freeProductionBuilt)return 'You already built your one free non-upgrade Production this Build.';
    if(bp.upgradeFrom&&!p.village.some(b=>b.id===bp.upgradeFrom&&!isRuined(b)))return 'The required base Building is not active.';
    if(bp.peaceful&&controlledMusters(p).length>=3)return 'Peaceful cannot be built while you control 3 or more Muster Buildings.';
    if(bp.muster&&!bp.upgradeFrom&&peacefulActive(p)&&controlledMusters(p).length>=2)return 'An active Peaceful Landmark caps you at 2 Muster Buildings.';
    return '';
  }
  function canBuild(p,bp){return buildReason(p,bp)==='';}

  function musterStatus(p,m,card){
    const accepts=musterMatches(card,m);
    const housingOk=accepts&&(housingUsed(p,m.uid)+1<=m.housing);
    const afford=accepts&&canAfford(p,m.recruitCost);
    return {accepts,housingOk,afford,legal:accepts&&housingOk&&afford};
  }
  function compatibleMusters(p,card){return musters(p).filter(m=>musterStatus(p,m,card).housingOk);}
  function legalMusters(p,card){return musters(p).filter(m=>musterStatus(p,m,card).legal);}

  function shieldBuildingOnRecruit(p,source){
    const choices=activeBuildings(p).filter(b=>!b.shield);
    if(!choices.length){log(`${source} had no unshielded Building to Shield.`);return;}
    let b=choices[0];
    if(isAiTurn()) b=[...choices].sort((a,z)=>(z.prosperity||0)-(a.prosperity||0)||(z.damage||0)-(a.damage||0))[0];
    else{
      const listing=choices.map((x,i)=>`${i+1}. ${x.name}${x.damage?` (${x.damage} damage)`:''}`).join('\n');
      const n=parseInt(prompt(`${source}: Shield a Building.\n${listing}`,'1'),10)-1;
      if(Number.isInteger(n)&&choices[n])b=choices[n];
    }
    b.shield=true;
    log(`${source} gave Shield to ${b.name}.`);
  }

  function recruit(cardUid,musterUid){
    const p=active();if(currentPhase()!=='Build')return;
    const idx=p.hand.findIndex(c=>c.uid===cardUid),card=p.hand[idx],m=p.village.find(b=>b.uid===musterUid);
    if(!card||card.type!=='Critter'||!m||isRuined(m))return;
    const status=musterStatus(p,m,card);
    if(!status.accepts){
      const advancedNote=card.advanced&&!m.upgradeFrom?' Advanced Critters require an upgraded matching Muster.':'';
      alert(`${m.name} is ${m.musterClass||'not a matching Muster'}, while ${card.name} uses ${(card.musterClasses||[]).join(' / ')}.${advancedNote}`);return;
    }
    if(!status.housingOk){alert(`${m.name} is full (${housingUsed(p,m.uid)}/${m.housing} Housing). Every Critter occupies 1 Housing in v0.6.2.`);return;}
    if(!status.afford){alert(`You need ${costText(m.recruitCost)} to recruit through ${m.name}. A Provision slot may be paid with any core resource.`);return;}
    if(!pay(p,m.recruitCost,!isAiTurn()))return;
    p.hand.splice(idx,1);
    const r={...card,musterUid:m.uid,damage:0,tired:false,defeated:false,tool:null,attacking:false,blocking:false,recruitedTurn:state.turnNo,shield:false};
    if(card.flags?.hearthsideRally&&p.buildReadySnapshot&&p.buildReadySnapshot.opponent>p.buildReadySnapshot.self)r.shield=true;
    p.residents.push(r);
    log(`${p.name} recruited ${card.name} into ${m.name}. It occupies 1 Housing and may block immediately${card.advanced?' (Advanced)':''}.`);
    if(r.shield)log(`${card.name} entered with Shield from Hearthside Rally.`);
    if(card.flags?.shieldBuildingOnRecruit)shieldBuildingOnRecruit(p,card.name);
    if(card.flags?.repairOnRecruit)repairPrompt(p,card.flags.repairOnRecruit,`${card.name} recruit`);
    render();
  }

  function repairPrompt(p,amount,source){
    if(isAiTurn())return repairBest(p,amount,source);
    const damaged=p.village.filter(b=>b.damage>0);if(!damaged.length)return;
    const names=damaged.map((b,i)=>`${i+1}. ${b.name} (${b.damage} dmg)`).join('\n');
    const n=parseInt(prompt(`${source}: repair ${amount}. Choose Building number:\n${names}`,'1'),10)-1;
    if(damaged[n])repairBuilding(p,damaged[n],amount,source);
  }

  function playTool(cardUid,resUid){
    const p=active(),idx=p.hand.findIndex(c=>c.uid===cardUid),c=p.hand[idx],r=p.residents.find(x=>x.uid===resUid);
    if(!c||c.subtype!=='Tool'||!r)return;
    if(currentPhase()!=='Build'){alert('Equip Tools before combat.');return;}
    if(!hasActive(p,b=>b.toolAccess)){alert('You need an active Tool Access Building.');return;}
    if(p.toolPlayed){alert('You already equipped a Tool this turn.');return;}
    if(r.tool){alert('That Critter already has a Tool.');return;}
    if(!canAfford(p,c.cost)){alert('Not enough resources.');return;}
    if(!pay(p,c.cost,!isAiTurn()))return;p.hand.splice(idx,1);r.tool=c;p.toolPlayed=true;log(`${p.name} equipped ${c.name} to ${r.name}.`);render();
  }

  function manualSupport(cardUid){
    const p=active(),idx=p.hand.findIndex(c=>c.uid===cardUid),c=p.hand[idx];if(!c||c.type!=='Support')return;
    if(c.subtype==='Reaction'&&!hasActive(p,b=>b.reactionAccess)){alert('You need active Reaction Access.');return;}
    if(c.subtype==='Reaction'&&p.reactionRoundUsed===currentRound()){alert('You already played a Reaction this round.');return;}
    if(!canAfford(p,c.cost)){alert('Not enough resources.');return;}
    if(!confirm(`Resolve ${c.name} manually, pay ${costText(c.cost)}, and move it to Compost?`))return;
    if(!pay(p,c.cost,!isAiTurn()))return;p.hand.splice(idx,1);p.compost.push(c);if(c.subtype==='Reaction')p.reactionRoundUsed=currentRound();log(`${p.name} manually resolved ${c.name}.`);render();
  }

  function workshopRepair(buildingUid){
    const p=active(),work=p.village.find(b=>b.uid===buildingUid);if(!work?.repairAbility||isRuined(work)||currentPhase()!=='Build')return;
    if(p.workshopRepairUsed){alert('Burrow Workshop repair already used this turn.');return;}
    const available=Object.entries(p.resources).filter(([,v])=>v>0);if(!available.length){alert('You need 1 resource.');return;}
    const r=prompt(`Spend one resource (${available.map(([k])=>k).join(', ')})`,available[0][0]);if(!available.some(([k])=>k===r))return;
    p.resources[r]--;p.workshopRepairUsed=true;repairPrompt(p,1,'Burrow Workshop');render();
  }

  function devDamage(playerIndex,buildingUid,delta){
    const p=state.players[playerIndex],b=p.village.find(x=>x.uid===buildingUid);if(!b)return;
    const was=isRuined(b);
    b.damage=Math.max(0,b.damage+delta);
    const now=isRuined(b);
    if(!was&&now){log(`${b.name} was Ruined.`);markMusterRuin(p,b);markNoBuildingsResponse(p);}
    if(was&&!now){
      log(`${b.name} was repaired and is active again.`);
      b.rehousingDueOwnTurn=null;
      if(activeBuildings(p).length>0){p.exposurePendingOwnTurn=null;p.exposed=false;}
    }
    render();
  }

  function changeResource(pi,r,d){const p=state.players[pi];p.resources[r]=Math.max(0,(p.resources[r]||0)+d);render();}
  function changeHearth(pi,d){const p=state.players[pi];p.hearthseed=Math.max(0,p.hearthseed+d);if(p.hearthseed<=0)state.winner=state.players[1-pi].name;render();}

  function declareAttack(resUid,targetValue){
    if(state.cleanup||state.winner)return;
    if(currentPhase()!=='Build'&&currentPhase()!=='Attack')return;
    if(state.combat.resolved)return;
    const p=active(),o=opponent(),r=p.residents.find(x=>x.uid===resUid);if(!r||!residentReady(p,r)||p.attackedThisStep.includes(r.uid))return;
    if(!residentCanAttack(p,r)){
      if(!isAiTurn())alert(`${r.name} was recruited this turn and cannot attack yet. Give it Eager to attack immediately.`);
      return;
    }
    const [kind,id]=targetValue.split(':');let target;
    if(kind==='hearthseed')target={kind:'hearthseed'};
    else{const b=o.village.find(x=>String(x.uid)===id);if(!b||isRuined(b))return;target={kind:'building',uid:b.uid,name:b.name};}
    if(target.kind==='hearthseed'&&r.flags?.hearthseedProsperityGate&&prosperity(p)<r.flags.hearthseedProsperityGate){alert(`${r.name} needs at least ${r.flags.hearthseedProsperityGate} active Prosperity to attack the Hearthseed.`);return;}
    if(currentPhase()==='Build'){state.phase=3;state.combat={attacks:[],resolved:false};p.attackedThisStep=[];log(`${p.name} begins combat.`);}
    r.attacking=true;if(!r.flags?.guard)r.tired=true;p.attackedThisStep.push(r.uid);
    state.combat.attacks.push({attackerUid:r.uid,target,blockerUid:null});log(`${r.name} attacks ${target.kind==='hearthseed'?'the Hearthseed':target.name}.`);render();
  }

  function canBlock(blocker,attack){
    const op=opponent(),atk=active().residents.find(r=>r.uid===attack.attackerUid);if(!atk)return false;
    if(!residentReady(op,blocker)||blocker.flags?.cannotBlock)return false;
    if(atk.flags?.unblockableVsBuilding&&attack.target.kind==='building')return false;
    if(atk.flags?.pounce&&attack.target.kind==='building'){
      const b=op.village.find(x=>x.uid===attack.target.uid);if(b&&b.damage>0&&blocker.might<=1)return false;
    }
    return true;
  }

  function assignBlock(blockerUid,attackIndex){
    const o=opponent(),b=o.residents.find(r=>r.uid===blockerUid),a=state.combat.attacks[attackIndex];if(!b||!a||a.blockerUid||!canBlock(b,a))return;
    if(state.combat.attacks.some(x=>x.blockerUid===b.uid)){alert('That Critter is already blocking.');return;}
    a.blockerUid=b.uid;b.blocking=true;log(`${b.name} blocks ${active().residents.find(r=>r.uid===a.attackerUid)?.name}.`);render();
  }

  function dealToResident(r,amount,source){
    if(amount<=0)return 0;
    if(r.shield){
      r.shield=false;
      log(`${r.name}'s Shield prevented ${amount} damage${source?` from ${source}`:''}.`);
      return 0;
    }
    r.damage+=amount;
    return amount;
  }

  function dealToTarget(defender,attack,amount,attacker){
    if(amount<=0)return;
    if(attack.target.kind==='hearthseed'){
      if(defender.exposed){state.winner=active().name;log(`${active().name} lands an unblocked attack on an Exposed Hearthseed and wins.`);return;}
      defender.hearthseed=Math.max(0,defender.hearthseed-amount);
      log(`${defender.name}'s Hearthseed takes ${amount} damage.`);
      if(defender.hearthseed<=0)state.winner=active().name;
    }else{
      const b=defender.village.find(x=>x.uid===attack.target.uid);if(!b)return;
      if(b.shield){
        b.shield=false;
        log(`${b.name}'s Shield prevented ${amount} damage.`);
        return;
      }
      const before=b.damage;b.damage+=amount;log(`${b.name} takes ${amount} damage.`);
      if(attacker.flags?.sabotageProduction&&b.production){defender.sabotagedBuildings[b.uid]=true;log(`${b.name} will produce nothing next Harvest.`);}
      if(before<b.durability&&b.damage>=b.durability){
        log(`${b.name} is Ruined.`);
        markMusterRuin(defender,b);
        markNoBuildingsResponse(defender);
      }
    }
  }

  function defeatResident(owner,r){
    if(r.defeated)return;
    r.defeated=true;r.attacking=false;r.blocking=false;
    if(r.flags?.onDefeatProvision)gain(owner,{provision:r.flags.onDefeatProvision});
    if(r.tool){owner.compost.push(r.tool);r.tool=null;}
    const idx=owner.residents.findIndex(x=>x.uid===r.uid);if(idx>=0)owner.residents.splice(idx,1);
    const card={...r,damage:0,tired:false,defeated:false,musterUid:undefined,shield:false};
    ['attacking','blocking','recruitedTurn'].forEach(k=>delete card[k]);
    owner.compost.push(card);
    log(`${r.name} is defeated and goes to Compost.`);
  }

  function resolveCombat(){
    if(currentPhase()!=='Attack'||state.combat.resolved||!state.combat.attacks.length)return;
    const p=active(),o=opponent();
    if(isAiIndex(1-state.active))aiAutoAssignBlocks();
    state.combat.attacks.forEach(a=>{
      if(state.winner)return;
      const atk=p.residents.find(r=>r.uid===a.attackerUid);if(!atk)return;
      const atkPower=residentMight(atk,a.target);
      if(a.blockerUid){
        const blk=o.residents.find(r=>r.uid===a.blockerUid);if(!blk)return;
        const blkPower=residentMight(blk,{kind:'critter'});
        const dealtToBlk=dealToResident(blk,atkPower,atk.name);
        dealToResident(atk,blkPower,blk.name);
        log(`${atk.name} and ${blk.name} resolve ${atkPower}/${blkPower} combat damage.`);
        const excess=Math.max(0,dealtToBlk-residentGrit(blk));
        if(excess>0&&atk.flags?.trample)dealToTarget(o,a,Math.min(excess,atk.flags.trample),atk);
        if(atk.flags?.crushingBlow&&blk.damage>=residentGrit(blk))dealToTarget(o,a,atk.flags.crushingBlow,atk);
      }else dealToTarget(o,a,atkPower,atk);
    });
    [...p.residents].forEach(r=>{if(r.damage>=residentGrit(r))defeatResident(p,r);});
    [...o.residents].forEach(r=>{if(r.damage>=residentGrit(r))defeatResident(o,r);});
    state.combat.resolved=true;state.aiWaitingForHuman=false;log('Combat resolved.');render();
    if(isAiTurn()&&!state.winner)aiDelay(900,finalizeEndTurn);
  }

  function discard(cardUid){
    const p=active();if(!state.cleanup)return;
    const i=p.hand.findIndex(c=>c.uid===cardUid);if(i>=0){const[c]=p.hand.splice(i,1);p.compost.push(c);log(`${p.name} discarded ${c.name}.`);}
    if(p.hand.length<=7){finalizeEndTurn();return;}
    render();
  }

  function closePass(){state.pass=false;beginDawn();}
  function reset(){if(!confirm('Reset the whole beta match?'))return; if(state?.mode==='ai')newGame('ai',humanFactionKey()); else newGame('hotseat');}

  function phaseBar(){
    const step=state.pendingHarvest?'Harvest':state.cleanup?'Rest':currentPhase();
    const items=[['☀','Dawn','auto'],['🧺','Harvest','auto'],['🔨','Build','play'],['🍂','Combat','play'],['🌙','Rest','auto']];
    return items.map(([ic,label,kind],i)=>{
      const map={Dawn:0,Harvest:1,Build:2,Attack:3,Rest:4};
      const activeStep=(label==='Combat'?step==='Attack':step===label);
      const passed=(map[step]??0)>i;
      return `<span class="pill ${activeStep?'active':''} ${passed?'done':''}">${ic} ${label}${kind==='auto'?'<small> auto</small>':''}</span>`;
    }).join('');
  }

  function resControls(p,pi){
    return ['acorn','sap','root','pebble','provision'].filter(r=>faction(p).resources.includes(r)).map(r=>{
      const pulse=state.fx.some(x=>x.playerIndex===pi&&x.resource===r);
      return `<div class="resource ${pulse?'resourcePulse':''}"><span>${rname(r)}</span><span class="resLabel">${RLABEL[r]}</span><button onclick="H.changeResource(${pi},'${r}',-1)">−</button><strong>${p.resources[r]}</strong><button onclick="H.changeResource(${pi},'${r}',1)">+</button></div>`;
    }).join('');
  }

  function targetOptions(o){
    return [`<option value="hearthseed:0">🔥 Hearthseed (${o.hearthseed} HP${o.exposed?' — EXPOSED':''})</option>`,...activeBuildings(o).map(b=>`<option value="building:${b.uid}">${esc(b.name)} (${b.damage}/${b.durability} dmg)</option>`)].join('');
  }

  function buildingFx(buid){
    return state.fx.filter(x=>x.buildingUid===buid).map(x=>`<div class="gainBurst">+${x.amount} ${rname(x.resource)}</div>`).join('');
  }

  function buildingCard(b,p,pi){
    const used=b.muster?housingUsed(p,b.uid):0;
    const mine=pi===state.active;
    const attackable=!mine&&!isRuined(b)&&(currentPhase()==='Build'||currentPhase()==='Attack')&&!state.cleanup;
    const attrs=[];
    if(mine&&!isAiTurn()&&b.muster&&!isRuined(b)&&currentPhase()==='Build')attrs.push(`data-muster-uid="${b.uid}"`);
    if(b.muster)attrs.push(`data-home-building="${b.uid}"`);
    if(attackable)attrs.push(`data-attack-target="building:${b.uid}"`);
    const acceptLine=b.muster?`<div class="musterAccept"><b>Muster — ${esc(b.musterClass||'')}</b> <span>• Recruit ${costText(b.recruitCost)} • every Critter uses 1 Housing</span></div>`:'';
    const housed=b.muster?p.residents.filter(r=>r.musterUid===b.uid):[];
    const residents=b.muster?`<div class="musterResidents"><span class="tiny">Residents</span>${housed.length?housed.map(r=>`<span class="residentChip" data-linked-resident="${r.uid}" title="${esc(r.name)}">${esc(r.name)}</span>`).join(''):'<span class="tiny">Empty</span>'}</div>`:'';
    return `<div class="card buildingCard ${isRuined(b)?'ruined':''} ${attackable?'attackDrop':''}" ${attrs.join(' ')}>${buildingFx(b.uid)}<div class="title">${esc(b.name)}</div><div class="type">${esc(b.subtype)} ${isRuined(b)?'• RUINED':''}</div><div class="numbers">🛡️ ${b.damage}/${b.durability} damage · ✨ ${isRuined(b)?0:b.prosperity}${b.muster?` · 🏠 ${used}/${b.housing}`:''}${b.shield?' · 🛡 Shield':''}</div>${b.shield?'<span class="shieldBadge">🛡 Shield</span>':''}${acceptLine}<div class="rules">${esc(b.text||'')}</div>${b.manual?`<span class="manual">Manual: ${esc(b.manual)}</span>`:''}${residents}<div class="actions">${state.dev?`<button class="ghost" onclick="H.devDamage(${pi},${b.uid},1)">+ dmg</button><button class="ghost" onclick="H.devDamage(${pi},${b.uid},-1)">repair</button>`:''}${b.repairAbility&&!isRuined(b)&&mine&&!isAiTurn()&&currentPhase()==='Build'?`<button onclick="H.workshopRepair(${b.uid})">Workshop repair</button>`:''}</div></div>`;
  }

  function residentBlock(p,muid,pi){
    return '';
  }

  function residentMini(r,p,pi){
    const ready=residentReady(p,r);
    const mine=pi===state.active;
    const humanControlled=mine&&!isAiTurn();
    const fresh=mine&&r.recruitedTurn===state.turnNo&&!residentHasEager(r);
    const canAtk=humanControlled&&(currentPhase()==='Build'||currentPhase()==='Attack')&&residentCanAttack(p,r)&&!p.attackedThisStep.includes(r.uid)&&!state.combat.resolved&&!state.cleanup;
    const toolTarget=humanControlled&&currentPhase()==='Build'&&!r.tool&&!r.defeated;
    const freshNote=fresh?'<span class="freshTag" title="Can block now, but cannot attack until your next turn unless it gains Eager.">🌱 New · no attack</span>':'';
    const home=p.village.find(b=>b.uid===r.musterUid);
    return `<div class="card fieldCritter ${ready?'':'inactive'} ${r.tired?'tired':''} ${r.attacking?'attacking':''} ${r.blocking?'blocking':''} ${canAtk?'draggableResident':''}" data-field-resident="${r.uid}" data-home-link="${r.musterUid||''}" ${canAtk?`draggable="true" data-attacker-uid="${r.uid}"`:''} ${toolTarget?`data-resident-drop="${r.uid}"`:''}><div class="title">${esc(r.name)}</div><div class="type">${esc(`Muster — ${(r.musterClasses||[]).join(' | ')}${r.advanced?' · ADVANCED':''}`)}</div><div class="numbers">💪${r.might} · ❤️ ${r.damage}/${residentGrit(r)}${r.shield?' · 🛡 Shield':''}</div><div class="homeBadge">🏡 ${esc(home?.name||'No active home')}</div>${freshNote}${r.tool?`<div class="tiny">🧰 ${esc(r.tool.name)}</div>`:''}${residentHasEager(r)?'<div class="tiny">⚡ Eager</div>':''}${canAtk?`<div class="targetline fallbackAction"><select class="smallSelect" id="t-${r.uid}">${targetOptions(opponent())}</select><button onclick="H.declareAttack(${r.uid},document.getElementById('t-${r.uid}').value)">Attack</button></div>`:''}</div>`;
  }

  function fieldArea(p,pi){
    const rs=p.residents.filter(r=>!r.defeated);
    return `<div class="boardZone fieldZone"><div class="zoneHeader"><span>FIELD</span><small>${rs.length} Critter${rs.length===1?'':'s'}</small></div><div class="fieldCards">${rs.length?rs.map(r=>residentMini(r,p,pi)).join(''):'<div class="zoneEmpty">No Critters in the Field.</div>'}</div></div>`;
  }

  function villageArea(p,pi){
    const mine=pi===state.active;
    return `<div class="boardZone villageZone" ${mine&&!isAiTurn()&&currentPhase()==='Build'?`data-village-drop="1"`:''}><div class="zoneHeader"><span>VILLAGE</span><small>${p.village.length} Building${p.village.length===1?'':'s'}</small></div><div class="village">${p.village.map(b=>buildingCard(b,p,pi)).join('')}</div></div>`;
  }

  function playerPanel(p,pi,label,orientation='player'){
    const mine=pi===state.active;
    const hearthAttackable=!mine&&(currentPhase()==='Build'||currentPhase()==='Attack')&&!state.cleanup;
    const header=`<div class="playerHeader"><div><div class="tiny">${label}</div><h2>${esc(p.name)} — ${esc(faction(p).short)}</h2><div class="tiny">Hearthkeeper: ${esc(faction(p).hearthkeeper)}</div></div><div class="stats"><span class="stat hearthStat ${hearthAttackable?'attackDrop':''}" ${hearthAttackable?'data-attack-target="hearthseed:0"':''}>🔥 <button class="ghost" style="padding:1px 5px" onclick="H.changeHearth(${pi},-1)">−</button> ${p.hearthseed} <button class="ghost" style="padding:1px 5px" onclick="H.changeHearth(${pi},1)">+</button></span><span class="stat">✨ ${prosperity(p)}</span>${p.exposed?'<span class="stat">⚠️ EXPOSED</span>':''}</div></div>`;
    const resources=`<div class="resrow">${resControls(p,pi)}</div><div class="resourceRule">📦 Provision costs may be paid with Provision or 1 core resource per slot.</div>`;
    const warning=p.exposurePendingOwnTurn!==null&&!p.exposed?'<div class="notice">⚠️ No active Buildings: your one-response-turn window is active.</div>':'';
    const hint=mine&&!isAiTurn()&&currentPhase()==='Build'?'<div class="dragHint">Recruitable Critters glow softly in your hand. Drag one onto a compatible Muster, or drag a Blueprint into your Village.</div>':'';
    const zones=orientation==='opponent'?`${villageArea(p,pi)}${fieldArea(p,pi)}`:`${fieldArea(p,pi)}${villageArea(p,pi)}`;
    return `<section class="panel playerPanel ${mine?'activePlayerPanel':'opponentPanel'}">${header}${resources}${warning}${hint}${zones}</section>`;
  }

  function homeHint(card,p){
    const accepting=musters(p).filter(m=>musterMatches(card,m));
    if(!accepting.length)return `<div class="homeHint noHome">🏠 No active ${card.advanced?'upgraded ':''}Muster matches ${(card.musterClasses||[]).join(' / ')}.</div>`;
    return `<div class="homeHint">🏠 ${accepting.map(m=>{
      const s=musterStatus(p,m,card);
      const note=!s.housingOk?'FULL':!s.afford?`need ${costText(m.recruitCost)}`:'ready';
      return `${esc(m.name)} <span>${esc(m.musterClass)} · ${housingUsed(p,m.uid)}/${m.housing} · ${note}</span>`;
    }).join('<br>')}</div>`;
  }

  function handCard(c,p=active(),interactive=true){
    let act='';let dragAttr='';
    const recruitNow=interactive&&c.type==='Critter'&&currentPhase()==='Build'&&legalMusters(p,c).length>0;
    if(interactive&&c.type==='Critter'&&currentPhase()==='Build'){
      dragAttr=`draggable="true" data-hand-critter="${c.uid}"`;
      const ms=compatibleMusters(p,c);
      if(ms.length)act=`<select id="m-${c.uid}">${ms.map(m=>`<option value="${m.uid}">${esc(m.name)} (${housingUsed(p,m.uid)}/${m.housing}) — ${costText(m.recruitCost)}</option>`).join('')}</select><button onclick="H.recruit(${c.uid},+document.getElementById('m-${c.uid}').value)">Recruit</button>`;
      else act='<span class="tiny">No compatible Muster with enough Housing.</span>';
    }else if(interactive&&c.type==='Support'){
      if(c.subtype==='Tool'&&currentPhase()==='Build'){
        dragAttr=`draggable="true" data-hand-tool="${c.uid}"`;
        const rs=p.residents.filter(r=>!r.tool&&!r.defeated);
        if(rs.length)act=`<select id="r-${c.uid}">${rs.map(r=>`<option value="${r.uid}">${esc(r.name)}</option>`).join('')}</select><button onclick="H.playTool(${c.uid},+document.getElementById('r-${c.uid}').value)">Equip ${costText(c.cost)}</button>`;
        else act='<span class="tiny">No unequipped Critter.</span>';
      }else act=`<button class="secondary" onclick="H.manualSupport(${c.uid})">Manual resolve ${costText(c.cost)}</button>`;
    }
    if(interactive&&state.cleanup)act+=`<button class="danger" onclick="H.discard(${c.uid})">Discard</button>`;
    const showHomes=c.type==='Critter'&&state.mode==='ai' ? homeHint(c,p) : (c.type==='Critter'&&currentPhase()==='Build'?homeHint(c,p):'');
    return `<div class="card handCard ${dragAttr?'isDraggable':''} ${interactive?'':'handLocked'} ${recruitNow?'recruitReady':''}" ${dragAttr}>${recruitNow?'<div class="recruitCue">✓ Recruitable</div>':''}<div class="title">${esc(c.name)}</div><div class="type">${c.type==='Critter'?esc(`Muster — ${(c.musterClasses||[]).join(' | ')}${c.advanced?' · ADVANCED':''}`):esc(c.subtype)}</div>${c.type==='Critter'?`<div class="numbers">💪${c.might} · ❤️${c.grit}${c.advanced?' · ⭐ Advanced':''}</div>${showHomes}`:`<div class="numbers">Cost: ${costText(c.cost)}</div>`}<div class="rules">${esc(c.text||'')}</div>${c.flags?.manual?`<span class="manual">Manual: ${esc(c.flags.manual)}</span>`:''}<div class="actions fallbackAction">${act}</div></div>`;
  }

  function blueprintFullCard(bp,p){
    const used=!!p.usedBlueprints?.includes(bp.id);
    const musterLine=bp.muster?`<div class="fullCardLine"><b>Muster:</b> ${esc(bp.musterClass)} · 🏠 ${bp.housing}${bp.upgradeFrom?' · Upgraded':''}</div>`:'';
    const recruit=bp.recruitCost?`<div class="fullCardLine"><b>Recruit:</b> ${costText(bp.recruitCost)}</div>`:'';
    return `<div class="blueprintFullCard ${used?'used':''}"><div class="fullCardTop"><span class="fullCardName">${esc(bp.name)}</span>${used?'<span class="usedTag">USED</span>':''}</div><div class="fullCardType">${esc(bp.subtype)}</div><div class="fullCardArt">BUILDING ART</div><div class="fullCardStats"><span>Cost ${costText(bp.cost)}</span><span>🛡️ ${bp.durability}</span><span>✨ ${bp.prosperity}</span>${bp.housing?`<span>🏠 ${bp.housing}</span>`:''}</div>${musterLine}${recruit}<div class="fullCardRules">${esc(bp.text||'')}</div>${bp.manual?`<div class="manual">Manual in beta: ${esc(bp.manual)}</div>`:''}</div>`;
  }

  function blueprintPanel(p=active()){
    const f=faction(p),locked=state.mode==='ai'&&isAiTurn();
    const available=f.blueprints.filter(bp=>!p.usedBlueprints?.includes(bp.id)).length;
    const first=f.blueprints.find(bp=>!p.usedBlueprints?.includes(bp.id))||f.blueprints[0];
    return `<details class="panel blueprintDrawer" open><summary><span>📜 Blueprint Deck</span><small>${available}/12 available</small></summary><div class="blueprintDrawerBody"><div class="tiny">Known build menu · each Blueprint is single-use. Hover or focus a Blueprint to inspect the full card.${locked?' Your plans remain visible while the AI acts.':''}</div><div class="blueprintPreview" id="blueprint-preview">${blueprintFullCard(first,p)}</div><div class="blueprints">${f.blueprints.map(bp=>{const used=!!p.usedBlueprints?.includes(bp.id);const why=locked?'AI turn':buildReason(p,bp);const unavailable=!!why;return `<div class="bp ${unavailable?'bpDisabled':'bpDraggable'} ${used?'bpUsed':''}" tabindex="0" data-bp-preview="${bp.id}" ${unavailable?'':`draggable="true" data-blueprint-id="${bp.id}"`} title="${esc(why)}"><div><div class="bpname">${esc(bp.name)} ${used?'<span class="usedTag">USED</span>':''}</div><div class="cost">${esc(bp.subtype)} · ${costText(bp.cost)}</div></div><button ${unavailable?'disabled':''} onclick="H.buildBlueprint('${bp.id}')">${used?'Used':bp.upgradeFrom?'Upgrade':'Build'}</button></div>`;}).join('')}</div></div></details>`;
  }

  function combatPanel(){
    if(currentPhase()!=='Attack')return `<div class="combat combatHint"><strong>Combat is implicit.</strong><div class="tiny">When you are ready, drag a ready Critter onto an enemy Building or Hearthseed. Your first attack automatically closes Build and starts combat.</div></div>`;
    const o=opponent(),defenderIsAi=isAiIndex(1-state.active);
    if(!state.combat.attacks.length)return '';
    const header=isAiTurn()?`${aiDisplayName()} is attacking`:'Declared attacks';
    const note=isAiTurn()?'Choose your blockers, then resolve combat. The AI will end its turn automatically.':defenderIsAi?`${aiDisplayName()} will assign legal blockers automatically when you resolve combat.`:'You may add more ready attackers before resolving. Assign blockers, then resolve once.';
    return `<div class="combat ${isAiTurn()?'aiCombat':''}"><strong>${header}</strong><div class="tiny">${note}</div>${state.combat.attacks.map((a,i)=>{const atk=active().residents.find(r=>r.uid===a.attackerUid),blk=o.residents.find(r=>r.uid===a.blockerUid);const eligible=o.residents.filter(r=>canBlock(r,a)&&!state.combat.attacks.some(x=>x.blockerUid===r.uid));return `<div class="bp attackRow"><div><b>${esc(atk?.name||'Attacker')}</b> → ${a.target.kind==='hearthseed'?'🔥 Hearthseed':esc(a.target.name)}${blk?`<br><span class="tiny">blocked by ${esc(blk.name)}</span>`:''}</div>${!defenderIsAi&&!blk&&eligible.length&&!state.combat.resolved?`<div><select id="b-${i}">${eligible.map(r=>`<option value="${r.uid}">${esc(r.name)}</option>`).join('')}</select><button onclick="H.assignBlock(+document.getElementById('b-${i}').value,${i})">Block</button></div>`:defenderIsAi&&!state.combat.resolved?(eligible.length?'<span class="tiny">AI blocker pending</span>':'<span class="tiny">No legal blocker</span>'):'<span class="tiny">Unblocked / no legal blocker</span>'}</div>`;}).join('')}<button ${state.combat.resolved?'disabled':''} onclick="H.resolveCombat()">Resolve combat</button>${state.combat.resolved?'<span class="tiny"> Combat resolved.</span>':''}</div>`;
  }

  function harvestChoiceOverlay(){
    if(!state.pendingHarvest)return '';
    const item=state.pendingHarvest.choices[state.pendingHarvest.index];if(!item)return '';
    if(isAiTurn())return '';
    return `<div class="choiceOverlay"><div class="choiceCard"><div class="beta">HARVEST</div><h2>${esc(item.buildingName)}</h2><p>Choose what this Building produces this turn.</p><div class="resourceChoices">${item.options.map(r=>`<button class="resourceChoice" onclick="H.chooseHarvest('${r}')"><span>${rname(r)}</span><b>+1 ${RLABEL[r]}</b></button>`).join('')}</div><div class="tiny">Dawn already resolved automatically. After this choice, you go straight into Build.</div></div></div>`;
  }

  function renderSetup(){
    app.innerHTML=`<div class="setup"><div class="beta">CLIENT BETA v0.5.0</div><h1>Hearth & Hollow</h1><p>A local, client-side rules prototype for the v0.6.2 Muster Classes playtest.</p><h2 class="setupPrompt">Choose your village</h2><div class="setupGrid factionSelect"><button class="choice factionButton" id="choose-as"><span class="choiceIcon">🥜💦</span><span><strong>Porchlight — Acorn / Sap</strong><small>Hazel Underleaf · quick, scrappy pressure</small></span><span class="choicePlay">Play Porchlight →</span></button><button class="choice factionButton" id="choose-rp"><span class="choiceIcon">🫚🪨</span><span><strong>Stonecap — Root / Pebble</strong><small>Mosswick Grubroot · sturdy, recursive defense</small></span><span class="choicePlay">Play Stonecap →</span></button></div><div class="setupNote"><b>Solo:</b> the AI automatically pilots the other starter village. Pick Porchlight and you face Mosswick; pick Stonecap and you face Hazel.</div><div class="setupActions"><button class="ghost" id="start-hotseat">Hot-seat two player</button></div><p class="footerNote"><b>v0.5.0:</b> v0.6.2 rules migration — Muster Classes, 1-Housing Critters, Advanced recruitment, flexible Provision payment, Shield, rehousing, and initiative.</p></div>`;
    document.getElementById('choose-as').onclick=()=>newGame('ai','AS');
    document.getElementById('choose-rp').onclick=()=>newGame('ai','RP');
    document.getElementById('start-hotseat').onclick=()=>newGame('hotseat');
  }

  function render(){
    if(!state){renderSetup();return;}
    const turnP=active(),ai=isAiTurn();
    const status=state.pendingHarvest?(ai?'AI choosing Harvest':'Choosing Harvest'):state.cleanup?'Rest / discard':currentPhase()==='Attack'?(ai?'AI Combat':'Combat'):(ai?'AI thinking':'Build');

    let topPanel,bottomPanel,handOwner,handInteractive,bpOwner;
    if(state.mode==='ai'){
      const hi=humanIndex(),aii=state.aiIndex;
      const human=state.players[hi],bot=state.players[aii];
      topPanel=playerPanel(bot,aii,ai?'AI OPPONENT — ACTIVE':'AI OPPONENT','opponent');
      bottomPanel=playerPanel(human,hi,!ai?'YOU — ACTIVE':'YOU','player');
      handOwner=human;
      handInteractive=!ai;
      bpOwner=human;
    }else{
      topPanel=playerPanel(opponent(),1-state.active,'OPPONENT','opponent');
      bottomPanel=playerPanel(active(),state.active,'ACTIVE PLAYER','player');
      handOwner=active();
      handInteractive=true;
      bpOwner=active();
    }

    const handTitle=state.mode==='ai'?'Your Hand':'Active Player Hand';
    const lockedNote=state.mode==='ai'&&ai?'<div class="notice aiTurnNotice">🤖 The opponent is taking its turn. Your hand and Blueprint Deck stay in place but are temporarily locked.</div>':'';
    const handHtml=`<section class="panel">${lockedNote}<div class="playerHeader"><div><h3>${handTitle} (${handOwner.hand.length})</h3><div class="tiny">Field Deck ${handOwner.fieldDeck.length} · Compost ${handOwner.compost.length}</div></div>${state.cleanup&&handInteractive?`<div class="notice">Rest: discard ${Math.max(0,handOwner.hand.length-7)} card(s). The turn ends automatically at 7.</div>`:''}</div><div class="hand">${handOwner.hand.map(c=>handCard(c,handOwner,handInteractive)).join('')||'<div class="tiny">Hand empty.</div>'}</div></section>`;

    app.innerHTML=`<div class="app"><header class="topbar"><div><div class="brand">Hearth & Hollow <span class="beta">CLIENT BETA v0.5.0</span></div><div class="tiny">Round ${currentRound()} · Turn ${state.turnNo} · ${esc(turnP.name)} · ${status}${state.mode==='ai'?' · Solo vs AI':''}</div></div><div class="turnbox">${phaseBar()}${ai?'<span class="aiBadge">🤖 AI TURN</span>':''}<button onclick="H.requestEndTurn()" ${state.pendingHarvest||state.pass||ai?'disabled':''}>End turn</button><button class="ghost" onclick="H.reset()">Reset</button></div></header>${state.winner?`<div class="panel notice win"><h2>🏆 ${esc(state.winner)} wins the Frost Trial!</h2></div>`:''}<div class="layout"><main class="main">${topPanel}<div class="frostTrialDivider"><span>❄ FROST TRIAL</span></div>${bottomPanel}${combatPanel()}${handHtml}</main><aside class="side">${blueprintPanel(bpOwner)}<section class="panel"><h3>Game Log</h3><div class="log">${state.log.map(x=>`<div>${esc(x)}</div>`).join('')}</div></section>${state.mode==='ai'?`<section class="panel"><h3>v0.5.0 · rules v0.6.2</h3><p class="tiny"><b>Field vs Village:</b> Critters now live in a dedicated Field row while Buildings stay in the Village.</p><p class="tiny"><b>Recruit clarity:</b> playable Critters glow softly in hand and compatible Musters light up while dragging.</p></section>`:''}</aside></div></div>${state.pass&&!state.winner&&state.mode!=='ai'?`<div class="passOverlay"><div class="passCard"><div class="beta">PASS DEVICE</div><h1>${esc(active().name)}'s turn</h1><p>${esc(faction(active()).short)}</p><p class="tiny">Dawn and Harvest will resolve after you reveal.</p><button onclick="H.closePass()">Reveal hand & start turn</button></div></div>`:''}${harvestChoiceOverlay()}`;
    bindDragAndDrop();
  }

  function clearDropClasses(){
    document.querySelectorAll('.dropOk,.dropMaybe,.dropBad,.draggingSource,.villageDropReady,.attackTargetReady,.toolTargetReady').forEach(el=>el.classList.remove('dropOk','dropMaybe','dropBad','draggingSource','villageDropReady','attackTargetReady','toolTargetReady'));
  }

  function highlightDrag(payload){
    clearDropClasses();
    if(!payload)return;
    const p=active();
    if(payload.kind==='critter'){
      const card=p.hand.find(c=>c.uid===payload.uid);if(!card)return;
      document.querySelectorAll('[data-muster-uid]').forEach(el=>{
        const m=p.village.find(b=>b.uid===+el.dataset.musterUid);if(!m)return;
        const s=musterStatus(p,m,card);
        el.classList.add(s.legal?'dropOk':s.accepts?'dropMaybe':'dropBad');
      });
    }else if(payload.kind==='tool'){
      document.querySelectorAll('[data-resident-drop]').forEach(el=>el.classList.add('toolTargetReady'));
    }else if(payload.kind==='blueprint'){
      document.querySelectorAll('[data-village-drop]').forEach(el=>el.classList.add('villageDropReady'));
    }else if(payload.kind==='attacker'){
      document.querySelectorAll('[data-attack-target]').forEach(el=>el.classList.add('attackTargetReady'));
    }
  }

  function bindDragAndDrop(){
    document.querySelectorAll('[data-bp-preview]').forEach(el=>{
      const show=()=>{
        const preview=document.getElementById('blueprint-preview');
        if(!preview)return;
        const owner=state.mode==='ai'?state.players[humanIndex()]:active();
        const bp=faction(owner).blueprints.find(x=>x.id===el.dataset.bpPreview);
        if(bp)preview.innerHTML=blueprintFullCard(bp,owner);
      };
      el.addEventListener('mouseenter',show);
      el.addEventListener('focus',show);
      el.addEventListener('click',e=>{if(!e.target.closest('button'))show();});
    });
    document.querySelectorAll('[data-home-link]').forEach(el=>{
      const uid=el.dataset.homeLink;
      const on=()=>document.querySelectorAll(`[data-home-building="${uid}"]`).forEach(x=>x.classList.add('linkedHighlight'));
      const off=()=>document.querySelectorAll(`[data-home-building="${uid}"]`).forEach(x=>x.classList.remove('linkedHighlight'));
      el.addEventListener('mouseenter',on);el.addEventListener('mouseleave',off);el.addEventListener('focusin',on);el.addEventListener('focusout',off);
    });
    document.querySelectorAll('[data-home-building]').forEach(el=>{
      const uid=el.dataset.homeBuilding;
      const on=()=>document.querySelectorAll(`[data-home-link="${uid}"]`).forEach(x=>x.classList.add('linkedHighlight'));
      const off=()=>document.querySelectorAll(`[data-home-link="${uid}"]`).forEach(x=>x.classList.remove('linkedHighlight'));
      el.addEventListener('mouseenter',on);el.addEventListener('mouseleave',off);
    });
    document.querySelectorAll('[data-hand-critter]').forEach(el=>{
      el.addEventListener('dragstart',e=>{dragPayload={kind:'critter',uid:+el.dataset.handCritter};el.classList.add('draggingSource');if(e.dataTransfer){e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','critter');}highlightDrag(dragPayload);});
      el.addEventListener('dragend',()=>{dragPayload=null;clearDropClasses();});
    });
    document.querySelectorAll('[data-hand-tool]').forEach(el=>{
      el.addEventListener('dragstart',e=>{dragPayload={kind:'tool',uid:+el.dataset.handTool};el.classList.add('draggingSource');if(e.dataTransfer){e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','tool');}highlightDrag(dragPayload);});
      el.addEventListener('dragend',()=>{dragPayload=null;clearDropClasses();});
    });
    document.querySelectorAll('[data-blueprint-id]').forEach(el=>{
      el.addEventListener('dragstart',e=>{dragPayload={kind:'blueprint',id:el.dataset.blueprintId};el.classList.add('draggingSource');if(e.dataTransfer){e.dataTransfer.effectAllowed='copy';e.dataTransfer.setData('text/plain','blueprint');}highlightDrag(dragPayload);});
      el.addEventListener('dragend',()=>{dragPayload=null;clearDropClasses();});
    });
    document.querySelectorAll('[data-attacker-uid]').forEach(el=>{
      el.addEventListener('dragstart',e=>{dragPayload={kind:'attacker',uid:+el.dataset.attackerUid};el.classList.add('draggingSource');if(e.dataTransfer){e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','attacker');}highlightDrag(dragPayload);});
      el.addEventListener('dragend',()=>{dragPayload=null;clearDropClasses();});
    });

    document.querySelectorAll('[data-muster-uid]').forEach(el=>{
      el.addEventListener('dragover',e=>{if(dragPayload?.kind==='critter'){e.preventDefault();if(e.dataTransfer)e.dataTransfer.dropEffect='move';}});
      el.addEventListener('drop',e=>{e.preventDefault();if(dragPayload?.kind==='critter')recruit(dragPayload.uid,+el.dataset.musterUid);dragPayload=null;clearDropClasses();});
    });
    document.querySelectorAll('[data-resident-drop]').forEach(el=>{
      el.addEventListener('dragover',e=>{if(dragPayload?.kind==='tool'){e.preventDefault();}});
      el.addEventListener('drop',e=>{e.preventDefault();if(dragPayload?.kind==='tool')playTool(dragPayload.uid,+el.dataset.residentDrop);dragPayload=null;clearDropClasses();});
    });
    document.querySelectorAll('[data-village-drop]').forEach(el=>{
      el.addEventListener('dragover',e=>{if(dragPayload?.kind==='blueprint'){e.preventDefault();}});
      el.addEventListener('drop',e=>{e.preventDefault();if(dragPayload?.kind==='blueprint')buildBlueprint(dragPayload.id);dragPayload=null;clearDropClasses();});
    });
    document.querySelectorAll('[data-attack-target]').forEach(el=>{
      el.addEventListener('dragover',e=>{if(dragPayload?.kind==='attacker'){e.preventDefault();}});
      el.addEventListener('drop',e=>{e.preventDefault();if(dragPayload?.kind==='attacker')declareAttack(dragPayload.uid,el.dataset.attackTarget);dragPayload=null;clearDropClasses();});
    });
  }

  window.H={requestEndTurn,reset,buildBlueprint,recruit,playTool,manualSupport,workshopRepair,devDamage,changeResource,changeHearth,declareAttack,assignBlock,resolveCombat,discard,closePass,chooseHarvest};
  render();
})();
