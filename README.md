# Hearth & Hollow — Client Beta v0.5.0

A zero-install, client-side prototype for **Hearth & Hollow rules v0.6.2**.

## Run it

1. Download or clone the repository.
2. Open `index.html` in a modern desktop browser.
3. Choose **Porchlight** or **Stonecap**.
4. The AI pilots the other starter village, or choose hot-seat two-player.

No server, Node.js, Steam, TTS, or Screentop account is required to play. Node.js is only needed for the optional smoke test.

## v0.5.0 — v0.6.2 rules migration

The client now follows the promoted v0.6.2 rules chassis:

- 45-card Field Decks: 33 Critters + 12 Supports.
- 12-card unshuffled, known Blueprint Deck.
- Founding Building starts separately; Village size is unlimited.
- Opening hand is 7, with an optional free partial mulligan.
- Fair four-result setup determines the round-1 opener and round-2 leader; initiative alternates by round from there.
- Six Muster Classes replace role-tag recruitment: **Scurry, Lantern, Bramble, Handwork, Gatewatch, Burrow**.
- Critter cards no longer have Housing values. Every Critter occupies exactly **1 Housing** in its Muster.
- **Advanced** Critters require an upgraded matching Muster. The current Advanced starters are Juniper Jay, Briarhart Siege Stag, and Clem Cedarhorn.
- **Provision** remains its own resource, but each Provision cost slot may instead be paid by one Acorn, Sap, Root, or Pebble.
- **Shield** prevents the entire next single damage instance to a Critter or Building, then is removed.
- Ruined Muster residents become inactive and must be rehoused at the end of their controller's next turn; unmatched residents return to hand.
- First Yield, Guard attack readiness, blocking without tiring, persistent Building damage, Rest cleanup, Prosperity, Exposed Hearthseed, Tool Access, Reaction Access, and Peaceful limits follow v0.6.2.
- Hearthkeepers are flavor/reference only in this rules version.

## Board/client features carried forward

- Fixed solo point of view: AI on top, player on bottom.
- Dedicated Field and Village zones.
- Drag Critters to matching Musters, Tools to Critters, Blueprints to the Village, and attack-ready Critters to enemy targets.
- Recruit-ready highlighting and Muster/home linking.
- Collapsible Blueprint drawer with full-card preview.
- AI economy, building, recruiting, attacking, and automatic blocking.
- Hot-seat mode.

## Current manual card-effect limitations

The v0.6.2 **system rules** above are wired into the client. A few timing-heavy individual card effects remain intentionally manual rather than guessed, including some Reactions, prevention triggers, Compost manipulation, and certain Muster/Tool bonuses. The UI labels those effects as `Manual`.

The client is still a local playtest prototype, not an authoritative networked multiplayer server.

## Smoke test

If Node.js is installed:

```bash
node smoke-test.js
```

The smoke test checks deck counts, Blueprint counts, Muster Class coverage, the 1-Housing data model, and the current Advanced roster.
