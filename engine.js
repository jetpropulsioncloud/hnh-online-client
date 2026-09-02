(() => {
  const {decks} = window.HNH_DATA;
  const CORE = ['acorn','sap','root','pebble'];
  const ALL_RESOURCES = [...CORE,'provision'];
  const PHASES = ['Dawn','Harvest','Build','Attack','Block','Discard','GameOver'];
  let uid = 1;

  const clone = value => JSON.parse(JSON.stringify(value));
  const inst = card => ({...clone(card),uid:uid++});
  const shuffle = (cards,rng=Math.random) => {
    const out=[...cards];
    for(let i=out.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[out[i],out[j]]=[out[j],out[i]];}
    return out;
  };
  const isRuined = b => b.damage >= b.durability;
  const activeBuildings = p => p.village.filter(b=>!isRuined(b));
  const prosperity = p => activeBuildings(p).reduce((n,b)=>n+(b.prosperity||0),0);
  const controlledMusters = p => p.village.filter(b=>b.muster);
  const activeMusters = p => activeBuildings(p).filter(b=>b.muster);
  const housingUsed = (p,musterUid) => p.residents.filter(r=>r.musterUid===musterUid).length;
  const log = (g,msg) => {g.log.unshift(msg);g.log=g.log.slice(0,160);};
  const playerIndex = (g,p) => g.players.indexOf(p);
  const opponentIndex = (g,pi) => 1-pi;
  const currentRound = g => Math.floor((g.turnNo-1)/2)+1;
  const roundLeader = (g,round) => round<=1?g.round1Opener:(round%2===0?g.round2Leader:1-g.round2Leader);

  function buildFieldDeck(faction,rng){
    const cards=[];
    faction.field.forEach(card=>{for(let i=0;i<card.count;i++)cards.push(inst({...card,count:undefined}));});
    return shuffle(cards,rng);
  }

  function makePlayer(name,key,rng){
    const faction=decks[key];
    const p={
      name,factionKey:key,hearthseed:20,hearthseedTempPrevent:0,
      resources:{acorn:0,sap:0,root:0,pebble:0,provision:0},
      fieldDeck:buildFieldDeck(faction,rng),hand:[],compost:[],village:[],residents:[],usedBlueprints:[],
      freeProductionBuilt:false,toolPlayed:false,reactionRoundUsed:null,workshopRepairUsed:false,
      attackedThisStep:[],turnsTaken:0,buildActionsTaken:0,buildReadySnapshot:null,
      exposed:false,exposurePendingOwnTurn:null,sabotagedBuildings:{},triggerRoundUsed:{},
    };
    p.village.push({...inst(faction.founding),damage:0,shield:false,tempPrevent:0,founding:true,rehousingDueOwnTurn:null});
    draw(null,p,7,false);
    return p;
  }

  function createGame({mode='ai',humanFaction='AS',rng=Math.random}={}){
    const humanKey=decks[humanFaction]?humanFaction:'AS';
    const otherKey=humanKey==='AS'?'RP':'AS';
    const players=mode==='ai'
      ?[makePlayer('You',humanKey,rng),makePlayer(`${decks[otherKey].hearthkeeper} AI`,otherKey,rng)]
      :[makePlayer('Player 1','AS',rng),makePlayer('Player 2','RP',rng)];
    const setupRoll=Math.floor(rng()*4);
    const round1Opener=setupRoll<2?0:1;
    const round2Leader=setupRoll%2===0?0:1;
    const g={
      version:'0.6.2',clientVersion:'0.6.0',mode,aiIndex:mode==='ai'?1:null,players,
      setupRoll,round1Opener,round2Leader,active:round1Opener,turnNo:1,phase:'Dawn',winner:null,
      combat:{attacks:[],committed:false,resolved:false},pendingHarvest:[],log:[],started:false,
    };
    log(g,`Setup ${setupRoll+1}/4: ${players[round1Opener].name} opens round 1; ${players[round2Leader].name} leads round 2.`);
    return g;
  }

  function draw(g,p,n=1,logIt=true){
    let count=0;
    for(let i=0;i<n;i++){
      const card=p.fieldDeck.shift();
      if(!card){if(g&&logIt)log(g,`${p.name} could not draw because the Field Deck is empty.`);continue;}
      p.hand.push(card);count++;
    }
    if(g&&logIt&&count)log(g,`${p.name} drew ${count} card${count===1?'':'s'}.`);
    return count;
  }

  function mulligan(g,pi,handUids){
    if(g.started)return {ok:false,reason:'The match already started.'};
    const p=g.players[pi];
    const chosen=new Set(handUids||[]);
    const returned=p.hand.filter(c=>chosen.has(c.uid));
    if(!returned.length)return {ok:true,count:0};
    p.hand=p.hand.filter(c=>!chosen.has(c.uid));
    p.fieldDeck=shuffle([...p.fieldDeck,...returned]);
    draw(g,p,returned.length,false);
    log(g,`${p.name} took a partial mulligan of ${returned.length} card${returned.length===1?'':'s'}.`);
    return {ok:true,count:returned.length};
  }

  function startGame(g){
    if(g.started)return;
    g.started=true;
    log(g,`The Frost Trial begins. ${g.players[g.active].name} has initiative.`);
    beginDawn(g);
  }

  function beginDawn(g){
    if(g.winner)return;
    const p=g.players[g.active];
    g.phase='Dawn';g.combat={attacks:[],committed:false,resolved:false};
    p.freeProductionBuilt=false;p.toolPlayed=false;p.workshopRepairUsed=false;p.attackedThisStep=[];p.buildActionsTaken=0;

    // Rulebook order: check Prosperity before readying or drawing.
    const pros=prosperity(p);
    if(pros>=15){
      g.winner={playerIndex:g.active,reason:'Prosperity'};g.phase='GameOver';
      log(g,`${p.name} begins Dawn with ${pros} active Prosperity and wins the Frost Trial.`);
      return;
    }

    p.residents.forEach(r=>{r.tired=false;r.attacking=false;r.blocking=false;});
    draw(g,p,1,true);
    log(g,`${p.name}: Dawn — Prosperity checked, Critters readied, draw resolved.`);
    beginHarvest(g);
  }

  function beginHarvest(g){
    if(g.winner)return;
    const p=g.players[g.active];
    g.phase='Harvest';g.pendingHarvest=[];
    activeBuildings(p).filter(b=>b.production).forEach(b=>{
      if(p.sabotagedBuildings[b.uid]){delete p.sabotagedBuildings[b.uid];log(g,`${b.name} is sabotaged and produces nothing this Harvest.`);return;}
      if(b.harvestChoice?.length)g.pendingHarvest.push({buildingUid:b.uid,options:[...b.harvestChoice]});
      else gain(p,b.harvest||{},g,`${b.name} Harvest`);
    });
    if(!g.pendingHarvest.length)beginBuild(g);
  }

  function chooseHarvest(g,resource){
    if(g.phase!=='Harvest'||!g.pendingHarvest.length)return {ok:false,reason:'No Harvest choice is pending.'};
    const p=g.players[g.active];
    const item=g.pendingHarvest[0];
    if(!item.options.includes(resource))return {ok:false,reason:'Invalid Harvest choice.'};
    const b=p.village.find(x=>x.uid===item.buildingUid);
    gain(p,{[resource]:1},g,`${b?.name||'Production'} Harvest`);
    g.pendingHarvest.shift();
    if(!g.pendingHarvest.length)beginBuild(g);
    return {ok:true};
  }

  function beginBuild(g){
    const p=g.players[g.active],o=g.players[1-g.active];
    g.phase='Build';
    p.buildReadySnapshot={self:readyCount(g,p),opponent:readyCount(g,o)};
    log(g,`${p.name}: Build begins.`);
  }

  function gain(p,gains,g=null,source='Gain'){
    Object.entries(gains||{}).forEach(([r,n])=>{p.resources[r]=(p.resources[r]||0)+n;});
    if(g&&Object.keys(gains||{}).length)log(g,`${source}: ${Object.entries(gains).map(([r,n])=>`+${n} ${r}`).join(', ')}.`);
  }

  function paymentPlan(p,cost){
    const virtual={...p.resources},plan={};
    for(const r of CORE){
      const need=cost?.[r]||0;
      if((virtual[r]||0)<need)return null;
      if(need){virtual[r]-=need;plan[r]=(plan[r]||0)+need;}
    }
    let flexible=cost?.provision||0;
    while(flexible>0){
      let pick=null;
      if((virtual.provision||0)>0)pick='provision';
      else{
        const candidates=CORE.filter(r=>(virtual[r]||0)>0).sort((a,b)=>(virtual[b]||0)-(virtual[a]||0));
        pick=candidates[0]||null;
      }
      if(!pick)return null;
      virtual[pick]--;plan[pick]=(plan[pick]||0)+1;flexible--;
    }
    return plan;
  }

  const canAfford = (p,cost) => !!paymentPlan(p,cost||{});
  function pay(p,cost){
    const plan=paymentPlan(p,cost||{});if(!plan)return null;
    Object.entries(plan).forEach(([r,n])=>p.resources[r]-=n);
    return plan;
  }

  function musterMatches(card,m){
    if(!m?.muster||isRuined(m))return false;
    if(card.advanced&&!m.upgradeFrom)return false;
    return (card.musterClasses||[]).includes(m.musterClass);
  }

  function buildReason(g,pi,bp){
    const p=g.players[pi];
    if(pi!==g.active||g.phase!=='Build')return 'Buildings can only be constructed during your Build.';
    if(p.usedBlueprints.includes(bp.id))return 'That Blueprint has already been used.';
    if(!canAfford(p,bp.cost))return 'Not enough resources.';
    if(bp.production&&!bp.upgradeFrom&&Object.keys(bp.cost||{}).length===0&&p.freeProductionBuilt)return 'You already built one free non-upgrade Production this Build.';
    if(bp.upgradeFrom&&!p.village.some(b=>b.id===bp.upgradeFrom))return 'The required base Building is not in your Village.';
    if(bp.peaceful&&controlledMusters(p).length>=3)return 'Peaceful cannot be built while you control 3 or more Muster Buildings.';
    if(bp.muster&&!bp.upgradeFrom&&activeBuildings(p).some(b=>b.peaceful)&&controlledMusters(p).length>=2)return 'An active Peaceful Landmark caps you at 2 Muster Buildings.';
    return '';
  }

  function build(g,pi,blueprintId){
    const p=g.players[pi],f=decks[p.factionKey],bp=f.blueprints.find(b=>b.id===blueprintId);
    if(!bp)return {ok:false,reason:'Unknown Blueprint.'};
    const reason=buildReason(g,pi,bp);if(reason)return {ok:false,reason};
    const plan=pay(p,bp.cost);if(!plan)return {ok:false,reason:'Not enough resources.'};
    p.usedBlueprints.push(bp.id);p.buildActionsTaken++;

    if(bp.upgradeFrom){
      const old=p.village.find(b=>b.id===bp.upgradeFrom);
      const oldUid=old.uid,damage=old.damage,shield=!!old.shield,tempPrevent=old.tempPrevent||0,due=old.rehousingDueOwnTurn;
      Object.assign(old,inst(bp),{damage,shield,tempPrevent,rehousingDueOwnTurn:due});
      p.residents.filter(r=>r.musterUid===oldUid).forEach(r=>r.musterUid=old.uid);
      if(!isRuined(old))old.rehousingDueOwnTurn=null;
      if(bp.upgradeGain)gain(p,bp.upgradeGain,g,`${bp.name} upgrade`);
      log(g,`${p.name} upgraded to ${bp.name}. Damage remained at ${damage}.`);
      if(isRuined(old))markMusterRuin(g,p,old); else clearExposureIfRecovered(p);
      return {ok:true,building:old,payment:plan};
    }

    const b={...inst(bp),damage:0,shield:false,tempPrevent:0,rehousingDueOwnTurn:null};
    p.village.push(b);
    if(bp.production&&Object.keys(bp.cost||{}).length===0)p.freeProductionBuilt=true;
    if(bp.production){const first=bp.firstYield||bp.harvest||{};if(Object.keys(first).length)gain(p,first,g,`${bp.name} First Yield`);}
    log(g,`${p.name} built ${bp.name}.`);
    clearExposureIfRecovered(p);
    return {ok:true,building:b,payment:plan};
  }

  function recruitReason(g,pi,card,m){
    const p=g.players[pi];
    if(pi!==g.active||g.phase!=='Build')return 'Critters are recruited during your Build.';
    if(!m||isRuined(m)||!m.muster)return 'Choose an active Muster.';
    if(!musterMatches(card,m))return card.advanced?'Advanced Critters require an upgraded matching Muster.':'That Muster Class does not match this Critter.';
    if(housingUsed(p,m.uid)>=m.housing)return 'That Muster has no open Housing.';
    if(!canAfford(p,m.recruitCost))return 'You cannot pay this Muster’s Recruit cost.';
    return '';
  }

  function recruit(g,pi,cardUid,musterUid,options={}){
    const p=g.players[pi],index=p.hand.findIndex(c=>c.uid===cardUid),card=p.hand[index],m=p.village.find(b=>b.uid===musterUid);
    if(!card||card.type!=='Critter')return {ok:false,reason:'That card is not a Critter in your hand.'};
    const reason=recruitReason(g,pi,card,m);if(reason)return {ok:false,reason};
    const plan=pay(p,m.recruitCost);if(!plan)return {ok:false,reason:'Could not pay Recruit cost.'};
    p.hand.splice(index,1);p.buildActionsTaken++;
    const r={...card,musterUid:m.uid,damage:0,tired:false,attacking:false,blocking:false,tool:null,shield:false,tempPrevent:0,recruitedTurn:g.turnNo};
    if(card.flags?.hearthsideRally&&p.buildReadySnapshot&&p.buildReadySnapshot.opponent>p.buildReadySnapshot.self)r.shield=true;
    p.residents.push(r);
    log(g,`${p.name} recruited ${card.name} through ${m.name}.`);

    if(card.flags?.shieldBuildingOnRecruit){
      const eligible=activeBuildings(p).filter(b=>!b.shield);
      const target=p.village.find(b=>b.uid===options.shieldTargetUid&&eligible.includes(b))||eligible[0];
      if(target){target.shield=true;log(g,`${card.name} gave Shield to ${target.name}.`);}
    }
    if(card.flags?.repairOnRecruit){
      const damaged=p.village.filter(b=>b.damage>0);
      const target=p.village.find(b=>b.uid===options.repairTargetUid&&damaged.includes(b))||[...damaged].sort((a,b)=>b.damage-a.damage)[0];
      if(target)repairBuilding(g,p,target,card.flags.repairOnRecruit,`${card.name} recruit`);
    }
    return {ok:true,resident:r,payment:plan};
  }

  function readyCount(g,p){return p.residents.filter(r=>residentReady(g,p,r)).length;}
  function residentReady(g,p,r){const m=p.village.find(b=>b.uid===r.musterUid);return !!m&&!isRuined(m)&&!r.tired;}
  function residentGrit(g,p,r,blocking=false){
    let grit=r.grit+(r.tool?.flags?.gritBonus||0);
    const home=p.village.find(b=>b.uid===r.musterUid);
    if(home&&!isRuined(home)&&home.id==='hidden_brambleworks'&&(r.traits||[]).includes('Chipmunk'))grit+=1;
    if(home&&!isRuined(home)&&home.id==='deep_rabbit_warren'&&(r.traits||[]).includes('Rabbit'))grit+=1;
    if(blocking&&home&&!isRuined(home)&&home.id==='fortified_snail_gate'&&(r.traits||[]).includes('Guard'))grit+=1;
    return grit;
  }
  function residentMight(r,target){return r.might+((target?.kind==='building'&&r.flags?.buildingMightBonus)||0);}
  function canAttack(g,pi,r){return pi===g.active&&(g.phase==='Build'||g.phase==='Attack')&&residentReady(g,g.players[pi],r)&&r.recruitedTurn!==g.turnNo&&!g.players[pi].attackedThisStep.includes(r.uid);}

  function playTool(g,pi,cardUid,residentUid){
    const p=g.players[pi],idx=p.hand.findIndex(c=>c.uid===cardUid),card=p.hand[idx],r=p.residents.find(x=>x.uid===residentUid);
    if(pi!==g.active||g.phase!=='Build')return {ok:false,reason:'Tools are equipped during your Build.'};
    if(!card||card.subtype!=='Tool'||!r)return {ok:false,reason:'Choose a Tool and Critter.'};
    if(!activeBuildings(p).some(b=>b.toolAccess))return {ok:false,reason:'You need an active Tool Access Building.'};
    if(p.toolPlayed)return {ok:false,reason:'You already equipped a Tool this turn.'};
    if(r.tool)return {ok:false,reason:'That Critter already carries a Tool.'};
    const plan=pay(p,card.cost);if(!plan)return {ok:false,reason:'Not enough resources.'};
    p.hand.splice(idx,1);r.tool=card;p.toolPlayed=true;p.buildActionsTaken++;
    log(g,`${p.name} equipped ${card.name} to ${r.name}.`);
    return {ok:true,payment:plan};
  }

  function useWorkshop(g,pi,buildingUid,targetUid,resource){
    const p=g.players[pi],work=p.village.find(b=>b.uid===buildingUid),target=p.village.find(b=>b.uid===targetUid);
    if(pi!==g.active||g.phase!=='Build')return {ok:false,reason:'Workshop repair is a Build ability.'};
    if(!work||isRuined(work)||!work.repairAbility)return {ok:false,reason:'That Workshop is not active.'};
    if(p.workshopRepairUsed)return {ok:false,reason:'Workshop repair was already used this turn.'};
    if(!ALL_RESOURCES.includes(resource)||(p.resources[resource]||0)<1)return {ok:false,reason:'Spend 1 available resource.'};
    if(!target||target.damage<=0)return {ok:false,reason:'Choose a damaged Building.'};
    p.resources[resource]--;p.workshopRepairUsed=true;p.buildActionsTaken++;
    repairBuilding(g,p,target,1,'Burrow Workshop');
    return {ok:true};
  }

  function declareAttack(g,pi,residentUid,target){
    const p=g.players[pi],o=g.players[1-pi],r=p.residents.find(x=>x.uid===residentUid);
    if(!r||!canAttack(g,pi,r))return {ok:false,reason:'That Critter cannot attack now.'};
    let targetObj;
    if(target==='hearthseed')targetObj={kind:'hearthseed'};
    else{
      const b=o.village.find(x=>x.uid===target&&!isRuined(x));
      if(!b)return {ok:false,reason:'Target an active enemy Building or Hearthseed.'};
      targetObj={kind:'building',uid:b.uid,name:b.name};
    }
    if(targetObj.kind==='hearthseed'&&r.flags?.hearthseedProsperityGate&&prosperity(p)<r.flags.hearthseedProsperityGate)return {ok:false,reason:`${r.name} needs ${r.flags.hearthseedProsperityGate} active Prosperity to attack the Hearthseed.`};
    if(g.phase==='Build')g.phase='Attack';
    r.attacking=true;if(!r.flags?.guard)r.tired=true;p.attackedThisStep.push(r.uid);
    g.combat.attacks.push({attackerUid:r.uid,target:targetObj,blockerUid:null,zeroDamage:false});
    log(g,`${r.name} is declared against ${targetObj.kind==='hearthseed'?'the Hearthseed':targetObj.name}.`);
    return {ok:true};
  }

  function cancelAttack(g,pi,residentUid){
    if(pi!==g.active||g.phase!=='Attack'||g.combat.committed)return {ok:false,reason:'Attackers can only be changed before the attack is declared.'};
    const p=g.players[pi],index=g.combat.attacks.findIndex(a=>a.attackerUid===residentUid);
    if(index<0)return {ok:false,reason:'That Critter is not in the current attack.'};
    g.combat.attacks.splice(index,1);
    const r=p.residents.find(x=>x.uid===residentUid);
    if(r){r.attacking=false;r.tired=false;}
    p.attackedThisStep=p.attackedThisStep.filter(uid=>uid!==residentUid);
    log(g,`${r?.name||'A Critter'} is withdrawn from the attack.`);
    return {ok:true};
  }

  function commitAttacks(g,pi){
    if(pi!==g.active||g.phase!=='Attack'||!g.combat.attacks.length)return {ok:false,reason:'Declare at least one attacker first.'};
    g.combat.committed=true;g.phase='Block';
    log(g,`${g.players[pi].name} declares ${g.combat.attacks.length} attacker${g.combat.attacks.length===1?'':'s'}. Defender may block.`);
    return {ok:true};
  }

  function canBlock(g,defenderIndex,r,attack){
    const defender=g.players[defenderIndex],attacker=g.players[g.active].residents.find(x=>x.uid===attack.attackerUid);
    if(defenderIndex===g.active||g.phase!=='Block'||!residentReady(g,defender,r)||r.flags?.cannotBlock)return false;
    if(g.combat.attacks.some(a=>a.blockerUid===r.uid))return false;
    if(attacker?.flags?.unblockableVsBuilding&&attack.target.kind==='building')return false;
    if(attacker?.flags?.pounce&&attack.target.kind==='building'){
      const b=defender.village.find(x=>x.uid===attack.target.uid);
      if(b&&b.damage>0&&r.might<=1)return false;
    }
    return true;
  }

  function assignBlock(g,defenderIndex,residentUid,attackIndex){
    const a=g.combat.attacks[attackIndex],r=g.players[defenderIndex].residents.find(x=>x.uid===residentUid);
    if(!a||!r||!canBlock(g,defenderIndex,r,a))return {ok:false,reason:'That block is not legal.'};
    a.blockerUid=r.uid;r.blocking=true;
    log(g,`${r.name} blocks ${g.players[g.active].residents.find(x=>x.uid===a.attackerUid)?.name||'an attacker'}.`);
    return {ok:true};
  }

  function reactionAccess(p){return activeBuildings(p).some(b=>b.reactionAccess);}
  function playReaction(g,pi,cardUid,target){
    const p=g.players[pi],idx=p.hand.findIndex(c=>c.uid===cardUid),card=p.hand[idx];
    if(!card||card.subtype!=='Reaction')return {ok:false,reason:'Choose a Reaction in hand.'};
    if(!reactionAccess(p))return {ok:false,reason:'You need an active Reaction Access Building.'};
    if(p.reactionRoundUsed===currentRound(g))return {ok:false,reason:'You already played a Reaction this round.'};
    if(g.phase!=='Block')return {ok:false,reason:'This client currently opens Reactions after attacks are committed and before damage resolves.'};
    const plan=paymentPlan(p,card.cost);if(!plan)return {ok:false,reason:'Not enough resources.'};

    let legal=false;
    if(card.id==='rootsnare'){
      const index=Number(target);const a=g.combat.attacks[index];
      legal=pi!==g.active&&!!a;
      if(legal)a.zeroDamage=true;
    }else if(card.id==='hide_in_ferns'){
      const index=Number(target);const a=g.combat.attacks[index];
      legal=pi===g.active&&!!a&&!!a.blockerUid;
      if(legal){const def=g.players[1-pi].residents.find(r=>r.uid===a.blockerUid);if(def)def.blocking=false;a.blockerUid=null;}
    }else if(card.id==='sap_bandage'){
      const [kind,id]=String(target).split(':');
      if(kind==='resident'){
        const r=p.residents.find(x=>String(x.uid)===id);if(r){r.tempPrevent=(r.tempPrevent||0)+2;legal=true;}
      }else if(kind==='building'){
        const b=p.village.find(x=>String(x.uid)===id&&!isRuined(x));if(b){b.tempPrevent=(b.tempPrevent||0)+2;legal=true;}
      }
    }else if(card.id==='brace_the_burrow'){
      if(target==='hearthseed'){p.hearthseedTempPrevent=(p.hearthseedTempPrevent||0)+3;legal=true;}
      else{
        const [,id]=String(target).split(':');const b=p.village.find(x=>String(x.uid)===id&&!isRuined(x));
        if(b){b.tempPrevent=(b.tempPrevent||0)+3;legal=true;}
      }
    }
    if(!legal)return {ok:false,reason:'That Reaction target or timing is not legal.'};
    pay(p,card.cost);p.hand.splice(idx,1);p.compost.push(card);p.reactionRoundUsed=currentRound(g);
    log(g,`${p.name} played ${card.name}.`);
    return {ok:true,payment:plan};
  }

  function applyTempPrevention(obj,amount){
    const prevent=Math.min(amount,obj.tempPrevent||0);obj.tempPrevent=Math.max(0,(obj.tempPrevent||0)-prevent);return amount-prevent;
  }

  function applyCritterDamage(g,p,r,amount,source){
    if(amount<=0)return 0;
    if(r.shield){r.shield=false;log(g,`${r.name}'s Shield prevents ${amount} damage.`);return 0;}
    const after=applyTempPrevention(r,amount);if(after<amount)log(g,`${r.name} prevents ${amount-after} damage.`);
    r.damage+=after;return after;
  }

  function flatBuildingPrevention(g,p,target,amount,attackDamage=true){
    let left=amount;
    if(left<=0)return left;
    const sources=activeBuildings(p).filter(b=>b.uid!==target.uid&&['resin_hedge','stonecap_bracewall','stonecap_root_cellar'].includes(b.id));
    for(const source of sources){
      if(left<=0)break;
      if(source.id!=='resin_hedge'&&!attackDamage)continue;
      if(p.triggerRoundUsed[source.uid]===currentRound(g))continue;
      p.triggerRoundUsed[source.uid]=currentRound(g);left=Math.max(0,left-1);
      log(g,`${source.name} prevents 1 damage to ${target.name}.`);
    }
    return left;
  }

  function markMusterRuin(g,p,b){
    if(!b?.muster)return;
    if(b.rehousingDueOwnTurn===null||b.rehousingDueOwnTurn===undefined){
      b.rehousingDueOwnTurn=p.turnsTaken+(playerIndex(g,p)===g.active?2:1);
      log(g,`${b.name}'s residents are inactive until repaired; if it stays Ruined, rehouse them at the end of ${p.name}'s next turn.`);
    }
  }
  function exposureDueOwnTurn(g,p){return p.turnsTaken+(playerIndex(g,p)===g.active?2:1);}
  function markNoBuildingsResponse(g,p){if(activeBuildings(p).length===0&&p.exposurePendingOwnTurn===null){p.exposurePendingOwnTurn=exposureDueOwnTurn(g,p);log(g,`${p.name} has no active Buildings and receives one full response turn.`);}}
  function clearExposureIfRecovered(p){if(activeBuildings(p).length>0){p.exposed=false;p.exposurePendingOwnTurn=null;}}

  function applyBuildingDamage(g,p,b,amount,attackDamage=true){
    if(amount<=0||!b)return 0;
    if(b.shield){b.shield=false;log(g,`${b.name}'s Shield prevents ${amount} damage.`);return 0;}
    let left=applyTempPrevention(b,amount);if(left<amount)log(g,`${b.name} prevents ${amount-left} damage.`);
    left=flatBuildingPrevention(g,p,b,left,attackDamage);
    if(left<=0)return 0;
    const was=isRuined(b);b.damage+=left;log(g,`${b.name} takes ${left} damage.`);
    if(!was&&isRuined(b)){log(g,`${b.name} is Ruined.`);markMusterRuin(g,p,b);markNoBuildingsResponse(g,p);}
    return left;
  }

  function applyHearthDamage(g,p,amount){
    if(amount<=0)return 0;
    const prevent=Math.min(amount,p.hearthseedTempPrevent||0);p.hearthseedTempPrevent=Math.max(0,(p.hearthseedTempPrevent||0)-prevent);
    const left=amount-prevent;if(prevent)log(g,`${p.name}'s Hearthseed prevents ${prevent} damage.`);
    if(left<=0)return 0;
    p.hearthseed=Math.max(0,p.hearthseed-left);log(g,`${p.name}'s Hearthseed takes ${left} damage.`);
    if(p.hearthseed<=0){g.winner={playerIndex:1-playerIndex(g,p),reason:'Hearthseed'};g.phase='GameOver';}
    return left;
  }

  function targetDamage(g,defenderIndex,target,amount,attacker=null){
    const p=g.players[defenderIndex];
    if(target.kind==='hearthseed'){
      if(p.exposed&&amount>0){g.winner={playerIndex:g.active,reason:'Exposed'};g.phase='GameOver';log(g,`${g.players[g.active].name} lands an unblocked attack on an Exposed Hearthseed and wins.`);return amount;}
      return applyHearthDamage(g,p,amount);
    }
    const b=p.village.find(x=>x.uid===target.uid);if(!b)return 0;
    const dealt=applyBuildingDamage(g,p,b,amount,true);
    if(dealt>0&&attacker?.flags?.sabotageProduction&&b.production){p.sabotagedBuildings[b.uid]=true;log(g,`${b.name} will produce nothing next Harvest.`);}
    return dealt;
  }

  function resolveCombat(g){
    if(g.phase!=='Block'||!g.combat.committed||g.combat.resolved)return {ok:false,reason:'Combat is not ready to resolve.'};
    const atkP=g.players[g.active],defIndex=1-g.active,defP=g.players[defIndex];
    const spill=[];

    // Blocked pairs deal combat damage simultaneously. Defeats are checked after all pairs are assigned.
    for(const a of g.combat.attacks.filter(x=>x.blockerUid)){
      const atk=atkP.residents.find(r=>r.uid===a.attackerUid),blk=defP.residents.find(r=>r.uid===a.blockerUid);if(!atk||!blk)continue;
      const atkPower=a.zeroDamage?0:residentMight(atk,a.target),blkPower=residentMight(blk,{kind:'critter'});
      const blkGrit=residentGrit(g,defP,blk,true);
      applyCritterDamage(g,atkP,atk,blkPower,blk.name);
      applyCritterDamage(g,defP,blk,atkPower,atk.name);
      const excess=Math.max(0,atkPower-blkGrit);
      if(excess>0&&atk.flags?.trample)spill.push({a,atk,amount:Math.min(excess,atk.flags.trample)});
      if(excess>0&&atk.flags?.crushingBlow)spill.push({a,atk,amount:Math.min(excess,atk.flags.crushingBlow)});
    }

    // Rulebook: damage from multiple unblocked attackers on the same target is added together.
    const groups=new Map();
    for(const a of g.combat.attacks.filter(x=>!x.blockerUid)){
      const atk=atkP.residents.find(r=>r.uid===a.attackerUid);if(!atk)continue;
      const amount=a.zeroDamage?0:residentMight(atk,a.target);const key=a.target.kind==='hearthseed'?'hearthseed':`building:${a.target.uid}`;
      const group=groups.get(key)||{target:a.target,amount:0,attackers:[]};group.amount+=amount;group.attackers.push(atk);groups.set(key,group);
    }
    for(const group of groups.values()){
      if(g.winner)break;
      const before=group.target.kind==='building'?defP.village.find(b=>b.uid===group.target.uid)?.damage:null;
      const dealt=targetDamage(g,defIndex,group.target,group.amount,group.attackers[0]);
      if(dealt>0&&group.target.kind==='building'){
        const b=defP.village.find(x=>x.uid===group.target.uid);
        if(b&&group.attackers.some(a=>a.flags?.sabotageProduction)&&b.production){defP.sabotagedBuildings[b.uid]=true;}
      }
    }
    for(const s of spill){if(!g.winner)targetDamage(g,defIndex,s.a.target,s.amount,s.atk);}

    const allAtk=[...atkP.residents],allDef=[...defP.residents];
    allAtk.filter(r=>r.damage>=residentGrit(g,atkP,r,false)).forEach(r=>defeatResident(g,atkP,r,false));
    allDef.filter(r=>r.damage>=residentGrit(g,defP,r,true)).forEach(r=>defeatResident(g,defP,r,true));
    g.combat.resolved=true;
    if(!g.winner)g.phase='Attack';
    log(g,'Combat resolved.');
    return {ok:true};
  }

  function repairBuilding(g,p,b,amount,source='Repair'){
    if(!b||b.damage<=0)return false;
    const was=isRuined(b);b.damage=Math.max(0,b.damage-amount);log(g,`${source} repairs ${b.name} by ${amount}.`);
    if(was&&!isRuined(b)){b.rehousingDueOwnTurn=null;clearExposureIfRecovered(p);log(g,`${b.name} is active again.`);}
    return true;
  }

  function defeatResident(g,p,r,wasBlocking){
    if(!p.residents.some(x=>x.uid===r.uid))return;
    const home=p.village.find(b=>b.uid===r.musterUid);
    if(r.flags?.onDefeatProvision)gain(p,{provision:r.flags.onDefeatProvision},g,`${r.name} — For the Pantry`);
    if(home&&!isRuined(home)&&home.id==='deep_rabbit_warren'&&(r.traits||[]).includes('Rabbit')&&home.rabbitReturnTurn!==g.turnNo){
      home.rabbitReturnTurn=g.turnNo;
      if(r.tool){p.compost.push(r.tool);r.tool=null;}
      p.residents=p.residents.filter(x=>x.uid!==r.uid);
      const card={...r};['musterUid','damage','tired','attacking','blocking','tool','shield','tempPrevent','recruitedTurn'].forEach(k=>delete card[k]);p.hand.push(card);
      log(g,`${r.name} returns to hand from Deep Rabbit Warren.`);return;
    }
    if(r.tool){p.compost.push(r.tool);r.tool=null;}
    p.residents=p.residents.filter(x=>x.uid!==r.uid);
    const card={...r};['musterUid','damage','tired','attacking','blocking','tool','shield','tempPrevent','recruitedTurn'].forEach(k=>delete card[k]);p.compost.push(card);
    log(g,`${r.name} is defeated and goes to Compost.`);
  }

  function rehousingOptions(g,p,r,fromUid){return activeMusters(p).filter(m=>m.uid!==fromUid&&musterMatches(r,m)&&housingUsed(p,m.uid)<m.housing);}
  function resolveRehousing(g,p){
    const due=p.village.filter(b=>b.muster&&isRuined(b)&&b.rehousingDueOwnTurn!==null&&b.rehousingDueOwnTurn<=p.turnsTaken);
    for(const ruined of due){
      const residents=[...p.residents.filter(r=>r.musterUid===ruined.uid)];
      for(const r of residents){
        const opts=rehousingOptions(g,p,r,ruined.uid);
        if(opts.length){r.musterUid=opts[0].uid;log(g,`${r.name} is rehoused in ${opts[0].name}.`);}
        else{
          if(r.tool){p.compost.push(r.tool);r.tool=null;}
          p.residents=p.residents.filter(x=>x.uid!==r.uid);
          const card={...r};['musterUid','damage','tired','attacking','blocking','tool','shield','tempPrevent','recruitedTurn'].forEach(k=>delete card[k]);p.hand.push(card);
          log(g,`${r.name} cannot be rehoused and returns to ${p.name}'s hand.`);
        }
      }
      ruined.rehousingDueOwnTurn=null;
    }
  }

  function discard(g,pi,cardUid){
    const p=g.players[pi];if(pi!==g.active||g.phase!=='Discard')return {ok:false,reason:'Not discarding now.'};
    const i=p.hand.findIndex(c=>c.uid===cardUid);if(i<0)return {ok:false,reason:'Card not in hand.'};
    const [card]=p.hand.splice(i,1);p.compost.push(card);log(g,`${p.name} discards ${card.name}.`);
    if(p.hand.length<=7)finishTurn(g);
    return {ok:true};
  }

  function requestEndTurn(g,pi){
    if(pi!==g.active||g.winner)return {ok:false,reason:'It is not your turn.'};
    if(g.phase==='Block'&&!g.combat.resolved)return {ok:false,reason:'Resolve combat before ending the turn.'};
    const p=g.players[pi];
    if(p.hand.length>7){g.phase='Discard';return {ok:true,discard:true};}
    finishTurn(g);return {ok:true};
  }

  function clearTurnEffects(g){
    g.players.forEach(p=>{
      p.hearthseedTempPrevent=0;
      p.village.forEach(b=>b.tempPrevent=0);
      p.residents.forEach(r=>r.tempPrevent=0);
    });
  }

  function finishTurn(g){
    if(g.winner)return;
    const p=g.players[g.active];
    clearTurnEffects(g);
    p.residents.forEach(r=>{r.damage=0;r.attacking=false;r.blocking=false;});
    p.turnsTaken++;
    resolveRehousing(g,p);
    if(activeBuildings(p).length===0){
      if(p.exposurePendingOwnTurn===null)p.exposurePendingOwnTurn=p.turnsTaken+1;
      if(p.turnsTaken>=p.exposurePendingOwnTurn){p.exposed=true;log(g,`${p.name}'s Hearthseed is now Exposed.`);}
    }else clearExposureIfRecovered(p);
    log(g,`${p.name}: Rest — surviving Critter damage cleared and turn ends.`);

    g.turnNo++;
    const r=currentRound(g);
    g.active=((g.turnNo-1)%2===0)?roundLeader(g,r):1-roundLeader(g,r);
    beginDawn(g);
  }

  function legalBuilds(g,pi){const p=g.players[pi],f=decks[p.factionKey];return f.blueprints.filter(bp=>!buildReason(g,pi,bp));}
  function legalMusters(g,pi,card){const p=g.players[pi];return activeMusters(p).filter(m=>!recruitReason(g,pi,card,m));}
  function legalAttackTargets(g,pi,r){
    if(!canAttack(g,pi,r))return [];
    const o=g.players[1-pi],out=[{kind:'hearthseed',label:'Hearthseed'}];
    activeBuildings(o).forEach(b=>out.push({kind:'building',uid:b.uid,label:b.name}));
    return out;
  }
  function status(g){return {round:currentRound(g),phase:g.phase,active:g.active,winner:g.winner};}

  window.HNH_ENGINE={
    CORE,PHASES,createGame,startGame,mulligan,draw,chooseHarvest,build,buildReason,recruit,recruitReason,playTool,useWorkshop,
    declareAttack,cancelAttack,commitAttacks,assignBlock,canBlock,playReaction,resolveCombat,requestEndTurn,discard,
    prosperity,activeBuildings,activeMusters,controlledMusters,housingUsed,residentReady,residentGrit,residentMight,canAttack,
    canAfford,paymentPlan,legalBuilds,legalMusters,legalAttackTargets,currentRound,status,isRuined,
    _test:{beginDawn,beginHarvest,beginBuild,finishTurn,applyBuildingDamage,applyHearthDamage,markNoBuildingsResponse,resolveRehousing}
  };
})();


