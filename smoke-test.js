'use strict';

const fs = require('fs');
global.window = {};
require('./data.js');

const { decks } = window.HNH_DATA;
const expectedClasses = {
  AS: ['Scurry', 'Lantern', 'Bramble'],
  RP: ['Handwork', 'Gatewatch', 'Burrow'],
};
const expectedAdvanced = [
  'Briarhart Siege Stag',
  'Clem Cedarhorn, Workshop Porter',
  'Juniper Jay, Hazelnut Runner',
].sort();

function assert(ok, message) {
  if (!ok) throw new Error(message);
}

for (const [key, deck] of Object.entries(decks)) {
  const fieldTotal = deck.field.reduce((sum, card) => sum + card.count, 0);
  const critters = deck.field.filter(card => card.type === 'Critter');
  const critterTotal = critters.reduce((sum, card) => sum + card.count, 0);
  const supportTotal = deck.field.filter(card => card.type === 'Support').reduce((sum, card) => sum + card.count, 0);

  assert(fieldTotal === 45, `${key}: Field Deck must contain 45 cards, found ${fieldTotal}`);
  assert(critterTotal === 33, `${key}: must contain 33 Critters, found ${critterTotal}`);
  assert(supportTotal === 12, `${key}: must contain 12 Supports, found ${supportTotal}`);
  assert(deck.blueprints.length === 12, `${key}: Blueprint Deck must contain 12 cards`);
  assert(critters.every(card => !Object.prototype.hasOwnProperty.call(card, 'housing')), `${key}: Critters must not carry a Housing stat`);
  assert(critters.every(card => Array.isArray(card.musterClasses) && card.musterClasses.length > 0), `${key}: every Critter needs at least one Muster Class`);

  const musterClasses = [...new Set(deck.blueprints.filter(card => card.muster).map(card => card.musterClass))].sort();
  assert(JSON.stringify(musterClasses) === JSON.stringify([...expectedClasses[key]].sort()), `${key}: Muster Class coverage mismatch`);
  assert(deck.blueprints.filter(card => card.muster).every(card => Number.isInteger(card.housing) && card.housing > 0), `${key}: each Muster needs positive Housing`);
}

const advanced = Object.values(decks)
  .flatMap(deck => deck.field)
  .filter(card => card.type === 'Critter' && card.advanced)
  .map(card => card.name)
  .sort();
assert(JSON.stringify(advanced) === JSON.stringify(expectedAdvanced), `Advanced roster mismatch: ${advanced.join(', ')}`);

console.log('Hearth & Hollow v0.6.2 data smoke: PASS');
console.log('✓ 45-card Field Decks (33 Critters + 12 Supports)');
console.log('✓ 12-card Blueprint Decks');
console.log('✓ six Muster Classes represented');
console.log('✓ Critters have no Housing stat and occupy 1 slot in engine logic');
console.log('✓ Advanced roster: Juniper, Briarhart, Clem');

// Static runtime wiring smoke. The legacy app.js client was retired; index.html
// must now point at the current rules-first client and coordinated UI layer.
const html = fs.readFileSync('index.html', 'utf8');
assert(html.includes('client-v062.js'), 'current client-v062.js is not loaded');
assert(html.includes('engine-v062.js'), 'v0.6.2 engine is not loaded');
assert(html.includes('ui-coordinator.js'), 'UI coordinator is not loaded');
assert(!html.includes('src="app.js"'), 'legacy app.js must not be loaded');
assert(html.includes('Tabletop Client v0.7.3'), 'client presentation version mismatch');
console.log('✓ current client/runtime wiring smoke');
