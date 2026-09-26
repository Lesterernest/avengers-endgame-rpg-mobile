/* ============================================================
   battle.js — one live simulation per battle front.
   every front ticks in real time whether or not you are looking
   at it. switching heroes changes only who you drive, never
   whether a fight is happening.
   ============================================================ */
(function (root) {
  'use strict';

  const GD = root.GD;
  const rnd = function (a, b) { return a + Math.random() * (b - a); };
  const pick = function (arr) { return arr[(Math.random() * arr.length) | 0]; };
  const clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  /* ---------- super tiers ----------
     one meter, three thresholds, three different rules.
     the ultimate is gated on a live team, not on a flag. */

  const TIERS = {
    s1:  { key: 's1',  label: 'super 1', cost: 26, minAct: 1 },
    s2:  { key: 's2',  label: 'super 2', cost: 58, minAct: 3, needsS1: true },
    ult: { key: 'ult', label: 'ultimate', cost: 100, minAct: 5, needsTeam: true }
  };
  const TEAM_REQ = 2;      // you + at least one other living ally
  const ULT_PERSONAL = 35; // raw charge needed before the team link applies

  /* the engine names the tiers s1/s2/ult; the roster spells them
     super1/super2/ultimate. this is the one place that knows. */
  const TIER_FIELD = { s1: 'super1', s2: 'super2', ult: 'ultimate' };
  function tierPower(heroDef, tier) {
    return heroDef ? heroDef[TIER_FIELD[tier] || tier] : null;
  }

  /* ---------- actor ---------- */

  function makeActor(hero, team, x, y) {
    return {
      id: hero.id + '@' + team + Math.random().toString(36).slice(2, 7),
      def: hero,
      name: hero.name,
      team: team,
      role: hero.role,
      x: x, y: y,
      hx: x, hy: y,                 // home slot, for the idle drift
      vx: 0, vy: 0,
      hp: hero.hp, maxHp: hero.hp,
      armor: hero.armor,
      atk: hero.atk,
      spd: hero.spd,
      crit: hero.crit,
      energy: 60, maxEnergy: 100,
      cds: {},
      super: 0,
      ultUnlocked: false,
      super2Unlocked: false,
      chargesCast: 0,
      ultCast: 0,
      rage: 0,                      // hulk / binary ramp
      busy: 0,                      // channeling
      channel: null,
      buffs: [],
      _now: 0,
      alive: true,
      surprise: !!hero.surprise,
      stagger: 0
    };
  }

  function makeFoe(kind, actLevel, x, y) {
    const d = GD.FOES[kind];
    const scale = 1 + (actLevel - 1) * 0.28;
    return {
      id: 'foe' + Math.random().toString(36).slice(2, 8),
      def: d,
      name: d.name,
      team: 'enemy',
      role: d.role,
      x: x, y: y,
      hx: x, hy: y,
      vx: 0, vy: 0,
      hp: d.hp * scale, maxHp: d.hp * scale,
      armor: 0.08,
      atk: d.atk * scale,
      spd: d.spd,
      crit: 0.06,
      energy: 100, maxEnergy: 100,
      cds: {},
      super: 0, ultUnlocked: false, super2Unlocked: false,
      chargesCast: 0, ultCast: 0,
      rage: 0, busy: 0, channel: null, buffs: [],
      _now: 0,
      alive: true, surprise: false, stagger: 0
    };
  }

  /* ---------- battle ---------- */

  function Battle(opts) {
    this.id = opts.id;
    this.actId = opts.actId;
    this.act = opts.act;
    this.locationId = opts.location;
    this.space = opts.space;
    this.title = opts.title;
    this.level = opts.level || 1;

    this.actors = [];
    this.foes = [];
    this.all = [];              // actors + foes, one list for queries
    this.t = 0;
    this.tick = 0;
    this.fx = [];
    this.log = [];
    this.banner = null;         // { text, sub, until, tone }
    this.wave = 0;
    this.wavesTotal = Math.max(1, (opts.waves || 3) + (opts.mods && opts.mods.extraWave || 0));
    this.waveTimer = 1.2;
    this.state = 'running';     // running | won | lost
    this.lastSurprise = -999;
    this.events = [];           // cinematic triggers: { kind, text, until }
    this.stat = { dealt: 0, taken: 0, healed: 0, kills: 0 };
    // the case board reaches the fight: what a mission earned or cost
    this.mods = opts.mods || { foeHp: 0, foeAtk: 0, charge: 0, heal: 0, surprise: null };
    this.forcedSurprise = this.mods.surprise || null;
    this.forcedFired = false;
    // the vehicle is optional in every sense: absent id, unknown id, or no
    // fleet at all all resolve to null, and null means no vehicle plays.
    this.vehicle = null;
  }

  Battle.prototype.teamOf = function (team) {
    return this.all.filter(function (a) { return a.team === team && a.alive; });
  };
  /* heroes only. the vehicle sits in `all` so it can be damaged and drawn,
     but it is never one of the team's combat choices. */
  Battle.prototype.heroesOf = function (team) {
    return this.all.filter(function (a) { return a.team === team && a.alive && !a.isVehicle; });
  };
  Battle.prototype.allyCount = function () { return this.heroesOf('ally').length; };
  Battle.prototype.actor = function (id) {
    for (let i = 0; i < this.all.length; i++) if (this.all[i].id === id) return this.all[i];
    return null;
  };

  function dist(a, b) {
    const dx = (a.x - b.x) * 1.7, dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  Battle.prototype.dist = dist;

  function nearest(a, list, max) {
    let best = null, bd = max === undefined ? 1e9 : max;
    for (let i = 0; i < list.length; i++) {
      const d = dist(a, list[i]);
      if (d < bd) { bd = d; best = list[i]; }
    }
    return best;
  }
  function lowest(a, list) {
    let best = null, r = 2;
    for (let i = 0; i < list.length; i++) {
      const f = list[i].hp / list[i].maxHp;
      if (f < r) { r = f; best = list[i]; }
    }
    return best;
  }

  /* ---------- fx ---------- */

  function spark(b, x, y, color, n, spread, up) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = rnd(0.02, 0.09) * (spread || 1);
      b.fx.push({
        x: x, y: y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6 - (up || 0.02),
        life: rnd(0.35, 0.9), max: 0.9, c: color, r: rnd(1.4, 3.6)
      });
    }
  }
  function ring(b, x, y, color, r0, r1, life, width) {
    b.fx.push({ ring: true, x: x, y: y, r0: r0, r1: r1, life: life, max: life, c: color, w: width || 2 });
  }
  function beam(b, x1, y1, x2, y2, color, life) {
    b.fx.push({ beam: true, x1: x1, y1: y1, x2: x2, y2: y2, life: life, max: life, c: color });
  }
  function textPop(b, x, y, s, color) {
    b.fx.push({ txt: s, x: x, y: y, life: 1.1, max: 1.1, c: color || '#ffffff' });
  }

  function note(b, s) {
    b.log.unshift({ t: b.t, s: s });
    if (b.log.length > 5) b.log.pop();
  }

  /* ---------- damage ---------- */

  function hasBuff(a, kind) {
    for (let i = 0; i < a.buffs.length; i++) if (a.buffs[i].kind === kind) return a.buffs[i];
    return null;
  }
  function addBuff(a, kind, dur, data) {
    const ex = hasBuff(a, kind);
    if (ex) { ex.until = Math.max(ex.until, a._now + dur); if (data) for (const k in data) ex[k] = data[k]; return ex; }
    const o = { kind: kind, until: a._now + dur };
    if (data) for (const k in data) o[k] = data[k];
    a.buffs.push(o);
    return o;
  }

  function damage(b, src, tgt, amount, opts) {
    opts = opts || {};
    if (!tgt || !tgt.alive) return 0;
    let amt = amount;
    const armored = tgt.armor || 0;
    if (opts.ignoreArmor) amt = amt * (1 - armored * 0.35);
    else amt = amt * (1 - armored);
    if (hasBuff(tgt, 'mark')) amt *= 1.3;
    if (hasBuff(tgt, 'hex')) amt *= 1.25;
    if (hasBuff(tgt, 'shrunk')) amt *= 2;
    if (hasBuff(tgt, 'dodge')) amt *= 0.5;
    if (opts.charge) amt *= 1.6;
    if (Math.random() < (src.crit || 0.05)) { amt *= 1.9; opts.crit = true; }

    amt = Math.max(1, amt);
    tgt.hp -= amt;
    tgt.stagger = Math.min(1, tgt.stagger + (opts.stun ? 1 : 0.15));
    if (tgt.team === 'enemy') {
      b.stat.dealt += amt;
      if (src && src.isVehicle) {
        // a vehicle's damage is counted for the readout, and deliberately
        // does not feed anybody's super meter
        src._dealt = (src._dealt || 0) + amt;
      } else if (src) {
        chargeSuper(src, amt * (opts.superGain || 0.1));
      }
    }
    else b.stat.taken += amt;

    spark(b, tgt.x, tgt.y, src && src.def ? src.def.color : '#ffffff', opts.crit ? 14 : 6, 1, 0.02);
    if (opts.crit) textPop(b, tgt.x, tgt.y - 0.05, Math.round(amt) + '!', '#ff4612');
    if (src && src.channel) { /* nothing extra */ }

    if (tgt.hp <= 0) {
      if (hasBuff(tgt, 'voidmass') && !tgt._phased) {
        tgt.hp = tgt.maxHp * 0.18;
        tgt._phased = true;
        textPop(b, tgt.x, tgt.y - 0.05, 'it does not die that way', '#7a3ab0');
        ring(b, tgt.x, tgt.y, '#7a3ab0', 0.02, 0.16, 0.7, 3);
        return amt;
      }
      tgt.alive = false;
      tgt.hp = 0;
      ring(b, tgt.x, tgt.y, '#ffffff', 0.01, 0.12, 0.6, 2);
      spark(b, tgt.x, tgt.y, '#ffffff', 22, 1.6, 0.05);
      if (tgt.team === 'enemy') { b.stat.kills++; note(b, tgt.name + ' down'); }
    }
    return amt;
  }

  function heal(b, src, tgt, amount) {
    if (!tgt || !tgt.alive) return 0;
    const before = tgt.hp;
    tgt.hp = Math.min(tgt.maxHp, tgt.hp + amount);
    const got = tgt.hp - before;
    b.stat.healed += got;
    textPop(b, tgt.x, tgt.y - 0.05, '+' + Math.round(got), '#8fd18a');
    ring(b, tgt.x, tgt.y, '#8fd18a', 0.01, 0.09, 0.5, 2);
    if (src) chargeSuper(src, got * 0.12);
    return got;
  }

  /* ---------- super meter ----------
     charge comes from doing and from taking, so a tank in the middle
     of it is close to ready at the same time as a dps. */

  function chargeSuper(a, amount) {
    if (a.team !== 'ally' || a.isVehicle) return;
    const b = a._b;
    const link = b ? b.allyCount() >= TEAM_REQ : false;
    let gain = amount;
    if (link) gain *= 1.45;                       // the team link feeds every tier
    a.super = clamp(a.super + gain, 0, 100);
    if (a.super >= ULT_PERSONAL && link) a.ultUnlocked = true;
    if (a.super >= TIERS.s1.cost) a.super2Unlocked = true;
  }

  /* ---------- powers ---------- */

  function pwReady(a, p) {
    const until = a.cds[p.id] || 0;
    return a._now >= until;
  }
  function pwLeft(a, p) {
    return Math.max(0, (a.cds[p.id] || 0) - a._now);
  }
  function spend(a, p) {
    // a vehicle passive that speeds the team up shortens every cooldown,
    // on top of whatever the hero's own passive already does.
    const scale = (a.def.passive && a.def.passive.id === 'spider-sense' ? 0.8 : 1) * (a._cdScale || 1);
    a.cds[p.id] = a._now + p.cd * scale;
    a.energy = clamp(a.energy - (p.cost || 0), 0, 999);
    a.chargesCast++;
  }

  const RANGE = { short: 0.1, mid: 0.24, long: 0.4 };

  /* verbs: every power in data.js is one of these. the numbers live
     here so balance is one file, not sixteen. */
  const VERBS = {
    projectile: function (b, a, t, p) {
      const mult = p.mult || 1.7;
      beam(b, a.x, a.y, t.x, t.y, a.def.color, 0.18);
      damage(b, a, t, a.atk * mult, { stun: false });
      if (a.def.id === 'cap' && t.hp > 0) { ring(b, a.x, a.y, a.def.color, 0.02, 0.1, 0.4, 2); }
      return t;
    },
    pierce: function (b, a, t, p) {
      const mult = p.mult || 1.5;
      const foes = b.teamOf('enemy');
      beam(b, a.x, a.y, t.x, t.y, a.def.color, 0.25);
      for (let i = 0; i < foes.length; i++) {
        const f = foes[i];
        if (Math.abs(f.y - a.y) < 0.22) damage(b, a, f, a.atk * mult, {});
      }
      return t;
    },
    beam: function (b, a, t, p) {
      const mult = p.mult || 0.7;
      a.busy = 2.2;
      a.channel = { t: t, tick: 0, mult: mult, p: p };
      textPop(b, a.x, a.y - 0.07, p.name, a.def.color);
      return t;
    },
    melee: function (b, a, t, p) {
      const mult = p.mult || 1.9;
      beam(b, a.x, a.y, t.x, t.y, a.def.color, 0.12);
      damage(b, a, t, a.atk * mult, {});
      return t;
    },
    slam: function (b, a, t, p) {
      const mult = p.mult || 2.0, r = p.rad || 0.13;
      ring(b, a.x, a.y, a.def.color, 0.01, r, 0.45, 3);
      spark(b, a.x, a.y, a.def.color, 20, 1.8, 0.05);
      const foes = b.teamOf('enemy');
      for (let i = 0; i < foes.length; i++) {
        if (dist(a, foes[i]) < r) damage(b, a, foes[i], a.atk * mult, { stun: true, superGain: 0.16 });
      }
      if (a.role === 'healer' || a.role === 'tank') heal(b, a, a, a.maxHp * 0.05);
      return t;
    },
    nova: function (b, a, t, p) {
      const mult = p.mult || 1.8, r = p.rad || 0.18;
      ring(b, a.x, a.y, a.def.color, 0.01, r, 0.5, 3);
      const foes = b.teamOf('enemy');
      for (let i = 0; i < foes.length; i++) {
        if (dist(a, foes[i]) < r) damage(b, a, foes[i], a.atk * mult, {});
      }
      return t;
    },
    burst: function (b, a, t, p) {
      const mult = p.mult || 3.2, r = p.rad || 0.17;
      const c = t || a;
      ring(b, c.x, c.y, a.def.color, 0.01, r, 0.55, 4);
      spark(b, c.x, c.y, a.def.color, 34, 2.4, 0.06);
      const foes = b.teamOf('enemy');
      for (let i = 0; i < foes.length; i++) {
        if (dist(c, foes[i]) < r) damage(b, a, foes[i], a.atk * mult, { superGain: 0.18 });
      }
      return c;
    },
    dash: function (b, a, t, p) {
      const mult = p.mult || 1.6;
      beam(b, a.x, a.y, t.x, t.y, a.def.color, 0.16);
      a.x = t.x + rnd(-0.03, 0.03); a.y = t.y + rnd(-0.03, 0.03);
      ring(b, a.x, a.y, a.def.color, 0.02, 0.12, 0.4, 2);
      const foes = b.teamOf('enemy');
      for (let i = 0; i < foes.length; i++) if (dist(a, foes[i]) < 0.12) damage(b, a, foes[i], a.atk * mult, { stun: true });
      if (a.role === 'tank') addBuff(a, 'taunt', 4);
      return t;
    },
    blink: function (b, a, t, p) {
      ring(b, a.x, a.y, a.def.color, 0.01, 0.07, 0.35, 2);
      if (t) { a.x = clamp(t.x + rnd(-0.1, 0.1), 0.06, 0.94); a.y = clamp(t.y + rnd(-0.1, 0.1), 0.12, 0.88); }
      ring(b, a.x, a.y, a.def.color, 0.01, 0.09, 0.4, 3);
      spark(b, a.x, a.y, a.def.color, 10, 1, 0.02);
      if (p && p.mult) damage(b, a, t, a.atk * p.mult, {});
      return t;
    },
    strike: function (b, a, t, p) {
      const mult = p.mult || 2.4;
      ring(b, t.x, t.y, a.def.color, 0.01, 0.1, 0.4, 3);
      beam(b, t.x, t.y + 0.3, t.x, t.y, a.def.color, 0.2);
      damage(b, a, t, a.atk * mult, { ignoreArmor: true, superGain: 0.2 });
      return t;
    },
    control: function (b, a, t, p) {
      const dur = p.dur || 3;
      addBuff(t, 'stun', dur);
      ring(b, t.x, t.y, a.def.color, 0.01, 0.08, 0.5, 2);
      textPop(b, t.x, t.y - 0.05, 'held', a.def.color);
      damage(b, a, t, a.atk * (p.mult || 0.6), {});
      return t;
    },
    debuff: function (b, a, t, p) {
      const r = p.rad || 0.28;
      const foes = b.teamOf('enemy');
      for (let i = 0; i < foes.length; i++) if (dist(a, foes[i]) < r) addBuff(foes[i], 'shrunk', 8);
      ring(b, a.x, a.y, a.def.color, 0.01, r, 0.6, 2);
      textPop(b, a.x, a.y - 0.07, 'subatomic', a.def.color);
      return t;
    },
    heal: function (b, a, t, p) {
      const tgt = lowest(a, b.heroesOf('ally')) || a;
      heal(b, a, tgt, a.maxHp * (p.frac || 0.28));
      beam(b, a.x, a.y, tgt.x, tgt.y, '#8fd18a', 0.3);
      return tgt;
    },
    /* ---- super-tier verbs ---- */
    bastion: function (b, a, t, p) {
      addBuff(a, 'bastion', p.dur || 8);
      a.ultCast++;
      ring(b, a.x, a.y, a.def.color, 0.01, 0.4, 0.8, 4);
      b.banner = { text: p.name, sub: 'the line is holding', until: b.t + 2.2, tone: 'ally' };
      b.events.push({ kind: 'bastion', text: p.name, until: b.t + 2.0 });
      heal(b, a, a, a.maxHp * 0.25);
      const allies = b.teamOf('ally');
      for (let i = 0; i < allies.length; i++) heal(b, a, allies[i], allies[i].maxHp * 0.2);
      return a;
    },
    laststand: function (b, a, t, p) {
      addBuff(a, 'bastion', 12);
      addBuff(a, 'immortal', 10);
      a.ultCast++;
      ring(b, a.x, a.y, a.def.color, 0.01, 0.6, 1.0, 5);
      b.banner = { text: p.name, sub: 'nothing here dies easily. including him.', until: b.t + 3, tone: 'ally' };
      b.events.push({ kind: 'laststand', text: p.name, until: b.t + 2.6 });
      const foes = b.teamOf('enemy');
      for (let i = 0; i < foes.length; i++) if (dist(a, foes[i]) < 0.2) damage(b, a, foes[i], a.atk * 2.4, { stun: true });
      return a;
    },
    stormcrown: function (b, a, t, p) {
      const dur = p.dur || 10;
      const allies = b.heroesOf('ally');
      for (let i = 0; i < allies.length; i++) addBuff(allies[i], 'blessed', dur);
      a.ultCast++;
      ring(b, a.x, a.y, a.def.color, 0.01, 0.5, 0.8, 4);
      b.banner = { text: p.name, sub: 'the sky is open above the field', until: b.t + 2.4, tone: 'ally' };
      b.events.push({ kind: 'storm', text: p.name, until: b.t + 2.2 });
      const foes = b.teamOf('enemy');
      for (let i = 0; i < foes.length; i++) if (dist(a, foes[i]) < 0.24) damage(b, a, foes[i], a.atk * 2.2, { stun: true });
      return a;
    },
    dodgefield: function (b, a, t, p) {
      const dur = p.dur || 8;
      const allies = b.teamOf('ally');
      for (let i = 0; i < allies.length; i++) addBuff(allies[i], 'dodge', dur);
      a.ultCast++;
      ring(b, a.x, a.y, a.def.color, 0.01, 0.45, 0.8, 3);
      b.banner = { text: p.name, sub: 'the field stopped being solid', until: b.t + 2.2, tone: 'ally' };
      b.events.push({ kind: 'dodge', text: p.name, until: b.t + 2.2 });
      return a;
    },
    sweepheal: function (b, a, t, p) {
      const allies = b.heroesOf('ally');
      for (let i = 0; i < allies.length; i++) heal(b, a, allies[i], allies[i].maxHp * (p.frac || 0.55));
      const foes = b.teamOf('enemy');
      for (let i = 0; i < foes.length; i++) addBuff(foes[i], 'stun', 2.2);
      a.ultCast++;
      ring(b, a.x, a.y, a.def.color, 0.01, 0.5, 0.7, 3);
      b.banner = { text: p.name, sub: 'everybody up. now.', until: b.t + 2.2, tone: 'ally' };
      b.events.push({ kind: 'healwave', text: p.name, until: b.t + 2.2 });
      return a;
    },
    snipe: function (b, a, t, p) {
      if (!t) return t;
      beam(b, a.x, a.y, t.x, t.y, a.def.color, 0.4);
      a.ultCast++;
      damage(b, a, t, a.atk * (p.mult || 6.5), { ignoreArmor: true, charge: true, superGain: 0.2 });
      textPop(b, t.x, t.y - 0.05, 'marked', a.def.color);
      addBuff(t, 'mark', 10);
      b.banner = { text: p.name, sub: 'one arrow. he chose the target.', until: b.t + 2.2, tone: 'ally' };
      b.events.push({ kind: 'snipe', text: p.name, until: b.t + 2.2 });
      return t;
    },
    orbit: function (b, a, t, p) {
      const dur = p.dur || 9;
      addBuff(a, 'orbit', dur);
      a.ultCast++;
      ring(b, a.x, a.y, a.def.color, 0.01, 0.35, 0.7, 3);
      b.banner = { text: p.name, sub: 'the armour is lighter now', until: b.t + 2.2, tone: 'ally' };
      b.events.push({ kind: 'orbit', text: p.name, until: b.t + 2.2 });
      return a;
    },
    overload: function (b, a, t, p) {
      const mult = p.mult || 5.5, r = p.rad || 0.55;
      a.ultCast++;
      ring(b, a.x, a.y, a.def.color, 0.01, r, 0.9, 5);
      ring(b, a.x, a.y, '#ffffff', 0.01, r * 0.7, 1.1, 3);
      spark(b, a.x, a.y, a.def.color, 60, 3, 0.1);
      const foes = b.teamOf('enemy');
      for (let i = 0; i < foes.length; i++) {
        const d = dist(a, foes[i]);
        if (d < r) damage(b, a, foes[i], a.atk * mult * (1 - d / r * 0.4), { ignoreArmor: true, charge: true, superGain: 0.22 });
      }
      b.banner = { text: p.name, sub: p.comic ? 'the field ends where he decided' : 'that is the whole field', until: b.t + 3, tone: 'ally' };
      b.events.push({ kind: 'overload', text: p.name, comic: p.comic, until: b.t + 3 });
      return a;
    },
    bifurcation: function (b, a, t, p) {
      const dur = p.dur || 7;
      const allies = b.heroesOf('ally');
      for (let i = 0; i < allies.length; i++) addBuff(allies[i], 'dodge', dur);
      a.ultCast++;
      ring(b, a.x, a.y, a.def.color, 0.01, 0.7, 0.9, 4);
      b.banner = { text: p.name, sub: 'the storm split the shot in half', until: b.t + 3, tone: 'ally' };
      b.events.push({ kind: 'bifurcation', text: p.name, comic: p.comic, until: b.t + 2.8 });
      const foes = b.teamOf('enemy');
      for (let i = 0; i < foes.length; i++) if (dist(a, foes[i]) < 0.5) damage(b, a, foes[i], a.atk * 3.6, { ignoreArmor: true, superGain: 0.22 });
      return a;
    },
    scarlet: function (b, a, t, p) {
      const dur = p.dur || 7;
      const foes = b.teamOf('enemy');
      for (let i = 0; i < foes.length; i++) {
        addBuff(foes[i], 'hex', dur);
        addBuff(foes[i], 'stun', 1.6);
        damage(b, a, foes[i], a.atk * 2.4, { charge: true, superGain: 0.2 });
      }
      const allies = b.teamOf('ally');
      for (let i = 0; i < allies.length; i++) heal(b, a, allies[i], allies[i].maxHp * 0.5);
      a.ultCast++;
      ring(b, a.x, a.y, a.def.color, 0.01, 0.8, 1.0, 4);
      b.banner = { text: p.name, sub: 'reality is briefly a suggestion', until: b.t + 3, tone: 'ally' };
      b.events.push({ kind: 'scarlet', text: p.name, comic: p.comic, until: b.t + 2.8 });
      return a;
    },
    /* villain surprise verbs */
    voidmass: function (b, a, t, p) { addBuff(a, 'voidmass', 600); return a; }
  };

  /* ---------- vehicles ----------
     a vehicle is a third combatant, not a hero. it joins a front the same
     way the heroes do — it has hp, a bar, an attack on a rate, and an energy
     pool of its own — and every number it spends goes through the same
     damage() as Cap's shield does, so armour, marks, hexes, dodges and crits
     all apply to it exactly as they apply to a hero.

     three rules keep it from taking the fight away from the heroes:
       1. it is optional. no fleet, no vehicle, no difference at all.
       2. it does not touch the super meter. heroes charge their own tiers.
       3. its best output per second is a fraction of a single super 1.

     the verbs below are separate from the hero verbs on purpose: a hull is
     not a person, so nothing here channels, and nothing here escalates. */

  const V_VERBS = {
    // hits one target. the bread and butter of all twelve.
    vprojectile: function (b, v, t, p) {
      beam(b, v.x, v.y, t.x, t.y, v.def.combat.color, 0.2);
      damage(b, v, t, v.atk * (p.mult || 1.5), { stun: !!p.stun, superGain: 0 });
      return t;
    },
    // runs the line: the wake is laid through the target's row, so the
    // whole depth of the field is in it
    vpierce: function (b, v, t, p) {
      const mult = p.mult || 1.6, r = p.rad || 0.34;
      const c = t || v;
      const foes = b.heroesOf('enemy');
      let hits = 0;
      for (let i = 0; i < foes.length; i++) {
        if (hits >= 4) break;                        // a line, not a wipe
        if (Math.abs(foes[i].y - c.y) < r) { damage(b, v, foes[i], v.atk * mult, { superGain: 0 }); hits++; }
      }
      beam(b, 0.06, c.y, 0.94, c.y, v.def.combat.color, 0.3);
      return t;
    },
    // closes the distance first
    vmelee: function (b, v, t, p) {
      const t0 = t;
      if (t) {
        const dx = t.x - v.x, dy = t.y - v.y;
        v.x = t.x - dx * 0.14;
        v.y = t.y - dy * 0.14;
        v.x = clamp(v.x, 0.04, 0.96); v.y = clamp(v.y, 0.06, 0.94);
        ring(b, t.x, t.y, v.def.combat.color, 0.01, 0.12, 0.4, 3);
      }
      damage(b, v, t0, v.atk * (p.mult || 1.8), { stun: !!p.stun, superGain: 0 });
      return t0;
    },
    // one blast, centred where the shot lands rather than on the vehicle —
    // the vehicle itself is parked on the ally side of the field
    vnova: function (b, v, t, p) {
      const mult = p.mult || 1.4, r = p.rad || 0.2;
      const c = t || v;
      ring(b, c.x, c.y, v.def.combat.color, 0.01, r, 0.55, 3);
      const foes = b.heroesOf('enemy');
      for (let i = 0; i < foes.length; i++) {
        if (dist(c, foes[i]) < r) damage(b, v, foes[i], v.atk * mult, { superGain: 0 });
      }
      return t;
    },
    // a spray rather than a single line
    vburst: function (b, v, t, p) {
      const mult = p.mult || 1.4, r = p.rad || 0.22;
      const c = t || v;
      const foes = b.heroesOf('enemy');
      let hits = 0;
      for (let i = 0; i < foes.length; i++) {
        if (dist(c, foes[i]) < r && hits < 3) { damage(b, v, foes[i], v.atk * mult, { superGain: 0 }); hits++; }
      }
      return t;
    },
    // parks itself. nothing heroic, and that is the point of it.
    vbastion: function (b, v, t, p) {
      const dur = p.dur || 6, allies = b.heroesOf('ally');
      for (let i = 0; i < allies.length; i++) addBuff(allies[i], 'bulwark', dur);
      v.channel = null; v.busy = 0;
      ring(b, v.x, v.y, v.def.combat.color, 0.01, 0.32, 0.7, 4);
      return v;
    },
    // a short continuous burn, resolved the same way a hero channel is
    vbeam: function (b, v, t, p) {
      v.busy = p.dur || 0.9;
      v.channel = { t: t, tick: v.busy, mult: (p.mult || 1.2) * 0.6, p: p, veh: true };
      beam(b, v.x, v.y, t.x, t.y, v.def.combat.color, 0.2);
      return t;
    },
    // a straight run at one target, past whatever is in front of it
    vdash: function (b, v, t, p) {
      if (!t) return t;
      beam(b, v.x, v.y, t.x, t.y, v.def.combat.color, 0.3);
      ring(b, t.x, t.y, v.def.combat.color, 0.01, 0.14, 0.45, 3);
      damage(b, v, t, v.atk * (p.mult || 2.0), { ignoreArmor: true, superGain: 0 });
      if (p.drift) { v.x = clamp(v.x + (t.x > 0.5 ? 0.1 : -0.1), 0.04, 0.96); }
      return t;
    },
    // the field steps sideways and somebody is standing in the wrong place
    vblink: function (b, v, t, p) {
      const foes = b.teamOf('enemy');
      if (!foes.length) return t;
      const dr = p.drift || 1.1;
      v.x = clamp(foes[(Math.random() * foes.length) | 0].x - dr, 0.04, 0.96);
      ring(b, v.x, v.y, v.def.combat.color, 0.01, 0.16, 0.5, 3);
      ring(b, v.x, v.y, '#ffffff', 0.01, 0.1, 0.35, 2);
      const target = nearest(v, foes) || t;
      damage(b, v, target, v.atk * (p.mult || 1.8), { superGain: 0 });
      return target;
    },
    // a pass that knocks everything it touches off its feet, thrown down
    // the line the target is standing in
    vsweepheal: function (b, v, t, p) {
      const mult = p.mult || 1.2, r = p.rad || 0.34;
      const c = t || v;
      const foes = b.heroesOf('enemy');
      for (let i = 0; i < foes.length; i++) {
        if (Math.abs(foes[i].y - c.y) < r) {
          addBuff(foes[i], 'stun', p.dur || 1.4);
          damage(b, v, foes[i], v.atk * mult, { superGain: 0 });
        }
      }
      const allies = b.heroesOf('ally');
      for (let i = 0; i < allies.length; i++) heal(b, v, allies[i], allies[i].maxHp * (p.frac || 0.25));
      return v;
    }
  };

  /* the vehicle as an actor. same shape as a hero actor, so it rides the
     same update loop, takes the same damage(), and draws on the field. */
  function makeVehicle(veh, x, y) {
    const c = veh.combat;
    return {
      id: 'veh:' + veh.id,
      def: veh,
      name: veh.name,
      isVehicle: true,
      team: 'ally',
      role: 'support',
      x: x, y: y,
      hx: x, hy: y,
      vx: 0, vy: 0,
      hp: c.hull, maxHp: c.hull,
      armor: 0.12,                 // a hull, not a person
      atk: c.atk,
      spd: 1.5,
      crit: 0.05,
      energy: 60, maxEnergy: 100,
      cds: {},
      super: 0, ultUnlocked: false, super2Unlocked: false,
      chargesCast: 0, ultCast: 0,
      rage: 0, busy: 0, channel: null, buffs: [],
      _now: 0, alive: true, stagger: 0,
      vehCd: 0
    };
  }

  /* the vehicle's passive is read by the update loop every tick, so all
     this has to do is put a clean, null-safe record on the battle. */
  function applyVehiclePassive(b) {
    const v = b.vehicle;
    if (!v || !v.passive) return;
    const P = v.passive, m = P.mods || {};
    v.atkStat = m.atk || 1;
    v.cdStat = m.cd || 1;
    v.critStat = m.crit || 1;
    v.energyStat = m.energy || 1;
    v.regenStat = m.regen || 0;
    v.teamArmor = P.teamArmor || 0;
  }

  /* optional in the strongest sense: a null id, an unknown id, or a vehicle
     with no combat block all resolve to no vehicle at all, which is exactly
     what every mission looked like before this layer existed. */
  function attachVehicle(b, vehicleId) {
    b.vehicle = null;
    if (!vehicleId || !GD.VEH_BY_ID) return b;
    const veh = GD.VEH_BY_ID[vehicleId];
    if (!veh || !veh.combat) return b;
    const v = makeVehicle(veh, 0.06, 0.52);
    v.passive = veh.combat.passive;
    b.all.push(v);
    b.vehicle = v;
    applyVehiclePassive(b);
    note(b, veh.name + ' on scene');
    return b;
  }

  /* the readout the battle UI and the tests both read from. */
  Battle.prototype.vehicleState = function () {
    const v = this.vehicle;
    if (!v) return null;
    const c = v.def.combat, p = c.passive, ab = c.ability;
    const energy = clamp(v.energy, 0, v.maxEnergy);
    const ready = energy >= ab.cost && this.t >= (v.cds[ab.id] || 0);
    return {
      id: v.def.id, name: v.def.name, color: c.color, kind: v.def.kind,
      hp: v.hp, maxHp: v.maxHp, alive: v.alive, hull: (v.hp / v.maxHp),
      energy: energy, maxEnergy: v.maxEnergy, energyPct: energy / v.maxEnergy,
      atk: v.atk, rate: c.rate, range: c.range, busy: v.busy > 0,
      attack: { id: c.attack.id, name: c.attack.name, mult: c.attack.mult, ready: !v.busy && v.alive },
      passive: { id: p.id, name: p.name, blurb: p.blurb, atk: v.atkStat || 1, cd: v.cdStat || 1, crit: v.critStat || 1, energy: v.energyStat || 1, regen: v.regenStat || 0, teamArmor: v.teamArmor || 0 },
      ability: {
        id: ab.id, name: ab.name, verb: ab.verb, cost: ab.cost, cd: ab.cd,
        desc: ab.desc, ready: ready, cdLeft: Math.max(0, (v.cds[ab.id] || 0) - this.t),
        gate: energy < ab.cost ? 'needs ' + Math.ceil(ab.cost - energy) + ' more energy' : (!ready ? 'cooling down' : '')
      },
      damageDealt: v._dealt || 0,
      casts: v.casts || 0,
      abilityCasts: v.abilityCasts || 0
    };
  };

  /* ---------- public casting ---------- */

  Battle.prototype.castPower = function (actorId, powerId) {
    const a = this.actor(actorId);
    if (!a || !a.alive || a.team !== 'ally') return false;
    if (a.isVehicle) return false;
    if (hasBuff(a, 'stun')) return false;
    if (a.busy > 0) return false;
    const def = a.def;
    let p = null;
    for (let i = 0; i < def.powers.length; i++) if (def.powers[i].id === powerId) p = def.powers[i];
    if (!p || !pwReady(a, p)) return false;

    const foes = this.teamOf('enemy');
    if (!foes.length) return false;
    const t = nearest(a, foes, p.range) || nearest(a, foes);
    if (p.range && p.range < 0.2 && dist(a, t) > p.range) return false;

    spend(a, p);
    VERBS[p.verb](this, a, t, p);
    a.energy = clamp(a.energy + 6, 0, a.maxEnergy);
    this.events.push({ kind: 'power', text: p.name, who: def.name, until: this.t + 0.9 });
    return true;
  };

  Battle.prototype.castSuper = function (actorId, tier) {
    const a = this.actor(actorId);
    if (!a || !a.alive || a.team !== 'ally') return false;
    if (a.isVehicle) return false;
    if (hasBuff(a, 'stun') || a.busy > 0) return false;
    const t = TIERS[tier];
    if (a.super < t.cost) return false;
    if (t.minAct > this.act) return false;
    if (tier === 's2' && !a.super2Unlocked) return false;
    if (tier === 'ult') {
      if (!t.needsTeam) { /* nothing */ }
      else if (this.allyCount() < TEAM_REQ) return false;   // the gate, enforced here
    }
    const p = tierPower(a.def, tier);
    if (!p) return false;
    const foes = this.teamOf('enemy');
    const target = nearest(a, foes) || a;
    a.super = clamp(a.super - t.cost, 0, 100);
    VERBS[p.verb](this, a, target, p);
    a.energy = a.maxEnergy;
    a.ultCast++;
    return true;
  };

  Battle.prototype.tierState = function (actor) {
    const b = this;
    function st(tier) {
      const t = TIERS[tier];
      const locked = t.minAct > b.act;
      const enough = actor.super >= t.cost;
      let gate = '';
      if (locked) gate = 'unlocks in act ' + t.minAct;
      else if (tier === 's2' && !actor.super2Unlocked) gate = 'cast super 1 first';
      else if (tier === 'ult') {
        const link = b.allyCount() >= TEAM_REQ;
        if (!link) gate = 'needs ' + TEAM_REQ + ' allies in this battle — you are solo here';
        else if (actor.super < ULT_PERSONAL) gate = 'personal charge ' + Math.round(actor.super) + '/' + ULT_PERSONAL;
      }
      return {
        key: tier, label: t.label, cost: t.cost, locked: locked,
        ready: !locked && enough && !gate,
        full: enough, gate: gate, pct: clamp(actor.super / t.cost, 0, 1)
      };
    }
    return { s1: st('s1'), s2: st('s2'), ult: st('ult'), link: b.allyCount() >= TEAM_REQ, allies: b.allyCount() };
  };

  /* ---------- spawning ---------- */

  const WAVE_TABLE = [
    ['outrider', 'outrider', 'outrider', 'drone'],
    ['outrider', 'marauder', 'drone', 'outrider'],
    ['marauder', 'prowler', 'drone', 'centuri'],
    ['prowler', 'centuri', 'marauder', 'marauder', 'drone'],
    ['centuri', 'prowler', 'prowler', 'marauder', 'leviathan']
  ];

  Battle.prototype.spawnWave = function () {
    this.wave++;
    const row = WAVE_TABLE[Math.min(this.wave, WAVE_TABLE.length) - 1];
    const n = row.length + (this.act - 1);
    for (let i = 0; i < n; i++) {
      const kind = row[i % row.length];
      const x = rnd(0.66, 0.94), y = rnd(0.16, 0.84);
      const f = makeFoe(kind, this.act, x, y);
      if (this.mods.foeHp) { f.hp *= 1 + this.mods.foeHp; f.maxHp = f.hp; }
      if (this.mods.foeAtk) f.atk *= 1 + this.mods.foeAtk;
      this.all.push(f);
      ring(this, f.x, f.y, '#ff4612', 0.01, 0.09, 0.6, 2);
    }
    note(this, 'wave ' + this.wave + ' of ' + this.wavesTotal);
  };

  /* surprise characters: rare by design, and visible when they happen.
     a solved non-combat mission can also hand you one deterministically,
     which is the point: what you did in the plaza decides who walks in. */
  Battle.prototype.rollSurprise = function () {
    const S = GD.SURPRISE;

    if (this.forcedSurprise && !this.forcedFired) {
      const hero = GD.BY_ID[this.forcedSurprise];
      if (hero) {
        this.forcedFired = true;
        this.lastSurprise = this.t;
        const ally = this.forcedSurprise === 'okayo';
        const a = makeActor(hero, ally ? 'ally' : 'enemy', ally ? 0.2 : 0.8, rnd(0.3, 0.7));
        a.hp = hero.hp * (1 + (this.act - 1) * 0.2); a.maxHp = a.hp;
        a.atk = hero.atk * (1 + (this.act - 1) * 0.22);
        a.surprise = true; a.forced = true;
        if (hero.id === 'null9') addBuff(a, 'voidmass', 600);
        this.all.push(a);
        ring(this, a.x, a.y, hero.color, 0.01, 0.3, 0.9, 4);
        this.banner = {
          text: 'surprise: ' + hero.name,
          sub: ally ? S.intro[hero.id] + ' — earned, not rolled. your work on the ground put them here.'
                    : S.intro[hero.id] + ' — and it is not on yours',
          until: this.t + 3.4, tone: ally ? 'ally' : 'evil'
        };
        this.events.push({ kind: 'surprise', text: hero.name, side: ally ? 'ally' : 'evil', comic: hero.ultimate.comic, until: this.t + 3.2 });
        note(this, (ally ? '+ ' : '- ') + hero.name + ' was promised by what you did off the field');
        return;
      }
    }

    if (this.act < S.minAct) return;
    if (this.t - this.lastSurprise < S.cooldownMs / 1000) return;
    if (this.state !== 'running') return;
    const roll = Math.random();
    let hero = null, tone = null;
    if (roll < S.villainChance) { hero = pick(GD.SURPRISE_ID.filter(function (h) { return h.id === 'null9' || h.id === 'eris'; })); tone = 'evil'; }
    else if (roll < S.villainChance + S.heroChance) { hero = pick(GD.SURPRISE_ID.filter(function (h) { return h.id === 'okayo'; })); tone = 'ally'; }
    if (!hero) return;

    this.lastSurprise = this.t;
    const team = tone === 'ally' ? 'ally' : 'enemy';
    const a = makeActor(hero, team, team === 'ally' ? 0.2 : 0.8, rnd(0.3, 0.7));
    a.hp = hero.hp * (1 + (this.act - 1) * 0.2);
    a.maxHp = a.hp;
    a.atk = hero.atk * (1 + (this.act - 1) * 0.22);
    a.surprise = true;
    if (hero.id === 'null9') addBuff(a, 'voidmass', 600);
    this.all.push(a);
    ring(this, a.x, a.y, hero.color, 0.01, 0.3, 0.9, 4);
    spark(this, a.x, a.y, hero.color, 40, 2, 0.08);
    this.banner = {
      text: tone === 'ally' ? 'surprise: ' + hero.name : 'surprise: ' + hero.name,
      sub: tone === 'ally' ? S.intro[hero.id] + ' — and it is on your side' : S.intro[hero.id] + ' — and it is not on yours',
      until: this.t + 3.4, tone: tone
    };
    this.events.push({ kind: 'surprise', text: hero.name, side: tone, comic: hero.ultimate.comic, until: this.t + 3.2 });
    note(this, (tone === 'ally' ? '+ ' : '- ') + hero.name + ' entered the field');
  };

  /* ---------- update ---------- */

  const TICK = 1 / 30;

  Battle.prototype.update = function (dt) {
    if (this.state !== 'running') {
      this.fx = this.fx.filter(function (f) { f.life -= dt; return f.life > 0; });
      this.t += dt;
      return;
    }
    this.t += dt;
    this.tick++;

    // The front is decided by the heroes. A lone vehicle cannot hold one on
    // its own, so with a vehicle on the field an all-heroes-down front is
    // lost up front: otherwise the fight can never end (no heroes to kill the
    // last foe) or the vehicle decides the front by itself. Checked ahead of
    // the win test for exactly that reason. With no vehicle the original
    // ordering below is untouched, so those battles are unchanged.
    if (this.vehicle && this.heroesOf('ally').length === 0) {
      this.state = 'lost';
      this.banner = { text: 'line broken', sub: this.title + ' fell', until: this.t + 4, tone: 'evil' };
      if (this.vehicle.alive) {
        note(this, this.vehicle.name + ' is still out there, and it is not enough');
      }
      return;
    }

    // waves
    const liveFoes = this.all.filter(function (a) { return a.team === 'enemy' && a.alive; });
    if (this.wave < this.wavesTotal) {
      this.waveTimer -= dt;
      if (this.waveTimer <= 0 && liveFoes.length === 0) { this.spawnWave(); this.waveTimer = 3; }
    } else if (liveFoes.length === 0) {
      this.state = 'won';
      this.banner = { text: 'field held', sub: this.title + ' is clear', until: this.t + 4, tone: 'ally' };
      return;
    }

    // the front is decided by the heroes. a lone vehicle still on the field
    // cannot hold it on its own, so an all-heroes-down front is lost even
    // though the vehicle is still alive — otherwise the fight never ends.
    const liveHeroes = this.heroesOf('ally');
    if (liveHeroes.length === 0) {
      this.state = 'lost';
      this.banner = { text: 'line broken', sub: this.title + ' fell', until: this.t + 4, tone: 'evil' };
      return;
    }

    // the vehicle's passive is folded into the heroes' own numbers each
    // tick, so a hero who walks in late is already under it. storing base
    // values the first time we see an actor keeps this idempotent.
    if (this.vehicle) {
      const P = this.vehicle.passive, m = P.mods || {};
      const ta = this.vehicle.teamArmor || 0;
      const regen = this.vehicle.regenStat || 0;
      const allies = this.heroesOf('ally');
      for (let i = 0; i < allies.length; i++) {
        const h = allies[i];
        if (h._vehKey !== h.def.id + '|' + h.id) {
          h._vehKey = h.def.id + '|' + h.id;
          h._baseAtk = h.atk; h._baseArmor = h.armor;
          h._baseCrit = h.crit; h._baseEnergy = h.maxEnergy;
        }
        h.atk = h._baseAtk * (m.atk || 1);
        h.armor = clamp(h._baseArmor + ta, 0, 0.9);
        h.crit = h._baseCrit * (m.crit || 1);
        h.maxEnergy = h._baseEnergy * (m.energy || 1);
        if (regen) h.hp = Math.min(h.maxHp, h.hp + h.maxHp * regen * dt);
        h._cdScale = m.cd || 1;      // consulted by spend()
      }
    }

    // per-actor tick
    for (let i = 0; i < this.all.length; i++) {
      const a = this.all[i];
      a._now = this.t;
      a._b = this;
      if (!a.alive) continue;

      // buffs tick down
      for (let k = a.buffs.length - 1; k >= 0; k--) {
        if (this.t > a.buffs[k].until) a.buffs.splice(k, 1);
      }
      if (a.busy > 0) a.busy -= dt;
      if (a.isVehicle) {
        this.tickVehicle(a, dt);
        continue;                    // the vehicle's whole life is below
      }
      a.energy = clamp(a.energy + (a.team === 'ally' ? 7 : 5) * dt, 0, a.maxEnergy);

      // damage modifiers
      let mul = 1;
      if (hasBuff(a, 'blessed')) mul *= 1.35;
      if (hasBuff(a, 'shrunk') && a.team === 'enemy') mul *= 1;
      a._mul = mul;

      if (hasBuff(a, 'stun')) continue;

      // channel resolution
      if (a.channel) {
        a.channel.tick -= dt;
        const tgt = a.channel.t;
        if (tgt && tgt.alive) damage(this, a, tgt, a.atk * a.channel.mult * mul * dt * 6, {});
        else { beam(this, a.x, a.y, a.x + 0.2, a.y, a.def.color, 0.15); a.channel = null; a.busy = 0; }
        if (a.channel && a.channel.tick <= 0) { a.channel = null; a.busy = 0; }
      }

      if (a.busy > 0) continue;

      const friends = this.heroesOf(a.team);
      let foes = this.heroesOf(a.team === 'ally' ? 'enemy' : 'ally');
      const vehInPlay = a.team === 'enemy' && this.vehicle && this.vehicle.alive;
      if (vehInPlay) foes = foes.concat([this.vehicle]);
      if (!foes.length) continue;
      const reach = a.def.ranged ? (a.def.range || 24) / 90 : 0.075;
      // the vehicle is a legal target on equal terms with a hero at the same
      // distance, so its hull bar is real damage and not a decoration. no
      // extra pull either way: heroes are not made safer by it being here.
      let t = null, td = 1e9;
      for (let i = 0; i < foes.length; i++) {
        const d = dist(a, foes[i]);
        if (d < td) { td = d; t = foes[i]; }
      }
      if (!t) continue;

      if (a.team === 'ally' && !a.controlled) {
        // unheld allies keep fighting on their own — the front stays live
        this.autoPilot(a, foes, t);
      }

      // movement
      const d = dist(a, t);
      if (d > reach) {
        const k = a.spd * dt * (a.busy > 0 ? 0 : 0.22);
        const dx = (t.x - a.x), dy = (t.y - a.y);
        const len = Math.hypot(dx, dy) || 1;
        a.x += (dx / len) * k + rnd(-0.004, 0.004);
        a.y += (dy / len) * k * 0.6 + rnd(-0.003, 0.003);
        a.x = clamp(a.x, 0.05, 0.95);
        a.y = clamp(a.y, 0.1, 0.9);
      } else {
        // drift around the target, stay spread out
        const ang = this.t * 0.6 + a.hx * 7;
        a.x += Math.cos(ang) * 0.0016;
        a.y += Math.sin(ang) * 0.0016;
      }

      // attack
      if (d <= reach * 1.12 && (!a.cds.attack || this.t >= a.cds.attack)) {
        a.cds.attack = this.t + (a.team === 'ally' ? 0.85 : 1.5) / a.spd;
        if (a.team === 'ally') chargeSuper(a, a.atk * 0.09);
        const crit = Math.random() < a.crit;
        damage(this, a, t, a.atk * (a._mul || 1) * (crit ? 1.8 : 1), { crit: crit });
        if (a.def.passive && a.def.passive.id === 'oath' && (a.chargesCast % 3 === 0)) {
          ring(this, t.x, t.y, '#ffffff', 0.01, 0.09, 0.35, 2);
          damage(this, a, t, a.atk * 2.2, { ignoreArmor: true });
        }
        if (a.def.passive && a.def.passive.id === 'gamma') a.rage = Math.min(1, a.rage + 0.08);
        if (a.def.passive && a.def.passive.id === 'binary') a.rage = Math.min(1, a.rage + 0.1);
      }

      // orbit damage (iron man super 2)
      const orb = hasBuff(a, 'orbit');
      if (orb && a.team === 'ally') {
        const foes2 = this.teamOf('enemy');
        for (let k = 0; k < foes2.length; k++) if (dist(a, foes2[k]) < 0.3) damage(this, a, foes2[k], a.atk * 0.9 * dt * 6, {});
      }

      // enemy smarts
      if (a.team === 'enemy') {
        a.rage = Math.min(1, a.rage + dt * 0.05);
        if (d <= reach * 1.12 && (!a.cds.skill || this.t >= a.cds.skill) && Math.random() < 0.02) {
          a.cds.skill = this.t + 8;
          VERBS.control(this, a, t, { dur: 1.2, mult: 0.2 });
        }
      }

      // passive heals
      if (a.team === 'ally') {
        if (a.def.passive && a.def.passive.id === 'nanotech' && a.hp < a.maxHp) a.hp = Math.min(a.maxHp, a.hp + a.maxHp * 0.02 * dt);
        if (a.def.passive && a.def.passive.id === 'redroom') {
          const friends2 = this.heroesOf('ally');
          for (let k = 0; k < friends2.length; k++) {
            if (dist(a, friends2[k]) < 0.24 && friends2[k].hp < friends2[k].maxHp) friends2[k].hp = Math.min(friends2[k].maxHp, friends2[k].hp + friends2[k].maxHp * 0.012 * dt);
          }
        }
        if (a.rage > 0) chargeSuper(a, a.rage * 6 * dt);
      }
    }

    // void on enemies
    this.rollSurprise();

    // fx
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i];
      f.life -= dt;
      if (f.vx !== undefined) {
        f.x += f.vx; f.y += f.vy; f.vy += 0.12 * dt;
      }
      if (f.life <= 0) this.fx.splice(i, 1);
    }
    for (let i = this.events.length - 1; i >= 0; i--) if (this.t > this.events[i].until) this.events.splice(i, 1);
  };

  /* an ally you are not holding still picks its own powers */
  Battle.prototype.autoPilot = function (a, foes, t) {
    if (a.isVehicle) return;
    const def = a.def;
    if (a.busy > 0 || hasBuff(a, 'stun')) return;
    const s = this.tierState(a);
    if (s.ult.ready && Math.random() < 0.05) { this.castSuper(a.id, 'ult'); return; }
    if (s.s2.ready && Math.random() < 0.035) { this.castSuper(a.id, 's2'); return; }
    if (s.s1.ready && Math.random() < 0.03) { this.castSuper(a.id, 's1'); return; }
    for (let i = 0; i < def.powers.length; i++) {
      const p = def.powers[i];
      if (pwReady(a, p) && a.energy >= p.cost && Math.random() < 0.05) { this.castPower(a.id, p.id); return; }
    }
  };

  /* ---------- the vehicle's own turn ----------
     it charges its own pool, picks its own target, attacks on its own rate,
     and holds its ability until the cost is in and the cooldown is back.
     it never casts a super, never spends a hero's meter, and its channel
     (if it has one) is a plain burn rather than a hero power. */

  /* one place decides whether the ability fires, so the automatic tick and
     the UI/test trigger can never disagree about cost or cooldown. */
  Battle.prototype.canVehicleAbility = function (v) {
    if (!v || !v.alive) return false;
    const ab = v.def.combat.ability;
    return v.energy >= ab.cost && this.t >= (v.cds[ab.id] || 0) && !(v.busy > 0);
  };

  Battle.prototype.fireVehicleAbility = function (v) {
    if (!this.canVehicleAbility(v)) return false;
    const ab = v.def.combat.ability;
    v.energy = clamp(v.energy - ab.cost, 0, v.maxEnergy);
    v.cds[ab.id] = this.t + ab.cd;
    v.casts = (v.casts || 0) + 1;
    v.abilityCasts = (v.abilityCasts || 0) + 1;
    v._dealt = (v._dealt || 0) + (v._pending || 0);
    const foes = this.heroesOf('enemy');
    const target = nearest(v, foes);
    const fn = V_VERBS[ab.verb];
    if (fn) fn(this, v, target, ab);
    this.events.push({ kind: 'vehicle', text: ab.name, who: v.name, until: this.t + 1.1 });
    note(this, v.name + ': ' + ab.name);
    this.banner = { text: v.name + ' — ' + ab.name, sub: ab.desc, until: this.t + 1.8, tone: 'ally' };
    return true;
  };

  Battle.prototype.tickVehicle = function (v, dt) {
    const c = v.def.combat;
    v.energy = clamp(v.energy + (c.energyRate || 6) * dt, 0, v.maxEnergy);

    // the ability fires on its own the moment it is paid for. the player
    // never has to press anything for a vehicle to matter, and holding the
    // vehicle is what decides *when*.
    this.fireVehicleAbility(v);

    if (v.busy > 0) return;
    if (hasBuff(v, 'stun')) return;

    // a vehicle channel keeps feeding, exactly like a hero's
    if (v.channel) {
      v.channel.tick -= dt;
      const tgt = v.channel.t;
      if (tgt && tgt.alive) damage(this, v, tgt, v.atk * v.channel.mult * dt * 6, { superGain: 0 });
      else { v.channel = null; v.busy = 0; }
      if (v.channel && v.channel.tick <= 0) { v.channel = null; v.busy = 0; }
      return;
    }

    const foes = this.heroesOf('enemy');
    if (!foes.length) return;
    const t = nearest(v, foes);
    if (!t) return;

    // drift toward the fight, but never into the middle of it
    const reach = c.range;
    if (dist(v, t) > reach) {
      const k = v.spd * dt * 0.12;
      const dx = t.x - v.x, dy = t.y - v.y, len = Math.hypot(dx, dy) || 1;
      v.x = clamp(v.x + (dx / len) * k, 0.03, 0.97);
      v.y = clamp(v.y + (dy / len) * k * 0.6, 0.05, 0.95);
    }

    // the ordinary attack, on its own clock
    if (dist(v, t) <= reach * 1.1 && this.t >= (v.cds.attack || 0)) {
      v.cds.attack = this.t + c.rate;
      v.casts = (v.casts || 0) + 1;
      const fn = V_VERBS[c.attack.verb] || V_VERBS.vprojectile;
      fn(this, v, t, c.attack);
    }
  };

  /* manual trigger for the ability, for the UI and for tests. it goes
     through exactly the same gate the tick uses, so a manual cast can
     never skip a cost or a cooldown. */
  Battle.prototype.castVehicleAbility = function () {
    return this.fireVehicleAbility(this.vehicle);
  };

  /* ---------- global world ---------- */

  function World() {
    this.battles = [];
    this.act = 1;
    this.byId = {};
  }

  World.prototype.add = function (b) { this.battles.push(b); this.byId[b.id] = b; return b; };
  World.prototype.get = function (id) { return this.byId[id] || null; };
  World.prototype.won = function () { return this.battles.every(function (b) { return b.state === 'won'; }); };
  World.prototype.anyRunning = function () { return this.battles.some(function (b) { return b.state === 'running'; }); };

  World.prototype.update = function (dt) {
    // every front ticks, always
    for (let i = 0; i < this.battles.length; i++) this.battles[i].update(dt);
  };

  /* ---------- a front: 3 allies of the player's team ---------- */
  function buildBattle(opts, heroIds, vehicleId) {
    const b = new Battle(opts);
    attachVehicle(b, vehicleId);
    const n = heroIds.length;
    const mods = opts.mods || { foeHp: 0, foeAtk: 0, charge: 0, heal: 0, surprise: null };
    for (let i = 0; i < n; i++) {
      const h = GD.BY_ID[heroIds[i]];
      if (!h) continue;
      const a = makeActor(h, 'ally', 0.14 + i * 0.07, 0.3 + i * 0.2);
      a.hx = a.x; a.hy = a.y;
      if (mods.charge) a.super = clamp(a.super + mods.charge, 0, 100);
      if (mods.heal) a.hp = a.maxHp * (1 + mods.heal * (i / Math.max(1, n)));
      b.all.push(a);
    }
    return b;
  }

  root.BATTLE = {
    Battle: Battle,
    World: World,
    buildBattle: buildBattle,
    attachVehicle: attachVehicle,
    V_VERBS: V_VERBS,
    TIERS: TIERS,
    TEAM_REQ: TEAM_REQ,
    ULT_PERSONAL: ULT_PERSONAL,
    tierPower: tierPower
  };
})(window);
