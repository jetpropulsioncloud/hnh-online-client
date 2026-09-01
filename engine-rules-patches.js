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
