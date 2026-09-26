/* ============================================================
   touch.js — the phone input layer.

   loaded last, after every other script. it changes input only:
   no combat value, no hero, no vehicle, and no decision the game
   makes is read or written here.

   it exists for one reason, and it is a narrow one:

     the mission brake is a HOLD. "hold to brake" means the engine
     reads a flag every frame and the player keeps it down while the
     reticle settles. a click gives that flag exactly one frame, so
     on a touchscreen the mechanic is literally unplayable.

   everything else in the game is a tap, and taps already work on a
   phone. the rest of the work for touch is in css/mobile.css —
   tap sizing, safe areas, the portrait layout, and removing the
   hover-only affordances. this file supplies the one thing CSS
   cannot express, which is a press with a beginning and an end.

   ---------- the double-fire problem ----------
   a press here must not also count as a click. if both fire, the
   brake toggles twice and lands back where it started, which looks
   like the button is broken rather than like a double-fire. so:

     pointerdown  -> holdstart  -> m.held = true
     pointerup    -> holdend    -> m.held = false
     click        -> ignored, because a real finger already did the
                     work and the game's own click handler would
                     toggle it a second time

   a keyboard user still needs the button to work, and a keyboard
   Enter/Space produces a click with detail === 0 (no pointer
   coordinates behind it). that is the discriminator: detail > 0
   means a pointer made this click, so it has already been handled.
   ============================================================ */
(function (root) {
  'use strict';

  const doc = document;
  const MOBILE = root.MOBILE = root.MOBILE || {};

  /* ---------- is this a coarse pointer? ----------
     decided once at load and used by the stylesheet's counterpart
     checks and by anything that needs to branch on input type. */
  MOBILE.coarse = (function () {
    try { return root.matchMedia('(hover: none)').matches; }
    catch (e) { return 'ontouchstart' in root; }
  })();
  MOBILE.isCoarse = MOBILE.coarse;

  /* ---------- the press bridge ----------
     one delegated listener on the document rather than one per
     button, because the game rebuilds the mission controls at
     runtime and a button that did not exist at load would
     otherwise need a listener nobody attached. delegation means a
     control created three frames from now is already covered.

     only elements carrying .hold are interested. */
  const holdTarget = function (e) {
    const t = e.target;
    if (!t || !t.closest) return null;
    const el = t.closest('.btn.hold, .hold');
    return el || null;
  };

  doc.addEventListener('pointerdown', function (e) {
    const el = holdTarget(e);
    if (!el) return;
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    /* keep the page from scrolling out from under a held finger, and
       keep the synthetic mouse events from firing a click at all */
    e.preventDefault();
    el._pressing = true;
    el.dispatchEvent(new Event('holdstart'));
  }, { passive: false });

  const endPress = function (e) {
    const el = holdTarget(e);
    if (!el || !el._pressing) return;
    el._pressing = false;
    el.dispatchEvent(new Event('holdend'));
  };

  doc.addEventListener('pointerup', endPress, { passive: true });
  doc.addEventListener('pointercancel', endPress, { passive: true });
  /* pointerleave covers the finger sliding off the control before
     release, which on a phone is an ordinary way to lose a hold. */
  doc.addEventListener('pointerleave', endPress, { passive: true });
  /* a scroll started with another finger on the control should also
     release, or the brake stays stuck on with no finger down. */
  doc.addEventListener('scroll', function () {
    const el = doc.querySelector('.btn.hold._pressing, .hold._pressing');
    if (!el) return;
    el._pressing = false;
    el.dispatchEvent(new Event('holdend'));
  }, { passive: true });

  /* ---------- suppress the redundant click ----------
     a click that carries pointer coordinates was produced by a real
     press, and that press has already been handled above. dropping
     it here means the game's own click listener can stay exactly
     as it is on the desktop build. */
  doc.addEventListener('click', function (e) {
    const el = holdTarget(e);
    if (!el) return;
    if (e.detail !== 0) { e.stopPropagation(); e.preventDefault(); }
  }, true);

  /* ---------- pause the clock when the phone is not looking ----------
     iOS backgrounded tabs and locked screens stop calling
     requestAnimationFrame, so on return the engine would otherwise be
     handed one enormous delta. game.js already caps the step at 0.12s,
     but resetting the frame clock means the first frame back is a
     normal one rather than a clamped catch-up. */
  doc.addEventListener('visibilitychange', function () {
    if (root.G) root.G.lastFrame = 0;
  });

  root.MOBILE = MOBILE;
})(window);
