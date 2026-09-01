window.HNH_DATA = (() => {
  const C = (id,name,musterClasses,might,grit,count,text='',flags={},traits=[]) => ({
    id,name,type:'Critter',musterClasses,traits,might,grit,count,text,flags,advanced:!!flags.advanced
  });
  const S = (id,name,subtype,count,cost,text='',flags={}) => ({id,name,type:'Support',subtype,count,cost,text,flags});
  const B = (id,name,subtype,cost,durability,prosperity,extra={}) => ({id,name,type:'Building',subtype,cost,durability,prosperity,...extra});

  const decks = {
    AS: {
      key:'AS', name:'Porchlight — Acorn / Sap', short:'Acorn / Sap', hearthkeeper:'Hazel Underleaf',
      resources:['acorn','sap','provision'],
      founding: B('porchlight_acorn_pantry','Porchlight Acorn Pantry','Founding Production',{},5,1,{
        production:true, harvestChoice:['acorn','sap'], text:'Harvest: gain 🥜 or 💦.'
      }),
      field:[
        C('squirrel_raider','Squirrel Raider',['Scurry'],1,2,3,'While attacking a Building, this Critter gets +1 💪.',{buildingMightBonus:1},['Squirrel','Raider']),
        C('meadow_mouse_scout','Meadow Mouse Scout',['Lantern'],1,3,3,'When this is recruited, Shield a Building you control.',{shieldBuildingOnRecruit:true},['Mouse','Scout']),
        C('ant_rush_team','Ant Rush Team',['Bramble'],3,3,3,'The ants have discovered the jam. For the next several minutes, very little else will matter.',{},['Ant','Swarm']),
        C('chipmunk_saboteur','Chipmunk Saboteur',['Bramble'],2,2,2,'A Production Building damaged by this Critter produces nothing next Harvest.',{sabotageProduction:true},['Chipmunk','Saboteur']),
        C('bramble_pouncer','Bramble Pouncer',['Scurry'],2,2,1,'Pounce — While attacking a damaged Building, 1 💪 Critters can’t block this Critter.',{pounce:true},['Pouncer','Raider']),
        C('pippa_bramblehop','Pippa Bramblehop, Hearthside Pouncer',['Scurry'],2,2,1,'Pounce. Hearthside Rally — If your opponent had more ready Critters when your Build began, this enters with Shield.',{pounce:true,hearthsideRally:true},['Pouncer','Raider']),
        C('luma_wickwing','Luma Wickwing, Lantern Scout',['Scurry','Lantern'],1,2,4,'Luma checks the Hearthseed before she leaves each morning. Then she checks it once more, just to be sure.',{},['Firefly','Scout','Raider']),
        C('pipkin_acorncap','Pipkin Acorncap, Pantry Courier',['Scurry','Lantern'],1,2,3,'Pipkin was sent for one loaf. He returned with half of one and a very reasonable explanation.',{},['Weevil','Raider','Scout']),
        C('dapple_dewskip','Dapple Dewskip, Puddle Runner',['Scurry','Lantern'],2,1,3,'Dapple knows a shortcut through the puddles! It takes a little longer.',{},['Froglet','Scout','Raider']),
        C('bramblebee_picnic_crew','Bramblebee Picnic Crew',['Bramble','Lantern'],3,2,3,'The bees remembered the honey. The napkins, it seems, were somebody else’s responsibility.',{},['Bee','Swarm','Scout']),
        C('tilly_thimbletail','Tilly Thimbletail, Hedge Wren',['Scurry','Lantern'],2,2,2,'When Tilly begins singing from the hedge, everyone knows supper cannot be far away.',{},['Wren','Scout','Raider']),
        C('marnie_mossfoot','Marnie Mossfoot, Rootcellar Sneak',['Bramble','Lantern'],2,3,2,'Somewhere beneath the village are six winter carrots. Marnie knows exactly where.',{},['Vole','Saboteur','Scout']),
        C('juniper_jay','Juniper Jay, Hazelnut Runner',['Scurry','Lantern'],5,2,1,'Juniper was supposed to be delivering hazelnuts. By lunchtime, she had also delivered most of the village gossip.',{advanced:true},['Jay','Raider','Scout']),
        C('briarhart_siege_stag','Briarhart Siege Stag',['Scurry','Lantern','Bramble'],6,2,2,'On the Move! — Cannot Block. Breach — Cannot be blocked while attacking a Building.',{advanced:true,cannotBlock:true,unblockableVsBuilding:true},['Stag','Siege']),
        S('shared_satchel','Shared Satchel','Tool',3,{acorn:1,provision:1},'Attached Critter gets +1 ❤️. First Building damaged each round: +📦.',{gritBonus:1,manual:'First Building damaged each round'}),
        S('bramble_climbing_kit','Bramble Climbing Kit','Tool',3,{sap:1,provision:1},'The attached Critter gains Eager.',{eager:true}),
        S('hide_in_ferns','Hide in the Ferns','Reaction',3,{sap:1,provision:1},'Slip Past — When blocked, remove that blocker from combat. This attack is unblocked.',{manual:'Reaction timing'}),
        S('sap_bandage','Sap Bandage','Reaction',3,{sap:1,provision:1},'Prevent the next 2 damage to one Critter or Building this turn.',{manual:'Damage prevention'})
      ],
      blueprints:[
        B('acorn_cache','Acorn Cache','Production',{},3,1,{production:true,harvest:{acorn:1},text:'Harvest: gain 🥜.'}),
        B('dewdrop_sap_tap','Dewdrop Sap Tap','Production',{},3,1,{production:true,harvest:{sap:1},text:'Harvest: gain 💦.'}),
        B('foragers_pantry','Forager’s Pantry','Production',{},3,1,{production:true,harvest:{provision:1},firstYield:{provision:2},text:'Harvest: gain 📦. First Yield: gain 📦📦.'}),
        B('squirrel_armory','Squirrel Armory','Muster',{acorn:1},4,2,{muster:true,musterClass:'Scurry',housing:3,recruitCost:{acorn:1},text:'Muster — Scurry. Recruit: pay 🥜.'}),
        B('porchlight_scout_nook','Porchlight Scout Nook','Muster',{sap:1},4,2,{muster:true,musterClass:'Lantern',housing:3,recruitCost:{sap:1},text:'Muster — Lantern. Recruit: pay 💦.'}),
        B('brambleworks_hideout','Brambleworks Hideout','Muster',{acorn:1},4,2,{muster:true,musterClass:'Bramble',housing:3,recruitCost:{acorn:1},text:'Muster — Bramble. Recruit: pay 🥜.'}),
        B('resin_hedge','Resin Hedge','Defense',{sap:1,provision:1},5,2,{reactionAccess:true,text:'Reaction Access. First time each round another Building you control would take damage, prevent 1.',manual:'Flat prevention remains manual in this client pass'}),
        B('acorn_tool_shed','Acorn Tool Shed','Utility',{acorn:1,provision:1},4,2,{toolAccess:true,text:'Tool Access — equip no more than one Tool each turn.'}),
        B('stocked_squirrel_armory','Stocked Squirrel Armory','Muster Upgrade',{acorn:1,sap:1},5,3,{upgradeFrom:'squirrel_armory',muster:true,musterClass:'Scurry',housing:5,recruitCost:{acorn:1},upgradeGain:{provision:1},text:'Muster — Scurry. Recruit: pay 🥜. When you upgrade to this, gain 📦.'}),
        B('lantern_scout_nook','Lantern Scout Nook','Muster Upgrade',{sap:1,provision:1},5,3,{upgradeFrom:'porchlight_scout_nook',muster:true,musterClass:'Lantern',housing:5,recruitCost:{sap:1},text:'Muster — Lantern. First Mouse or Bird recruited here each round lets you look at the top 2 Field Deck cards.',manual:'Species trigger remains manual'}),
        B('hidden_brambleworks','Hidden Brambleworks','Muster Upgrade',{acorn:1,sap:1},5,3,{upgradeFrom:'brambleworks_hideout',muster:true,musterClass:'Bramble',housing:5,recruitCost:{acorn:1},text:'Muster — Bramble. Chipmunks housed here get +1 ❤️.',manual:'Chipmunk bonus remains manual'}),
        B('great_clover_hearthring','Great Clover Hearthring','Peaceful Landmark',{sap:2,provision:2},6,5,{peaceful:true,reactionAccess:true,text:'Peaceful. Reaction Access. Once each round, save a defeated Critter in its Muster, tired at ❤️−1 damage.',manual:'Save trigger remains manual'})
      ]
    },
    RP: {
      key:'RP', name:'Stonecap — Root / Pebble', short:'Root / Pebble', hearthkeeper:'Mosswick Grubroot',
      resources:['root','pebble','provision'],
      founding: B('stonecap_root_cellar','Stonecap Root Cellar','Founding Production',{},4,1,{production:true,harvestChoice:['root','pebble'],text:'Harvest: gain 🫚 or 🪨. First attack damage to another Building each round is reduced by 1.',manual:'Founding prevention remains manual'}),
      field:[
        C('rootling_mole','Rootling Mole',['Handwork','Burrow'],2,2,3,'For the Pantry — When defeated, gain 📦.',{onDefeatProvision:1},['Mole','Builder','Burrower']),
        C('nell_rootwatch','Nell Rootwatch, Hearth Warden',['Handwork','Burrow'],2,3,1,'For the Pantry. Hearthbound — The first time each game this is defeated while blocking, return it to your hand instead.',{onDefeatProvision:1,manual:'Hearthbound'},['Mole','Builder','Burrower']),
        C('tunnel_beetle','Tunnel Beetle',['Handwork'],1,2,3,'Patchwork — When defeated, repair 1 damage from one Building you control.',{manual:'On-defeat repair'},['Beetle','Builder']),
        C('pebbleback_ant_guard','Pebbleback Ant Guard',['Gatewatch'],1,3,4,'Guard — Attacking does not cause this Critter to get tired.',{guard:true},['Ant','Guard']),
        C('rabbit_helper','Rabbit Helper',['Handwork'],1,2,4,'Patchwork. When recruited, repair 1 damage from one Building you control.',{repairOnRecruit:1},['Rabbit','Helper']),
        C('pillbug_builder','Pillbug Builder',['Handwork'],1,3,3,'When recruited, repair 2 damage from one Building you control.',{repairOnRecruit:2},['Pillbug','Builder']),
        C('crow_salvager','Crow Salvager',['Burrow'],2,1,1,'When recruited, return one Tool or one Critter from your Compost to your hand.',{manual:'Compost return'},['Crow','Salvager']),
        C('stone_toad_bruiser','Stone Toad Bruiser',['Gatewatch'],5,4,3,'Guard. This cannot attack the Hearthseed unless you have at least 5 active ✨. Crushing Blow 2.',{guard:true,hearthseedProsperityGate:5,crushingBlow:2},['Toad','Guard']),
        C('merrin_mossback','Merrin Mossback, Newt Mason',['Handwork'],2,3,3,'Merrin says a crooked stone will bother you eventually, so you may as well fix it now.',{},['Newt','Builder','Helper']),
        C('barley_burrowwright','Barley Burrowwright, Badger Builder',['Handwork'],3,4,3,'Nobody remembers when Barley started leaving fresh bread at the burrow doors. Barley has never mentioned it.',{},['Badger','Builder']),
        C('odo_ramhorn','Odo Ramhorn, Gate Snail',['Gatewatch'],4,5,1,'Guard — This stays ready after it attacks. It still attacks only once each Attack step.',{guard:true},['Snail','Guard']),
        C('clem_cedarhorn','Clem Cedarhorn, Workshop Porter',['Handwork','Gatewatch'],5,5,2,'Guard — This stays ready after it attacks. It still attacks only once each Attack step.',{guard:true,advanced:true},['Beetle','Guard','Builder']),
        C('flintcap_siege_badger','Flintcap Siege Badger',['Handwork','Gatewatch','Burrow'],5,2,2,'On the Move! — Cannot Block. Trample 3.',{cannotBlock:true,trample:3},['Badger','Siege']),
        S('pebble_plating','Pebble Plating','Tool',3,{pebble:1,provision:1},'Attached Critter gets +2 ❤️.',{gritBonus:2}),
        S('burrow_stores','Burrow Stores','Supply',3,{},'At the start of your Build, if you can’t build a Building or recruit a Critter, discard this: exchange 1 resource for 🫚 or 🪨.',{manual:'Conditional exchange'}),
        S('brace_the_burrow','Brace the Burrow','Reaction',3,{pebble:1,provision:1},'Prevent the next 3 damage to one Building or Hearthseed this turn.',{manual:'Damage prevention'}),
        S('rootsnare','Rootsnare','Reaction',3,{root:1,provision:1},'When an enemy Critter attacks, it deals no damage this attack.',{manual:'Reaction timing'})
      ],
      blueprints:[
        B('root_hollow','Root Hollow','Production',{},4,1,{production:true,harvest:{root:1},text:'Harvest: gain 🫚.'}),
        B('pebble_yard','Pebble Yard','Production',{},5,1,{production:true,harvest:{pebble:1},text:'Harvest: gain 🪨.'}),
        B('mushroom_stockpile','Mushroom Stockpile','Production',{},5,1,{production:true,harvest:{provision:1},firstYield:{provision:2},text:'Harvest: gain 📦. First Yield: gain 📦📦.'}),
        B('rabbit_warren','Rabbit Warren','Muster',{root:1,provision:1},4,2,{muster:true,musterClass:'Handwork',housing:3,recruitCost:{root:1},text:'Muster — Handwork. Recruit: pay 🫚.'}),
        B('snail_gate','Snail Gate','Muster',{pebble:1,provision:1},5,2,{muster:true,musterClass:'Gatewatch',housing:3,recruitCost:{pebble:1,provision:1},text:'Muster — Gatewatch. Recruit: pay 🪨 + 📦.'}),
        B('wormturn_den','Wormturn Den','Muster',{root:1,pebble:1},4,2,{muster:true,musterClass:'Burrow',housing:3,recruitCost:{root:1,provision:1},text:'Muster — Burrow. Recruit: pay 🫚 + 📦.'}),
        B('stonecap_bracewall','Stonecap Bracewall','Defense',{pebble:1,provision:1},5,2,{reactionAccess:true,text:'Reaction Access. First time each round another Building you control would take attack damage, prevent 1.',manual:'Flat prevention remains manual in this client pass'}),
        B('burrow_workshop','Burrow Workshop','Utility',{root:1,pebble:1},5,2,{toolAccess:true,text:'Tool Access. Build, once per turn: pay 1 resource to repair 1 damage from one Building.',repairAbility:true}),
        B('deep_rabbit_warren','Deep Rabbit Warren','Muster Upgrade',{root:1,pebble:1,provision:1},5,3,{upgradeFrom:'rabbit_warren',muster:true,musterClass:'Handwork',housing:3,recruitCost:{root:1},text:'Muster — Handwork. Rabbits housed here get +1 ❤️. First Rabbit defeated here each turn returns to your hand.',manual:'Rabbit bonuses remain manual'}),
        B('fortified_snail_gate','Fortified Snail Gate','Muster Upgrade',{pebble:1,provision:1},6,3,{upgradeFrom:'snail_gate',muster:true,musterClass:'Gatewatch',housing:3,recruitCost:{pebble:1,provision:1},text:'Muster — Gatewatch. Guards housed here get +1 ❤️ while blocking.',manual:'Blocking bonus remains manual'}),
        B('deep_wormturn_den','Deep Wormturn Den','Muster Upgrade',{root:2,provision:1},5,3,{upgradeFrom:'wormturn_den',muster:true,musterClass:'Burrow',housing:3,recruitCost:{root:1,provision:1},text:'Muster — Burrow. First Mole or Crow recruited here each round may put one Critter from Compost on top of your Field Deck.',manual:'Compost topdeck'}),
        B('hearthroot_tree','Hearthroot Tree','Peaceful Landmark',{root:2,provision:2},8,7,{peaceful:true,reactionAccess:true,text:'Peaceful. Reaction Access. Once each round, when one of your Buildings is repaired, draw a card, then put one card from your hand on the bottom of your Field Deck.',manual:'Repair draw/filter remains manual'})
      ]
    }
  };

  return {decks};
})();
