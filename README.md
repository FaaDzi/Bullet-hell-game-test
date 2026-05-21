# ARCHITECS_ — Game Design Reference

A bullet-hell shoot-em-up with roguelike module pickups between stages. Inspired by Touhou, JSAB, and Calamity mod aesthetics.

---

## Development Setup

**Prerequisites:** Node.js

1. Install dependencies: `npm install`
2. Set `GEMINI_API_KEY` in `.env.local`
3. Run: `npm run dev`

---

## Controls

| Action | Keys |
|---|---|
| Move | WASD / Arrow Keys |
| Focus (slow + precise) | Hold Shift |
| Special / Dash | Space |
| Switch fire mode | Alt / CapsLock |

---

## Ships

### VOTIVE_ORB (Circle)

A precision vessel built around sustained fire. The sigil-ring body has an orbiting particle that spins faster as you move.

**Movement**
- Normal speed: 4.5 px/frame — near-instant acceleration/deceleration (0.9)
- Focus speed: 2.0 px/frame
- Visual: cyan/teal scheme, dashed outer ring, orbiting particle, orb ghost trails

**Fire Modes**
- **PRIMARY** — Twin parallel stream: two bullets side-by-side, 10 dmg each, 100ms fire rate
- **ALTERNATE** — Concentrated single shot: 1.2× speed, smaller radius, 25 dmg, 120ms fire rate

**Special — CIRCLE BOMB**
- Clears all enemy bullets on screen
- Deals 500 damage to all bosses (forces phase advance if lethal)
- Instantly kills all regular enemies; XP awarded for each
- Costs 50 special meter

**Spell Bonus** (survive a boss SPECIAL phase without being hit): special meter fills to 100

---

### PULSE_NODE (Square)

A high-aggression brawler. Square body with a counter-rotating inner ring. Core mechanic is a directional dash with i-frames.

**Movement**
- Normal speed: 5.0 px/frame — fully instant acceleration/deceleration (1.0), fastest ship
- Focus speed: 2.1 px/frame
- Visual: electric blue on near-black fill, corner glow dots, cube rotates with speed, ghost cube trails during dash

**Fire Modes**
- **PRIMARY** — Chunky forward pulse: large bullet, 20 dmg, 150ms fire rate
- **ALTERNATE** — Narrow fast pulse: thin bullet at 1.5× speed, 15 dmg, 80ms fire rate

**Dash (Space — cooldown-based)**
- 0.16s active, 1.4s cooldown
- Speed: 18 px/frame in held input direction (defaults to up if no input)
- Full i-frames for entire dash duration

**Special — SHOCK PULSE (powered dash)**
- When dash triggers with special meter ≥ 50, departure also fires a shockwave
- Clears enemy bullets within a 480×480 square area
- Deals 350 damage to enemies in range
- Costs 50 special meter

**Spell Bonus:** special meter fills to 100

---

### VOID_SPIRE (Triangle)

An evasive high-risk vessel. The triangle dynamically rotates to face movement direction. Gameplay rewards staying inside bullet patterns to charge the Void Convert special via grazes.

**Movement**
- Normal speed: 4.7 px/frame — gradual acceleration (0.7), slow deceleration (0.5). Has noticeable inertia.
- Focus speed: 1.9 px/frame
- Visual: deep purple, rotates dynamically toward movement, purple ghost trails

**Fire Modes**
- **PRIMARY** — 3-way spread: three bullets fanning ±2px lateral, 12 dmg each, 130ms fire rate
- **ALTERNATE** — Tri-lance (tight): three close bullets at 1.3× speed, 18 dmg each, 150ms fire rate

**Special — VOID CONVERT**
- Absorbs all enemy bullets within radius 380 — each becomes a player projectile (40 dmg, speed 16) aimed at the nearest enemy
- Deals 200 void damage directly to all enemies in absorb radius
- Visual: WotG-style 3 staggered expanding dashed rings with chromatic aberration offset, radial void flash, dark purple screen pulse, screen shake
- Costs 50 special meter

