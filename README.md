# Hearth & Hollow — Client Beta v0.4.0

A zero-install, client-side prototype for **Hearth & Hollow v0.6.1 — Village Muster**.

## Run it

1. Unzip the folder.
2. Double-click `index.html`.
3. Choose **Porchlight** or **Stonecap**.
4. The AI automatically pilots the other starter village.

No server, Node.js, Steam, TTS, or Screentop account is required.

## New in v0.4.0 — Board Architecture

- **Dedicated Field + Village zones.** Critters now occupy a separate Field row. The Village contains Buildings only.
- **Mirrored battlefield.** Opponent Village → Opponent Field → Frost Trial → Your Field → Your Village, so combatants face each other while infrastructure sits behind them.
- **Muster links without card clutter.** Muster Buildings still show Housing and resident names, but full Critter cards live in the Field.
- **Home highlighting.** Hover a Field Critter to highlight its Muster; hover a Muster to highlight its residents.
- **Recruit-ready cue.** A Critter in your hand gets a subtle green glow and `✓ Recruitable` badge only when a compatible active Muster has Housing and you can pay the recruit cost.
- **Drag guidance remains.** While dragging a Critter, legal Musters highlight green, accepting-but-unavailable Musters amber, and incompatible Musters dim.
- **Collapsible Blueprint Deck.** The Blueprint menu can be folded away to give the battlefield more space.
- **Full Blueprint card preview.** Hover, focus, or click a Blueprint row to inspect a larger card-style view with its full cost, Durability, Prosperity, Housing, Accepts/Recruit text, and rules text.
- **Finite Blueprints remain enforced.** Each of the 12 starter Blueprints is single-use; used entries remain marked `USED`.

## Carried forward

- Fixed solo POV: AI stays on top, you stay on bottom.
- Choose Porchlight or Stonecap; the AI takes the other starter.
- Dawn and Harvest auto-resolve into Build.
- Harvest / First Yield resource gains display visual `+1` feedback.
- Newly recruited Critters may block immediately but cannot attack that turn unless they have Eager.
- Drag Critters to Musters, Tools to Critters, Blueprints to the Village, and attack-ready Critters to enemy targets.
- AI handles its own economy, building, recruiting, attacks, and automatic blocking; when it attacks, you choose blockers.
- Hot-seat mode remains available.

## AI / rules limitations

The AI is still a playtest bot rather than a competitive opponent. Timing-heavy Reactions and several manual/incomplete v0.6.1 card effects are intentionally not guessed.
