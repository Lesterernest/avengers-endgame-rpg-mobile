/* ============================================================
   footage.js — the cinematic layer.
   three separate systems share one stage:
     1. story footage   — full-stage interruptions, random moments
     2. power casts     — short camera treatment on a hero's own field
     3. surprise cuts   — a stinger when a rare character enters
   all of it is generated: procedural canvas, no borrowed footage.
   ============================================================ */
(function (root) {
  'use strict';

  const TAU = Math.PI * 2;
  const rnd = function (a, b) { return a + Math.random() * (b - a); };
  const pick = function (a) { return a[(Math.random() * a.length) | 0]; };

  /* ============================================================
     1. story footage — the full-stage interruption
     ============================================================ */

  const GLYPHS = {
    'reset': 'the compound is not a building. it is a sentence somebody finished',
    'break': 'there is a version of this where you come back and it works',
    'wait': 'the signal counts. you have been counted',
    'cross': 'every road in this state ends at a body of water',
    'witness': 'the tesseract does not lead to san francisco. it leads where it is',
    'shear': 'i saw the other side of the orb. it was not empty. i did not like what was there'
  };

  const FORMS = {
    'Alva Ackerman, 11':  'A-11. registered. one hundred percent. a miracle, and then it was just an accident',
    'Samuel Ackerman, 9': 'S-09. in a car seat. asleep. did not wake up',
    'Priya Rao, 34':      'P-34. her card still works everywhere in central florida',
    'Marisol Vega, 27':   'M-27. was mid-sentence. the sentence is still there in her phone',
    'Kwame Boateng, 41':  'K-41. he was the one who called it in. he called it in twice',
    'Eden Cho, 6':        'E-06. she was on a swing at the park. the swing is still there',
    'Tomas Reyes, 52':    'T-52. no dependents. the mail still goes to his door',
    'Hana Okonkwo, 19':   'H-19. first day of college. the dorm room is still assigned',
    'Bo Whittaker, 8':    'B-08. counted his wands out loud. got to four',
    'Ruth Delgado, 63':   'R-63. kept bees. the bees are fine. that is the part nobody believes'
  };

  function randName() { return pick(Object.keys(FORMS)); }

  function makeClips() {
    const names = Object.keys(FORMS);
    for (let i = names.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = names[i]; names[i] = names[j]; names[j] = t; }
    return names.map(function (n) { return { who: n, text: FORMS[n] }; });
  }

  /* ---------- scene painters: one grammar per kind ---------- */

  const PAINT = {
    replay: function (c, W, H, t, f) {
      // ground / interior, side-lit, with a figure
      const k = f.p;
      c.fillStyle = '#07070a'; c.fillRect(0, 0, W, H);
      const hz = H * (0.62 - k * 0.04);
      c.fillStyle = '#0d0d11'; c.fillRect(0, hz, W, H - hz);
      c.fillStyle = 'rgba(255,255,255,.05)';
      for (let i = 0; i < 30; i++) {
        const x = (i * 91 + 13) % W;
        c.fillRect(x, hz - H * 0.06 * ((i % 5) / 5), 1.4, 1.4);
      }
      c.fillStyle = 'rgba(255,255,255,.09)';
      c.fillRect(0, hz - 2, W, 2);
      // figure
      const fx = W * (0.2 + f.jitter * 0.5), fy = hz + H * 0.06;
      const s = H * 0.2;
      c.fillStyle = 'rgba(255,255,255,.2)';
      c.beginPath(); c.arc(fx, fy - s, s * 0.3, 0, TAU); c.fill();
      c.fillRect(fx - s * 0.34, fy - s * 0.7, s * 0.68, s * 1.4);
      c.fillStyle = 'rgba(255,255,255,.3)';
      c.beginPath(); c.ellipse(fx + s * 1.4, fy + s * 0.2, s * 1.1, s * 0.3, 0, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,70,18,.1)';
      c.beginPath(); c.arc(fx, fy - s * 0.4, s * 2.2, 0, TAU); c.fill();
    },
    glitch: function (c, W, H, t, f) {
      c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
      const bands = 9;
      for (let i = 0; i < bands; i++) {
        const y = (i / bands) * H;
        const hgt = H / bands;
        const off = (Math.sin(t * 6 + i * 1.7) * 0.5 + 0.5) * W * 0.12 * (0.3 + f.p);
        c.fillStyle = i % 2 ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.02)';
        c.fillRect(-off, y, W, hgt * 0.8);
        if (i % 3 === 0) {
          c.fillStyle = 'rgba(255,70,18,' + (0.08 + Math.abs(Math.sin(t * 4 + i)) * 0.12) + ')';
          c.fillRect(rnd(0, W * 0.4), y, rnd(W * 0.1, W * 0.6), hgt * 0.3);
        }
      }
      for (let i = 0; i < 40; i++) {
        c.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.2) + ')';
        c.fillRect(Math.random() * W, Math.random() * H, rnd(6, 40), 1.2);
      }
    },
    signal: function (c, W, H, t, f) {
      c.fillStyle = '#020806'; c.fillRect(0, 0, W, H);
      c.strokeStyle = 'rgba(255,70,18,.5)'; c.lineWidth = 1.4;
      c.beginPath();
      for (let x = 0; x <= W; x += 6) {
        const y = H / 2 + Math.sin(x * 0.02 + t * 2) * H * 0.1 * (1 - f.p * 0.6)
          + (Math.random() - .5) * H * 0.05 * (1 - f.p * 0.8);
        if (x === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.14)';
      for (let i = 1; i < 5; i++) { c.beginPath(); c.moveTo(0, H * i / 5); c.lineTo(W, H * i / 5); c.stroke(); }
      c.fillStyle = 'rgba(255,70,18,' + (0.1 + Math.sin(t * 3) * .06) + ')';
      c.fillRect(0, H / 2 - H * 0.1, W, H * 0.2);
    }
  };

  /* ---------- a playback ---------- */

  function Playback(footage) {
    this.f = footage;
    this.dur = footage.dur;
    this.t = 0;
    this.clips = makeClips();
    this.done = false;
  }
  Playback.prototype.update = function (dt) {
    this.t += dt;
    if (this.t >= this.dur) this.done = true;
  };
  Playback.prototype.p = function () { return Math.min(1, this.t / this.dur); };
  Playback.prototype.glyph = function () { return GLYPHS[pick(Object.keys(GLYPHS))]; };

  /* ============================================================
     the stage — a full-viewport canvas above the game
     ============================================================ */

  function Stage(canvas) {
    this.cv = canvas;
    this.cx = canvas.getContext('2d');
    this.play = null;
    this.overlay = null;     // power cast treatment
    this.overlayT = 0;
    this.pending = [];
    this.paused = false;
    this.onEnd = null;
  }

  Stage.prototype.resize = function () {
    const dpr = root.canvasDpr ? root.canvasDpr() : Math.min(2, root.devicePixelRatio || 1);
    this.cv.width = Math.round(root.innerWidth * dpr);
    this.cv.height = Math.round(root.innerHeight * dpr);
    this.dpr = dpr;
  };

  /* story footage: a full interruption, queued so two never overlap */
  Stage.prototype.queueFootage = function (f) {
    if (this.play || this.paused) { this.pending.push({ t: 'footage', f: f }); return false; }
    this.startFootage(f);
    return true;
  };

  Stage.prototype.startFootage = function (f) {
    this.play = new Playback(f);
    const el = document.getElementById('footage-card');
    const g = document.getElementById('footage-glyph');
    if (el) {
      el.querySelector('.fc-tag').textContent = f.tag;
      el.querySelector('.fc-title').textContent = f.title;
      el.querySelector('.fc-text').textContent = f.text;
      el.classList.add('on');
    }
    if (g) g.textContent = this.play.glyph();
  };

  Stage.prototype.endFootage = function () {
    this.play = null;
    const el = document.getElementById('footage-card');
    if (el) el.classList.remove('on');
  };

  /* power cast: a short, in-place camera move tied to the casting field */
  Stage.prototype.overlayCast = function (data) {
    this.overlay = data;
    this.overlayT = 0;
    const el = document.getElementById('cast-card');
    if (el) {
      el.classList.add('on');
      el.classList.toggle('evil', data.tone === 'evil');
      const tier = el.querySelector('.ct-tier');
      const nm = el.querySelector('.ct-name');
      const sm = el.querySelector('.ct-sub');
      const tick = el.querySelector('.ct-tick');
      if (tier) tier.textContent = data.tierLabel || 'power';
      if (nm) nm.textContent = data.name;
      if (sm) sm.textContent = data.sub || '';
      if (tick) tick.textContent = data.hud || '';
    }
  };

  Stage.prototype.update = function (dt) {
    if (this.play) {
      this.play.update(dt);
      if (this.play.done) {
        this.endFootage();
        if (this.onEnd) this.onEnd();
        const p = this.pending.shift();
        if (p && p.t === 'footage') this.startFootage(p.f);
      }
    }
    if (this.overlay) {
      this.overlayT += dt;
      if (this.overlayT > 1.25) {
        this.overlay = null;
        const el = document.getElementById('cast-card');
        if (el) el.classList.remove('on');
      }
    }
  };

  Stage.prototype.busy = function () { return !!(this.play || this.overlay); };

  /* ---------- draw the full-stage footage ---------- */
  Stage.prototype.draw = function (dt) {
    if (!this.play) return;
    const c = this.cx, W = root.innerWidth, H = root.innerHeight;
    const f = this.play, p = f.p;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, W, H);

    const fadeIn = Math.min(1, p * 9);
    const fadeOut = Math.min(1, (1 - p) * 8);
    const a = Math.min(fadeIn, fadeOut);

    // bars close in
    const barH = H * 0.11 * Math.min(1, p * 5) * Math.min(1, (1 - p) * 5);
    c.fillStyle = '#000';
    c.fillRect(0, 0, W, barH);
    c.fillRect(0, H - barH, W, barH);

    // scene, letterboxed between the bars
    const y0 = barH, hh = H - barH * 2;
    c.save();
    c.beginPath(); c.rect(0, y0, W, hh); c.clip();
    c.globalAlpha = a;
    (PAINT[f.f.kind] || PAINT.glitch)(c, W, hh, f.t, f);
    c.globalAlpha = 1;

    // desaturation + vignette
    const vg = c.createRadialGradient(W / 2, hh / 2, hh * 0.2, W / 2, hh / 2, hh * 0.85);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.7)');
    c.fillStyle = vg; c.fillRect(0, y0, W, hh);

    // chip
    if (p > 0.2 && p < 0.9 && Math.random() < 0.25) {
      c.fillStyle = 'rgba(255,255,255,.14)';
      c.fillRect(0, y0 + Math.random() * hh, W, rnd(2, 18));
    }

    // the field: a list, counting down
    const showList = p > 0.28;
    if (showList) {
      const lk = Math.min(1, (p - 0.28) * 6);
      c.globalAlpha = lk;
      const n = Math.min(5, Math.max(1, Math.round(lk * 5.2)));
      const start = Math.floor(p * 40) % 6;
      c.fillStyle = '#ffffff';
      c.textAlign = 'left';
      c.font = '200 ' + Math.round(hh * 0.075) + 'px "Power Grotesk","Helvetica Neue",sans-serif';
      c.fillText('_ _ ' + randName(), W * 0.08, y0 + hh * 0.18);
      c.fillStyle = 'rgba(255,255,255,.72)';
      c.font = '300 ' + Math.round(hh * 0.026) + 'px "Power Grotesk","Helvetica Neue",sans-serif';
      for (let i = 0; i < n; i++) {
        const cl = f.clips[(start + i) % f.clips.length];
        c.fillText(cl.text, W * 0.08, y0 + hh * (0.3 + i * 0.062));
      }
      c.fillStyle = '#ff4612';
      c.font = '300 ' + Math.round(hh * 0.022) + 'px "Power Grotesk","Helvetica Neue",sans-serif';
      c.fillText('one of these is why the count is correct', W * 0.08, y0 + hh * (0.32 + n * 0.062));
      c.globalAlpha = 1;
    }
    c.restore();

    // letterbox edge lines
    c.fillStyle = 'rgba(255,255,255,.16)';
    c.fillRect(0, y0 - 1, W, 1);
    c.fillRect(0, y0 + hh, W, 1);

    // hud: timecode, tag, glyph — os3 house style
    const tc = f.t.toFixed(2).padStart(5, '0');
    c.fillStyle = 'rgba(255,255,255,.85)';
    c.textAlign = 'left';
    c.font = '300 20px "Power Grotesk","Helvetica Neue",sans-serif';
    c.fillText('REC  ' + tc, W * 0.03, y0 + hh * 0.07);
    c.fillStyle = '#ff4612';
    c.fillText(f.f.tag, W * 0.03, y0 + hh * 0.99);
    c.textAlign = 'right';
    c.fillStyle = 'rgba(255,255,255,.7)';
    c.fillText('shd // 2.39 : 1', W * 0.97, y0 + hh * 0.07);
  };

  root.FOOTAGE = {
    Stage: Stage,
    GLYPHS: GLYPHS,
    clipLine: function () { const c = makeClips(); return c[0]; }
  };
})(window);