**Spell Bonus:** Restores 40 HP + 15 integrity (the only ship that recovers HP from spell bonuses)

**VOID Stack** *(proposed)*
- Each graze within a 2-second window builds one VOID stack, up to 5 stacks
- Each stack gives +8% bullet damage (×1.40 at 5 stacks)
- Stacks decay individually — the window resets per graze, not per stack
- Staying deep inside bullet patterns keeps stacks maxed; backing off to safety bleeds power
- This is the mechanic that earns the ship's name: VOID_SPIRE players are actively rewarded for threading the needle instead of playing around patterns

---

## Graze System

Every enemy bullet that passes through the outer graze zone without touching the hitbox counts as a graze.

- **Hitbox radius:** 4px
- **Graze zone:** between radius 4 (hitbox edge) and radius 15 (outer threshold)
- Each new bullet entering the zone for the first time grants **+3 XP** and **+2 special meter**
- A streak counter increments per graze and displays as `GRAZE ×N` in the bottom-left, fading after 1.8s of no new grazes
- A yellow ring flash animates outward from the hitbox on each graze
- Graze is suppressed during active dash i-frames and immediately after taking damage (post-hit flash window)

VOID_SPIRE additionally builds VOID stacks from grazes (see Ship section above).

---

## Enemies

### STRIKER
Basic pursuit enemy. Descends, hovers, fires, exits.
- Phase 0: drifts down with a slight random angle, soft wall bounce
- Phase 1: hovers with slow random horizontal drift, fires aimed single shots
- Phase 2: exits downward at 2× speed
- HP: 30 × difficulty | Score: 100 | Fire rate: 2000ms ÷ difficulty

### VOLT
Side-sweeper. Crosses the screen sinusoidally.
- Enters from either side with Y oscillation (sine wave)
- Fires a 3-way spread aimed at the player
- Despawns after crossing to the opposite side
- HP: 20 × difficulty | Score: 150 | Fire rate: 1500ms ÷ difficulty

### BASTION
Heavy anchor enemy. High HP, fires radial rings.
- Phase 0: descends from top with wide sinusoidal X drift
- Phase 1: hovers with gentle oscillation, fires rotating 6-bullet radial rings
- Phase 2: exits downward
- HP: 80 × difficulty | Score: 250 | Fire rate: 2500ms ÷ difficulty

---

## Formation Spawns

During normal stages, 45% of waves may spawn a formation instead of individual enemies (requires 4+ enemies remaining to spawn and fewer than 10 on screen).

| Formation | Enemies | Description |
|---|---|---|
| **SNAKE** | 6 STRIKERs | Sweep from one side in a chain, each oscillating with a staggered phase — creates a flowing snake curve across the screen |
| **V_DIVE** | 5 STRIKERs | Classic Galaga-style V formation diving from the top at 1.5× speed |
| **PINCER** | 2–4 VOLTs | Two pairs converge simultaneously from both sides on fixed Y rows |
| **GRID_WEAVE** | 3×3 STRIKERs | Land in a 3×3 grid, then each column orbits 120° out of phase (pinwheel illusion), then exits downward |
| **RICOCHET** | 1 VOLT | High-HP bouncer (70 HP), ricochets diagonally off all screen edges and the upper boundary for 9 seconds. Score: 350 |

---

## Stage Structure

Six stages total. All enemy counts and HP scale with difficulty multipliers.

| Stage | Type | Base Enemy Count |
|---|---|---|
| 1 | Normal | 55 |
| 2 | Miniboss | 1 |
| 3 | Normal | 65 |
| 4 | Boss | 1 |
| 5 | Normal | 80 |
| 6 | Act Boss | 1 |

**Enemy composition ramps within normal stages:**
- Stage 1: Pure STRIKERs (0–35%) → STRIKER + VOLT mix (35–68%) → all three types (68–100%)
- Stage 3: Opens with STRIKER/VOLT mix → heavy VOLT/BASTION lean
- Stage 5: Opens near-entirely with VOLTs and BASTIONs, almost no STRIKERs by end

