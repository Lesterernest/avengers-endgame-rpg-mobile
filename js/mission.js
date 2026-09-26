/* ============================================================
   mission.js — the non-combat layer.
   seven verbs, one canvas grammar, one timer, and a failure that
   costs somebody instead of saying "try again".
   ============================================================ */
(function (root) {
  'use strict';

  const GD = root.GD;
  const TAU = Math.PI * 2;
  const rnd = function (a, b) { return a + Math.random() * (b - a); };
  const rndi = function (a, b) { return a + ((Math.random() * (b - a + 1)) | 0); };
  const clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  const pick = function (a) { return a[(Math.random() * a.length) | 0]; };
  const shuffle = function (a) { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = r[i]; r[i] = r[j]; r[j] = t; } return r; };

  const GLYPH = 'ABCDEFGHJKLMNPRSTUVWXYZ23456789#$%&';

  /* ============================================================
     CASE — everything the missions and the story share:
     the clue board, the solved threads, the ledger, and the
     modifiers the missions hand to the battle engine.
     ============================================================ */

  function Case() {
    this.clues = {};        // id -> clue
    this.order = [];        // discovery order, for the board
    this.threads = {};      // id -> { solved, wrong }
    this.ledger = {};       // id -> true|false (survivor lost)
    this.lostHeroes = {};   // hero id -> they are not coming back
    this.closedPlaces = {}; // florida id -> the door/place is shut
    this.mods = { foeHp: 0, foeAtk: 0, extraWave: 0, charge: 0, heal: 0, surprise: null };
    this.results = {};      // missionId -> 'won' | 'lost'
    this.log = [];          // readable history
  }

  Case.prototype.has = function (id) { return !!this.clues[id]; };
  Case.prototype.count = function () { return this.order.length; };

  Case.prototype.addClue = function (id) {
    const c = GD.CLUE_BY_ID[id];
    if (!c || this.clues[id]) return null;
    this.clues[id] = c;
    this.order.push(id);
    this.log.push({ kind: 'clue', text: 'evidence logged: ' + c.label + ' — ' + c.line });
    return c;
  };

  /* a thread only appears on the board once there is enough evidence
     to justify it, and only draws one line per pair of clues it
     actually uses. */
  Case.prototype.threadFor = function (act) {
    for (let i = 0; i < GD.THREADS.length; i++) {
      const t = GD.THREADS[i];
      if (this.threads[t.id] || t.act > act) continue;
      if (this.count() >= t.need) return t;
    }
    return null;
  };

  Case.prototype.solveThread = function (threadId, ok) {
    const t = GD.THREADS.filter(function (x) { return x.id === threadId; })[0];
    if (!t) return null;
    this.threads[threadId] = { solved: ok, wrong: 0 };
    this.log.push({ kind: ok ? 'thread' : 'thread-bad', text: 'conclusion (' + t.question + '): ' + (ok ? 'held' : 'unproven') });
    return t;
  };

  Case.prototype.answerThread = function (threadId, ok) {
    const st = this.threads[threadId];
    if (st && st.solved) return true;
    const t = GD.THREADS.filter(function (x) { return x.id === threadId; })[0];
    if (!t) return false;
    this.threads[threadId] = { solved: ok, wrong: (st ? st.wrong : 0) + (ok ? 0 : 1) };
    this.log.push({ kind: ok ? 'thread' : 'thread-bad', text: 'conclusion (' + t.question + '): ' + (ok ? 'held' : 'unproven') });
    return ok;
  };

  Case.prototype.lose = function (id) {
    this.ledger[id] = false;
    const l = GD.LEDGER.filter(function (x) { return x.id === id; })[0];
    if (l) this.log.push({ kind: 'loss', text: l.who + ' is no longer on the count. ' + l.note });
  };

  Case.prototype.aliveCount = function () {
    let n = 0;
    for (let i = 0; i < GD.LEDGER.length; i++) if (this.ledger[GD.LEDGER[i].id] !== false) n++;
    return n;
  };

  Case.prototype.mod = function (key) { return this.mods[key] || 0; };

  Case.prototype.apply = function (res, mission) {
    const m = res.mod || {};
    if (m.foeHp) this.mods.foeHp += m.foeHp;
    if (m.foeAtk) this.mods.foeAtk += m.foeAtk;
    if (m.extraWave) this.mods.extraWave += m.extraWave;
    if (m.charge) this.mods.charge += m.charge;
    if (m.heal) this.mods.heal += m.heal;
    if (m.surprise) this.mods.surprise = m.surprise;
    if (res.lose) this.lose(res.lose);

    // the three ways a failure takes something real
    if (res.cost === 'place' && res.place) {
      this.closedPlaces[res.place] = true;
      const p = GD.FLORIDA_BY_ID[res.place];
      this.log.push({ kind: 'loss', text: (p ? p.name : res.place) + ' is closed to us for the rest of this run. the address is gone.' });
    }
    if (res.cost === 'hero' && res.who && this.lostHeroes[res.who] !== true) {
      this.lostHeroes[res.who] = true;
      this.log.push({ kind: 'loss', text: res.who + ' is not coming back. that front runs a thinner line from here on.' });
    }

    this.results[mission.id] = res.pass ? 'won' : 'lost';
    this.log.push({ kind: res.pass ? 'win' : 'fail', text: mission.title + ' — ' + (res.pass ? 'clean' : 'it cost us') });
  };

  /* what a failure actually took, in one place, for the ledger panel */
  Case.prototype.costs = function () {
    const out = [];
    const self = this;
    this.log.forEach(function (l) { if (l.kind === 'loss') out.push(l.text); });
    return out;
  };
  Case.prototype.isClosed = function (placeId) { return !!this.closedPlaces[placeId]; };
  Case.prototype.isLost = function (heroId) { return !!this.lostHeroes[heroId]; };

  /* ---------- evidence chain, for the board drawing ---------- */
  Case.prototype.chain = function () {
    const out = [];
    const ids = this.order;
    for (let i = 0; i + 1 < ids.length; i++) out.push([ids[i], ids[i + 1]]);
    return out;
  };

  /* ============================================================
     MISSION — one non-combat job.
     api: { case, onDone(result), stage, log }
     ============================================================ */

  function Mission(def, api) {
    this.d = def;
    this.api = api;
    this.t = def.timer;
    this.done = false;
    this.result = null;
    this.flash = 0;
    this.shake = 0;
    this.el = 0;             // scene clock, always runs
    this.feedback = '';
    this.feedbackT = 0;
    this.tone = 'neutral';
    this.init();
  }

  Mission.prototype.say = function (s, tone) { this.feedback = s; this.feedbackT = 2.6; if (tone) this.tone = tone; };

  Mission.prototype.init = function () {
    const kind = this.d.kind;
    if (kind === 'wheel') {
      this.rings = 4;
      this.targets = [];
      this.rot = [];
      for (let i = 0; i < 4; i++) { this.targets.push((Math.random() * 10) | 0); this.rot.push(rndi(0, 9)); }
      this.seg = 10;
      this.solved = false;
    } else if (kind === 'grid') {
      this.n = 6; this.alarms = 3; this.alarmsHit = 0;
      this.pos = { x: 0, y: 5 };
      this.path = [{ x: 0, y: 5 }];
      this.alarmSet = {};
      for (let i = 0; i < 7; i++) { const x = rndi(0, 5), y = rndi(0, 4); this.alarmSet[x + ',' + y] = 1; }
      this.goal = { x: 5, y: 0 };
      // the console tile is the way in, never a tripwire — reaching it should
      // never be what kills you
      delete this.alarmSet[this.goal.x + ',' + this.goal.y];
      // nor is the tile you start on
      delete this.alarmSet[this.pos.x + ',' + this.pos.y];
      this.goalGuard = true;
      this.solved = false;
    } else if (kind === 'order') {
      this.items = shuffle([
        { l: 'bay 04, doors logged 22:41', v: 41 },
        { l: 'bay 09, doors logged 22:44', v: 44 },
        { l: 'bay 01, doors logged 22:58', v: 58 },
        { l: 'bay 11, doors logged 23:02', v: 62 },
        { l: 'bay 07, doors logged 23:09', v: 69 },
        { l: 'bay 03, doors logged 23:15', v: 75 },
        { l: 'bay 12, doors logged 23:24', v: 84 },
        { l: 'bay 02, doors logged 23:40', v: 100 }
      ]);
      this.slots = new Array(this.items.length).fill(null);
      this.solved = false;
    } else if (kind === 'talk') {
      this.rounds = 3;
      this.round = 0;
      this.tol = 3;
      this.used = 0;
      this.talks = [
        { q: 'wong: you have used the branch before. why should I allow it again?',
          o: [
            { t: 'because we did not know it was here', ok: true, why: 'honest. he prefers honest, it costs him less.' },
            { t: 'because we are going to need it and you know it', ok: false, why: 'that is a bill, and he has read this one.' },
            { t: 'because you told strange to tell us where to stand', ok: false, why: 'he did not. he allowed it. those are different words and he knows yours is wrong.' }
          ] },
        { q: 'wong: if it crosses the threshold, what stops it replacing the address?',
          o: [
            { t: 'the line holds while a body stands in the doorway', ok: true, why: 'a door needs a hinge. you are offering a hinge.' },
            { t: 'we will cut the power to the plaza', ok: false, why: 'the plaza is not what is powered. he is disappointed on your behalf.' },
            { t: 'nothing, but we will be faster next time', ok: false, why: 'candour without a plan. he closes on this one.' }
          ] },
        { q: 'wong: last thing. why florida?',
          o: [
            { t: 'because the queue is being read out in this state, and nowhere else', ok: true, why: 'evidence, not heroics. the branch stays open.' },
            { t: 'because there is more of us here', ok: false, why: 'there are not. he knows the return list, and this state is thin on it.' },
            { t: 'because it is warm', ok: false, why: 'it is warm everywhere. you have not read anything yet.' }
          ] }
      ];
    } else if (kind === 'lock') {
      this.drift = rnd(-1, 1);
      this.v = rnd(0.3, 0.7);
      this.held = false;
      this.holdT = 0;
      this.acc = 0;
      this.solved = false;
    } else if (kind === 'deduce') {
      const chain = [
        { claim: 'the signal is terrestrial, not orbital',
          right: 'radio', wrong: ['manifest', 'tape'] },
        { claim: 'something in florida filed it as work, not as a threat',
          right: 'doorway', wrong: ['swing', 'manifest'] },
        { claim: 'one hand wrote the manifest, the wall survey and the lease',
          right: 'manifest', wrong: ['tape', 'swing'] },
        { claim: 'the fragment was placed, not found',
          right: 'cooler', wrong: ['radio', 'doorway'] }
      ];
      const have = Object.keys(this.api.case.clues);
      this.steps = chain.filter(function (s) { return have.indexOf(s.right) >= 0; });
      if (!this.steps.length) this.steps = [chain[0]];
      this.step = 0;
      this.solved = false;
    } else if (kind === 'timing') {
      this.passes = 3;
      this.pass = 0;
      this.sweep = 0;
      this.dir = 1;
      this.band = { c: rnd(.3, .7), w: .17 };
      this.solved = false;
    }
  };

  /* ---------- per-kind interaction ---------- */

  Mission.prototype.gridClick = function (x, y) {
    if (this.done) return;
    const p = this.pos;
    if (Math.abs(x - p.x) + Math.abs(y - p.y) !== 1) { this.say('that is not adjacent. you have one body.'); return; }
    if (x < 0 || y < 0 || x > this.n - 1 || y > this.n - 1) return;
    p.x = x; p.y = y;
    this.path.push({ x: x, y: y });
    this.shake = 0.2;
    if (this.alarmSet[x + ',' + y]) {
      this.alarmsHit++;
      this.flash = 1;
      this.shake = 0.8;
      this.api.stage.overlayCast({ name: 'alarm node ' + (this.alarms - this.alarmsHit) + ' left', sub: 'somebody on the roof now knows somebody is on the roof', tierLabel: 'hack', tone: 'evil', hud: 'pad 14 // access grid' });
      if (this.alarmsHit >= this.alarms) return this.fail('the roof lights came on. the window closed with them still on the pad.');
      this.say('alarm. ' + (this.alarms - this.alarmsHit) + ' left before the window shuts.', 'bad');
    } else {
      this.say('clean step. ' + (this.path.length - 1) + ' of 8 to the console.');
    }
    if (x === this.goal.x && y === this.goal.y) this.win();
  };

  Mission.prototype.ringClick = function (i, dir) {
    if (this.done) return;
    this.rot[i] = (this.rot[i] + (dir || 1) + this.seg) % this.seg;
    this.api.stage.overlayCast({ name: 'ring ' + (i + 1) + ' / 4', sub: 'the burst rotates on its own schedule. you are not faster than it, you are just earlier.', tierLabel: 'decrypt', tone: 'ally', hud: 'interception // four rings' });
    let ok = true;
    for (let k = 0; k < 4; k++) if (this.rot[k] !== this.targets[k]) ok = false;
    if (ok) this.win();
  };

  Mission.prototype.slotClick = function (i) {
    if (this.done) return;
    const free = this.slots.indexOf(null);
    if (free < 0) return;
    this.slots[free] = i;
    const used = this.slots.filter(function (s) { return s !== null; }).length;
    this.say('position ' + (free + 1) + ' of ' + this.slots.length + ' — ' + this.items[i].l);
    if (used === this.slots.length) {
      let ok = true;
      for (let k = 0; k < this.slots.length; k++) {
        if (this.items[this.slots[k]].v !== this.items[k].v) ok = false;
      }
      if (ok) this.win();
      else { this.t = Math.max(4, this.t - 12); this.shake = .6; this.say('the water took twelve seconds of that. the order is still wrong.', 'bad'); }
    }
  };

  Mission.prototype.talkPick = function (i) {
    if (this.done) return;
    const r = this.talks[this.round];
    const o = r.o[i];
    this.used++;
    this.say(o.why, o.ok ? 'good' : 'bad');
    if (o.ok) {
      this.round++;
      if (this.round >= this.rounds) return this.win();
      this.api.stage.overlayCast({ name: 'wong', sub: r.q, tierLabel: 'negotiate', tone: 'ally', hud: 'sanctum branch // plaza' });
    } else {
      this.tol--;
      this.t = Math.max(3, this.t - 8);
      this.shake = .5;
      if (this.tol <= 0) return this.fail('he closed the branch mid-sentence. the doorway in the plaza is a doorway to the parking lot now, permanently, for everybody.');
    }
  };

  Mission.prototype.deducePick = function (i) {
    if (this.done) return;
    const s = this.steps[this.step];
    const have = Object.keys(this.api.case.clues);
    const ids = [s.right].concat(s.wrong.filter(function (w) { return have.indexOf(w) >= 0; }));
    const chosen = ids[i];
    if (chosen === s.right) {
      this.step++;
      this.say('that is the one that supports it.', 'good');
      if (this.step >= this.steps.length) return this.win();
    } else {
      this.t = Math.max(6, this.t - 18);
      this.shake = .7;
      this.flash = .8;
      const c = GD.CLUE_BY_ID[chosen];
      this.say((c ? c.label : 'that') + ' does not say that. you are burning the window.', 'bad');
    }
  };

  Mission.prototype.passClick = function () {
    if (this.done) return;
    const d = Math.abs(this.sweep - this.band.c);
    this.pass++;
    if (d <= this.band.w) {
      this.say('pass ' + this.pass + ' held. ' + (this.passes - this.pass) + ' left.', 'good');
      this.api.stage.overlayCast({ name: 'pass ' + this.pass + ' of ' + this.passes, sub: 'the sweep went over the cistern and came back. somebody up there is still standing.', tierLabel: 'rescue', tone: 'ally', hud: 'st. augustine // cistern nineteen' });
      this.band = { c: rnd(.25, .75), w: Math.max(.09, this.band.w - .03) };
      if (this.pass >= this.passes) return this.win();
    } else {
      this.t = Math.max(5, this.t - 15);
      this.shake = 1;
      this.flash = 1;
      this.say('the sweep did not stop. it is past the band.', 'bad');
      this.api.stage.overlayCast({ name: 'pass ' + this.pass + ' — miss', sub: 'the water took the gap and the gap was a person', tierLabel: 'rescue', tone: 'evil', hud: 'st. augustine // cistern nineteen' });
    }
  };

  /* ---------- outcomes ---------- */

  Mission.prototype.win = function () {
    if (this.done) return;
    this.done = true; this.result = { pass: true, mod: this.d.onSucceed.mod, clues: this.d.onSucceed.clues || [] };
    this.flash = 1; this.shake = 1;
    this.api.stage.overlayCast({ name: this.d.title, sub: this.d.stakes, tierLabel: this.d.verb, tone: 'ally', hud: this.d.where });
    this.api.onDone(this.result);
  };

  Mission.prototype.fail = function (why) {
    if (this.done) return;
    this.done = true;
    const f = this.d.onFail;
    this.result = {
      pass: false, mod: f.mod, why: why,
      cost: f.cost || '', who: f.who || '', place: f.place || '',
      lose: f.lose || ''
    };
    this.flash = 1; this.shake = 1.2;
    this.api.stage.overlayCast({ name: this.d.title + ' — failed', sub: why, tierLabel: this.d.verb, tone: 'evil', hud: this.d.where });
    this.api.onDone(this.result);
  };

  Mission.prototype.update = function (dt) {
    this.el += dt;
    this.flash = Math.max(0, this.flash - dt * 1.6);
    this.shake = Math.max(0, this.shake - dt * 1.8);
    this.feedbackT = Math.max(0, this.feedbackT - dt);
    if (this.done) return;
    this.t -= dt;
    if (this.t <= 0) { this.t = 0; return this.fail('the window closed. ' + (this.d.onFail.why || 'it did not matter what you were nearly right about.')); }
    const k = this.d.kind;
    if (k === 'lock') {
      // the hold fights: keep the reticle inside tolerance by braking
      this.drift += rnd(-1, 1) * dt * 1.4;
      this.v += this.drift * dt * 0.9;
      if (this.held) { this.v *= 0.965; this.drift *= 0.94; this.holdT += dt; }
      else { this.v *= 0.995; }
      this.v = clamp(this.v, -0.9, 0.9);
      this.sweep = clamp(0.5 + this.v, 0.03, 0.97);
      const inTol = Math.abs(this.sweep - 0.5) < 0.055;
      this.acc += dt * (inTol ? 1 : -0.55);
      if (this.held && Math.abs(this.sweep - 0.5) < 0.12) this.say('holding. ' + Math.ceil(this.d.timer - this.el) + 's of the ninety.', 'good');
      else if (!this.held) this.say('the lock is drifting. hold it or it walks off.');
      if (this.acc >= this.d.timer) this.win();
    } else if (k === 'timing') {
      this.sweep += this.dir * dt * (0.30 + this.pass * 0.09);
      if (this.sweep > 0.95) { this.sweep = 0.95; this.dir = -1; }
      if (this.sweep < 0.05) { this.sweep = 0.05; this.dir = 1; }
    }
  };

  /* ---------- draw: the same language as the combat field ---------- */

  Mission.prototype.draw = function (c, W, H, dpr) {
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const t = this.el;
    c.clearRect(0, 0, W, H);
    c.save();
    const sx = (Math.random() - .5) * this.shake * 7, sy = (Math.random() - .5) * this.shake * 7;
    c.translate(sx, sy);

    // backdrop, per mission
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#06070a'); g.addColorStop(1, '#0b0c10');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    this.backdrop(c, W, H, t);

    const k = this.d.kind;
    if (k === 'wheel') this.drawWheel(c, W, H, t);
    else if (k === 'grid') this.drawGrid(c, W, H, t);
    else if (k === 'order') this.drawOrder(c, W, H, t);
    else if (k === 'talk') this.drawTalk(c, W, H, t);
    else if (k === 'lock') this.drawLock(c, W, H, t);
    else if (k === 'deduce') this.drawDeduce(c, W, H, t);
    else if (k === 'timing') this.drawTiming(c, W, H, t);

    c.restore();

    // scan lines + vignette, identical to the field
    c.globalAlpha = .05; c.fillStyle = '#000';
    for (let y = (t * 22) % 4; y < H; y += 4) c.fillRect(0, y, W, 1);
    c.globalAlpha = 1;
    const vg = c.createRadialGradient(W / 2, H / 2, H * .25, W / 2, H / 2, H * .9);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.75)');
    c.fillStyle = vg; c.fillRect(0, 0, W, H);
    if (this.flash > 0.01) { c.fillStyle = 'rgba(255,255,255,' + this.flash * .3 + ')'; c.fillRect(0, 0, W, H); }
  };

  Mission.prototype.backdrop = function (c, W, H, t) {
    const w = GD.FLORIDA_BY_ID[this.d.where] ? this.d.where : 'avenue';
    c.strokeStyle = 'rgba(255,255,255,.05)'; c.lineWidth = 1;
    for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(0, H * i / 9); c.lineTo(W, H * i / 9); c.stroke(); }
    if (w === 'titan') {
      c.fillStyle = 'rgba(255,70,18,.06)';
      c.beginPath(); c.arc(W * .8, H * .3, Math.min(W, H) * .18, 0, TAU); c.fill();
    } else if (w === 'stone') {
      c.strokeStyle = 'rgba(255,70,18,.3)'; c.lineWidth = 2;
      c.beginPath(); c.arc(W * .5, H * .5, Math.min(W, H) * .24, 0, TAU); c.stroke();
    } else if (w === 'aero') {
      c.strokeStyle = 'rgba(79,195,217,.3)';
      c.beginPath(); c.moveTo(0, H * .3); c.quadraticCurveTo(W * .5, H * .1, W, H * .34); c.stroke();
    } else if (w === 'staug') {
      c.fillStyle = 'rgba(255,255,255,.06)';
      for (let i = 0; i < 12; i++) c.fillRect(i * W / 12, H * .2, W / 30, H * .8);
    } else if (w === 'tampa') {
      c.strokeStyle = 'rgba(255,255,255,.14)'; c.lineWidth = 2;
      c.strokeRect(W * .1, H * .2, W * .35, H * .3);
    }
  };

  Mission.prototype.drawWheel = function (c, W, H, t) {
    const cx = W * .5, cy = H * .52, R = Math.min(W, H) * .34;
    for (let i = 0; i < 4; i++) {
      const r = R - i * (R * .16);
      c.strokeStyle = 'rgba(255,255,255,' + (0.5 - i * .08) + ')'; c.lineWidth = 1.4;
      c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.stroke();
      for (let s = 0; s < this.seg; s++) {
        const a = (s / this.seg) * TAU - Math.PI / 2 - this.rot[i] * (TAU / this.seg);
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        const on = s === this.targets[i];
        c.fillStyle = on ? '#ff4612' : 'rgba(255,255,255,.75)';
        c.beginPath(); c.arc(x, y, on ? 7 : 4.5, 0, TAU); c.fill();
        if (on) { c.strokeStyle = 'rgba(255,70,18,.5)'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 13 + Math.sin(t * 6) * 3, 0, TAU); c.stroke(); }
      }
    }
    c.fillStyle = 'rgba(255,255,255,.8)';
    c.font = '300 20px "Power Grotesk",sans-serif'; c.textAlign = 'center';
    c.fillText('align all four marks to the flash', cx, cy + R + 42);
  };

  Mission.prototype.drawGrid = function (c, W, H, t) {
    const pad = Math.min(W, H) * .12;
    const s = (Math.min(W, H) - pad * 2) / this.n;
    const ox = (W - s * this.n) / 2, oy = (H - s * this.n) / 2 - H * .04;
    for (let y = 0; y < this.n; y++) for (let x = 0; x < this.n; x++) {
      const a = this.alarmSet[x + ',' + y];
      c.fillStyle = a ? 'rgba(255,70,18,' + (0.12 + Math.sin(t * 3 + x + y) * .06) + ')' : 'rgba(255,255,255,.04)';
      c.fillRect(ox + x * s + 2, oy + y * s + 2, s - 4, s - 4);
      if (x === this.goal.x && y === this.goal.y) { c.strokeStyle = '#fff'; c.lineWidth = 2; c.strokeRect(ox + x * s + 6, oy + y * s + 6, s - 12, s - 12); }
    }
    c.strokeStyle = '#fff'; c.lineWidth = 2.4;
    c.beginPath();
    for (let i = 0; i < this.path.length; i++) { const p = this.path[i]; const x = ox + (p.x + .5) * s, y = oy + (p.y + .5) * s; if (i) c.lineTo(x, y); else c.moveTo(x, y); }
    c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(ox + (this.pos.x + .5) * s, oy + (this.pos.y + .5) * s, s * .16, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,70,18,.9)'; c.textAlign = 'center';
    c.font = '300 20px "Power Grotesk",sans-serif';
    c.fillText('alarms left: ' + (this.alarms - this.alarmsHit), W / 2, oy - 14);
  };

  Mission.prototype.drawOrder = function (c, W, H, t) {
    c.textAlign = 'center';
    c.fillStyle = 'rgba(255,255,255,.5)'; c.font = '300 20px "Power Grotesk",sans-serif';
    c.fillText('the code reads forward from the first door to the last', W / 2, H * .2);
    for (let i = 0; i < this.slots.length; i++) {
      const x = W * .12 + (i % 4) * W * .19, y = H * .34 + ((i / 4) | 0) * H * .22;
      c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 1; c.strokeRect(x, y, W * .16, H * .16);
      c.fillStyle = 'rgba(255,255,255,.35)'; c.font = '200 20px "Power Grotesk",sans-serif';
      c.fillText(String(i + 1), x + W * .08, y + H * .05);
      if (this.slots[i] !== null) {
        c.fillStyle = '#fff'; c.font = '300 18px "Power Grotesk",sans-serif';
        c.fillText(this.items[this.slots[i]].l, x + W * .08, y + H * .1);
      }
    }
  };

  Mission.prototype.drawTalk = function (c, W, H, t) {
    c.textAlign = 'center';
    const r = this.talks[Math.min(this.round, this.rounds - 1)];
    c.fillStyle = 'rgba(255,255,255,.85)'; c.font = '300 24px "Power Grotesk",sans-serif';
    wrap(c, r.q, W / 2, H * .3, W * .7, 30);
    c.fillStyle = 'rgba(255,70,18,.9)'; c.font = '300 20px "Power Grotesk",sans-serif';
    c.fillText('wong\'s patience: ' + '▮'.repeat(this.tol) + '▯'.repeat(3 - this.tol), W / 2, H * .68);
    c.fillStyle = 'rgba(255,255,255,.4)';
    c.fillText('exchange ' + Math.min(this.round + 1, this.rounds) + ' of ' + this.rounds, W / 2, H * .76);
  };

  Mission.prototype.drawLock = function (c, W, H, t) {
    const y = H * .55;
    c.fillStyle = 'rgba(255,255,255,.1)'; c.fillRect(W * .1, y - 3, W * .8, 6);
    c.fillStyle = 'rgba(95,160,58,.4)'; c.fillRect(W * (0.5 - .055), y - 12, W * .11, 24);
    c.strokeStyle = '#fff'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(W * this.sweep, y - 40); c.lineTo(W * this.sweep, y + 40); c.stroke();
    c.fillStyle = 'rgba(255,70,18,' + (0.4 + Math.abs(this.drift) * .4) + ')';
    c.beginPath(); c.arc(W * this.sweep, y, 10, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.8)'; c.textAlign = 'center'; c.font = '300 22px "Power Grotesk",sans-serif';
    c.fillText('hold to brake · ' + Math.max(0, Math.ceil(this.d.timer - this.el)) + 's of ninety', W / 2, y + 90);
    c.fillStyle = 'rgba(255,255,255,.4)'; c.font = '300 20px "Power Grotesk",sans-serif';
    c.fillText('drift ' + (this.drift > 0 ? '→' : '←') + ' ' + Math.abs(this.drift).toFixed(2), W / 2, y + 122);
  };

  Mission.prototype.drawDeduce = function (c, W, H, t) {
    const s = this.steps[Math.min(this.step, this.steps.length - 1)];
    c.textAlign = 'center';
    c.fillStyle = 'rgba(255,255,255,.5)'; c.font = '300 20px "Power Grotesk",sans-serif';
    c.fillText('step ' + Math.min(this.step + 1, this.steps.length) + ' of ' + this.steps.length + ' — pick the evidence that carries it', W / 2, H * .24);
    c.fillStyle = '#fff'; c.font = '200 30px "Power Grotesk",sans-serif';
    wrap(c, '"' + s.claim + '"', W / 2, H * .38, W * .7, 38);
  };

  Mission.prototype.drawTiming = function (c, W, H, t) {
    const y = H * .58;
    c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(W * .1, y - 40, W * .8, 80);
    c.fillStyle = 'rgba(95,160,58,.22)'; c.fillRect(W * (this.band.c - this.band.w), y - 40, W * this.band.w * 2, 80);
    c.fillStyle = 'rgba(255,70,18,.5)';
    c.fillRect(W * this.sweep - 2, y - 46, 4, 92);
    c.fillStyle = 'rgba(255,255,255,.8)'; c.textAlign = 'center'; c.font = '300 22px "Power Grotesk",sans-serif';
    c.fillText('pass ' + Math.min(this.pass + 1, this.passes) + ' of ' + this.passes + ' — stop the sweep in the band', W / 2, y - 70);
  };

  function wrap(c, s, x, y, maxw, lh) {
    const words = String(s).split(' ');
    let line = '', yy = y;
    for (let i = 0; i < words.length; i++) {
      const test = line + words[i] + ' ';
      if (c.measureText(test).width > maxw && line) { c.fillText(line, x, yy); line = words[i] + ' '; yy += lh; }
      else line = test;
    }
    c.fillText(line, x, yy);
  }

  root.MISSION = { Case: Case, Mission: Mission };
})(window);
