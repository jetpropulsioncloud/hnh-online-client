window.HNH_DATA = (() => {
  const C = (id,name,tags,housing,might,grit,count,text='',flags={}) => ({id,name,type:'Critter',tags,housing,might,grit,count,text,flags});
  const S = (id,name,subtype,count,cost,text='',flags={}) => ({id,name,type:'Support',subtype,count,cost,text,flags});
  const B = (id,name,subtype,cost,durability,prosperity,extra={}) => ({id,name,type:'Building',subtype,cost,durability,prosperity,...extra});

  const decks = {
    AS: {
      key:'AS', name:'Porchlight — Acorn / Sap', short:'Acorn / Sap', hearthkeeper:'Hazel Underleaf',
      resources:['acorn','sap','provision'],
      founding: B('porchlight_acorn_pantry','Porchlight Acorn Pantry','Founding Production',{},5,1,{production:true, harvestChoice:['acorn','sap'], text:'Harvest: gain 🥜 or 💦.'}),
      field:[
        C('squirrel_raider','Squirrel Raider',['Squirrel','Raider'],1,1,2,3,'While attacking a Building, this Critter gets +1 💪.',{buildingMightBonus:1}),
        C('meadow_mouse_scout','Meadow Mouse Scout',['Mouse','Scout'],1,1,3,3,'When recruited, look at the top 2 cards of your Field Deck. Put one on top and the other on the bottom.',{scryOnRecruit:2}),
        C('ant_rush_team','Ant Rush Team',['Ant','Swarm'],2,3,3,3,'The ants have discovered the jam. For the next several minutes, very little else will matter.'),
        C('chipmunk_saboteur','Chipmunk Saboteur',['Chipmunk','Saboteur'],1,2,2,2,'A Production Building damaged by this Critter produces nothing next Harvest.',{sabotageProduction:true}),
        C('bramble_pouncer','Bramble Pouncer',['Pouncer','Raider'],1,2,2,1,'Pounce — While attacking a damaged Building, 1 💪 Critters can’t block this Critter.',{pounce:true}),
        C('pippa_bramblehop','Pippa Bramblehop, Hearthside Pouncer',['Pouncer','Raider'],1,2,2,1,'Pounce. Hearthside Rally — may enter with a shield when behind on ready Critters.',{pounce:true,manual:'Hearthside Rally'}),
        C('luma_wickwing','Luma Wickwing, Lantern Scout',['Firefly','Scout','Raider'],1,1,2,4,'Luma checks the Hearthseed before she leaves each morning. Then she checks it once more, just to be sure.'),
        C('pipkin_acorncap','Pipkin Acorncap, Pantry Courier',['Weevil','Raider','Scout'],1,1,2,3,'Pipkin was sent for one loaf. He returned with half of one and a very reasonable explanation.'),
        C('dapple_dewskip','Dapple Dewskip, Puddle Runner',['Froglet','Scout','Raider'],1,2,1,3,'Dapple knows a shortcut through the puddles! It takes a little longer.'),
        C('bramblebee_picnic_crew','Bramblebee Picnic Crew',['Bee','Swarm','Scout'],2,3,2,3,'The bees remembered the honey. The napkins, it seems, were somebody else’s responsibility.'),
        C('tilly_thimbletail','Tilly Thimbletail, Hedge Wren',['Wren','Scout','Raider'],2,2,2,2,'When Tilly begins singing from the hedge, everyone knows supper cannot be far away.'),
        C('marnie_mossfoot','Marnie Mossfoot, Rootcellar Sneak',['Vole','Saboteur','Scout'],2,2,3,2,'Somewhere beneath the village are six winter carrots. Marnie knows exactly where.'),
        C('juniper_jay','Juniper Jay, Hazelnut Runner',['Jay','Raider','Scout'],4,5,2,1,'Juniper was supposed to be delivering hazelnuts. By lunchtime, she had also delivered most of the village gossip.'),
        C('briarhart_siege_stag','Briarhart Siege Stag',['Stag','Siege'],2,6,2,2,'On the Move! — Cannot Block. Breach — Cannot be blocked while attacking a Building.',{cannotBlock:true,unblockableVsBuilding:true}),
        S('shared_satchel','Shared Satchel','Tool',3,{acorn:1,provision:1},'Attached Critter gets +1 ❤️. First Building damaged each round: +📦.',{gritBonus:1,manual:'First Building damaged each round'}),
        S('bramble_climbing_kit','Bramble Climbing Kit','Tool',3,{sap:1,provision:1},'The attached Critter gains Eager.',{eager:true}),
        S('hide_in_ferns','Hide in the Ferns','Reaction',3,{sap:1,provision:1},'Slip Past — When blocked, remove that blocker from combat. This attack is unblocked.',{manual:'Reaction timing'}),
        S('sap_bandage','Sap Bandage','Reaction',3,{sap:1,provision:1},'Prevent the next 2 damage to one Critter or Building this turn.',{manual:'Damage prevention'})
      ],
      blueprints:[
        B('acorn_cache','Acorn Cache','Production',{},3,1,{production:true,harvest:{acorn:1},text:'Harvest: gain 🥜.'}),
        B('dewdrop_sap_tap','Dewdrop Sap Tap','Production',{},3,1,{production:true,harvest:{sap:1},text:'Harvest: gain 💦.'}),
        B('foragers_pantry','Forager’s Pantry','Production',{},3,1,{production:true,harvest:{provision:1},firstYield:{provision:2},text:'Harvest: gain 📦. First Yield: gain 📦📦.'}),
        B('squirrel_armory','Squirrel Armory','Muster',{acorn:1},4,2,{muster:true,housing:3,accepts:['Raider'],recruitCost:{acorn:1},text:'Accepts Raider. Recruit: pay 🥜.'}),
        B('porchlight_scout_nook','Porchlight Scout Nook','Muster',{sap:1},4,2,{muster:true,housing:3,accepts:['Scout'],recruitCost:{sap:1},text:'Accepts Scout. Recruit: pay 💦.'}),
        B('brambleworks_hideout','Brambleworks Hideout','Muster',{acorn:1},4,2,{muster:true,housing:3,accepts:['Saboteur','Swarm'],recruitCost:{acorn:1},text:'Accepts Saboteur, Swarm. Recruit: pay 🥜.'}),
        B('resin_hedge','Resin Hedge','Defense',{sap:1,provision:1},5,2,{reactionAccess:true,text:'Reaction Access. First time each round another Building would take damage, prevent 1.',manual:'Prevention is manual in beta'}),
        B('acorn_tool_shed','Acorn Tool Shed','Utility',{acorn:1,provision:1},4,2,{toolAccess:true,text:'Tool Access — equip no more than one Tool each turn.'}),
        B('stocked_squirrel_armory','Stocked Squirrel Armory','Muster Upgrade',{acorn:1,sap:1},5,3,{upgradeFrom:'squirrel_armory',muster:true,housing:5,accepts:['Raider','Siege'],recruitCost:{acorn:1},text:'Squirrels housed here get +1 💪.',manual:'Squirrel bonus not yet automated'}),
        B('lantern_scout_nook','Lantern Scout Nook','Muster Upgrade',{sap:1,provision:1},5,3,{upgradeFrom:'porchlight_scout_nook',muster:true,housing:5,accepts:['Scout','Siege'],recruitCost:{sap:1},text:'First Mouse or Bird recruited here each round: look at top 2.',manual:'Species trigger partly manual'}),
        B('hidden_brambleworks','Hidden Brambleworks','Muster Upgrade',{acorn:1,sap:1},5,3,{upgradeFrom:'brambleworks_hideout',muster:true,housing:5,accepts:['Saboteur','Swarm','Siege'],recruitCost:{acorn:1},text:'Chipmunks housed here get +1 ❤️.',manual:'Chipmunk bonus not yet automated'}),
        B('great_clover_hearthring','Great Clover Hearthring','Peaceful Landmark',{sap:2,provision:2},6,5,{peaceful:true,reactionAccess:true,text:'Peaceful. Reaction Access. Once each round, save a defeated Critter in its Muster, tired at ❤️−1 damage.',manual:'Save trigger is manual'})
      ]
    },
    RP: {
      key:'RP', name:'Stonecap — Root / Pebble', short:'Root / Pebble', hearthkeeper:'Mosswick Grubroot',
      resources:['root','pebble','provision'],
      founding: B('stonecap_root_cellar','Stonecap Root Cellar','Founding Production',{},4,1,{production:true,harvestChoice:['root','pebble'],text:'Harvest: gain 🫚 or 🪨. First attack damage to another Building each round is reduced by 1.',manual:'Founding prevention is manual'}),
      field:[
        C('rootling_mole','Rootling Mole',['Mole','Burrower','Builder'],2,2,2,3,'For the Pantry — When defeated, gain 📦.',{onDefeatProvision:1}),
        C('nell_rootwatch','Nell Rootwatch, Hearth Warden',['Mole','Burrower','Builder'],2,2,3,1,'For the Pantry. Hearthbound — first time each game defeated while blocking, return it to your hand instead.',{onDefeatProvision:1,manual:'Hearthbound'}),
        C('tunnel_beetle','Tunnel Beetle',['Beetle','Builder'],2,1,2,3,'Patchwork — When defeated, repair 1 damage from one Building you control.',{manual:'On-defeat repair'}),
        C('pebbleback_ant_guard','Pebbleback Ant Guard',['Ant','Guard'],1,1,3,4,'Guard — Attacking does not cause this Critter to get tired.',{guard:true}),
        C('rabbit_helper','Rabbit Helper',['Rabbit','Helper'],1,1,2,4,'Patchwork. When recruited, repair 1 damage from one Building you control.',{repairOnRecruit:1}),
        C('pillbug_builder','Pillbug Builder',['Pillbug','Builder'],2,1,3,3,'When recruited, repair 2 damage from one Building you control.',{repairOnRecruit:2}),
        C('crow_salvager','Crow Salvager',['Crow','Salvager'],1,2,1,1,'When recruited, return one Tool or one 🏠1 Critter from your Compost to your hand.',{manual:'Compost return'}),
        C('stone_toad_bruiser','Stone Toad Bruiser',['Toad','Guard'],2,5,4,3,'Guard. Cannot attack the Hearthseed unless you have at least 5 active ✨. Crushing Blow 2.',{guard:true,hearthseedProsperityGate:5,crushingBlow:2}),
        C('merrin_mossback','Merrin Mossback, Newt Mason',['Newt','Builder','Helper'],1,2,3,3,'Merrin says a crooked stone will bother you eventually, so you may as well fix it now.'),
        C('barley_burrowwright','Barley Burrowwright, Badger Builder',['Badger','Builder'],2,3,4,3,'Nobody remembers when Barley started leaving fresh bread at the burrow doors. Barley has never mentioned it.'),
        C('odo_ramhorn','Odo Ramhorn, Gate Snail',['Snail','Guard'],3,4,5,1,'Guard — This stays ready after it attacks. It still attacks only once each Attack step.',{guard:true}),
        C('clem_cedarhorn','Clem Cedarhorn, Workshop Porter',['Beetle','Guard','Builder'],4,5,5,2,'Guard — This stays ready after it attacks. It still attacks only once each Attack step.',{guard:true}),
        C('flintcap_siege_badger','Flintcap Siege Badger',['Badger','Siege'],3,5,2,2,'On the Move! — Cannot Block. Trample 3.',{cannotBlock:true,trample:3}),
        S('pebble_plating','Pebble Plating','Tool',3,{pebble:1,provision:1},'Attached Critter gets +2 ❤️.',{gritBonus:2}),
        S('burrow_stores','Burrow Stores','Supply',3,{},'At the start of your Build, if you can’t build a Building or recruit a Critter, discard this: exchange 1 resource for 🫚 or 🪨.',{manual:'Conditional exchange'}),
        S('brace_the_burrow','Brace the Burrow','Reaction',3,{pebble:1,provision:1},'Prevent the next 3 damage to one Building or Hearthseed this turn.',{manual:'Damage prevention'}),
        S('rootsnare','Rootsnare','Reaction',3,{root:1,provision:1},'When an enemy Critter attacks, it deals no damage this attack.',{manual:'Reaction timing'})
      ],
      blueprints:[
        B('root_hollow','Root Hollow','Production',{},4,1,{production:true,harvest:{root:1},text:'Harvest: gain 🫚.'}),
        B('pebble_yard','Pebble Yard','Production',{},5,1,{production:true,harvest:{pebble:1},text:'Harvest: gain 🪨.'}),
        B('mushroom_stockpile','Mushroom Stockpile','Production',{},5,1,{production:true,harvest:{provision:1},firstYield:{provision:2},text:'Harvest: gain 📦. First Yield: gain 📦📦.'}),
        B('rabbit_warren','Rabbit Warren','Muster',{root:1,provision:1},4,2,{muster:true,housing:3,accepts:['Helper','Builder'],recruitCost:{root:1},text:'Accepts Helper, Builder. Recruit: pay 🫚.'}),
        B('snail_gate','Snail Gate','Muster',{pebble:1,provision:1},5,2,{muster:true,housing:3,accepts:['Guard','Siege'],recruitCost:{pebble:1,provision:1},text:'Accepts Guard, Siege. Recruit: pay 🪨 + 📦.'}),
        B('wormturn_den','Wormturn Den','Muster',{root:1,pebble:1},4,2,{muster:true,housing:3,accepts:['Burrower','Salvager'],recruitCost:{root:1,provision:1},text:'Accepts Burrower, Salvager. Recruit: pay 🫚 + 📦.'}),
        B('stonecap_bracewall','Stonecap Bracewall','Defense',{pebble:1,provision:1},5,2,{reactionAccess:true,text:'Reaction Access. First time each round another Building takes attack damage, prevent 1.',manual:'Prevention is manual in beta'}),
        B('burrow_workshop','Burrow Workshop','Utility',{root:1,pebble:1},5,2,{toolAccess:true,text:'Tool Access. Build, once per turn: pay 1 resource to repair 1 damage from one Building.',repairAbility:true}),
        B('deep_rabbit_warren','Deep Rabbit Warren','Muster Upgrade',{root:1,pebble:1,provision:1},5,3,{upgradeFrom:'rabbit_warren',muster:true,housing:3,accepts:['Helper','Builder','Siege'],recruitCost:{root:1},text:'Rabbits housed here get +1 ❤️. First Rabbit defeated here each turn returns to hand.',manual:'Rabbit bonuses not yet automated'}),
        B('fortified_snail_gate','Fortified Snail Gate','Muster Upgrade',{pebble:1,provision:1},6,3,{upgradeFrom:'snail_gate',muster:true,housing:3,accepts:['Guard','Siege'],recruitCost:{pebble:1,provision:1},text:'Guards housed here get +1 ❤️ while blocking.',manual:'Blocking bonus not yet automated'}),
        B('deep_wormturn_den','Deep Wormturn Den','Muster Upgrade',{root:2,provision:1},5,3,{upgradeFrom:'wormturn_den',muster:true,housing:3,accepts:['Burrower','Salvager','Siege'],recruitCost:{root:1,provision:1},text:'First Mole or Crow recruited here each round may put one 🏠1 Critter from Compost on top of Field Deck.',manual:'Compost topdeck'}),
        B('hearthroot_tree','Hearthroot Tree','Peaceful Landmark',{root:2,provision:2},8,7,{peaceful:true,reactionAccess:true,text:'Peaceful. Reaction Access. Once each round, when one of your Buildings is repaired, draw a card, then put …',manual:'Printed v0.6.1 text is truncated in the supplied card sheet; effect intentionally not completed here.'})
      ]
    }
  };

  return {decks};
})();
