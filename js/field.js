/* ============================================================
   field.js — canvas renderer for one battle front.
   every front is drawn every frame, watched or not, so the
   parallel battles are visibly alive while you drive someone else.
   ============================================================ */
(function (root) {
  'use strict';

  const TAU = Math.PI * 2;
  const hash = function (s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; };

  /* ---------- per-hero sigils: primitives only, drawn solid ---------- */
  const GLYPH = {
    cap: function (c, s) {
      c.beginPath();
      c.moveTo(0, -s); c.lineTo(s * .8, -s * .55); c.lineTo(s * .62, s * .5);
      c.lineTo(0, s); c.lineTo(-s * .62, s * .5); c.lineTo(-s * .8, -s * .55); c.closePath(); c.fill();
    },
    thor: function (c, s) {
      c.fillRect(-s * .8, -s * .95, s * 1.6, s * .5);
      c.fillRect(-s * .16, -s * .45, s * .32, s * 1.3);
    },
    ironman: function (c, s) {
      c.beginPath(); c.arc(0, s * .2, s * .9, Math.PI, TAU); c.lineTo(s * .2, s * .2); c.lineTo(-s * .2, s * .2); c.closePath(); c.fill();
    },
    widow: function (c, s) {
      c.beginPath(); c.arc(0, 0, s, 0, TAU); c.fill();
      c.globalCompositeOperation = 'destination-out';
      c.beginPath(); c.arc(0, -s * .45, s * .42, 0, TAU); c.fill();
      c.beginPath(); c.arc(0, s * .45, s * .42, 0, TAU); c.fill();
      c.globalCompositeOperation = 'source-over';
    },
    wanda: function (c, s) {
      c.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * TAU, r = i % 2 ? s * .38 : s;
        const fn = i ? 'lineTo' : 'moveTo';
        c[fn](Math.cos(a) * r, Math.sin(a) * r);
      }
      c.closePath(); c.fill();
    },
    marvel: function (c, s) {
      c.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * TAU - Math.PI / 2, r = i % 2 ? s * .44 : s;
        const fn = i ? 'lineTo' : 'moveTo';
        c[fn](Math.cos(a) * r, Math.sin(a) * r);
      }
      c.closePath(); c.fill();
    },
    spiderman: function (c, s) {
      c.beginPath(); c.arc(0, 0, s * .42, 0, TAU); c.fill();
      c.lineWidth = Math.max(1, s * .14); c.strokeStyle = c.fillStyle;
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU;
        c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * s, Math.sin(a) * s); c.stroke();
      }
    },
    antman: function (c, s) {
      c.beginPath(); c.arc(0, 0, s, 0, TAU); c.fill();
      c.globalCompositeOperation = 'destination-out';
      c.beginPath(); c.arc(0, 0, s * .52, 0, TAU); c.fill();
      c.globalCompositeOperation = 'source-over';
    },
    hawkeye: function (c, s) {
      c.beginPath();
      c.moveTo(-s, s * .7); c.lineTo(s * .7, -s * .7); c.lineTo(s, -s); c.lineTo(-s * .7, s); c.closePath(); c.fill();
      c.fillRect(s * .2, -s * 1.1, s * .28, s * .7);
    },
    rocket: function (c, s) {
      c.beginPath();
      c.moveTo(0, -s); c.quadraticCurveTo(s * .7, -s * .1, s * .5, s * .8);
      c.lineTo(-s * .5, s * .8); c.quadraticCurveTo(-s * .7, -s * .1, 0, -s); c.closePath(); c.fill();
    },
    hulk: function (c, s) {
      c.fillRect(-s * .9, -s * .6, s * 1.8, s * 1.2);
      c.beginPath(); c.arc(0, -s * .6, s * .55, Math.PI, TAU); c.fill();
    },
    vision: function (c, s) {
      c.beginPath();
      c.moveTo(0, -s); c.lineTo(s * .7, 0); c.lineTo(0, s); c.lineTo(-s * .7, 0); c.closePath(); c.fill();
    },
    strange: function (c, s) {
      c.beginPath(); c.arc(0, 0, s * .8, 0, TAU); c.fill();
      c.globalCompositeOperation = 'destination-out';
      c.beginPath(); c.arc(0, 0, s * .42, 0, TAU); c.fill();
      c.globalCompositeOperation = 'source-over';
      c.fillRect(-s * .06, -s * 1.2, s * .12, s * 2.4);
    },
    okayo: function (c, s) {
      c.lineWidth = Math.max(1, s * .26); c.strokeStyle = c.fillStyle;
      c.beginPath();
      for (let i = 0; i <= 40; i++) {
        const a = i * .32, r = s * .12 * i * .22;
        const fn = i ? 'lineTo' : 'moveTo';
        c[fn](Math.cos(a) * r, Math.sin(a) * r);
      }
      c.stroke();
    },
    null9: function (c, s) {
      c.beginPath(); c.arc(0, 0, s, 0, TAU); c.fill();
      c.globalCompositeOperation = 'destination-out';
      c.beginPath(); c.arc(0, 0, s * .66, 0, TAU); c.fill();
      c.globalCompositeOperation = 'source-over';
      c.beginPath(); c.arc(0, 0, s * .3, 0, TAU); c.fill();
    },
    eris: function (c, s) {
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * TAU, r = s * (.35 + (i % 3) * .28);
        c.beginPath(); c.arc(Math.cos(a) * r * .6, Math.sin(a) * r * .6, s * .2, 0, TAU); c.fill();
      }
    }
  };

  /* ---------- vehicle glyphs: a silhouette each, drawn nose-right because
     that is the way they are pointed when they are on the field ---------- */
  const VEH_GLYPH = {
    // swept wings, twin tails
    quinjet: function (c, s) {
      c.beginPath();
      c.moveTo(s, 0); c.lineTo(s * .1, s * .32); c.lineTo(-s * .9, s * .18);
      c.lineTo(-s * .55, 0); c.lineTo(-s * .9, -s * .18); c.lineTo(s * .1, -s * .32);
      c.closePath(); c.fill();
      c.fillRect(-s * .62, -s * .62, s * .3, s * .2);
      c.fillRect(-s * .62, s * .42, s * .3, s * .2);
    },
    // hard-edged single delta, no canopy
    talon: function (c, s) {
      c.beginPath();
      c.moveTo(s, 0); c.lineTo(-s * .78, s * .62); c.lineTo(-s * .5, 0);
      c.lineTo(-s * .78, -s * .62); c.closePath(); c.fill();
    },
    // a cube, in isometric
    tesseract: function (c, s) {
      c.beginPath();
      c.moveTo(0, -s); c.lineTo(s * .8, -s * .45); c.lineTo(s * .8, s * .5);
      c.lineTo(0, s * .95); c.lineTo(-s * .8, s * .5); c.lineTo(-s * .8, -s * .45);
      c.closePath(); c.fill();
    },
    // a wheel and a fairing, leaning forward
    spitfire: function (c, s) {
      c.beginPath();
      c.moveTo(s * .95, s * .1); c.lineTo(-s * .5, -s * .45);
      c.lineTo(-s * .5, s * .5); c.lineTo(s * .95, s * .34); c.closePath(); c.fill();
      c.beginPath(); c.arc(-s * .55, s * .28, s * .38, 0, TAU); c.fill();
      c.beginPath(); c.arc(-s * .05, s * .3, s * .34, 0, TAU); c.fill();
    },
    // a lifting body with a rotor disc
    nighthawk: function (c, s) {
      c.beginPath();
      c.moveTo(s * .9, 0); c.lineTo(s * .1, s * .34); c.lineTo(-s * .85, s * .3);
      c.lineTo(-s * .85, -s * .3); c.lineTo(s * .1, -s * .34); c.closePath(); c.fill();
      c.lineWidth = s * .16; c.strokeStyle = c.fillStyle;
      c.beginPath(); c.moveTo(-s * .2, -s * .78); c.lineTo(-s * .2, s * .78); c.stroke();
    },
    // a long hull with a raised bow
    gator: function (c, s) {
      c.beginPath();
      c.moveTo(s, s * .1); c.lineTo(s * .35, -s * .3); c.lineTo(-s * .95, -s * .22);
      c.lineTo(-s * .95, s * .38); c.lineTo(s * .35, s * .42); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(s * .45, -s * .3); c.lineTo(-s * .1, -s * .72);
      c.lineTo(-s * .42, -s * .3); c.closePath(); c.fill();
    },
    // a falcon: swept crest and a fanned tail
    coronet: function (c, s) {
      c.beginPath();
      c.moveTo(s * .95, 0); c.quadraticCurveTo(s * .2, -s * .5, -s * .1, -s * .1);
      c.quadraticCurveTo(-s * .4, s * .18, -s * .95, s * .5);
      c.quadraticCurveTo(-s * .4, s * .3, -s * .1, s * .12);
      c.quadraticCurveTo(s * .2, s * .1, s * .95, 0);
      c.closePath(); c.fill();
    },
    // a tower on a hull
    lifeguard: function (c, s) {
      c.beginPath();
      c.moveTo(s, s * .18); c.lineTo(s * .3, -s * .1); c.lineTo(-s * .9, -s * .1);
      c.lineTo(-s * .9, s * .5); c.lineTo(s * .3, s * .5); c.closePath(); c.fill();
      c.fillRect(-s * .55, -s * .85, s * .5, s * .78);
      c.beginPath(); c.arc(-s * .3, -s * .85, s * .22, Math.PI, 0); c.fill();
    },
    // a long hood, short deck
    piston: function (c, s) {
      c.beginPath();
      c.moveTo(s, s * .05); c.lineTo(s * .55, -s * .3); c.lineTo(-s * .2, -s * .32);
      c.lineTo(-s * .2, -s * .72); c.lineTo(-s * .62, -s * .72); c.lineTo(-s * .62, -s * .3);
      c.lineTo(-s * .95, -s * .24); c.lineTo(-s * .95, s * .4);
      c.lineTo(s * .6, s * .4); c.closePath(); c.fill();
      c.beginPath(); c.arc(-s * .5, s * .42, s * .3, 0, TAU); c.fill();
    },
    // a planing hull with a hard chine
    lilboat: function (c, s) {
      c.beginPath();
      c.moveTo(s, s * .05); c.lineTo(s * .1, -s * .32); c.lineTo(-s * .85, -s * .2);
      c.lineTo(-s * .7, s * .45); c.lineTo(s * .35, s * .45); c.closePath(); c.fill();
      c.fillRect(-s * .35, -s * .78, s * .55, s * .46);
    },
    // a needle, all leading edge
    sunspear: function (c, s) {
      c.beginPath();
      c.moveTo(s, 0); c.lineTo(-s * .8, s * .26); c.lineTo(-s * .45, 0);
      c.lineTo(-s * .8, -s * .26); c.closePath(); c.fill();
    },
    // a long flat deck with a raised bridge
    keysmobile: function (c, s) {
      c.beginPath();
      c.moveTo(s, s * .08); c.lineTo(s * .5, -s * .16); c.lineTo(-s * .92, -s * .12);
      c.lineTo(-s * .92, s * .44); c.lineTo(s * .5, s * .44); c.closePath(); c.fill();
      c.fillRect(-s * .5, -s * .62, s * .62, s * .46);
    }
  };

  /* ---------- role marks: one shape each, 3 primitives ---------- */
  const ROLE_MARK = {
    tank:    function (c, s) { c.beginPath(); c.moveTo(0, -s); c.lineTo(s, 0); c.lineTo(0, s); c.lineTo(-s, 0); c.closePath(); c.fill(); },
    healer:  function (c, s) { c.fillRect(-s * .3, -s, s * .6, s * 2); c.fillRect(-s, -s * .3, s * 2, s * .6); },
    dps:     function (c, s) { c.beginPath(); c.moveTo(0, -s); c.lineTo(s * .85, s * .7); c.lineTo(-s * .85, s * .7); c.closePath(); c.fill(); },
    support: function (c, s) { c.beginPath(); c.arc(0, 0, s * .5, 0, TAU); c.fill(); c.fillRect(-s, -s * .16, s * 2, s * .32); }
  };

  /* ---------- location backdrops: florida, on the ground and off it ---------- */
  const SCENES = {
    avenue: function (c, w, h, t) {                     // new avengers compound, west palm beach
      c.fillStyle = '#0a120c'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 26; i++) {
        const x = (i * 97 % w), y = h * 0.62 + (i * 53 % (h * 0.3));
        c.fillStyle = 'rgba(70,110,70,' + (0.1 + (i % 4) * 0.04) + ')';
        c.fillRect(x, y, 30 + (i % 5) * 12, 2);
      }
      c.strokeStyle = 'rgba(255,255,255,.09)'; c.lineWidth = 1;
      c.strokeRect(w * .06, h * .58, w * .3, h * .2);
      c.beginPath(); c.moveTo(w * .06, h * .58); c.lineTo(w * .21, h * .42); c.lineTo(w * .36, h * .58); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.13)';
      for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(w * .5 + i * 9, h * .84, 2.5, 0, TAU); c.fill(); }
    },
    magic: function (c, w, h, t) {                      // sanctum branch, orlando
      c.fillStyle = '#0c0a12'; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(255,255,255,.05)';
      for (let i = 0; i < 7; i++) c.fillRect(i * w / 7, h * .5, w / 12, h * .5);
      c.strokeStyle = 'rgba(42,143,143,' + (0.4 + Math.sin(t * .9) * .12) + ')'; c.lineWidth = 2;
      c.beginPath(); c.ellipse(w * .5, h * .5, w * .06, h * .1, 0, 0, TAU); c.stroke();
      c.beginPath(); c.ellipse(w * .5, h * .5, w * .1, h * .17, 0, 0, TAU); c.stroke();
    },
    titan: function (c, w, h, t) {                      // everglades, titanic fragment
      c.fillStyle = '#08120f'; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(60,110,100,.16)';
      for (let i = 0; i < 34; i++) {
        const y = h * .5 + (i * 31 % (h * .5));
        c.fillRect(0, y, w, 1.4);
      }
      const px = w * .74, py = h * .38, pr = Math.min(w, h) * .1;
      const g = c.createRadialGradient(px, py, 0, px, py, pr * 1.8);
      g.addColorStop(0, 'rgba(255,70,18,.42)'); g.addColorStop(1, 'rgba(255,70,18,0)');
      c.fillStyle = g; c.beginPath(); c.arc(px, py, pr * 1.8, 0, TAU); c.fill();
      c.fillStyle = '#0d0d12';
      c.beginPath(); c.arc(px, py, pr, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 1.5; c.stroke();
    },
    hulk: function (c, w, h, t) {                       // gamma basin
      c.fillStyle = '#0b100a'; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(95,160,58,.22)'; c.lineWidth = 1;
      for (let r = 1; r < 5; r++) { c.beginPath(); c.arc(w * .5, h * .5, r * Math.min(w, h) * .11, 0, TAU); c.stroke(); }
      const pulse = .5 + Math.sin(t * 1.6) * .3;
      c.fillStyle = 'rgba(95,160,58,' + (0.1 + pulse * 0.12) + ')';
      c.beginPath(); c.arc(w * .5, h * .5, Math.min(w, h) * .2, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(95,160,58,.4)';
      c.beginPath(); c.moveTo(0, h * .78); c.lineTo(w, h * .78); c.stroke();
    },
    stone: function (c, w, h, t) {                      // cape canaveral, pad 14
      c.fillStyle = '#080a10'; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(255,255,255,.05)';
      for (let i = 0; i < 20; i++) c.fillRect(i * w / 20, 0, w / 44, h);
      c.strokeStyle = 'rgba(255,70,18,' + (0.25 + Math.sin(t * 2) * 0.1) + ')'; c.lineWidth = 3;
      c.beginPath(); c.arc(w * .5, h * .55, Math.min(w, h) * .2, 0, TAU); c.stroke();
      c.beginPath(); c.arc(w * .5, h * .55, Math.min(w, h) * .27, 0, TAU); c.stroke();
      c.fillStyle = 'rgba(255,70,18,.2)';
      c.beginPath(); c.arc(w * .5, h * .55, Math.min(w, h) * .2, 0, TAU); c.fill();
    },
    aero: function (c, w, h, t) {                       // aeroplane over orlando
      c.fillStyle = '#0a0d14'; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(255,255,255,.035)';
      for (let i = 0; i < 30; i++) {
        const x = (i * 137 + t * 40) % w;
        c.fillRect(x, (i * 61 % h), 26, 1.6);
      }
      c.strokeStyle = 'rgba(79,195,217,.28)'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(0, h * .2); c.quadraticCurveTo(w * .5, h * .1, w, h * .26); c.stroke();
      c.beginPath(); c.moveTo(0, h * .8); c.quadraticCurveTo(w * .5, h * .92, w, h * .76); c.stroke();
    },
    miami: function (c, w, h, t) {                      // little havana rooftop
      c.fillStyle = '#0e0a10'; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(255,255,255,.05)';
      for (let i = 0; i < 16; i++) c.fillRect(i * w / 16, h * .3, w / 26, h * .7);
      c.fillStyle = 'rgba(214,58,90,' + (0.06 + Math.sin(t * .8) * .03) + ')';
      c.fillRect(0, h * .28, w, 2);
    },
    staug: function (c, w, h, t) {                      // st. augustine walls
      c.fillStyle = '#0b0a0a'; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(255,255,255,.07)';
      for (let i = 0; i < 12; i++) c.fillRect(i * w / 12, h * .22, w / 30, h * .78);
      c.fillStyle = 'rgba(255,255,255,.12)';
      c.fillRect(0, h * .2, w, h * .04);
      for (let i = 0; i < 7; i++) {
        c.fillRect(w * (.06 + i * .13), h * .12, w * .045, h * .1);
        c.beginPath(); c.moveTo(w * (.06 + i * .13), h * .12); c.lineTo(w * (.082 + i * .13), h * .05);
        c.lineTo(w * (.104 + i * .13), h * .12); c.closePath(); c.fill();
      }
    },
    keys: function (c, w, h, t) {                       // florida keys drydock
      c.fillStyle = '#081018'; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(79,195,217,.08)';
      for (let i = 0; i < 12; i++) {
        const y = h * .45 + Math.sin((t * .6 + i) * .8) * 6;
        c.fillRect(0, y + i * 5, w, 1.4);
      }
      c.strokeStyle = 'rgba(255,255,255,.14)'; c.lineWidth = 2;
      c.strokeRect(w * .12, h * .2, w * .34, h * .3);
    },
    tampa: function (c, w, h, t) {
      c.fillStyle = '#0a0e14'; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(255,255,255,.1)'; c.lineWidth = 2;
      c.strokeRect(w * .18, h * .24, w * .5, h * .3);
      c.fillStyle = 'rgba(255,255,255,.05)';
      c.fillRect(w * .18, h * .24, w * .5, 3);
    },
    panhandle: function (c, w, h, t) {
      c.fillStyle = '#0b0d0a'; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(255,70,18,' + (0.1 + Math.sin(t * 1.2) * .05) + ')'; c.lineWidth = 1;
      for (let i = 0; i < 8; i++) { c.beginPath(); c.arc(w * .5, h * .5, 10 + i * 14, 0, TAU); c.stroke(); }
    },
    gulf: function (c, w, h, t) {                       // platform nine
      c.fillStyle = '#07100f'; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(79,195,217,.1)';
      for (let i = 0; i < 16; i++) {
        const y = (h / 16) * i + Math.sin(t * .7 + i) * 3;
        c.fillRect(0, y, w, 1.2);
      }
      c.fillStyle = 'rgba(0,0,0,.5)';
      c.fillRect(w * .3, h * .18, w * .1, h * .6);
      c.fillRect(w * .5, h * .18, w * .1, h * .6);
      c.fillRect(w * .3, h * .3, w * .3, h * .05);
      c.fillStyle = 'rgba(255,70,18,' + (0.2 + Math.sin(t * 3) * .1) + ')';
      c.beginPath(); c.arc(w * .55, h * .18, 3.5, 0, TAU); c.fill();
    },
    /* off-world */
    space: function (c, w, h, t, loc) {
      c.fillStyle = '#000000'; c.fillRect(0, 0, w, h);
      const seed = hash(loc || 'space');
      for (let i = 0; i < 110; i++) {
        const x = (i * 173 + seed * 500) % w, y = (i * 97 + seed * 300) % h;
        const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * (.4 + (i % 5) * .2) + i));
        c.fillStyle = 'rgba(255,255,255,' + (0.2 + tw * 0.6) + ')';
        c.fillRect(x, y, 1.3, 1.3);
      }
      // a planet limb, bottom left
      const px = w * .12, py = h * 1.15, pr = h * .8;
      const g = c.createRadialGradient(px, py, pr * .7, px, py, pr);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.82, 'rgba(30,60,90,.5)'); g.addColorStop(1, 'rgba(80,160,220,0)');
      c.fillStyle = g; c.beginPath(); c.arc(px, py, pr, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(140,210,255,.28)'; c.lineWidth = 2; c.stroke();
      if (loc === 'clemson') {                          // the vanishing point
        c.strokeStyle = 'rgba(255,255,255,.1)'; c.lineWidth = 1;
        for (let i = 0; i < 7; i++) {
          c.beginPath();
          c.ellipse(w * .5, h * .5, 14 + i * 20, (14 + i * 20) * .4, t * .1, 0, TAU); c.stroke();
        }
      }
    }
  };

  /* ---------- the front ---------- */

  function Field(battle, canvas) {
    this.b = battle;
    this.cv = canvas;
    this.cx = canvas.getContext('2d');
    this.cam = { shake: 0, zoom: 1, fx: 0, fy: .5, pull: 0 };
    this.t = 0;
    this.flash = 0;
    this.scan = 0;
    this.focusId = null;
    this.dpr = root.canvasDpr ? root.canvasDpr() : Math.min(2, root.devicePixelRatio || 1);
  }

  Field.prototype.resize = function () {
    const r = this.cv.getBoundingClientRect();
    if (!r.width) return;
    this.cv.width = Math.round(r.width * this.dpr);
    this.cv.height = Math.round(r.height * this.dpr);
    this.w = r.width; this.h = r.height;
  };

  /* a cinematic push when something big happens on this front */
  Field.prototype.kick = function (power) {
    this.cam.shake = Math.min(1.4, this.cam.shake + power);
    this.flash = Math.min(1, this.flash + power * .6);
  };

  Field.prototype.draw = function (dt) {
    const b = this.b, c = this.cx;
    if (!this.w) this.resize();
    if (!this.w) return;
    this.t += dt;
    const t = this.t;

    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, this.w, this.h);

    // camera
    this.cam.shake = Math.max(0, this.cam.shake - dt * 2.2);
    this.cam.pull = Math.max(0, this.cam.pull - dt * 1.1);
    this.cam.fx += (this.cam.fx - (b.x !== undefined ? 0 : 0)) * 0.1;
    const z = 1 + this.cam.pull * .06;
    const sx = (Math.random() - .5) * this.cam.shake * 9;
    const sy = (Math.random() - .5) * this.cam.shake * 9;
    c.save();
    c.translate(this.w / 2, this.h / 2);
    c.scale(z, z);
    c.translate(-this.w / 2 + sx, -this.h / 2 + sy);

    const W = this.w, H = this.h;

    // backdrop
    const loc = GD.FLORIDA_BY_ID[b.locationId];
    if (b.space || (loc && loc.space)) SCENES.space(c, W, H, t, b.locationId);
    else (SCENES[loc ? loc.id : 'avenue'] || SCENES.avenue)(c, W, H, t);

    // field bounds + grid
    c.strokeStyle = 'rgba(255,255,255,.07)';
    c.lineWidth = 1;
    for (let i = 1; i < 8; i++) {
      c.beginPath(); c.moveTo(W * (i / 8), 0); c.lineTo(W * (i / 8), H); c.stroke();
    }
    for (let i = 1; i < 5; i++) {
      c.beginPath(); c.moveTo(0, H * (i / 5)); c.lineTo(W, H * (i / 5)); c.stroke();
    }

    const X = function (a) { return a.x * W; };
    const Y = function (a) { return a.y * H; };

    // range rings for the held actor: shows role reach on the field
    const held = b.actor(this.focusId);
    if (held && held.alive) {
      c.strokeStyle = 'rgba(255,255,255,.1)';
      c.setLineDash([4, 6]);
      c.beginPath(); c.arc(X(held), Y(held), W * .1, 0, TAU); c.stroke();
      c.setLineDash([]);
    }

    // sort by y for depth
    const order = b.all.slice().sort(function (p, q) { return p.y - q.y; });

    // links
    c.lineWidth = 1;
    for (let i = 0; i < order.length; i++) {
      const a = order[i];
      if (!a.alive) continue;
      const bs = a.buffs || [];
      for (let k = 0; k < bs.length; k++) {
        const bf = bs[k];
        if (bf.kind === 'bastion') {
          c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 1.5;
          c.beginPath(); c.arc(X(a), Y(a), W * (.14 + (1 - (bf.until - b.t) / 8) * .0) , 0, TAU); c.stroke();
        }
        if (bf.kind === 'dodge' || bf.kind === 'blessed' || bf.kind === 'orbit' || bf.kind === 'immortal') {
          c.strokeStyle = 'rgba(255,255,255,' + (0.1 + Math.sin(t * 3) * .05) + ')';
          c.beginPath(); c.arc(X(a), Y(a), W * .055, 0, TAU); c.stroke();
        }
      }
    }

    // actors
    for (let i = 0; i < order.length; i++) this.drawActor(c, order[i], X, Y, t, W, H);

    // fx
    for (let i = 0; i < b.fx.length; i++) {
      const f = b.fx[i];
      const k = 1 - f.life / f.max;
      if (f.ring) {
        c.strokeStyle = f.c; c.globalAlpha = 1 - k; c.lineWidth = f.w * (1 - k * .6);
        c.beginPath(); c.arc(f.x * W, f.y * H, f.r0 + (f.r1 - f.r0) * k, 0, TAU); c.stroke();
        c.globalAlpha = 1;
      } else if (f.beam) {
        c.strokeStyle = f.c; c.globalAlpha = (1 - k) * .9; c.lineWidth = 2.5 * (1 - k) + .6;
        c.beginPath(); c.moveTo(f.x1 * W, f.y1 * H); c.lineTo(f.x2 * W, f.y2 * H); c.stroke();
        c.globalAlpha = 1;
      } else if (f.txt) {
        c.fillStyle = f.c; c.globalAlpha = 1 - k * k;
        c.font = '300 ' + Math.round(W * .028) + 'px "Power Grotesk","Helvetica Neue",sans-serif';
        c.textAlign = 'center';
        c.fillText(f.txt, f.x * W, f.y * H - k * H * .09);
        c.globalAlpha = 1;
      } else {
        c.fillStyle = f.c; c.globalAlpha = 1 - k;
        c.beginPath(); c.arc(f.x * W, f.y * H, f.r * (1 - k * .5), 0, TAU); c.fill();
        c.globalAlpha = 1;
      }
    }

    // scan lines — every front carries one, so they read as footage
    c.globalAlpha = .05; c.fillStyle = '#000';
    for (let y = (t * 22) % 4; y < H; y += 4) c.fillRect(0, y, W, 1);
    c.globalAlpha = 1;

    // banner
    if (b.banner && b.t < b.banner.until) {
      const k = 1 - (b.banner.until - b.t) / 4;
      const app = Math.min(1, k * 6);
      c.globalAlpha = app;
      c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(0, H * .38, W, H * .17);
      c.fillStyle = b.banner.tone === 'evil' ? '#ff4612' : '#ffffff';
      c.textAlign = 'center';
      c.font = '200 ' + Math.round(W * .055) + 'px "Power Grotesk","Helvetica Neue",sans-serif';
      c.fillText(b.banner.text, W / 2, H * .48);
      c.fillStyle = 'rgba(255,255,255,.7)';
      c.font = '300 ' + Math.round(W * .022) + 'px "Power Grotesk","Helvetica Neue",sans-serif';
      c.fillText(b.banner.sub || '', W / 2, H * .515);
      c.globalAlpha = 1;
    }

    // edge: red when the line is close
    const allies = b.all.filter(function (a) { return a.team === 'ally' && a.alive; });
    const ratio = allies.length ? (allies.reduce(function (s, a) { return s + a.hp / a.maxHp; }, 0) / allies.length) : 0;
    if (ratio < 0.4) {
      const p = (0.4 - ratio) / 0.4 * (0.5 + Math.sin(t * 4) * .2);
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, 'rgba(255,70,18,' + p * .5 + ')'); g.addColorStop(.5, 'rgba(255,70,18,0)');
      g.addColorStop(1, 'rgba(255,70,18,' + p * .5 + ')');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
    }

    // surprise vignette
    const sp = b.events.filter(function (e) { return e.kind === 'surprise' && b.t < e.until; })[0];
    if (sp) {
      const k = (sp.until - b.t) / 3.2;
      c.strokeStyle = sp.side === 'ally' ? 'rgba(255,255,255,' + (k * .5) + ')' : 'rgba(255,70,18,' + (k * .7) + ')';
      c.lineWidth = 6;
      c.strokeRect(3, 3, W - 6, H - 6);
    }

    // flash
    if (this.flash > 0.01) {
      c.fillStyle = 'rgba(255,255,255,' + this.flash * .35 + ')'; c.fillRect(0, 0, W, H);
      this.flash = Math.max(0, this.flash - dt * 2.6);
    }

    c.restore();
  };

  Field.prototype.drawActor = function (c, a, X, Y, t, W, H) {
    const x = X(a), y = Y(a);
    const s = Math.max(9, W * 0.021) * (a.role === 'boss' ? 1.35 : 1);
    const col = (a.isVehicle && a.def.combat && a.def.combat.color)
              || a.def.color
              || (a.team === 'ally' ? '#ffffff' : '#ff4612');
    const hit = a.stagger > 0.5;
    const buffed = (a.buffs || []).some(function (b) { return b.kind === 'blessed' || b.kind === 'bastion' || b.kind === 'dodge' || b.kind === 'immortal'; });

    if (!a.alive) {
      c.globalAlpha = .3; c.strokeStyle = col; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(x - s, y - s); c.lineTo(x + s, y + s);
      c.moveTo(x + s, y - s); c.lineTo(x - s, y + s); c.stroke();
      c.globalAlpha = 1;
      return;
    }

    // shadow
    c.fillStyle = 'rgba(0,0,0,.4)';
    c.beginPath(); c.ellipse(x, y + s * 1.15, s * 1.05, s * .34, 0, 0, TAU); c.fill();

    // charged / held indicator
    if (a.team === 'ally' && (a.id === this.focusId || a.surprise)) {
      c.strokeStyle = a.id === this.focusId ? '#ffffff' : col;
      c.lineWidth = a.id === this.focusId ? 1.6 : 1.2;
      c.globalAlpha = .8;
      c.beginPath(); c.arc(x, y, s * 1.7, 0, TAU); c.stroke();
      c.globalAlpha = 1;
    }
    if (buffed) {
      c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1;
      c.beginPath(); c.arc(x, y, s * 2.05, t * 1.4, t * 1.4 + 2.2); c.stroke();
    }

    // body
    c.fillStyle = hit ? '#ffffff' : col;
    c.save();
    c.translate(x, y);
    if (a.stagger > 0.5) c.globalAlpha = .7;
    // a vehicle is a machine, not a person: it gets its own silhouette and
    // sits slightly smaller, so it never reads as the fight's main subject
    const gl = a.isVehicle ? (VEH_GLYPH[a.def.id] || GLYPH.strange)
                          : (GLYPH[a.def.id] || GLYPH.strange);
    if (a.isVehicle) { c.scale(.82, .82); c.rotate(Math.sin(t * 0.9) * 0.04); }
    gl(c, s);
    c.restore();
    c.globalAlpha = 1;

    // role mark — heroes only. a vehicle never carries one: it does not fill
    // a role on this front, it just turns up.
    if (!a.isVehicle && (a.team === 'ally' || a.role === 'boss')) {
      c.fillStyle = a.team === 'ally' ? 'rgba(0,0,0,.75)' : '#ff4612';
      const rm = ROLE_MARK[a.role] || ROLE_MARK.dps;
      c.save(); c.translate(x + s * 1.5, y - s * 1.5); c.scale(.42, .42); rm(c, s); c.restore();
    }

    // hp bar
    const bw = s * 2.6, frac = Math.max(0, a.hp / a.maxHp);
    c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(x - bw / 2, y - s * 1.95, bw, 2.6);
    c.fillStyle = a.team === 'ally' ? '#ffffff' : '#ff4612';
    c.fillRect(x - bw / 2, y - s * 1.95, bw * frac, 2.6);

    // super meter pips under the held actor
    if (a.team === 'ally' && !a.isVehicle && a.id === this.focusId) {
      const mx = x - bw / 2, my = y - s * 2.6, mw = bw;
      c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(mx, my, mw, 2.2);
      c.fillStyle = '#ff4612';
      c.fillRect(mx, my, mw * Math.min(1, a.super / 100), 2.2);
      c.fillStyle = 'rgba(255,255,255,.4)';
      c.fillRect(mx + mw * 0.26, my, 1, 2.2);
      c.fillRect(mx + mw * 0.58, my, 1, 2.2);
    }

    // a vehicle's charge, drawn under its hull — it fills as it is spent
    // and goes bright when the ability is worth calling in
    if (a.isVehicle) {
      const mx = x - bw / 2, my = y - s * 2.45, mw = bw;
      const ab = a.def.combat.ability;
      const full = a.energy >= ab.cost;
      c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(mx, my, mw, 2.2);
      c.fillStyle = full ? '#ffd24f' : 'rgba(255,210,79,.45)';
      c.fillRect(mx, my, mw * Math.min(1, a.energy / a.maxEnergy), 2.2);
      if (full) { c.globalAlpha = .3 + Math.sin(t * 3) * .2; c.fillRect(mx, my, mw, 2.2); c.globalAlpha = 1; }
    }

    // name
    if (W > 420) {
      c.fillStyle = a.team === 'ally' ? 'rgba(255,255,255,.85)' : 'rgba(255,70,18,.9)';
      c.font = '300 ' + Math.round(W * 0.0155) + 'px "Power Grotesk","Helvetica Neue",sans-serif';
      c.textAlign = 'center';
      c.fillText(a.name, x, y + s * 2.5);
    }

    // charge beam
    if (a.channel && a.channel.t && a.channel.t.alive) {
      c.strokeStyle = col; c.lineWidth = 3 * (1 - (a.busy / 2.2));
      c.beginPath(); c.moveTo(x, y); c.lineTo(X(a.channel.t), Y(a.channel.t)); c.stroke();
    }
  };

  root.FIELD = { Field: Field, GLYPH: GLYPH, VEH_GLYPH: VEH_GLYPH, ROLE_MARK: ROLE_MARK };
})(window);