/* ===== v0.6.2 sequencing/rules patches ===== */
(() => {
  const E=window.HNH_ENGINE;
  if(!E)return;

  const baseCanAttack=E.canAttack;
  E.canAttack=(g,pi,r)=>!g.combat.committed&&baseCanAttack(g,pi,r);

  const baseDeclareAttack=E.declareAttack;
  E.declareAttack=(g,pi,residentUid,target)=>{
    if(g.combat.committed)return {ok:false,reason:'All attackers were already committed for this Attack step.'};
    return baseDeclareAttack(g,pi,residentUid,target);
  };

  const baseEndTurn=E.requestEndTurn;
  E.requestEndTurn=(g,pi)=>{
    if(g.phase==='Attack'&&g.combat.attacks.length&&!g.combat.committed)return {ok:false,reason:'Commit and resolve your declared attack before ending the turn.'};
    return baseEndTurn(g,pi);
  };

  E.playSupply=(g,pi,cardUid,spendResource,gainResource)=>{
    const p=g.players[pi],idx=p.hand.findIndex(c=>c.uid===cardUid),card=p.hand[idx];
    if(pi!==g.active||g.phase!=='Build')return {ok:false,reason:'This Supply is used at its printed Build timing.'};
    if(!card||card.id!=='burrow_stores')return {ok:false,reason:'That Supply is not automated yet.'};
    if(p.buildActionsTaken!==0)return {ok:false,reason:'Burrow Stores is only available at the start of your Build.'};
    const canBuild=E.legalBuilds(g,pi).length>0;
    const canRecruit=p.hand.filter(c=>c.type==='Critter').some(c=>E.legalMusters(g,pi,c).length>0);
    if(canBuild||canRecruit)return {ok:false,reason:'Burrow Stores requires that you cannot build a Building or recruit a Critter.'};
    if(!['acorn','sap','root','pebble','provision'].includes(spendResource)||(p.resources[spendResource]||0)<1)return {ok:false,reason:'Choose one resource you actually have.'};
    if(!['root','pebble'].includes(gainResource))return {ok:false,reason:'Burrow Stores may gain Root or Pebble.'};
    p.resources[spendResource]--;p.resources[gainResource]=(p.resources[gainResource]||0)+1;
    p.hand.splice(idx,1);p.compost.push(card);p.buildActionsTaken++;
    g.log.unshift(`${p.name} used Burrow Stores: exchanged 1 ${spendResource} for 1 ${gainResource}.`);
    return {ok:true};
  };
})();


