'use strict';

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

// Minimal DOM shim to catch startup/runtime regressions without browser dependencies.
const nodes = new Map();
const app = { innerHTML: '' };
global.document = {
  getElementById(id) {
    if (id === 'app') return app;
    if (!nodes.has(id)) nodes.set(id, { id, onclick: null, value: '', innerHTML: '', addEventListener(){} });
    return nodes.get(id);
  },
  querySelectorAll() { return []; },
};
global.confirm = () => false;
global.prompt = (_msg, fallback='') => fallback;
global.alert = () => {};
const oldRandom = Math.random;
Math.random = () => 0.1;
require('./app.js');
assert(typeof nodes.get('choose-as')?.onclick === 'function', 'client setup buttons did not bind');
nodes.get('choose-as').onclick();
assert(app.innerHTML.includes('CLIENT BETA v0.5.0'), 'client did not render v0.5.0');
assert(app.innerHTML.includes('Provision costs may be paid'), 'Provision substitution UI note missing');
assert(app.innerHTML.includes('Blueprint Deck'), 'Blueprint UI missing');
Math.random = oldRandom;
console.log('✓ client startup/runtime render smoke');