**Wave timing:** New waves spawn every 7–11 seconds once the current enemies drop below 10 on screen. Stage ends when all enemies are spawned and defeated.

---

## Bosses

All bosses enter from off-screen top (y = −120), descend to y = 180 before their AI activates, then wander between random target positions chosen every 2.5–4 seconds.

**DEPTH_SCROLL background** *(proposed)*
During boss fights, add a parallax dot-grid layer scrolling upward (opposite to bullet downward motion). Bullets actually move down; the scrolling grid makes them appear faster than they are. Compresses the perceived reaction window without changing any bullet speed value. Skilled players tune it out — learning to ignore it is itself a skill expression. Visually consistent with the existing dot-grid background, just animated.

### Miniboss — Stage 2
Radius 50, Score 2000, Move speed 3.0 px/frame

| Phase | Type | HP (STABLE) | Pattern |
|---|---|---|---|
| 1 | Normal | 280 | AIMED_SPREAD |
| 2 | Special | 200 | SPELL_SPIRAL |
| 3 | Normal | 320 | CROSS_AIMED |
| 4 | Special | 240 | SPELL_WALLS |

**Gimmick (SPECIAL phases):** Two CORNER_TURRETs spawn at top-left and top-right, each firing aimed shots at the player every ~260ms (10 dmg).

---

### Boss — Stage 4
Radius 80, Score 5000, Move speed 2.5 px/frame

| Phase | Type | HP (STABLE) | Pattern |
|---|---|---|---|
| 1 | Normal | 350 | AIMED_SPREAD |
| 2 | Special | 250 | SPELL_FLOWER |
| 3 | Normal | 400 | AIMED_FAN |
| 4 | Special | 280 | SPELL_SPIRAL |
| 5 | Normal | 450 | CROSS_AIMED |
| 6 | Special | 300 | SPELL_LASER_CROSS |
| 7 | Normal | 480 | DENSE_AIMED |
| 8 | Special | 320 | SPELL_BUTTERFLY |
| 9 | Normal | 500 | ALL_OUT |
| 10 | Special | 380 | SPELL_STORM |

**Gimmicks:**
- SPECIAL phases → two CORNER_TURRETs
- CROSS_AIMED phase → spawns a LASER_SWEEP at a random Y (0.75s telegraph → 0.38s fire, 18 dmg)

---

### Act Boss — Stage 6
Radius 90, Score 20000, Move speed 2.0 px/frame (slower and more imposing)

| Phase | Type | HP (STABLE) | Pattern |
|---|---|---|---|
| 1 | Normal | 600 | AIMED_SPREAD |
| 2 | Special | 500 | SPELL_SPIRAL |
| 3 | Normal | 650 | ROTATING_RING |
| 4 | Special | 520 | SPELL_WALLS |
| 5 | Normal | 700 | AIMED_FAN |
| 6 | Special | 550 | SPELL_FLOWER |
| 7 | Normal | 750 | DENSE_AIMED |
| 8 | Special | 580 | SPELL_BUTTERFLY |
| 9 | Normal | 800 | ALL_OUT |
| 10 | Special | 620 | SPELL_VORTEX |
| 11 | Normal | 850 | CROSS_AIMED |
| 12 | Special | 660 | SPELL_STORM |
| 13 | Normal | 900 | AIMED_FAN |
| 14 | Special | 700 | SPELL_LASER_CROSS |
| 15 | Normal | 950 | DENSE_AIMED |
| 16 | Special | 720 | SPELL_GALAXY |
| 17 | Normal | 1000 | ROTATING_RING |
| 18 | Special | 750 | SPELL_SPIRAL |
| 19 | Normal | 1100 | ALL_OUT |
| 20 | Special | 800 | SPELL_GALAXY |

**Gimmicks (pattern-dependent):**
- SPELL_GALAXY / SPELL_VORTEX / SPELL_STORM → **SAW_ARMS**: Rotating lines extending 360px from the boss. Contact = 22 dmg, 0.6s immunity window. Rotation speed and arm count vary per pattern.
- SPELL_BUTTERFLY / SPELL_LASER_CROSS / SPELL_WALLS → **ARENA_COMPRESS**: Walls close from both sides to 22%–78% of screen width, hold for 4.5 seconds, then open. Player position is physically constrained.