/* ===== v0.6.2 card ability completion ===== */
(() => {
  const E=window.HNH_ENGINE;
  if(!E)return;
  let choiceSeq=1;
  const clone=v=>JSON.parse(JSON.stringify(v));
  const active=p=>E.activeBuildings(p);
  const round=g=>E.currentRound(g);
  const log=(g,msg)=>{g.log.unshift(msg);g.log=g.log.slice(0,160);};
  const cardValue=c=>c?.type==='Critter'?(c.might||0)*2+(c.grit||0)+(c.advanced?2:0):c?.subtype==='Tool'?4:c?.subtype==='Reaction'?3:1;
  const isBird=c=>(c?.traits||[]).some(t=>['Bird','Wren','Jay','Crow','Sparrow'].includes(t));
  const isMouseOrBird=c=>(c?.traits||[]).includes('Mouse')||isBird(c);
  const isMoleOrCrow=c=>(c?.traits||[]).some(t=>t==='Mole'||t==='Crow');
  const isSquirrel=c=>(c?.traits||[]).includes('Squirrel');
  const ensure=g=>{if(!Array.isArray(g.pendingAbilityChoices))g.pendingAbilityChoices=[];return g.pendingAbilityChoices;};
  const firstChoice=g=>ensure(g)[0]||null;
  const playerIsAI=(g,pi)=>g.mode==='ai'&&g.aiIndex===pi;
  const triggerKey=(prefix,uid)=>`${prefix}:${uid}`;

  function stripResident(card){
    const out={...card};
    ['musterUid','damage','tired','attacking','blocking','tool','shield','tempPrevent','recruitedTurn','_hhStockedSquirrel'].forEach(k=>delete out[k]);
    return out;
  }

  function refreshHomeMarkers(g){
    g.players.forEach(p=>p.residents.forEach(r=>{
      const home=p.village.find(b=>b.uid===r.musterUid);
      r._hhStockedSquirrel=!!(home&&!E.isRuined(home)&&home.id==='stocked_squirrel_armory'&&isSquirrel(r));
    }));
  }

  function repairDirect(g,pi,buildingUid,amount,source){
    const p=g.players[pi],b=p.village.find(x=>x.uid===Number(buildingUid));
    if(!b||b.damage<=0)return false;
    const wasRuined=E.isRuined(b),before=b.damage;
    b.damage=Math.max(0,b.damage-amount);
    const repaired=before-b.damage;
    if(!repaired)return false;
    log(g,`${source} repairs ${b.name} by ${repaired}.`);
    if(wasRuined&&!E.isRuined(b)){
      b.rehousingDueOwnTurn=null;
      p.exposed=false;p.exposurePendingOwnTurn=null;
      log(g,`${b.name} is active again.`);
    }
    triggerHearthroot(g,pi);
    return true;
  }

  function triggerHearthroot(g,pi){
    const p=g.players[pi];
    const tree=active(p).find(b=>b.id==='hearthroot_tree');
    if(!tree)return;
    const key=triggerKey('hearthroot',tree.uid);
    if(p.triggerRoundUsed[key]===round(g))return;
    p.triggerRoundUsed[key]=round(g);
    E.draw(g,p,1,true);
    if(!p.hand.length){log(g,'Hearthroot Tree has no card to put on the bottom of the Field Deck.');return;}
    queueChoice(g,{
      kind:'hearthroot-bottom',playerIndex:pi,title:'Hearthroot Tree',prompt:'A Building was repaired. Choose one card from your hand to put on the bottom of your Field Deck.',
      options:p.hand.map(c=>({id:String(c.uid),label:c.name,card:clone(c)}))
    });
  }

  function queueChoice(g,choice){
    const q=ensure(g);
    const item={id:`ability-${choiceSeq++}`,...choice};
    q.push(item);
    if(playerIsAI(g,item.playerIndex))autoResolve(g);
    return item;
  }

  function bestAIChoice(choice){
    if(choice.optional&&choice.options.some(o=>o.id==='skip')){
      const real=choice.options.filter(o=>o.id!=='skip');
      if(!real.length)return 'skip';
    }
    const opts=choice.options.filter(o=>o.id!=='skip');
    if(!opts.length)return choice.optional?'skip':null;
    if(['repair-building','shield-building'].includes(choice.kind))return opts.slice().sort((a,b)=>(b.meta?.damage||0)-(a.meta?.damage||0))[0].id;
    if(['crow-salvage','deep-wormturn','clover-save'].includes(choice.kind))return opts.slice().sort((a,b)=>cardValue(b.card)-cardValue(a.card))[0].id;
    if(choice.kind==='hearthroot-bottom')return opts.slice().sort((a,b)=>cardValue(a.card)-cardValue(b.card))[0].id;
    if(choice.kind==='lantern-scry')return opts.slice().sort((a,b)=>cardValue(b.card)-cardValue(a.card))[0].id;
    return opts[0].id;
  }

  function autoResolve(g){
    let safety=20;
    while(safety--){
      const choice=firstChoice(g);
      if(!choice||!playerIsAI(g,choice.playerIndex))break;
      const selection=bestAIChoice(choice);
      if(selection===null)break;
      resolveAbilityChoice(g,choice.playerIndex,choice.id,selection);
    }
  }

  function resolveAbilityChoice(g,pi,choiceId,selection){
    const q=ensure(g),choice=q[0];
    if(!choice||choice.id!==choiceId)return {ok:false,reason:'That card choice is no longer pending.'};
    if(choice.playerIndex!==pi)return {ok:false,reason:'That choice belongs to the other player.'};
    const p=g.players[pi];
    const opt=choice.options.find(o=>o.id===String(selection));
    if(!opt)return {ok:false,reason:'Choose one of the shown options.'};
    q.shift();

    if(choice.kind==='shield-building'){
      const b=p.village.find(x=>String(x.uid)===opt.id&&!E.isRuined(x));
      if(b){b.shield=true;log(g,`${choice.sourceName} gives Shield to ${b.name}.`);}
    }else if(choice.kind==='repair-building'){
      repairDirect(g,pi,opt.id,choice.amount||1,choice.sourceName||'Patchwork');
    }else if(choice.kind==='lantern-scry'){
      const shown=choice.cards.map(x=>x.uid),topUid=Number(opt.id);
      const current=p.fieldDeck.filter(c=>shown.includes(c.uid));
      const top=current.find(c=>c.uid===topUid),bottom=current.find(c=>c.uid!==topUid);
      p.fieldDeck=p.fieldDeck.filter(c=>!shown.includes(c.uid));
      if(top)p.fieldDeck.unshift(top);
      if(bottom)p.fieldDeck.push(bottom);
      log(g,`${choice.sourceName}: one looked-at card stays on top and one goes to the bottom of the Field Deck.`);
    }else if(choice.kind==='crow-salvage'){
      const i=p.compost.findIndex(c=>String(c.uid)===opt.id&&(c.type==='Critter'||c.subtype==='Tool'));
      if(i>=0){const [c]=p.compost.splice(i,1);p.hand.push(c);log(g,`${choice.sourceName} returns ${c.name} from Compost to hand.`);}
    }else if(choice.kind==='deep-wormturn'){
      if(opt.id!=='skip'){
        const i=p.compost.findIndex(c=>String(c.uid)===opt.id&&c.type==='Critter');
        if(i>=0){const [c]=p.compost.splice(i,1);p.fieldDeck.unshift(c);log(g,`${choice.sourceName} puts ${c.name} from Compost on top of the Field Deck.`);}
      }else log(g,`${choice.sourceName}: no Critter was moved from Compost.`);
    }else if(choice.kind==='hearthroot-bottom'){
      const i=p.hand.findIndex(c=>String(c.uid)===opt.id);
      if(i>=0){const [c]=p.hand.splice(i,1);p.fieldDeck.push(c);log(g,`Hearthroot Tree puts ${c.name} on the bottom of the Field Deck.`);}
    }else if(choice.kind==='clover-save'){
      if(opt.id!=='skip')restoreSavedResident(g,pi,choice.snapshots.find(s=>String(s.uid)===opt.id),choice.sourceUid);
      else log(g,'Great Clover Hearthring is held for a later defeat this round.');
    }
    autoResolve(g);
    return {ok:true};
  }

  function restoreSavedResident(g,pi,snap,sourceUid){
    if(!snap)return;
    const p=g.players[pi],source=p.village.find(b=>b.uid===sourceUid);
    if(!source||E.isRuined(source))return;
    p.compost=p.compost.filter(c=>c.uid!==snap.uid&&(!snap.tool||c.uid!==snap.tool.uid));
    const restored=clone(snap);
    const grit=E.residentGrit(g,p,restored,false);
    restored.damage=Math.max(0,grit-1);restored.tired=true;restored.attacking=false;restored.blocking=false;restored.shield=false;restored.tempPrevent=0;
    p.residents.push(restored);
    p.triggerRoundUsed[triggerKey('clover-save',source.uid)]=round(g);
    log(g,`Great Clover Hearthring saves ${restored.name} in its Muster, tired at ❤️−1 damage.`);
    refreshHomeMarkers(g);
  }

  const baseCreateGame=E.createGame;
  E.createGame=(opts={})=>{
    const g=baseCreateGame(opts);ensure(g);window.HNH_CURRENT_GAME=g;refreshHomeMarkers(g);return g;
  };

  const baseBuild=E.build;
  E.build=(g,pi,id)=>{
    const result=baseBuild(g,pi,id);
    if(result?.ok)refreshHomeMarkers(g);
    return result;
  };

  const baseCanAttack=E.canAttack;
  E.canAttack=(g,pi,r)=>{
    if(baseCanAttack(g,pi,r))return true;
    return !g.combat.committed&&pi===g.active&&(g.phase==='Build'||g.phase==='Attack')&&E.residentReady(g,g.players[pi],r)&&r.recruitedTurn===g.turnNo&&!!r.tool?.flags?.eager&&!g.players[pi].attackedThisStep.includes(r.uid);
  };

  const baseDeclareAttack=E.declareAttack;
  E.declareAttack=(g,pi,residentUid,target)=>{
    const r=g.players[pi]?.residents.find(x=>x.uid===residentUid);
    if(r?.recruitedTurn===g.turnNo&&r.tool?.flags?.eager){
      const saved=r.recruitedTurn;r.recruitedTurn=-1;
      const result=baseDeclareAttack(g,pi,residentUid,target);r.recruitedTurn=saved;return result;
    }
    return baseDeclareAttack(g,pi,residentUid,target);
  };

  const baseResidentMight=E.residentMight;
  E.residentMight=(r,target)=>baseResidentMight(r,target)+(r?._hhStockedSquirrel?1:0);

  const baseCanBlock=E.canBlock;
  E.canBlock=(g,pi,r,attack)=>{
    if(!r?._hhStockedSquirrel)return baseCanBlock(g,pi,r,attack);
    r.might++;try{return baseCanBlock(g,pi,r,attack);}finally{r.might--;}
  };

  const baseRecruit=E.recruit;
  E.recruit=(g,pi,cardUid,musterUid,options={})=>{
    const p=g.players[pi],card=p.hand.find(c=>c.uid===cardUid),m=p.village.find(b=>b.uid===musterUid);
    if(!card)return baseRecruit(g,pi,cardUid,musterUid,options);
    const originalFlags=clone(card.flags||{}),shield=!!card.flags?.shieldBuildingOnRecruit,repair=card.flags?.repairOnRecruit||0;
    if(shield)card.flags.shieldBuildingOnRecruit=false;
    if(repair)card.flags.repairOnRecruit=0;
    const result=baseRecruit(g,pi,cardUid,musterUid,options);
    card.flags=originalFlags;
    if(!result?.ok)return result;
    result.resident.flags=originalFlags;
    refreshHomeMarkers(g);

    if(shield){
      const opts=active(p).filter(b=>!b.shield).map(b=>({id:String(b.uid),label:b.name,meta:{damage:b.damage}}));
      if(opts.length)queueChoice(g,{kind:'shield-building',playerIndex:pi,title:card.name,prompt:'Choose a Building you control to Shield.',sourceName:card.name,options:opts});
    }
    if(repair){
      const opts=p.village.filter(b=>b.damage>0).map(b=>({id:String(b.uid),label:`${b.name} · ${b.damage} damage`,meta:{damage:b.damage}}));
      if(opts.length)queueChoice(g,{kind:'repair-building',playerIndex:pi,title:card.name,prompt:`Choose a Building to repair ${repair} damage.`,sourceName:card.name,amount:repair,options:opts});
    }

    if(m?.id==='lantern_scout_nook'&&isMouseOrBird(card)){
      const key=triggerKey('lantern-scry',m.uid);
      if(p.triggerRoundUsed[key]!==round(g)){
        p.triggerRoundUsed[key]=round(g);
        const cards=p.fieldDeck.slice(0,2);
        if(cards.length===2)queueChoice(g,{kind:'lantern-scry',playerIndex:pi,title:'Lantern Scout Nook',prompt:'Look at the top 2 cards. Choose the card that stays on top; the other goes to the bottom.',sourceName:'Lantern Scout Nook',cards:cards.map(c=>({uid:c.uid})),options:cards.map(c=>({id:String(c.uid),label:c.name,card:clone(c)}))});
        else if(cards.length===1)log(g,'Lantern Scout Nook looks at the only card remaining in the Field Deck.');
        else log(g,'Lantern Scout Nook finds the Field Deck empty.');
      }
    }

    if(card.flags?.salvageOnRecruit){
      const opts=p.compost.filter(c=>c.type==='Critter'||c.subtype==='Tool').map(c=>({id:String(c.uid),label:c.name,card:clone(c)}));
      if(opts.length)queueChoice(g,{kind:'crow-salvage',playerIndex:pi,title:card.name,prompt:'Choose a Tool or Critter from Compost to return to your hand.',sourceName:card.name,options:opts});
    }

    if(m?.id==='deep_wormturn_den'&&isMoleOrCrow(card)){
      const key=triggerKey('deep-wormturn',m.uid);
      if(p.triggerRoundUsed[key]!==round(g)){
        p.triggerRoundUsed[key]=round(g);
        const critters=p.compost.filter(c=>c.type==='Critter');
        const opts=[...critters.map(c=>({id:String(c.uid),label:c.name,card:clone(c)})),{id:'skip',label:'Do not move a Critter'}];
        queueChoice(g,{kind:'deep-wormturn',playerIndex:pi,title:'Deep Wormturn Den',prompt:'You may put one Critter from Compost on top of your Field Deck.',sourceName:'Deep Wormturn Den',optional:true,options:opts});
      }
    }
    return result;
  };

  const baseUseWorkshop=E.useWorkshop;
  E.useWorkshop=(g,pi,buildingUid,targetUid,resource)=>{
    const p=g.players[pi],before=p.village.find(b=>b.uid===targetUid)?.damage;
    const result=baseUseWorkshop(g,pi,buildingUid,targetUid,resource);
    const after=p.village.find(b=>b.uid===targetUid)?.damage;
    if(result?.ok&&Number.isFinite(before)&&after<before)triggerHearthroot(g,pi);
    return result;
  };

  const baseResolveCombat=E.resolveCombat;
  E.resolveCombat=(g)=>{
    const snapshots=g.players.map(p=>p.residents.map(r=>clone(r)));
    const buildingBefore=g.players.map(p=>new Map(p.village.map(b=>[b.uid,b.damage])));
    const attackerPi=g.active,atkP=g.players[attackerPi];

    const boosted=[];
    atkP.residents.forEach(r=>{if(r._hhStockedSquirrel){r.might++;boosted.push(r);}});
    const result=baseResolveCombat(g);
    boosted.forEach(r=>r.might--);
    if(!result?.ok)return result;

    refreshHomeMarkers(g);

    // Shared Satchel: each attached Satchel can trigger once per round when its carrier damages a Building.
    for(const a of g.combat.attacks){
      if(a.target.kind!=='building')continue;
      const snap=snapshots[attackerPi].find(r=>r.uid===a.attackerUid);
      const tool=snap?.tool;if(tool?.id!=='shared_satchel')continue;
      const defenderPi=1-attackerPi,b=g.players[defenderPi].village.find(x=>x.uid===a.target.uid);
      const before=buildingBefore[defenderPi].get(a.target.uid);
      if(!b||!Number.isFinite(before)||b.damage<=before)continue;
      const key=triggerKey('shared-satchel',tool.uid);
      if(atkP.triggerRoundUsed[key]===round(g))continue;
      atkP.triggerRoundUsed[key]=round(g);atkP.resources.provision=(atkP.resources.provision||0)+1;
      log(g,`${snap.name}'s Shared Satchel gains 1 Provision after damaging a Building.`);
    }

    for(let pi=0;pi<g.players.length;pi++){
      const p=g.players[pi],before=snapshots[pi];
      let missing=before.filter(s=>!p.residents.some(r=>r.uid===s.uid));

      // Hearthbound replaces Nell's first blocking defeat each game with a return to hand.
      for(const snap of missing.filter(s=>s.id==='nell_rootwatch'&&s.blocking&&s.flags?.hearthbound)){
        if(p._nellHearthboundUsed)continue;
        const ci=p.compost.findIndex(c=>c.uid===snap.uid);if(ci<0)continue;
        const [card]=p.compost.splice(ci,1);p.hand.push(card);p._nellHearthboundUsed=true;
        log(g,`${snap.name}'s Hearthbound returns it to hand instead of Compost.`);
      }
      missing=before.filter(s=>!p.residents.some(r=>r.uid===s.uid)&&!p.hand.some(c=>c.uid===s.uid));

      // Tunnel Beetle Patchwork triggers for every defeat and requires a Building choice.
      for(const snap of missing.filter(s=>s.flags?.repairOnDefeat)){
        const opts=p.village.filter(b=>b.damage>0).map(b=>({id:String(b.uid),label:`${b.name} · ${b.damage} damage`,meta:{damage:b.damage}}));
        if(opts.length)queueChoice(g,{kind:'repair-building',playerIndex:pi,title:snap.name,prompt:'Patchwork — choose a Building to repair 1 damage.',sourceName:snap.name,amount:snap.flags.repairOnDefeat,options:opts});
      }

      // Great Clover Hearthring can save one defeated Critter each round. Let the player choose or hold it.
      const clover=active(p).find(b=>b.id==='great_clover_hearthring');
      const ckey=clover&&triggerKey('clover-save',clover.uid);
      const eligible=clover&&p.triggerRoundUsed[ckey]!==round(g)?missing.filter(s=>p.compost.some(c=>c.uid===s.uid)):[];
      if(clover&&eligible.length){
        queueChoice(g,{kind:'clover-save',playerIndex:pi,title:'Great Clover Hearthring',prompt:'Choose a defeated Critter to save in its Muster, tired at ❤️−1 damage, or hold the once-per-round save.',sourceUid:clover.uid,optional:true,snapshots:eligible.map(clone),options:[...eligible.map(s=>({id:String(s.uid),label:s.name,card:stripResident(s)})),{id:'skip',label:'Hold the save for later this round'}]});
      }
    }
    autoResolve(g);
    return result;
  };

  const baseRequestEndTurn=E.requestEndTurn;
  E.requestEndTurn=(g,pi)=>{
    if(firstChoice(g))return {ok:false,reason:'Resolve the pending card ability first.'};
    const result=baseRequestEndTurn(g,pi);refreshHomeMarkers(g);return result;
  };

  E.pendingAbilityChoice=g=>firstChoice(g);
  E.resolveAbilityChoice=resolveAbilityChoice;
  E.autoResolveAbilityChoices=autoResolve;
  E.refreshAbilityMarkers=refreshHomeMarkers;
})();


