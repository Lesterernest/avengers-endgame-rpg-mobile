/* ============================================================
   game.js — controller: screens, hud, switching, travel, story
   ============================================================ */
(function (root) {
  'use strict';

  const GD = root.GD, BATTLE = root.BATTLE, FIELD = root.FIELD, FT = root.FOOTAGE, MS = root.MISSION;
  const $ = function (s, p) { return (p || document).querySelector(s); };
  const $$ = function (s, p) { return Array.prototype.slice.call((p || document).querySelectorAll(s)); };
  const rnd = function (a, b) { return a + Math.random() * (b - a); };
  const pick = function (a) { return a[(Math.random() * a.length) | 0]; };
  const shuffle = function (a) { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = r[i]; r[i] = r[j]; r[j] = t; } return r; };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };

  /* Every canvas in the game is sized from this. The desktop build capped
     at 2, which is right for a laptop. A modern iPhone reports 3, and a
     full-screen cinematic at 3x is 2.25x the pixels of the same picture at
     2x for no visible gain on a phone-sized screen — that is the single
     largest frame-rate cost in the game. Cap at 2 on a coarse pointer,
     keep 2 elsewhere, so the desktop path is bit-for-bit what it was. */
  const canvasDpr = function () {
    var d = Math.min(2, root.devicePixelRatio || 1);
    /* A coarse pointer means a finger, which means a phone or tablet. The
       check is made here rather than reading a flag from touch.js because
       game.js can boot before that file has run, and the first canvas
       size happens during boot. */
    var coarse = false;
    try { coarse = root.matchMedia('(hover: none)').matches; }
    catch (e) { coarse = 'ontouchstart' in root; }
    if (coarse) d = Math.min(d, 2);
    return d;
  };
  root.canvasDpr = canvasDpr;

  const G = {
    world: null,
    act: 1,
    party: ['cap', 'thor', 'ironman'],
    held: 'cap',
    screen: 'title',
    stage: null,
    fields: {},
    lastFrame: 0,
    footageTimer: rnd(26, 40),
    actReveal: [],
    deployed: [],
    started: false,
    location: null,
    clearing: false,
    // --- non-combat layer ---
    kase: null,          // the Case: clues, threads, ledger, battle mods
    mission: null,       // live MISSION instance
    misCanvas: null,
    clueCanvas: null
  };
  root.G = G;

  const ICON = {
    sun: '<svg viewBox="0 0 48 48" fill="currentColor" aria-hidden="true"><circle cx="24" cy="24" r="9"/><rect x="22" y="2" width="4" height="10"/><rect x="22" y="36" width="4" height="10"/><rect x="2" y="22" width="10" height="4"/><rect x="36" y="22" width="10" height="4"/></svg>',
    moon: '<svg viewBox="0 0 48 48" fill="currentColor" aria-hidden="true"><path d="M34 6a18 18 0 1 0 8 32A20 20 0 0 1 34 6z"/></svg>',
    play: '<svg viewBox="0 0 48 48" fill="currentColor" aria-hidden="true"><path d="M14 8l24 16-24 16z"/></svg>',
    stop: '<svg viewBox="0 0 48 48" fill="currentColor" aria-hidden="true"><rect x="12" y="12" width="24" height="24"/></svg>',
    down: '<svg viewBox="0 0 48 48" fill="currentColor" aria-hidden="true"><rect x="8" y="10" width="32" height="28"/><path d="M18 20h12l-6 10z"/></svg>'
  };

  /* ---------- theme ---------- */
  function initTheme() {
    let theme = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    const b = $('#theme-toggle');
    function paint() {
      b.innerHTML = theme === 'light' ? ICON.moon : ICON.sun;
      b.setAttribute('aria-label', theme === 'light' ? 'switch to dark' : 'switch to light');
    }
    paint();
    b.addEventListener('click', function () {
      theme = theme === 'light' ? 'dark' : 'light';
      document.documentElement.dataset.theme = theme;
      paint();
    });
  }

  /* ---------- stickers ---------- */
  const STICKER_BASE = { desktop: 120, tablet: 100, mobile: 80 };
  function stickerBase() {
    const w = root.innerWidth;
    return w < 768 ? STICKER_BASE.mobile : w < 1024 ? STICKER_BASE.tablet : STICKER_BASE.desktop;
  }
  function sticker() {
    const size = stickerBase() * (0.78 + Math.random() * 0.44);
    const glyph = Math.random() < 0.25 ? '☺︎' : '☻';
    const el = document.createElement('span');
    el.className = 'sticker';
    el.textContent = glyph;
    el.style.fontSize = size + 'px';
    el.style.transform = 'rotate(' + (Math.random() * 50 - 25) + 'deg)';
    el.style.position = 'fixed';
    const cx = Math.min(Math.max(e0.clientX, 40), root.innerWidth - 40);
    const cy = Math.min(Math.max(e0.clientY, 70), root.innerHeight - 60);
    el.style.left = (cx - size / 2) + 'px';
    el.style.top = (cy - size / 2) + 'px';
    el.style.zIndex = 950;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 2600);
  }
  let e0 = { clientX: 0, clientY: 0 };

  /* ---------- screens ---------- */
  function show(id) {
    G.screen = id;
    $$('.screen').forEach(function (s) { s.classList.toggle('on', s.id === id); });
    root.scrollTo(0, 0);
  }

  /* ---------- title ---------- */
  function paintTitle() {
    $('#title-loc').textContent = 'central florida // home base // the new avengers compound';
    const prev = $('#title-progress');
    if (G.actReveal.length) {
      const last = G.actReveal[G.actReveal.length - 1];
      prev.innerHTML = '<span class="accent">' + esc(last.title) + '</span> — ' + esc(last.reveal);
      $('#title-resume').classList.remove('hidden');
    } else {
      prev.textContent = '_ _ no run in progress — the compound is dark _ _';
      $('#title-resume').classList.add('hidden');
    }
  }

  /* ---------- select ---------- */
  function paintSelect() {
    const grid = $('#roster-grid');
    grid.innerHTML = '';
    const d = document.createElement('div');
    d.className = 'roster-head';
    d.innerHTML = '<p class="meta dim">choose three. you hold one. the other two keep fighting while you are somewhere else.</p>';
    grid.appendChild(d);
    GD.HEROES_ID.forEach(function (h) {
      const on = G.party.indexOf(h.id) >= 0;
      const b = document.createElement('button');
      b.className = 'roster-card' + (on ? ' on' : '');
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.innerHTML =
        '<canvas class="roster-glyph" width="120" height="120" data-hero="' + h.id + '"></canvas>' +
        '<h3>' + esc(h.name) + '</h3>' +
        '<p class="role-tag role-' + h.role + '">' + h.role + '</p>' +
        '<p class="meta dim bio">' + esc(h.bio) + '</p>' +
        '<div class="stat"><b>hit points</b><span>' + h.hp + '</span></div>' +
        '<div class="stat"><b>damage</b><span>' + h.atk + '</span></div>' +
        '<div class="stat"><b>armour</b><span>' + Math.round(h.armor * 100) + '%</span></div>' +
        '<div class="stat"><b>passive</b><span>' + esc(h.passive.name) + '</span></div>';
      b.addEventListener('click', function () { toggleParty(h.id); });
      grid.appendChild(b);
    });
    $$('.roster-glyph', grid).forEach(drawGlyph);
    $('#party-line').textContent = G.party.length === 3
      ? 'deployed: ' + G.party.map(function (i) { return GD.BY_ID[i].name; }).join(', ')
      : 'choose ' + (3 - G.party.length) + ' more';
    $('#sel-go').disabled = G.party.length !== 3;
  }

  function drawGlyph(cv) {
    const id = cv.getAttribute('data-hero');
    if (!id) return;
    const h = GD.BY_ID[id];
    const c = cv.getContext('2d');
    const dpr = canvasDpr();
    const sz = cv.getAttribute('width') ? parseInt(cv.getAttribute('width'), 10) : 120;
    cv.width = sz * dpr; cv.height = sz * dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, sz, sz);
    c.fillStyle = h.color;
    c.save(); c.translate(sz / 2, sz / 2);
    (FIELD.GLYPH[id] || FIELD.GLYPH.strange)(c, sz * 0.36);
    c.restore();
  }

  function drawVehicleGlyph(cv, id) {
    const d = GD.VEH_BY_ID[id];
    if (!d) return;
    const c = cv.getContext('2d');
    const dpr = canvasDpr();
    const sz = cv.getAttribute('width') ? parseInt(cv.getAttribute('width'), 10) : 52;
    cv.width = sz * dpr; cv.height = sz * dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, sz, sz);
    c.fillStyle = (d.combat && d.combat.color) || d.color || '#ffffff';
    c.save(); c.translate(sz / 2, sz / 2); c.scale(0.92, 0.92);
    (FIELD.VEH_GLYPH[id] || FIELD.GLYPH.strange)(c, sz * 0.34);
    c.restore();
  }

  function toggleParty(id) {
    const i = G.party.indexOf(id);
    if (i >= 0) G.party.splice(i, 1);
    else { if (G.party.length >= 3) G.party.shift(); G.party.push(id); }
    paintSelect();
  }

  /* ---------- act ---------- */
  function actDef(n) { return GD.STORY[n - 1]; }

  function paintAct() {
    const A = actDef(G.act);
    const loc = GD.FLORIDA_BY_ID[A.location];
    $('#act-num').textContent = 'act ' + A.act + ' / ' + GD.STORY.length;
    $('#act-title').textContent = A.title;
    $('#act-obj').textContent = A.objective;
    $('#act-loc').innerHTML = (loc.space ? '<span class="badge space">off-world</span> ' : '<span class="badge">ground</span> ') +
      esc(loc.name) + ' — ' + esc(loc.region);
    $('#act-blurb').textContent = loc.blurb;
    $('#act-brief').innerHTML = A.beats.map(function (b) {
      return '<div class="beat"><span class="who">' + esc(b.who) + '</span><span class="line">' + esc(b.line) + '</span></div>';
    }).join('');

    const dl = $('#act-deploy');
    dl.innerHTML = '';
    A.deploy.forEach(function (vid) {
      const v = GD.VEH_BY_ID[vid];
      const row = document.createElement('div');
      row.className = 'veh';
      row.innerHTML =
        '<div class="veh-head"><h3>' + esc(v.name) + '</h3>' +
        '<span class="badge ' + v.kind + '">' + v.kind + '</span>' +
        (v.comic ? '<span class="badge comic">comic</span>' : '<span class="badge new">new</span>') + '</div>' +
        '<p class="meta dim">' + esc(v.desc) + '</p>' +
        '<div class="veh-mods"><span>crew ' + v.crew + '</span><span>speed ' + v.mods.speed.toFixed(1) + '</span>' +
        '<span>attack ' + v.mods.atk.toFixed(2) + '</span><span>armour ' + v.mods.armor.toFixed(2) + '</span></div>';
      dl.appendChild(row);
    });

    // what the non-combat work did before these fronts open
    const k = G.kase;
    const brief = $('#act-brief');
    if (k && brief) {
      const pre = missionFor(G.act);
      const won = pre && k.results[pre.id] === 'won';
      const lost = pre && k.results[pre.id] === 'lost';
      const line = k.count() === 0
        ? 'nothing on the board yet. this act starts with a non-combat job before the fronts open.'
        : k.count() + ' piece(s) of evidence · the count is ' + k.aliveCount() + ' · ' +
          (won ? 'last act\'s job was clean.' : lost ? 'last act\'s job cost somebody.' : 'the board is open.');
      let extra = document.getElementById('act-case');
      if (!extra) { extra = document.createElement('div'); extra.id = 'act-case'; brief.appendChild(extra); }
      extra.innerHTML = '<p class="meta accent">pre-fronts: ' + esc(line) + '</p>' +
        '<p class="meta dim">the mission runs between here and the fight. solve it and the field changes shape; fail it and it does too.</p>';
    }
  }

  /* ---------- map ---------- */
  function paintMap() {
    const m = $('#map-grid');
    m.innerHTML = '';
    GD.FLORIDA.forEach(function (f) {
      const closed = G.kase && G.kase.isClosed(f.id);
      const vehs = G.deployed.filter(function (vid) { return GD.VEH_BY_ID[vid].reach.indexOf(f.id) >= 0; });
      const spaceOk = !f.space || G.deployed.some(function (v) { return GD.VEH_BY_ID[v].kind === 'space'; });
      const b = document.createElement('button');
      b.className = 'map-card' + (f.home ? ' home' : '') + (f.space ? ' space' : '') + (spaceOk ? '' : ' locked') + (closed ? ' closed' : '');
      b.innerHTML =
        '<div class="map-top"><h3>' + esc(f.name) + '</h3><span class="badge ' + (closed ? 'closed' : (f.home ? 'home' : f.hideout)) + '">' + (closed ? 'closed' : f.hideout) + '</span></div>' +
        '<p class="meta dim">' + esc(f.region) + (f.space ? ' — off-world' : ' — florida') + '</p>' +
        '<p class="meta bio">' + (closed ? '<span class="bad">shut to us. we lost the way in on the ground.</span> ' + esc(f.blurb) : esc(f.blurb)) + '</p>' +
        '<p class="meta reach">' + (closed
          ? 'no route in. this one is a story we tell now.'
          : (vehs.length
            ? 'reachable by: ' + vehs.map(function (v) { return GD.VEH_BY_ID[v].name; }).join(', ')
            : (spaceOk ? 'on foot or by convoy' : 'no space-capable vehicle in the fleet'))) + '</p>';
      b.addEventListener('click', function () { if (closed) { note(f.name + ' is closed. we burned that route on the ground and it did not reopen.'); return; } travelTo(f.id); });
      m.appendChild(b);
    });
    $('#fleet-line').textContent = G.deployed.length
      ? 'fleet: ' + G.deployed.map(function (v) { return GD.VEH_BY_ID[v].name; }).join(' · ')
      : '_ _ no vehicles deployed — the hangar is empty _ _';
  }

  function travelTo(id) {
    const f = GD.FLORIDA_BY_ID[id];
    if (f.space) {
      const v = G.deployed.filter(function (vid) { return GD.VEH_BY_ID[vid].kind === 'space'; })[0];
      if (!v) { note('no space-capable vehicle in the fleet. deploy a quinjet or something worse first.'); return; }
      note('transit: ' + GD.VEH_BY_ID[v].name + ' → ' + f.name);
    } else {
      note('transit: convoy → ' + f.name + ', ' + f.region);
    }
    G.location = id;
    $('#travel-note').textContent = 'arrived: ' + f.name + ' — ' + f.region + '. ' + f.blurb;
    $('#to-battle').disabled = false;
  }

  function note(s) { $('#travel-note').textContent = s; }

  /* ============================================================
     the non-combat layer
     every act runs one of these before the fronts open. the case
     persists across acts: clues accumulate, conclusions open when
     there is enough evidence to justify them, and what you learn
     changes the fight you walk into.
     ============================================================ */

  function missionFor(n) {
    return GD.MISSIONS.filter(function (m) { return m.act === n; })[0] || null;
  }

  function startMission(n) {
    const def = missionFor(n);
    if (!def) { deploy(); return; }
    G.act = n;
    G.mission = new MS.Mission(def, {
      case: G.kase,
      stage: G.stage,
      onDone: missionDone
    });
    G.misCanvas = $('#mis-canvas');
    paintMission();
    show('mission');
    setTimeout(drawClueBoard, 30);
  }

  function missionDone(result) {
    const def = G.mission.d;
    G.kase.apply(result, def);
    (result.clues || []).forEach(function (cid) { G.kase.addClue(cid); });
    // a solved mission can change who shows up in the fight
    if (result.pass && result.mod && result.mod.surprise) {
      G.stage.queueFootage({
        kind: 'glitch', dur: 3.6, tag: 'unregistered signature // florida',
        title: 'someone noticed what you did',
        text: 'the field you just finished is the reason somebody is going to be standing in the next one. you did not pick that. you caused it.'
      });
    }
    G.mission = null;
    paintMissionResult(result);
  }

  function paintMission() {
    const m = G.mission;
    if (!m) return;
    const d = m.d;
    $('#mis-verb').textContent = d.verb;
    $('#mis-title').textContent = d.title;
    $('#mis-where').textContent = d.where;
    $('#mis-brief').textContent = d.brief;
    $('#mis-stakes').textContent = 'at stake: ' + d.stakes;
    $('#mis-continue').disabled = true;
    $('#mis-continue').textContent = 'working…';
    paintMissionControls();
    paintCaseSide();
  }

  /* The frame loop repaints these controls every frame for the lock and
     timing kinds. On a desktop that is invisible, but rebuilding the DOM
     under a finger means the touch target a player is holding is destroyed
     and recreated 60 times a second, and a hold cannot survive it. So the
     build is skipped when the controls it would produce are already on
     screen. The signature covers everything the labels and handlers below
     depend on, so a real change still rebuilds. */
  function missionControlsSig(m) {
    const k = m.d.kind;
    if (k === 'grid') return k + '|' + m.n + '|' + m.pos.x + ',' + m.pos.y;
    if (k === 'wheel') return k + '|' + m.rings;
    if (k === 'order') return k + '|' + m.items.length;
    if (k === 'talk') return k + '|' + m.round;
    if (k === 'deduce') {
      return k + '|' + m.step + '|' + Object.keys(G.kase.clues).length;
    }
    return k;
  }

  function paintMissionControls(force) {
    const m = G.mission;
    if (!m) return;
    const host = $('#mis-controls');
    const sig = missionControlsSig(m);
    if (!force && sig === host._sig) return;
    host._sig = sig;
    host.innerHTML = '';
    const k = m.d.kind;
    const mk = function (label, fn, cls) {
      const b = document.createElement('button');
      b.className = 'btn small' + (cls ? ' ' + cls : '');
      b.textContent = label;
      b.addEventListener('click', fn);
      host.appendChild(b);
      return b;
    };
    if (k === 'grid') {
      mk('↑', function () { m.gridClick(m.pos.x, Math.max(0, m.pos.y - 1)); });
      mk('↓', function () { m.gridClick(m.pos.x, Math.min(m.n - 1, m.pos.y + 1)); });
      mk('←', function () { m.gridClick(Math.max(0, m.pos.x - 1), m.pos.y); });
      mk('→', function () { m.gridClick(Math.min(m.n - 1, m.pos.x + 1), m.pos.y); });
    } else if (k === 'wheel') {
      for (let i = 0; i < m.rings; i++) {
        mk('ring ' + (i + 1) + ' ◀', function () { m.ringClick(i, -1); });
        mk('ring ' + (i + 1) + ' ▶', function () { m.ringClick(i, 1); });
      }
    } else if (k === 'order') {
      m.items.forEach(function (it, i) {
        mk(it.l, function () { m.slotClick(i); });
      });
    } else if (k === 'talk') {
      const r = m.talks[Math.min(m.round, m.rounds - 1)];
      r.o.forEach(function (o, i) { mk(o.t, function () { m.talkPick(i); }); });
    } else if (k === 'deduce') {
      const s = m.steps[Math.min(m.step, m.steps.length - 1)];
      const have = Object.keys(G.kase.clues);
      const known = s.wrong.filter(function (w) { return have.indexOf(w) >= 0; });
      // mission.js deducePick indexes its own [right, ...knownWrongs] list, so the
      // true index has to be looked up there -- not in the shuffled display order.
      const order = [s.right].concat(known);
      const ids = shuffle(known).concat([s.right]);
      // park the right answer anywhere but the top slot: pick j in 1..N-1 and swap
      // the last element (the right answer) down into it.
      const n = ids.length;
      const j = n > 1 ? 1 + ((Math.random() * (n - 1)) | 0) : 0;
      const t = ids[j]; ids[j] = ids[n - 1]; ids[n - 1] = t;
      ids.forEach(function (cid) {
        const c = GD.CLUE_BY_ID[cid];
        mk(c ? c.label : cid, function () { m.deducePick(order.indexOf(cid)); });
      });
    } else if (k === 'lock') {
      /* The brake is a press, not a tap: the engine reads m.held every
         frame, so a click gives it one frame and lets go. On a keyboard
         it stays a plain toggle, because a button is a button. On a
         finger the press and the release are the whole mechanic, and
         touch.js turns the press into holdstart/holdend.

         The 'on' class is the house style's own held state — game.css
         already styles #mis-controls .btn.hold.on, and the desktop build
         never sets it, so this is filling in something that was
         declared and left unused rather than adding a new look. */
      const b = mk('hold to brake', function () { m.held = !m.held; b.classList.toggle('on', m.held); }, 'hold');
      b.addEventListener('holdstart', function (e) { e.preventDefault(); m.held = true; b.classList.add('on'); });
      b.addEventListener('holdend', function () { m.held = false; b.classList.remove('on'); });
    } else if (k === 'timing') {
      mk('stop the sweep', function () { m.passClick(); });
    }
  }

  function paintMissionResult(result) {
    const d = (result && result.def) || null;
    const last = G.mission ? null : null;
    const host = $('#mis-continue');
    host.disabled = false;
    const dm = missionFor(G.act);
    host.textContent = result.pass ? 'take it to the fronts' : 'it cost us — take it to the fronts';
    host.onclick = function () { host.onclick = null; deploy(); };
    if (result.pass) {
      $('#mis-say').textContent = 'clean. ' + (result.clues || []).length + ' piece(s) of evidence logged.';
    } else {
      // say what the failure actually took — person, place, or both
      const f = (dm && dm.onFail) || {};
      let line = '';
      if (f.cost === 'place' && f.place) {
        const pl = GD.FLORIDA_BY_ID[f.place];
        line = '<span class="accent">' + esc(pl ? pl.name : f.place) + '</span> is shut to us. the route is gone. ' + esc(result.why || '');
      } else if (f.cost === 'hero' && f.who) {
        line = '<span class="accent">' + esc(f.who) + '</span> is off the count. ' + esc(result.why || '');
      } else if (f.who) {
        line = '<span class="accent">' + esc(f.who) + '</span> is off the count. ' + esc(result.why || '');
      } else {
        line = esc(result.why || 'it cost us, and the bill is still being counted.');
      }
      $('#mis-say').innerHTML = line;
      $('#mis-say').classList.add('bad');
    }
    paintCaseSide();
  }

  function paintCaseSide() {
    const c = G.kase;
    if (!c) return;
    $('#mis-count').textContent = c.aliveCount();
    $('#mis-count-note').textContent = 'of ' + GD.LEDGER.length + ' floridans the snap took. it goes down. it does not come back up.';

    const led = $('#mis-ledger');
    led.innerHTML = '';
    GD.LEDGER.forEach(function (l) {
      const gone = c.ledger[l.id] === false;
      const el = document.createElement('div');
      el.className = 'ledger-row' + (gone ? ' gone' : '');
      el.innerHTML = '<span class="lr-i">' + esc(l.id) + '</span><span class="lr-w">' + esc(l.who) + '</span>' +
        '<span class="lr-s">' + (gone ? 'off the count' : 'waiting') + '</span>';
      el.title = l.note;
      led.appendChild(el);
    });

    // what this run has already cost, above and beyond the count
    const costEl = $('#mis-cost');
    if (costEl) {
      const costs = c.costs();
      costEl.innerHTML = costs.length
        ? '<h4 class="display-sm">what failure has cost</h4>' + costs.map(function (t) {
            return '<p class="meta bad">— ' + esc(t) + '</p>';
          }).join('')
        : '<h4 class="display-sm">what failure has cost</h4><p class="meta dim">nothing yet. it is still early enough that it could stay that way.</p>';
    }

    const th = $('#mis-thread');
    th.innerHTML = '';
    const t = c.threadFor(G.act);
    if (!t) {
      th.innerHTML = '<p class="meta dim">nothing here is provable yet. ' + c.count() + ' piece(s) of evidence, and the board only draws a line when two of them mean the same thing.</p>';
    } else {
      const box = document.createElement('div');
      box.className = 'thread';
      box.innerHTML = '<p class="meta">' + esc(t.question) + '?</p>';
      t.options.forEach(function (o) {
        const b = document.createElement('button');
        b.className = 'thread-opt';
        b.innerHTML = '<span class="to-t">' + esc(o.t) + '</span>';
        b.addEventListener('click', function () {
          const ok = c.answerThread(t.id, o.ok);
          $('#mis-say').textContent = o.why;
          $('#mis-say').classList.toggle('bad', !ok);
          b.classList.add(ok ? 'held' : 'broken');
          $$('.thread-opt', th).forEach(function (x) { x.disabled = true; });
          if (ok) {
            G.stage.overlayCast({ name: 'conclusion', sub: t.question + ' — ' + o.why, tierLabel: 'deduce', tone: 'ally', hud: 'the case board' });
          }
          setTimeout(paintCaseSide, 1400);
        });
        box.appendChild(b);
      });
      th.appendChild(box);
    }

    $('#clue-count').textContent = c.count() + ' piece(s) of evidence · ' + c.chain().length + ' link(s) drawn';
  }

  /* the board: evidence as pinned cards, lines between what agrees */
  function drawClueBoard() {
    const cv = G.clueCanvas;
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    if (!r.width) return;
    const dpr = canvasDpr();
    cv.width = r.width * dpr; cv.height = r.height * dpr;
    const c = cv.getContext('2d');
    const W = r.width, H = r.height;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);
    const k = G.kase;
    c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 1;
    for (let y = 0; y < H; y += 18) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }

    if (!k.count()) {
      c.fillStyle = 'rgba(255,255,255,.35)'; c.textAlign = 'center';
      c.font = '200 20px "Power Grotesk",sans-serif';
      c.fillText('the board is empty. nothing has been logged yet.', W / 2, H / 2);
      return;
    }
    // layout: pin clues in two columns by discovery
    const pos = {};
    k.order.forEach(function (id, i) {
      const col = i % 2, row = (i / 2) | 0;
      pos[id] = { x: col ? W * .68 : W * .3, y: 34 + row * 74 };
    });
    // links
    c.strokeStyle = 'rgba(255,70,18,.55)'; c.lineWidth = 1.5;
    k.chain().forEach(function (link) {
      const a = pos[link[0]], b = pos[link[1]];
      if (!a || !b) return;
      c.beginPath(); c.moveTo(a.x, a.y + 18); c.lineTo(b.x, b.y + 18); c.stroke();
    });
    // cards
    k.order.forEach(function (id) {
      const cl = GD.CLUE_BY_ID[id], p = pos[id];
      c.fillStyle = 'rgba(255,255,255,.06)';
      c.fillRect(p.x - 74, p.y - 20, 148, 40);
      c.fillStyle = '#ff4612';
      c.beginPath(); c.arc(p.x, p.y - 20, 3, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,.9)'; c.textAlign = 'left';
      c.font = '300 13px "Power Grotesk",sans-serif';
      c.fillText(cl.label, p.x - 68, p.y - 3);
      c.fillStyle = 'rgba(255,255,255,.5)'; c.font = '200 11px "Power Grotesk",sans-serif';
      c.fillText(cl.line.slice(0, 30) + '…', p.x - 68, p.y + 11);
    });
  }

  function sizeCanvas(cv) {
    const r = cv.getBoundingClientRect();
    if (!r.width) return null;
    const dpr = canvasDpr();
    cv.width = r.width * dpr; cv.height = r.height * dpr;
    return { c: cv.getContext('2d'), w: r.width, h: r.height, dpr: dpr };
  }

  /* ============================================================
     battle
     ============================================================ */

  const FRONT_NAMES = ['front alpha', 'front bravo', 'front charlie'];

  /* Which vehicle fights alongside the heroes on a given front.
     The fleet you deployed decides, and it is decided for you — there is no
     screen and no required pick. Each front takes the next vehicle in the
     list, so three fronts run three different hulls, and any front that
     gets nothing runs exactly as it always did. Returns null freely. */
  function vehicleForFront(index) {
    const fleet = (G.deployed || []).filter(function (vid) {
      const d = GD.VEH_BY_ID[vid];
      return d && d.combat;
    });
    if (!fleet.length) return null;
    return fleet[index % fleet.length] || null;
  }

  function deploy() {
    G.started = true;
    G.world = new BATTLE.World();
    G.clearing = false;
    G.deployed = actDef(G.act).deploy.slice();
    G.location = actDef(G.act).location;
    // a hero lost on the ground does not walk onto the field again
    if (G.kase) {
      const before = G.party.length;
      G.party = G.party.filter(function (h) { return !G.kase.isLost(h); });
      if (G.party.length !== before && G.party.length) {
        note('deploying thinner: ' + G.party.map(function (h) { return GD.BY_ID[h].name; }).join(' · ') + '.');
      }
    }
    buildAct(G.act);
  }

  function buildAct(n) {
    G.act = n;
    G.world.act = n;
    const A = actDef(n);
    const loc = GD.FLORIDA_BY_ID[A.location];
    G.world.battles.length = 0;
    G.world.byId = {};
    G.fields = {};

    for (let i = 0; i < FRONT_NAMES.length; i++) {
      const lead = G.party[i % G.party.length];
      const others = G.party.filter(function (x) { return x !== lead; });
      const squad = [lead, others[0] || lead, others[1] || lead];
      const b = BATTLE.buildBattle({
        id: 'f' + n + '-' + i,
        actId: A.id, act: n, location: A.location, space: !!loc.space,
        title: FRONT_NAMES[i] + ' — ' + loc.name,
        waves: 3, level: n,
        mods: {
          foeHp: G.kase ? G.kase.mod('foeHp') : 0,
          foeAtk: G.kase ? G.kase.mod('foeAtk') : 0,
          extraWave: G.kase ? G.kase.mod('extraWave') : 0,
          charge: G.kase ? G.kase.mod('charge') : 0,
          heal: G.kase ? G.kase.mod('heal') : 0,
          surprise: G.kase ? G.kase.mods.surprise : null
        }
      }, squad, vehicleForFront(i));
      G.world.add(b);
    }
    G.held = G.party[0];
    const first = G.world.battles[0];
    G.fields[first.id] = new FIELD.Field(first, $('#field-main'));
    G.fields[first.id].focusId = findActor(first, G.held);
    G.fields[first.id].resize();
    paintBattle();
    show('battle');
    noteFront();
  }

  function findActor(b, heroId) {
    const a = b.all.filter(function (x) { return x.team === 'ally' && x.def.id === heroId; })[0];
    return a ? a.id : (b.all[0] ? b.all[0].id : null);
  }

  function currentBattle() { return G.world ? G.world.battles[0] : null; }
  function heldActor() {
    const b = currentBattle();
    return b ? b.actor(G.fields[b.id].focusId) : null;
  }

  function noteFront(s) {
    const el = $('#front-note');
    if (!el) return;
    if (s !== undefined) { el.textContent = s; return; }
    const d = new Date();
    el.textContent = 'fronts live · ' + G.world.battles.length + ' simultaneous · ' +
      String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0') + ' utc';
  }

  /* ---------- hud ---------- */
  function paintBattle() {
    const b = currentBattle();
    const a = heldActor();
    if (!b || !a) return;
    const h = a.def;

    $('#hud-name').textContent = h.name;
    $('#hud-role').textContent = h.role;
    $('#hud-role').className = 'role-tag role-' + h.role;
    $('#hud-role-blurb').textContent = GD.ROLES[h.role].blurb;
    $('#hud-aka').textContent = h.aka;
    $('#hud-passive').textContent = h.passive.name + ' — ' + h.passive.blurb;

    const pb = $('#power-bar');
    pb.innerHTML = '';
    h.powers.forEach(function (p, i) {
      const btn = document.createElement('button');
      btn.className = 'power';
      btn.innerHTML = '<span class="pk">' + (i + 1) + '</span><span class="pn">' + esc(p.name) + '</span>' +
        '<span class="pd">' + esc(p.desc) + '</span><span class="pc"></span>';
      btn.addEventListener('click', function () { castPower(a.id, p.id); });
      pb.appendChild(btn);
    });

    paintTiers(b, a);
    paintVehicle(b);

    const strip = $('#party-strip');
    strip.innerHTML = '';
    G.party.forEach(function (id) {
      const pid = GD.BY_ID[id];
      const loc = G.world.battles.map(function (bb) { return bb.actor(findActor(bb, id)); }).filter(Boolean)[0];
      const hp = loc ? Math.round(loc.hp / loc.maxHp * 100) : 0;
      const btn = document.createElement('button');
      btn.className = 'party-btn' + (id === G.held ? ' on' : '') + (loc && !loc.alive ? ' down' : '');
      btn.innerHTML = '<span class="pb-g"><canvas width="56" height="56" data-hero="' + id + '"></canvas></span>' +
        '<span class="pb-n">' + esc(pid.name) + '</span>' +
        '<span class="pb-r role-' + pid.role + '">' + pid.role + '</span>' +
        '<span class="bar"><i style="transform:scaleX(' + (hp / 100) + ')"></i></span>';
      btn.addEventListener('click', function () { switchTo(id); });
      strip.appendChild(btn);
    });
    $$('canvas[data-hero]', strip).forEach(drawGlyph);
  }

  function paintTiers(b, a) {
    const s = b.tierState(a);
    const host = $('#tier-bar');
    host.innerHTML = '';
    ['s1', 's2', 'ult'].forEach(function (k) {
      const t = s[k];
      const d = document.createElement('button');
      d.className = 'tier' + (t.ready ? ' ready' : '') + (t.locked ? ' locked' : '') + (k === 'ult' ? ' ult' : '');
      d.setAttribute('aria-disabled', t.ready ? 'false' : 'true');
      let state = 'filling';
      if (t.locked) state = 'locked — act ' + t.minAct;
      else if (t.gate) state = t.gate;
      else if (t.full) state = 'ready';
      d.innerHTML =
        '<span class="t-l">' + t.label + '</span>' +
        '<span class="t-n">' + esc(a.def[k].name) + '</span>' +
        '<span class="t-d">' + esc(a.def[k].desc) + '</span>' +
        '<span class="t-s">' + esc(state) + '</span>' +
        '<span class="bar"><i style="transform:scaleX(' + t.pct + ')"></i></span>';
      d.addEventListener('click', function () { castSuper(a.id, k); });
      host.appendChild(d);
    });
    paintGate(s);
  }

  /* the support vehicle's whole state, in plain numbers. it is here to be
     read, not to be admired: hull, what the passive is doing to the heroes,
     what its gun is hitting for, and what the ability still needs. */
  function paintVehicle(b) {
    const panel = $('#veh-panel'), host = $('#veh-body');
    if (!panel || !host) return;
    const v = b.vehicleState();
    if (!v) { panel.hidden = true; host.innerHTML = ''; return; }
    panel.hidden = false;

    const p = v.passive;
    const levers = [];
    if (p.atk !== 1) levers.push('heroes hit ' + Math.round(p.atk * 100) + '%');
    if (p.teamArmor) levers.push('heroes take ' + Math.round(p.teamArmor * 100) + '% less');
    if (p.crit !== 1) levers.push('crit ' + Math.round(p.crit * 100) + '%');
    if (p.cd !== 1) levers.push('cooldowns ' + Math.round(p.cd * 100) + '%');
    if (p.energy !== 1) levers.push('energy ceiling ' + Math.round(p.energy * 100) + '%');
    if (p.regen) levers.push('regen ' + (p.regen * 100).toFixed(1) + '%/s');
    if (!levers.length) levers.push('no lever — it is here for the guns');

    const ability = v.ability;
    const abilityState = !v.alive ? 'wrecked'
      : ability.gate ? ability.gate
      : 'ready';

    host.innerHTML =
      '<div class="veh-head" style="border-color:' + v.color + '">' +
        '<canvas class="veh-glyph" width="52" height="52" data-veh="' + esc(v.id) + '"></canvas>' +
        '<div>' +
          '<div class="veh-name" style="color:' + v.color + '">' + esc(v.name) + '</div>' +
          '<div class="veh-kind">' + esc(v.kind) + ' · supporting this front</div>' +
        '</div>' +
      '</div>' +
      '<div class="veh-meters">' +
        '<div class="meter"><span class="ml">hull</span><span class="bar"><i style="transform:scaleX(' +
          v.hull.toFixed(3) + ')"></i></span><span class="mv">' + Math.round(v.hp) + '/' + v.maxHp + '</span></div>' +
        '<div class="meter"><span class="ml">charge</span><span class="bar"><i style="transform:scaleX(' +
          v.energyPct.toFixed(3) + ')"></i></span><span class="mv">' + Math.round(v.energy) + '/' + v.maxEnergy + '</span></div>' +
      '</div>' +
      '<div class="veh-rows">' +
        '<div class="veh-row"><span class="vk">passive</span><span class="vval">' + esc(p.name) + '</span>' +
          '<span class="vsub">' + esc(levers.join(' · ')) + '</span></div>' +
        '<div class="veh-row"><span class="vk">gun</span><span class="vval">' + esc(v.attack.name) + '</span>' +
          '<span class="vsub">' + Math.round(v.atk * v.attack.mult) + ' a hit, every ' +
          v.rate.toFixed(2) + 's' + (v.busy ? ' · reloading' : '') + ' · ' + v.casts + ' fired, ' +
          Math.round(v.damageDealt) + ' damage landed</span></div>' +
        '<div class="veh-row"><span class="vk">ability</span><span class="vval">' + esc(ability.name) + '</span>' +
          '<span class="vsub">' + ability.cost + ' charge, ' + ability.cd + 's cooldown · ' +
          (ability.cdLeft > 0 ? ability.cdLeft.toFixed(1) + 's left · ' : '') + abilityState + '</span></div>' +
      '</div>' +
      '<button class="btn veh-cast' + (ability.ready && v.alive ? '' : ' off') + '"' +
        (ability.ready && v.alive ? '' : ' aria-disabled="true"') + '>' +
        (v.alive ? 'call it in — ' + esc(ability.name) : 'the vehicle is wrecked') + '</button>' +
      '<p class="meta dim veh-foot">It cannot take a hero decision, and nothing on this front ' +
        'waits for it. The heroes win this on their own.</p>';

    const btn = host.querySelector('.veh-cast');
    if (btn) btn.addEventListener('click', function () { castVehicleAbility(); });
    const glyph = host.querySelector('canvas[data-veh]');
    if (glyph) drawVehicleGlyph(glyph, v.id);
  }

  function castVehicleAbility() {
    const b = currentBattle();
    if (!b) return;
    const v = b.vehicleState();
    if (!v) return;
    if (!v.ability.ready) { noteFront(v.ability.gate || 'the vehicle is not ready'); return; }
    if (b.castVehicleAbility()) {
      cinematicCast(b, { x: 0.06, y: 0.52, def: { color: v.color, name: v.name } },
        v.ability.name, v.ability.desc, 'vehicle ability', false);
      if (G.fields[b.id]) G.fields[b.id].kick(0.5);
    }
  }

  function paintGate(s) {
    const gate = $('#team-gate');
    if (!gate) return;
    gate.textContent = s.link
      ? 'team link live · ' + s.allies + ' allies on this front — the ultimate is reachable'
      : 'team link cold · you are alone on this front — the ultimate stays locked until ' + BATTLE.TEAM_REQ + ' allies are fighting here';
    gate.className = 'meta ' + (s.link ? '' : 'accent');
  }

  /* ---------- casting ---------- */
  function castPower(actorId, pid) {
    const b = currentBattle();
    if (!b) return;
    if (b.castPower(actorId, pid)) {
      const a = b.actor(actorId);
      const p = a.def.powers.filter(function (x) { return x.id === pid; })[0];
      cinematicCast(b, a, p.name, p.desc, 'power', false);
      G.fields[b.id].kick(0.35);
    }
  }

  function castSuper(actorId, tier) {
    const b = currentBattle();
    if (!b) return;
    const a = b.actor(actorId);
    if (!a) return;
    const s = b.tierState(a);
    if (!s[tier].ready) { noteFront(s[tier].locked ? 'locked — ' + s[tier].gate : (s[tier].gate || 'not ready yet')); return; }
    if (b.castSuper(actorId, tier)) {
      const p = BATTLE.tierPower(a.def, tier);
      if (!p) { noteFront('that tier has no defined power'); return; }
      const label = tier === 'ult' ? 'ultimate' : tier === 's2' ? 'super 2' : 'super 1';
      cinematicCast(b, a, p.name, p.desc, label, true, p.comic);
      G.fields[b.id].kick(tier === 'ult' ? 1.4 : 1.0);
    }
  }

  /* a cast gets a camera moment — randomised, layered on the field's kick */
  function cinematicCast(b, a, name, desc, label, big, comic) {
    if (Math.random() > (big ? 1 : 0.55)) { G.fields[b.id].kick(big ? 1.2 : 0.3); return; }
    G.stage.overlayCast({
      name: name, sub: desc, tierLabel: label, comic: comic,
      tone: a.team === 'ally' ? 'ally' : 'evil',
      hud: a.name + ' // ' + a.def.role + ' // ' + b.title.split('—')[0].trim()
    });
  }

  /* ---------- switching ---------- */
  function switchTo(id) {
    G.held = id;
    const b = currentBattle();
    const aid = findActor(b, id);
    G.fields[b.id].focusId = aid;
    G.fields[b.id].kick(0.6);
    paintBattle();
    const a = b.actor(aid);
    if (a && Math.random() < 0.5) {
      G.stage.overlayCast({
        name: a.def.name, sub: a.def.role + ' — ' + GD.ROLES[a.def.role].blurb,
        tierLabel: 'switching', tone: 'ally',
        hud: 'front alpha // ' + b.title.split('—')[1].trim()
      });
    }
  }

  /* ---------- story ---------- */
  function afterAct() {
    const A = actDef(G.act);
    G.actReveal.push({ title: A.title, reveal: A.reveal });
    const last = G.act === GD.STORY.length;
    G.stage.queueFootage({
      kind: 'signal', dur: 4.4, tag: 'act ' + A.act + ' clear // ' + A.title,
      title: 'recovered: ' + A.id, text: A.reveal
    });
    paintTitle();
    if (last) {
      setTimeout(function () { show('end'); paintEnd(); }, 4800);
    } else {
      setTimeout(function () {
        G.act++;
        G.deployed = actDef(G.act).deploy.slice();
        G.location = actDef(G.act).location;
        paintAct();
        show('act');
      }, 4800);
    }
  }

  /* ============================================================
     loop
     ============================================================ */
  function frame(ts) {
    requestAnimationFrame(frame);
    const now = ts / 1000;
    let dt = G.lastFrame ? now - G.lastFrame : 0.016;
    G.lastFrame = now;
    if (dt > 0.12) dt = 0.12;

    if (G.stage) { G.stage.update(dt); G.stage.draw(dt); }

    if (G.screen === 'mission' && G.mission) {
      G.mission.update(dt);
      const s = sizeCanvas(G.misCanvas);
      if (s) G.mission.draw(s.c, s.w, s.h, s.dpr);
      const clock = $('#mis-clock');
      if (clock) clock.textContent = G.mission.t.toFixed(1);
      const say = $('#mis-say');
      if (say && G.mission.feedbackT > 0) {
        say.textContent = G.mission.feedback;
        say.classList.toggle('bad', G.mission.tone === 'bad');
      }
      if (G.mission.kind === 'lock' || G.mission.kind === 'timing') paintMissionControls();
      if (G.mission.done && G.mission.needControls !== false && !G.mission.controlsGone) {
        // controls stop mattering the moment it resolves
        G.mission.controlsGone = true;
        $('#mis-controls').innerHTML = '';
        paintMissionResult(G.mission.result);
      }
    }

    if (G.screen === 'battle' && G.world) {
      // every front steps, always — watched or not
      G.world.update(dt);

      const primary = G.world.battles[0];
      const pf = G.fields[primary.id];
      pf.draw(dt);
      for (let i = 1; i < G.world.battles.length; i++) {
        const b = G.world.battles[i];
        const mini = document.getElementById('mini-cv-' + b.id);
        if (!mini) continue;
        if (G.fields[b.id]) drawMini(b, mini);
      }

      if (!G.stage.busy()) {
        G.footageTimer -= dt;
        if (G.footageTimer <= 0) {
          G.stage.queueFootage(pick(GD.FOOTAGE));
          G.footageTimer = rnd(34, 62);
        }
      }

      const a = heldActor();
      if (a) {
        const b = currentBattle();
        $('#hud-hp').style.transform = 'scaleX(' + Math.max(0, a.hp / a.maxHp) + ')';
        $('#hud-energy').style.transform = 'scaleX(' + (a.energy / a.maxEnergy) + ')';
        $('#hud-super').style.transform = 'scaleX(' + (a.super / 100) + ')';
        const s = b.tierState(a);
        const kids = $$('#tier-bar .tier');
        ['s1', 's2', 'ult'].forEach(function (k, i) {
          const t = s[k], el = kids[i];
          if (!el) return;
          el.classList.toggle('ready', t.ready);
          el.classList.toggle('locked', t.locked);
          el.querySelector('.t-s').textContent = t.locked ? 'locked — act ' + t.minAct
            : t.gate ? t.gate : t.full ? 'ready' : 'filling';
          el.querySelector('i').style.transform = 'scaleX(' + t.pct + ')';
        });
        paintGate(s);
        const pwEls = $$('#power-bar .power');
        a.def.powers.forEach(function (p, i) {
          const el = pwEls[i];
          if (!el) return;
          const left = Math.max(0, (a.cds[p.id] || 0) - b.t);
          const c = el.querySelector('.pc');
          if (left > 0) { c.textContent = left.toFixed(1) + 's'; c.classList.add('on'); }
          else { c.textContent = 'ready'; c.classList.remove('on'); }
          el.classList.toggle('spent', left > 0 || a.energy < p.cost);
        });
        const sp = $('#super-pct');
        if (sp) sp.textContent = Math.round(a.super) + '%';
      }

      paintFronts();

      if (G.world.won() && !G.clearing) {
        G.clearing = true;
        setTimeout(function () { G.clearing = false; afterAct(); }, 1500);
      }
    }
  }

  function paintEnd() {
    const host = $('#end-reveals');
    if (!host) return;
    host.innerHTML = G.actReveal.map(function (r, i) {
      return '<div class="beat"><span class="who">act ' + (i + 1) + '</span><span class="line">' +
        '<b>' + esc(r.title) + '</b> — ' + esc(r.reveal) + '</span></div>';
    }).join('');
  }

  /* the other fronts: small canvases, same renderer, visibly live */
  function drawMini(b, cv) {
    if (!b._field) b._field = new FIELD.Field(b, cv);
    const f = b._field;
    if (f.cv !== cv) { f.cv = cv; f.w = 0; }
    const r = cv.getBoundingClientRect();
    if (!r.width) return;
    if (!f.w || Math.abs(f.w - r.width) > 2) { f.w = r.width; f.h = r.height; f.dpr = canvasDpr(); cv.width = r.width * f.dpr; cv.height = r.height * f.dpr; }
    f.dpr = f.dpr || 1;
    f.draw(0.016);
  }

  function paintFronts() {
    const host = $('#front-strip');
    if (!host) return;
    if (host.childElementCount !== G.world.battles.length) {
      host.innerHTML = '';
      G.world.battles.slice(1).forEach(function (b) {
        const w = document.createElement('div');
        w.className = 'front-mini';
        w.id = 'fm-' + b.id;
        w.innerHTML = '<canvas id="mini-cv-' + b.id + '" class="mini-cv"></canvas>' +
          '<div class="mini-bar"><span class="mn"></span></div>';
        host.appendChild(w);
      });
    }
    G.world.battles.slice(1).forEach(function (b) {
      const el = document.getElementById('fm-' + b.id);
      if (!el) return;
      const foes = b.all.filter(function (a) { return a.team === 'enemy' && a.alive; }).length;
      const allies = b.all.filter(function (a) { return a.team === 'ally' && a.alive; }).length;
      el.querySelector('.mn').textContent = b.title.split('—')[0].trim() + ' · ' + allies + 'v' + foes + ' · wave ' + b.wave + '/' + b.wavesTotal;
      el.classList.toggle('won', b.state === 'won');
      el.classList.toggle('lost', b.state === 'lost');
    });
  }

  /* ============================================================
     boot
     ============================================================ */
  function boot() {
    initTheme();
    $('.hero').addEventListener('click', function (e) {
      e0 = e;
      if (e.target.closest('button,a')) return;
      sticker();
    });

    G.stage = new FT.Stage($('#stage'));
    G.clueCanvas = $('#clue-canvas');

    $('#btn-start').addEventListener('click', function () {
      G.act = 1; G.actReveal = []; G.started = false;
      G.kase = new MS.Case();
      paintSelect(); show('select');
    });
    $('#title-resume').addEventListener('click', function () { if (G.world) { show('battle'); } });
    $('#sel-go').addEventListener('click', function () { paintAct(); show('act'); });
    $('#act-go').addEventListener('click', function () { paintMap(); show('map'); });
    $('#to-battle').addEventListener('click', function () { startMission(G.act); });
    $('#end-restart').addEventListener('click', function () {
      G.started = false; G.actReveal = []; G.act = 1; paintTitle(); show('title');
    });
    $('#btn-pause').addEventListener('click', function () {
      G.stage.paused = !G.stage.paused;
      $('#btn-pause').innerHTML = G.stage.paused ? ICON.play : ICON.stop;
    });

    addEventListener('keydown', function (e) {
      if (G.screen !== 'battle') return;
      const a = heldActor();
      if (!a) return;
      const k = e.key.toLowerCase();
      const pw = { '1': 0, '2': 1, '3': 2 };
      if (pw[k] !== undefined && a.def.powers[pw[k]]) { castPower(a.id, a.def.powers[pw[k]].id); e.preventDefault(); }
      const t = { q: 's1', w: 's2', e: 'ult' };
      if (t[k]) castSuper(a.id, t[k]);
      const sw = { z: 0, x: 1, c: 2 };
      if (sw[k] !== undefined && G.party[sw[k]]) switchTo(G.party[sw[k]]);
    });

    addEventListener('resize', function () {
      if (G.stage) G.stage.resize();
      const b = currentBattle();
      if (b && G.fields[b.id]) G.fields[b.id].resize();
      if (G.screen === 'mission') drawClueBoard();
    });

    /* Rotating a phone and letting the browser chrome collapse as the page
       scrolls both change the layout box without necessarily firing resize
       at the right moment, and every canvas in the game is sized from
       getBoundingClientRect. Re-measure on the events that actually fire on
       a phone, and again a beat later, once the new box has settled. The
       sizeCanvas() calls in the frame loop would paper over this, but they
       reallocate a backing store per frame — doing it once, on settle, is
       both correct and cheaper. */
    const remeasure = function () {
      if (G.stage) G.stage.resize();
      const b = currentBattle();
      if (b && G.fields[b.id]) G.fields[b.id].resize();
      if (G.screen === 'mission') drawClueBoard();
    };
    addEventListener('orientationchange', function () { setTimeout(remeasure, 250); });
    if (root.visualViewport) {
      root.visualViewport.addEventListener('resize', function () { setTimeout(remeasure, 120); });
    }

    G.stage.resize();
    G.stage.cv.style.display = 'none';

    show('title');
    requestAnimationFrame(frame);

    setTimeout(function () {
      if (!G.stage.busy()) {
        G.stage.queueFootage({
          kind: 'replay', dur: 4.0, tag: 'new avengers compound // west palm beach',
          title: 'the compound, 05:12 local',
          text: 'somebody left a light on in the farm house. the signal started the same night it came on.'
        });
      }
    }, 1400);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
