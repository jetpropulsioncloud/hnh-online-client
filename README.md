# Hearth & Hollow — Online Client

A zero-install browser playtest client for **Hearth & Hollow rules v0.6.2**.

## Run it

Open `index.html` in a modern desktop browser and choose a starter village. No server or build step is required.

## Runtime architecture

The browser now loads only four project assets:

- `data.js` — complete v0.6.2 starter card/deck data.
- `engine.js` — rules engine, combat sequencing, and completed starter-card abilities.
- `client.js` — rendering, tabletop interactions, card inspection, deck movement, social links, ability-choice UI, and coordinated render notifications.
- `styles.css` — the complete tabletop presentation layer.

`index.html` is only the entry point. Regression tests live under `tests/` and are **not loaded by the browser**.

## Current rules checkpoint

- 45-card Field Decks and 12-card known Blueprint Decks.
- Founding Building starts separately; Village size is unlimited.
- Six Muster Classes: Scurry, Lantern, Bramble, Handwork, Gatewatch, Burrow.
- Every Critter occupies 1 Housing; Advanced Critters require an upgraded matching Muster.
- Provision is its own resource; a Provision cost may instead be paid 1-for-1 with Acorn, Sap, Root, or Pebble.
- Persistent Building damage, Ruined/rehousing rules, Shield, First Yield, Guard, Tool Access, Reaction Access, Peaceful limits, Exposed, and Dawn Prosperity victory follow v0.6.2.
- Starter card abilities, including Field Deck / Compost choice effects, are covered by regression tests.

## Tests

With Node.js installed:

```bash
node tests/smoke-test.js
node tests/rules-test.js
node tests/rules-patch-test.js
node tests/ability-completion-test.js
node tests/ability-edge-test.js
node tests/ui-coordinator-test.js
```

GitHub Actions runs the same gates on pull requests and pushes to `main`.


## Solo AI difficulty

Solo setup now explains each starter deck's play style and offers three AI profiles. Beginner is the default: it pauses longer between actions, takes fewer Build actions, and sends fewer attackers so first-time players can see the opponent's turn unfold. Standard restores a normal tempo, while Hard acts faster and uses the full action/attack caps.

Card-display wording is checked against the latest editable starter-card source while v0.6.2 rulebook rules remain authoritative when older card-layout text conflicts with the rules chassis.
