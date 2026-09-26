# Mobile build — what changed and why

The phone edition of `avengers-endgame-rpg`. Playable by tapping, laid out for
a portrait screen, and still a plain folder of static files: open `index.html`
and it runs. No build step, no package manager, no network calls, no external
fonts, no images. Every pixel is drawn by the existing canvas code.

Run it locally with any static server, or straight off a phone via GitHub Pages.

## What did not change

The game. Not one line of combat, data, or story differs from the desktop
build:

| file | state |
| --- | --- |
| `js/data.js` | byte-identical — every hero, power, role, ultimate, 12 vehicles, every location, clue and mission |
| `js/battle.js` | byte-identical — the whole combat engine |
| `js/mission.js` | byte-identical — all seven mission types |
| `css/os3.css` | byte-identical — the house design system |
| `css/game.css` | byte-identical — the desktop layout |

All 13 heroes still cast every power and all three super tiers, and all seven
missions still resolve on both the win and the fail path (verified — see below).

**Vehicle choice is not a gate.** The 12 vehicles are still assigned to fronts
by the act, exactly as before, and a front that gets no vehicle runs as it
always did. Nothing in the mobile layer reads or writes the fleet.

## What changed, and why

### `css/mobile.css` — new

The presentation layer, loaded after the two base stylesheets so it wins.

- **Portrait layout.** Every multi-column grid collapses to one column. The
  battle screen reorders so the controls sit under the field, and the field
  goes to 4:3 rather than 16:9, because a 16:9 strip in the middle of a
  portrait screen is a letterbox — the actors become unreadable, and the field
  is the thing you are reading mid-fight.
- **44px minimum targets.** Every button, power, tier, party chip, mission
  control and vehicle button is at least 44×44 CSS px. Primary buttons are
  52px, the mission controls 56px, the brake 64px.
- **No horizontal scrolling.** `overflow-x: hidden` on the body, and every
  text block is `max-width: 100%`. Nothing can scroll sideways.
- **Safe areas.** The fixed header carries the notch inset; the footer and the
  sticky party strip carry the home-indicator inset. `env(safe-area-inset-*)`
  degrades to `0px` where the browser does not know about it, so this is safe
  on desktop.
- **Rotation and browser chrome.** The overlays use `100dvh`, which tracks the
  collapsing address bar as the page scrolls, with a `100vh` line ahead of it
  as the fallback.
- **No hover-only affordances.** The base stylesheet reveals live states on
  `:hover`. A tap can leave that state latched after the finger lifts, so
  inside `@media (hover: none)` every hover value is pinned back to its
  resting value and `:active` takes over as the pressed look. Keyboard chips
  (`<kbd>`) and the line describing keys the phone does not have are hidden.
- **Spelling** is corrected to "tap the title for stickers".

The spacing scale is tightened only inside `@media (max-width: 820px)`, so the
desktop rhythm is untouched.

### `js/touch.js` — new

One job. The mission brake is a **hold** — "hold to brake" means the engine
reads a flag every frame while the reticle settles. A click gives that flag
exactly one frame, so on a touchscreen the mechanic is unplayable. This file
supplies the one thing CSS cannot: a press with a beginning and an end.

- Press and release are delegated on the document, so a control the game
  creates at runtime is covered without a listener being attached per button.
- **No double-fire.** On iOS a tap also synthesises a click, and the game's
  own click handler would toggle the brake a second time. A click carrying
  pointer coordinates (`detail > 0`) is one a finger already handled, so it is
  suppressed; a keyboard Enter/Space produces `detail === 0` and still works.
- Releasing on `pointerleave` and on `scroll` means sliding off the control, or
  scrolling with a second finger, never leaves the brake stuck on.
- The frame clock is reset on `visibilitychange`, so returning to a
  backgrounded tab does not hand the engine one enormous delta.

### `js/game.js` — four changes

1. **`canvasDpr()`.** Every canvas is now sized through one helper. A modern
   iPhone reports `devicePixelRatio` 3; a full-screen cinematic at 3× is 2.25×
   the pixels of the same picture at 2× for no visible gain on a phone-sized
   screen. Capped at 2 on a coarse pointer. On desktop it returns exactly what
   the old `Math.min(2, ...)` returned — that path is unchanged.

2. **The mission controls no longer rebuild every frame.** The frame loop calls
   `paintMissionControls()` for the lock and timing kinds, and each call did
   `host.innerHTML = ''` and rebuilt. On a desktop that is invisible. On a
   phone, the touch target a player is holding is destroyed and recreated 60
   times a second, and a hold cannot survive it. The build is now skipped when
   a signature of everything the controls depend on is unchanged. A real change
   — a move, a new round, a new clue, a new step — still rebuilds.

3. **The brake is a real press.** `holdstart` sets `m.held`, `holdend` clears
   it, and the button takes the `on` class while held. The keyboard path is
   still a plain toggle. The `on` styling is not new: `game.css` already
   declares `#mis-controls .btn.hold.on` and the desktop build never set it.

4. **Rotation and chrome.** `orientationchange` and `visualViewport.resize` now
   re-measure the canvases, with a short delay so the new box has settled.
   Only `resize` was handled before.

### `js/field.js`, `js/footage.js` — one line each

Both now read `root.canvasDpr()` with the original `Math.min(2, ...)` as a
fallback, since they load before `game.js` publishes the helper. Behaviour is
identical on desktop.

## The one thing I could not do

**Visual verification on a real iPhone and in Mac Chrome did not happen.** No
browser is driven in this environment, so nothing below was confirmed by eye:

- that the portrait layout actually looks right, and that nothing overlaps
- that a real finger activates each control, and that 44px is enough
- that rotation and browser-chrome collapse are smooth rather than janky
- the real frame rate on a phone, and whether the 2× cap is enough
- how the safe-area insets read on a notched device

What *was* verified is below. Treat the visual layer as correct-by-construction
and unproven-by-eye.

## What was verified

Run in Node against this copy, with the real engine loaded:

- `node --check` on all seven scripts — clean.
- All 13 heroes cast every power and all three super tiers.
- All seven missions resolve on the win path and the fail path.
- The brake: press sets it, release clears it, a second press does not latch,
  and the keyboard toggle still works.
- The rebuild guard: identical state does not rebuild; a move, a new round, a
  new deduce step, and a new clue all do.
- The touch bridge: the synthesised click is suppressed, the keyboard click
  passes, sliding off releases, other controls are untouched, a disabled
  control does not register.
- All 72 element IDs referenced from JS exist in the HTML, or are created
  dynamically at runtime by the existing code.
- All ten local asset references resolve to files that exist. No absolute
  paths, no external URLs, no network calls.

The dynamic IDs above were created by the original code, not by this work.

## Constraints held

- The original `avengers-endgame-rpg` directory was never read-modified,
  moved, deleted, or tested. Every edit landed in `avengers-endgame-rpg-mobile`.
- No bundler, no dependencies, no network calls at runtime.
- `index.html` opens directly from the filesystem.
