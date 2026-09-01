(() => {
  const decks=window.HNH_DATA?.decks;
  if(!decks)return;
  const byId=(key,id)=>{
    const d=decks[key];
    return d?.field?.find(c=>c.id===id)||d?.blueprints?.find(c=>c.id===id)||(d?.founding?.id===id?d.founding:null);
  };
  const clean=(card,extra={})=>{
    if(!card)return;
    if(card.flags)delete card.flags.manual;
    delete card.manual;
    Object.assign(card,extra);
  };

  clean(byId('AS','shared_satchel'));
  Object.assign(byId('AS','shared_satchel').flags,{sharedSatchel:true});
  clean(byId('AS','bramble_climbing_kit'));
  clean(byId('AS','hide_in_ferns'));
  clean(byId('AS','sap_bandage'));
  clean(byId('AS','resin_hedge'));
  clean(byId('AS','hidden_brambleworks'));

  const stocked=byId('AS','stocked_squirrel_armory');
  clean(stocked,{text:'Muster — Scurry. Recruit: pay 🥜. Squirrels housed here get +1 💪.',squirrelMightBonus:1});
  delete stocked.upgradeGain;

  clean(byId('AS','lantern_scout_nook'),{
    text:'Muster — Lantern. First Mouse or Bird recruited here each round lets you look at the top 2 Field Deck cards. Put one on top and one on the bottom.',
    lanternScry:true
  });
  clean(byId('AS','great_clover_hearthring'),{
    subtype:'Defense',
    text:'Peaceful. Reaction Access. Once each round, save a defeated Critter in its Muster, tired at ❤️−1 damage.',
    cloverSave:true
  });

  clean(byId('RP','stonecap_root_cellar'));
  clean(byId('RP','nell_rootwatch'));
  Object.assign(byId('RP','nell_rootwatch').flags,{hearthbound:true});
  clean(byId('RP','tunnel_beetle'));
  Object.assign(byId('RP','tunnel_beetle').flags,{repairOnDefeat:1});
  clean(byId('RP','crow_salvager'));
  Object.assign(byId('RP','crow_salvager').flags,{salvageOnRecruit:true});
  clean(byId('RP','burrow_stores'));
  clean(byId('RP','brace_the_burrow'));
  clean(byId('RP','rootsnare'));
  clean(byId('RP','stonecap_bracewall'));
  clean(byId('RP','deep_rabbit_warren'));
  clean(byId('RP','fortified_snail_gate'));
  clean(byId('RP','deep_wormturn_den'),{
    text:'Muster — Burrow. The first Mole or Crow recruited here each round may put one Critter from Compost on top of your Field Deck.',
    compostTopdeckOnRecruit:true
  });
  clean(byId('RP','hearthroot_tree'),{
    subtype:'Utility',
    text:'Peaceful. Reaction Access. Once each round, when one of your Buildings is repaired, draw a card, then put one card from your hand on the bottom of your Field Deck.',
    repairFilter:true
  });
})();