/* ===== v0.6.2 card ability edge fixes ===== */
(() => {
  const E=window.HNH_ENGINE;
  if(!E)return;

  const baseResolveCombat=E.resolveCombat;
  E.resolveCombat=g=>{
    const defender=g?.players?.[1-g.active];
    const boosted=(defender?.residents||[]).filter(r=>r._hhStockedSquirrel);
    boosted.forEach(r=>r.might++);
    let result;
    try{result=baseResolveCombat(g);}finally{boosted.forEach(r=>r.might--);}
    // Great Clover Hearthring's printed save is mandatory when it triggers.
    // If multiple Critters were defeated simultaneously, choose which one;
    // do not offer a "hold" option that is not present on the card.
    (g.pendingAbilityChoices||[]).forEach(choice=>{
      if(choice.kind==='clover-save'){
        choice.optional=false;
        choice.options=choice.options.filter(o=>o.id!=='skip');
      }
    });
    return result;
  };

  // Deep Wormturn Den says "may". When Compost contains no Critter there is
  // nothing to decide, so consume the first-Mole/Crow trigger without opening
  // a pointless modal containing only "Do not move a Critter".
  const baseRecruit=E.recruit;
  E.recruit=(g,pi,cardUid,musterUid,options={})=>{
    const result=baseRecruit(g,pi,cardUid,musterUid,options);
    const q=g.pendingAbilityChoices||[];
    for(let i=q.length-1;i>=0;i--){
      const choice=q[i];
      if(choice.kind==='deep-wormturn'&&choice.options.length===1&&choice.options[0].id==='skip')q.splice(i,1);
    }
    return result;
  };
})();