---

## Bullet Speed Tiers

All bullets in the game fit into one of four speed tiers. Patterns with personality mix tiers deliberately — slow bullets box in the player while fast ones punish escape routes.

| Tier | Speed | Role | Current Examples |
|---|---|---|---|
| CREEP | ~1.5 px/frame | Wall-forming, area denial | SPELL_WALLS large bullets |
| STANDARD | 3–4 px/frame | Readable tracking | AIMED_SPREAD, SPELL_SPIRAL |
| FAST | 7–8 px/frame | Reaction shots | DENSE_AIMED, turret shots |
| LASER | 14+ px/frame | Instant-read; requires short telegraph | Void Convert converted bullets |

Mixing CREEP + FAST in the same pattern (Touhou's signature) is the target for new spell cards.

---

## Bullet Color Language

Color conveys threat level before the player consciously reads the pattern. Proposed grammar:

| Color | Meaning | Examples |
|---|---|---|
| Red `#CC3333` / `#FF2222` | Standard aimed threat | STRIKER shots, AIMED_SPREAD |
| Orange `#FF8800` | Side-approach, spread | VOLT 3-way spread |
| Blue `#4466FF` | Radial/non-aimed, area-cover | BASTION rings |
| Purple / Magenta `#FF00AA` | Spell card — curving, angular | SPELL_SPIRAL, SPELL_BUTTERFLY |
| Teal / Cyan `#00FFAA` | Fast rotating beams | SPELL_LASER_CROSS |
| Yellow-orange `#FFAA00` | Mixed aimed + rotating (storm) | SPELL_STORM |
| Void purple `#CC44FF` | Player (Void Convert) | Converted absorbed bullets |
| Red turret `#FF3300` | Gimmick — predictable source | CORNER_TURRET shots |

Consistency here lets a player react to color before consciously parsing trajectory.

---

## Boss Attack Patterns

| Pattern | Fire Rate | Description |
|---|---|---|
| AIMED_SPREAD | 1200ms | 5-bullet fan aimed at player |
| ROTATING_RING | 700ms | 10 bullets in a rotating full ring |
| CROSS_AIMED | 1400ms | 4-bullet rotating cross + 3-bullet aimed burst; also triggers LASER_SWEEP |
| DENSE_AIMED | 260ms | Single fast aimed shot with slight random spread (rapid fire) |
| ALL_OUT | 550ms | 8-bullet omnidirectional ring + 1 extra aimed bullet |
| AIMED_FAN | 800ms | 3 concentric speed layers × 5 angles = 15 bullets per shot |
| SPELL_SPIRAL | 100ms | 3-arm spiral; bullets have angular velocity and curve continuously |
| SPELL_WALLS | 360ms | 5 of 6 large wall bullets descend from top with one random gap |
| SPELL_FLOWER | 550ms | 6-petal pattern, 3 bullets per petal (18 total) |
| SPELL_LASER_CROSS | 80ms | 4 rapid-fire beams rotating in a cross pattern |
| SPELL_VORTEX | 120ms | 2-arm dual spiral with curving angular velocity |
| SPELL_STORM | 180ms | 6-way combined aimed + rotating spread |
| SPELL_BUTTERFLY | 600ms | Symmetric 5-bullet wings per side (10 total) fanning from player direction |
| SPELL_GALAXY | 200ms | 4-arm spiral; alternating arms curve opposite directions (galaxy arcs) |

### Proposed New Patterns

| Pattern | Fire Rate | Description |
|---|---|---|
| SPELL_HYPNOSIS | 400ms | Three concentric rings at different angular velocities (inner ×1.0, middle ×0.85, outer ×0.7). The differential makes the inner ring appear to rotate backward — the player's gap-reading fights itself. Target: Act Boss. |
| SPELL_HELIX | 300ms | Two counter-rotating spirals: one arm fires CREEP bullets (visible, look threatening), the other fires FAST bullets (the actual kill condition). Eyes track the wrong layer. |
| SPELL_MIRAGE | 500ms | Bullets spawn in a ring aimed inward toward the boss — the player's instinct reads them as safe. They travel inward, pause at a close radius, then reverse and scatter outward. The reversal is the attack. |

---

## Gimmicks (Phase Hazards)

| Gimmick | Appears During | Behavior |
|---|---|---|
| **CORNER_TURRET** | Miniboss/Boss SPECIAL phases | Two turrets at top corners fire aimed shots at the player every ~260ms (10 dmg) |
| **LASER_SWEEP** | Boss CROSS_AIMED pattern | Horizontal laser at random Y: 0.75s warn → 0.38s fire (18 dmg, 0.4s immunity per hit) |
| **SAW_ARMS** | Act Boss SPELL_GALAXY / VORTEX / STORM | Rotating arms extend 360px from boss center. Contact = 22 dmg, 0.6s immunity after hit |
| **ARENA_COMPRESS** | Act Boss SPELL_BUTTERFLY / LASER_CROSS / WALLS | Walls close to 22–78% width, hold 4.5s, reopen. Player physically clamped inside |

---

## Spell Cards

When a boss enters a SPECIAL phase, a spell card title is announced. If you survive the entire phase without taking any damage:

- **VOTIVE_ORB / PULSE_NODE:** Special meter fills to 100
- **VOID_SPIRE:** Restore 40 HP + 15 integrity

Taking any hit during a spell phase cancels the bonus for that card.

**Spell Card Announce Freeze** *(proposed)*
When a SPECIAL phase triggers, freeze the entire field (bullets, boss, player input) for 1.5 seconds while the spell card title animates in — identical to Touhou's approach. Current behavior just transitions immediately. The freeze does two things: gives the player a mental reset between phases, and builds dread by letting the pattern name sit on screen before anything happens. The 1.5s pause also prevents cheap hits during the transition.

---

## Deathbomb

If HP reaches 0 while special meter is ≥ 50:
- HP is restored to 20
- Special activates automatically
- The meter is consumed

Below 50 meter at death = game over.

---

## Difficulty

| | STABLE | FLUX | CHAOS |
|---|---|---|---|
| Enemy Count | ×1.0 | ×1.3 | ×1.8 |
| Boss HP | ×1.0 | ×1.5 | ×2.5 |
| Damage Multiplier | ×1.0 | ×1.5 | ×2.5 |
| Starting Bombs | 3 | 2 | 1 |

---

## Roguelike Module System

Between every stage you reach the **LEVELING** screen and choose 1 of 3 randomly offered modules. Rarity is performance-weighted.

**Rarity formula:** `performance = (kills ÷ 10) − (damageTaken ÷ 50)`
- Legendary chance: 5% base → up to 30% at high performance
- Rare chance: 20% base → up to 60%
- Common: remainder

### Modules

| Module | Rarity | Effect |
|---|---|---|
| **REFRACTION** | Common | *(not yet implemented — placeholder)* |
| **KINETIC** | Common | +0.45 to bullet damage multiplier (stacks, max ×2.0 total) |
| **OVERCLOCK** | Rare | Instantly grants +500 XP |
| **REPAIR** | Common | Restore 50 HP and +20 integrity |
| **SHIELD** | Legendary | Fully restores integrity to 100 |

**KINETIC stacking:** Each pick adds ×0.45. First pick = ×1.45 damage. Two picks = ×1.90. Three or more picks cap at ×2.0. Applies to every bullet type and fire mode.

---

## Player Stats

| Stat | Notes |
|---|---|
| Health | 100 max. Hits 0 = game over (deathbomb if meter ≥ 50) |
| Integrity | 0–100 cosmetic stat. −5 per hit |
| Special Meter | 0–100. +5/sec passive, +2 per graze, +2 per kill. Powers specials and powered dash |
| Experience | Score total from kills and grazes |
| Level | Current stage index + 1 |
| Kills | Total enemies destroyed |
