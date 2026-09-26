/* ============================================================
   data.js — roster, powers, super tiers, florida map, vehicles, story
   powers are object-per-ability so the engine can cast them generically
   ============================================================ */
(function (root) {
  'use strict';

  /* ---------- combat verb vocabulary ----------
     every power below is one of these; the battle engine owns the
     behaviour, the data only picks which verb and with what numbers. */

  const ROLES = {
    tank:    { id: 'tank',    label: 'tank',    blurb: 'soaks the hit, holds the line, drags the fight' },
    healer:  { id: 'healer',  label: 'healer',  blurb: 'keeps the team standing, buys seconds with light' },
    dps:     { id: 'dps',     label: 'dps',     blurb: 'kills things before they finish talking' },
    support: { id: 'support', label: 'support', blurb: 'reads the fight and rewrites it before it starts' }
  };

  /* ---------- the roster ----------
     power format:
       { id, name, verb, cd, cost, range, cdDesc }
     verb is resolved in battle.js */

  const HEROES = [
    /* ---------------- CAPTAIN AMERICA ---------------- */
    {
      id: 'cap',
      name: 'captain america',
      aka: 'steve rogers',
      role: 'tank',
      callsign: 'shield',
      color: '#2f6fd0',
      hp: 2400, armor: 0.34, atk: 34, spd: 1.0, crit: 0.08,
      passive: { id: 'vibranium', name: 'vibranium frame', blurb: 'takes 34% less from everything' },
      bio: 'the lakes of central florida raised him. he came back for them first.',
      powers: [
        { id: 'shieldthrow', name: 'shield throw',  verb: 'projectile', cd: 5,  cost: 10, range: 34, desc: 'throws vibranium. returns to hand. on a clean throw it crits.' },
        { id: 'shieldrush',  name: 'shield rush',   verb: 'dash',       cd: 11, cost: 20, range: 16, desc: 'charges shoulder-first. knocks the field back, taunts on arrival.' },
        { id: 'vibranium',   name: 'vibranium slam', verb: 'slam',     cd: 8,  cost: 15, range: 8,  desc: 'ground slam. stuns everything in reach, heals a little himself.' }
      ],
      super1: { id: 'cap_s1', name: 'vibranium bastion', verb: 'bastion', cd: 40, cost: 0, range: 0, desc: 'every hit he absorbs pours back into the team. the fight stops moving without him.' },
      super2: { id: 'cap_s2', name: 'the line holds', verb: 'bastion', cd: 60, cost: 0, range: 0, desc: 'extended. he becomes the wall: team damage out, ally damage cut in half.' },
      ultimate: { id: 'cap_ult', name: 'the last stand', verb: 'laststand', cd: 90, cost: 0, range: 0,
        comic: 'cap, broken and bleeding, lifts the shield against thanos anyway. (infinity war, ch. 25)',
        desc: 'he will not move. while the ultimate runs, nothing on that field dies easily — including him.' }
    },

    /* ---------------- THOR ---------------- */
    {
      id: 'thor',
      name: 'thor',
      aka: 'odinson',
      role: 'dps',
      callsign: 'mjolnir',
      color: '#4fc3d9',
      hp: 1750, armor: 0.12, atk: 40, spd: 1.05, crit: 0.1,
      passive: { id: 'oath', name: 'heavenly oath', blurb: 'storm clouds follow him. every 4th strike calls the bolt on its own.' },
      bio: 'three days of storm over the everglades. florida weather is a joke to him now.',
      powers: [
        { id: 'mjolnir',   name: 'mjolnir throw',  verb: 'projectile', cd: 5,  cost: 10, range: 30, desc: 'the hammer goes out and comes back. heavy, no charge time, no complaints.' },
        { id: 'boltcall',  name: 'bolt call',       verb: 'strike',    cd: 7,  cost: 15, range: 26, desc: 'calls a bolt onto a single target. the storm is overhead, the target is not.' },
        { id: 'bifrost',   name: 'bifrost step',    verb: 'blink',     cd: 13, cost: 15, range: 0,  desc: 'steps through the rainbow. no travel time, no telegraph, he is simply there.' }
      ],
      super1: { id: 'thor_s1', name: 'god blast', verb: 'strike', cd: 42, cost: 0, range: 0, desc: 'one enormous bolt onto the worst thing on the field.' },
      super2: { id: 'thor_s2', name: 'storm crown', verb: 'stormcrown', cd: 60, cost: 0, range: 0, desc: 'the storm opens overhead and stays open. allies in it hit harder and take less.' },
      ultimate: { id: 'thor_ult', name: 'godbolt bifurcation', verb: 'bifurcation', cd: 90, cost: 0, range: 0,
        comic: 'thor takes the full infinity gauntlet blast and the storm splits it down the middle. (endgame, ch. 22)',
        desc: 'the storm forks. what would have killed the field misses, and what comes back hits everything.' }
    },

    /* ---------------- IRON MAN ---------------- */
    {
      id: 'ironman',
      name: 'iron man',
      aka: 'tony stark',
      role: 'dps',
      callsign: 'nanotech',
      color: '#e8b23a',
      hp: 1550, armor: 0.2, atk: 46, spd: 1.12, crit: 0.14,
      passive: { id: 'nanotech', name: 'nanotech shell', blurb: 'armour repairs itself. regen 2% per second in a fight.' },
      bio: 'built a suit in a garage in winter park. flew it south on a dare.',
      powers: [
        { id: 'repulsor',  name: 'repulsor',        verb: 'projectile', cd: 3,  cost: 8,  range: 30, desc: 'the standard. fast, cheap, hits like a car hitting a wall.' },
        { id: 'missiles',  name: 'micro missiles',  verb: 'pierce',     cd: 8,  cost: 20, range: 32, desc: 'locked volley, walks through a line of enemies and keeps going.' },
        { id: 'laser',     name: 'focused beam',    verb: 'beam',       cd: 10, cost: 18, range: 26, desc: 'holds the trigger. damage per second, pierces a column of bodies.' }
      ],
      super1: { id: 'iron_s1', name: 'iron slash', verb: 'beam', cd: 42, cost: 0, range: 0, desc: 'one uninterrupted beam, wide enough to matter.' },
      super2: { id: 'iron_s2', name: 'nano orbit', verb: 'orbit', cd: 60, cost: 0, range: 0, desc: 'nanites lift off his frame and swarm the field on their own for a while.' },
      ultimate: { id: 'iron_ult', name: 'nanotech overload', verb: 'overload', cd: 90, cost: 0, range: 0,
        comic: 'tony forces the nanotech out of the armour and into the gauntlet, blinding thanos. (endgame, ch. 21)',
        desc: 'the suit empties itself into a storm of metal. total field damage, and the fight is over after it.' }
    },

    /* ---------------- BLACK WIDOW ---------------- */
    {
      id: 'widow',
      name: 'black widow',
      aka: 'natasha romanoff',
      role: 'healer',
      callsign: 'widow',
      color: '#d63a5a',
      hp: 1400, armor: 0.1, atk: 24, spd: 1.3, crit: 0.2,
      passive: { id: 'redroom', name: 'red room calm', blurb: 'the field holds together around her. allies regen 1.2% per second within 24m.' },
      bio: 'red room said she was expendable. florida said otherwise.',
      powers: [
        { id: 'pistols',  name: 'bi-weapon pair',   verb: 'projectile', cd: 3,  cost: 8,  range: 26, desc: 'two shots, two targets, no wasted motion.' },
        { id: 'baton',    name: 'baton strike',     verb: 'melee',      cd: 5,  cost: 8,  range: 7,  desc: 'close work. crits off the back of a high number.' },
        { id: 'sedation', name: 'sedation dart',    verb: 'control',    cd: 12, cost: 15, range: 24, desc: 'stops a target dead for a few seconds. a held breath that lasted too long.' }
      ],
      super1: { id: 'widow_s1', name: 'widow sting', verb: 'strike', cd: 42, cost: 0, range: 0, desc: 'one dart, no resistance, no counter, enormous damage to a single target.' },
      super2: { id: 'widow_s2', name: 'iron Maiden protocol', verb: 'sweepheal', cd: 60, cost: 0, range: 0, desc: 'a field-wide panic button. allies restored hard, threats interrupted.' },
      ultimate: { id: 'widow_ult', name: 'the scarlet break', verb: 'scarlet', cd: 90, cost: 0, range: 0,
        comic: 'wanda breaks the mindscape around thanos and holds reality open with her hands. (endgame, ch. 21)',
        desc: 'reality fails open. the field is rewritten in her favour for a handful of seconds. hold the line.' }
    },

    /* ---------------- SCARLET WITCH ---------------- */
    {
      id: 'wanda',
      name: 'scarlet witch',
      aka: 'wanda maximoff',
      role: 'support',
      callsign: 'hex',
      color: '#c02b8a',
      hp: 1350, armor: 0.08, atk: 30, spd: 1.08, crit: 0.1,
      passive: { id: 'probability', name: 'probability', blurb: 'hexes land 25% harder and the odds are always on her side.' },
      bio: 'her hex took half the world apart. it can also take a nightlight out in florida.',
      powers: [
        { id: 'hexbolt',  name: 'hex bolt',      verb: 'projectile',  cd: 4,  cost: 8,  range: 28, desc: 'red chaos at range. hexes amplify every hit it carries.' },
        { id: 'mindwipe', name: 'mind whip',     verb: 'control',     cd: 11, cost: 15, range: 22, desc: 'unhooks a mind from the fight. it stops moving for a while.' },
        { id: 'lift',     name: 'psychic lift',  verb: 'heal',        cd: 9,  cost: 12, range: 26, desc: 'hands off the ground, hands back on their feet. heals hard, one at a time.' }
      ],
      super1: { id: 'wanda_s1', name: 'red nova', verb: 'burst', cd: 42, cost: 0, range: 0, desc: 'a nova of raw chaos centred on her. everything nearby is thrown outward.' },
      super2: { id: 'wanda_s2', name: 'probability collapse', verb: 'sweepheal', cd: 60, cost: 0, range: 0, desc: 'the odds invert on her side of the field for a long moment.' },
      ultimate: { id: 'wanda_ult', name: 'reality break', verb: 'scarlet', cd: 90, cost: 0, range: 0,
        comic: 'wanda collapses the mindscape, walks through the rubble of the illusion, and unmakes thanos. (endgame, ch. 21)',
        desc: 'she reaches into the shape of the fight and finds what is real. reality break — then it snaps back, harder.' }
    },

    /* ---------------- CAPTAIN MARVEL ---------------- */
    {
      id: 'marvel',
      name: 'captain marvel',
      aka: 'carol danvers',
      role: 'dps',
      callsign: 'binary',
      color: '#f0c419',
      hp: 1900, armor: 0.22, atk: 42, spd: 1.22, crit: 0.12,
      passive: { id: 'binary', name: 'binary form', blurb: 'every second without taking damage raises her damage. taking a hit resets it.' },
      bio: 'she came down over the keys like a searchlight looking for something specific.',
      powers: [
        { id: 'blast',  name: 'photon blast', verb: 'projectile', cd: 3, cost: 9, range: 30, desc: 'clean, enormous, no wind-up she needs to telegraph.' },
        { id: 'dive',   name: 'atmospheric dive', verb: 'slam', cd: 9, cost: 16, range: 14, desc: 'comes in from high and fast. ground impact, big radius.' },
        { id: 'flare',  name: 'energy flare', verb: 'nova', cd: 14, cost: 20, range: 16, desc: 'radiates energy. pushes everything away, hurts everything it touches.' }
      ],
      super1: { id: 'marvel_s1', name: 'binary detonation', verb: 'burst', cd: 42, cost: 0, range: 0, desc: 'full binary form for a handful of seconds. everything near her burns.' },
      super2: { id: 'marvel_s2', name: 'speed of light', verb: 'stormcrown', cd: 60, cost: 0, range: 0, desc: 'she stops moving like a person and starts moving like a headline.' },
      ultimate: { id: 'marvel_ult', name: 'supernova', verb: 'overload', cd: 90, cost: 0, range: 0,
        comic: 'carol absorbs the energy of a collapsing star and takes it out on everything in front of her. (captain marvel, 2019)',
        desc: 'she eats a star and throws it. this is what the phrase meant the whole time.' }
    },

    /* ---------------- SPIDER-MAN ---------------- */
    {
      id: 'spiderman',
      name: 'spider-man',
      aka: 'peter parker',
      role: 'dps',
      callsign: 'web',
      color: '#e03a3a',
      hp: 1250, armor: 0.06, atk: 36, spd: 1.34, crit: 0.22,
      passive: { id: 'spider sense', name: 'spider-sense', blurb: 'dodges a visible tell. his attacks and cooldowns move 20% faster.' },
      bio: 'a field trip to cape canaveral. a school trip, technically. nobody logged it.',
      powers: [
        { id: 'webshot',  name: 'web shot',      verb: 'projectile', cd: 2,  cost: 6,  range: 28, desc: 'highest single-tap crit in the roster. silk, not science.' },
        { id: 'webzip',   name: 'web zip',       verb: 'blink',      cd: 8,  cost: 10, range: 0,  desc: 'reel himself to a point. fastest travel in the game, then a free swing on arrival.' },
        { id: 'punch',    name: 'maximum web',   verb: 'melee',      cd: 5,  cost: 8,  range: 7,  desc: 'a punch wrapped in everything he is too polite to say.' }
      ],
      super1: { id: 'spider_s1', name: 'maximum voltage', verb: 'beam', cd: 40, cost: 0, range: 0, desc: 'every web he throws becomes a live wire for a while.' },
      super2: { id: 'spider_s2', name: 'spider-sense overload', verb: 'stormcrown', cd: 60, cost: 0, range: 0, desc: 'the sense goes loud. the whole team dodges better, and he never stops moving.' },
      ultimate: { id: 'spider_ult', name: 'final swing', verb: 'overload', cd: 90, cost: 0, range: 0,
        comic: 'peter, out of webbing and out of options, swings the last remaining web straight into thanos. (endgame, ch. 19)',
        desc: 'the last swing. he comes in low and fast and the field feels it whether it is ready or not.' }
    },

    /* ---------------- ANT-MAN ---------------- */
    {
      id: 'antman',
      name: 'ant-man',
      aka: 'scott lang',
      role: 'support',
      callsign: 'pym',
      color: '#c85a3a',
      hp: 1300, armor: 0.18, atk: 26, spd: 1.2, crit: 0.12,
      passive: { id: 'giant', name: 'giant form', blurb: 'grows to four metres. hp and reach scale up, speed does not.' },
      bio: 'kennedy space center had a spare pym particle. he borrowed it. long story.',
      powers: [
        { id: 'punchbig', name: 'giant fist',   verb: 'slam',       cd: 7,  cost: 12, range: 12, desc: 'grows an arm and brings it down. stun, splash damage.' },
        { id: 'shrink',   name: 'go subatomic', verb: 'debuff',     cd: 14, cost: 15, range: 0,  desc: 'shrinks every enemy in range to nothing. small targets take double damage.' },
        { id: 'cytokinesis', name: 'cytokinesis', verb: 'control',  cd: 11, cost: 14, range: 24, desc: 'rides an enemy. you decide what it does next.' }
      ],
      super1: { id: 'ant_s1', name: 'giant at the castle', verb: 'burst', cd: 42, cost: 0, range: 0, desc: 'goes full height in the middle of the field. everything nearby is rubble.' },
      super2: { id: 'ant_s2', name: 'quantum tunnel', verb: 'dodgefield', cd: 60, cost: 0, range: 0, desc: 'phases the whole team. incoming damage skips off a quantum step.' },
      ultimate: { id: 'ant_ult', name: 'the quantum break', verb: 'scarlet', cd: 90, cost: 0, range: 0,
        comic: 'scott comes out of the quantum state holding the galaxy, and the field is briefly somewhere else. (endgame, ch. 20)',
        desc: 'he steps sideways through the quantum and takes the fight with him. it comes back changed.' }
    },

    /* ---------------- HAWKEYE ---------------- */
    {
      id: 'hawkeye',
      name: 'hawkeye',
      aka: 'clint barton',
      role: 'dps',
      callsign: 'arrow',
      color: '#7a8c99',
      hp: 1300, armor: 0.08, atk: 44, spd: 1.0, crit: 0.2,
      passive: { id: 'marksman', name: 'marksman', blurb: 'every arrow carries a mark. marked targets take +30% from everyone.' },
      bio: 'avengers compound, florida. he was already on the roof when the alarm went.',
      powers: [
        { id: 'arrow',    name: 'explosive arrow',  verb: 'projectile', cd: 3,  cost: 8,  range: 32, desc: 'punch-through arrow that applies a mark to whatever it hits.' },
        { id: 'rain',     name: 'arrow rain',       verb: 'pierce',     cd: 10, cost: 20, range: 30, desc: 'lifts the bow and lets gravity do the work on a whole area.' },
        { id: 'rickroll', name: 'rick roll',        verb: 'blink',      cd: 12, cost: 14, range: 0,  desc: 'arrow in the leg. a hard reposition, and it stuns where he lands.' }
      ],
      super1: { id: 'clint_s1', name: 'skyline volley', verb: 'pierce', cd: 42, cost: 0, range: 0, desc: 'a long volley from somewhere he should not be standing.' },
      super2: { id: 'clint_s2', name: 'the long shot', verb: 'snipe', cd: 60, cost: 0, range: 0, desc: 'one arrow, one target, very far, very quiet.' },
      ultimate: { id: 'clint_ult', name: 'the avengers compound', verb: 'overload', cd: 90, cost: 0, range: 0,
        comic: 'clint walks out onto the lawn at the compound, draws, and puts an arrow through thanos. (endgame, ch. 22)',
        desc: 'he stops running. he picks his shot, and the field ends where he chose it.' }
    },

    /* ---------------- ROCKET RACCOON ---------------- */
    {
      id: 'rocket',
      name: 'rocket raccoon',
      aka: 'rocket',
      role: 'dps',
      callsign: 'rocket',
      color: '#c08457',
      hp: 1200, armor: 0.08, atk: 50, spd: 1.12, crit: 0.18,
      passive: { id: 'heavy', name: 'heavy ordnance', blurb: 'explosions he causes ignore 40% of enemy armour. he was built for this.' },
      bio: 'stole a prototype out of a vault in cape canaveral. it was not a good night for anyone.',
      powers: [
        { id: 'pistol',  name: 'heavy pistol',   verb: 'projectile', cd: 2,  cost: 7,  range: 26, desc: 'shoots through armour, not just flesh. ignores enemy plating.' },
        { id: 'launcher', name: 'plasma launcher', verb: 'burst',   cd: 8,  cost: 18, range: 24, desc: 'one big splash. leaves a burning patch where it lands.' },
        { id: 'grapple', name: 'grapple and bite', verb: 'melee',  cd: 6,  cost: 10, range: 8,  desc: 'hauls a target in and works on it up close.' }
      ],
      super1: { id: 'rocket_s1', name: 'donatello mode', verb: 'nova', cd: 42, cost: 0, range: 0, desc: 'over-charges the plasma. it is worse for everyone, including him.' },
      super2: { id: 'rocket_s2', name: 'gunpowder rain', verb: 'pierce', cd: 60, cost: 0, range: 0, desc: 'a rain of it, from above, on everyone not on his side.' },
      ultimate: { id: 'rocket_ult', name: 'the big one', verb: 'overload', cd: 90, cost: 0, range: 0,
        comic: 'rocket blows a hole in an alien warship, alone, and says the quiet part out loud. (avengers: endgame, the ark is a spaceship problem)',
        desc: 'the one he has been saving. there is nowhere on the field it does not count.' }
    },

    /* ---------------- BRUCE BANNER / HULK ---------------- */
    {
      id: 'hulk',
      name: 'hulk',
      aka: 'bruce banner',
      role: 'tank',
      callsign: 'gamma',
      color: '#5fa03a',
      hp: 3000, armor: 0.26, atk: 36, spd: 0.9, crit: 0.05,
      passive: { id: 'gamma', name: 'gamma ramp', blurb: 'every hit he takes and every second he fights raises his damage and regen.' },
      bio: 'the gamma sample did not stay in the vault. florida is very warm and he is very large.',
      powers: [
        { id: 'slamh',  name: 'gamma slam',  verb: 'slam',      cd: 6,  cost: 12, range: 10, desc: 'ground pound. everything in reach goes airborne and stunned.' },
        { id: 'throwh', name: 'car throw',   verb: 'projectile', cd: 7, cost: 15, range: 26, desc: 'picks up whatever is nearby, including other people, and throws it.' },
        { id: 'leap',   name: 'gamma leap',   verb: 'dash',      cd: 10, cost: 12, range: 22, desc: 'crosses the field in one motion and lands with a shock.' }
      ],
      super1: { id: 'hulk_s1', name: 'green bomb', verb: 'burst', cd: 42, cost: 0, range: 0, desc: 'an overhead. one enormous shock, everything on the ground goes down.' },
      super2: { id: 'hulk_s2', name: 'banner breaks', verb: 'stormcrown', cd: 60, cost: 0, range: 0, desc: 'the rage peaks and stays peaked. he stops pretending to be careful.' },
      ultimate: { id: 'hulk_ult', name: 'rage out', verb: 'overload', cd: 90, cost: 0, range: 0,
        comic: 'the snap turns banner into the hulk, and the hulk walks through the army of outriders to stop it. (endgame, ch. 18)',
        desc: 'rage out. a pulse of gamma that flattens the field and leaves him standing in the middle of it.' }
    },

    /* ---------------- VISION ---------------- */
    {
      id: 'vision',
      name: 'vision',
      aka: 'vision',
      role: 'support',
      callsign: 'mind stone',
      callsignNote: 'carries the mind stone. his team forgets less than it should.',
      color: '#c8a83a',
      hp: 1450, armor: 0.2, atk: 28, spd: 1.05, crit: 0.08,
      passive: { id: 'density', name: 'vibranium density', blurb: 'phases through attacks. a flat 12% chance to take zero from any hit.' },
      bio: 'built in a lab under central florida to be a weapon. chose the rest himself.',
      powers: [
        { id: 'beamv',   name: 'mind stone beam', verb: 'beam',      cd: 5,  cost: 12, range: 28, desc: 'a beam that carries the stone. hexes land on whatever it touches.' },
        { id: 'hexv',    name: 'mind hex',        verb: 'control',   cd: 10, cost: 14, range: 24, desc: 'stops a target and makes the rest of the team crit against it.' },
        { id: 'phase',   name: 'phasing',         verb: 'dodgefield',cd: 14, cost: 12, range: 0,  desc: 'steps out of physical space. the next few hits land somewhere else.' }
      ],
      super1: { id: 'vision_s1', name: 'the stone speaks', verb: 'control', cd: 42, cost: 0, range: 0, desc: 'the mind stone names every enemy weakness on the field at once.' },
      super2: { id: 'vision_s2', name: 'density field', verb: 'dodgefield', cd: 60, cost: 0, range: 0, desc: 'hardens the air around the team. everything arriving gets slower.' },
      ultimate: { id: 'vision_ult', name: 'corrupted stone', verb: 'scarlet', cd: 90, cost: 0, range: 0,
        comic: 'vision, corrupted by the stone, tears the mind out of thanos with his own. (endgame, ch. 16)',
        desc: 'he opens the stone all the way. the whole field is held, undone, and put back on its feet.' }
    },

    /* ---------------- DR. STRANGE ---------------- */
    {
      id: 'strange',
      name: 'dr. strange',
      aka: 'stephen strange',
      role: 'healer',
      callsign: 'cloak',
      color: '#2a8f8f',
      hp: 1500, armor: 0.12, atk: 26, spd: 1.1, crit: 0.08,
      passive: { id: 'mystic', name: 'mystic wards', blurb: 'his barriers regenerate. shields the whole team a little, always.' },
      bio: 'came to florida to find the one thing he could not look up. it is in a lagoon under the space center.',
      powers: [
        { id: 'boltstr',  name: 'eldritch bolt',  verb: 'projectile', cd: 4,  cost: 10, range: 28, desc: 'orange light with an opinion. ignores enemy armour.' },
        { id: 'shield',   name: 'shield of seraphim', verb: 'heal',  cd: 9,  cost: 14, range: 24, desc: 'a disc of light. soaks damage for the whole team inside it.' },
        { id: 'portal',   name: 'portal step',     verb: 'blink',      cd: 12, cost: 14, range: 0,  desc: 'opens a doorway, walks the team through it, closes it behind them.' }
      ],
      super1: { id: 'strange_s1', name: 'shield of seraphim', verb: 'sweepheal', cd: 42, cost: 0, range: 0, desc: 'a shield wide enough to stand on. it holds a lot of damage.' },
      super2: { id: 'strange_s2', name: 'mirror dimension', verb: 'dodgefield', cd: 60, cost: 0, range: 0, desc: 'a sliver of the mirror dimension opens under the field. it is not solid anymore.' },
      ultimate: { id: 'strange_ult', name: 'shield of the lost', verb: 'scarlet', cd: 90, cost: 0, range: 0,
        comic: 'strange holds the shield of the sorcerer supreme, holding a collapsing sky back, alone, for as long as he can. (doctor strange, 2016 / endgame, ch. 18)',
        desc: 'he holds the sky where it is. nothing on the field falls, for as long as he is standing.' }
    },

    /* ---------------- OKAYO (surprise, heroic) ---------------- */
    {
      id: 'okayo',
      name: 'okayo',
      aka: 'the raccoon from the future',
      role: 'support',
      callsign: 'future',
      surprise: true,
      color: '#a06ad0',
      hp: 1600, armor: 0.15, atk: 34, spd: 1.3, crit: 0.15,
      passive: { id: 'future', name: 'future sense', blurb: 'sees two seconds ahead. allies inside the aura never get caught by a telegraphed hit.' },
      bio: 'arrived from a florida that has not finished going badly yet.',
      powers: [
        { id: 'tail',     name: 'tail whip',  verb: 'nova',     cd: 6,  cost: 12, range: 14, desc: 'a sweep. throws enemies off their feet and marks them.' },
        { id: 'throwf',   name: 'banana throw', verb: 'projectile', cd: 4, cost: 8, range: 24, desc: 'yes, a banana. it works. it has always worked.' },
        { id: 'futuremap', name: 'future step', verb: 'blink',  cd: 10, cost: 12, range: 0,  desc: 'repositions to exactly where the fight is going to be.' }
      ],
      super1: { id: 'okayo_s1', name: 'a small angry god', verb: 'burst', cd: 40, cost: 0, range: 0, desc: 'a pressure wave of pure small-animal rage.' },
      super2: { id: 'okayo_s2', name: 'final Florida', verb: 'stormcrown', cd: 58, cost: 0, range: 0, desc: 'he shows everyone the ending they earned. it is usually better than the one they got.' },
      ultimate: { id: 'okayo_ult', name: 'the one that comes back', verb: 'overload', cd: 90, cost: 0, range: 0,
        comic: 'okayo is a joke that became real: the thing that was not supposed to be there, holding the line anyway. (what if...?, 2018)',
        desc: 'he was not supposed to survive this timeline. he does anyway, and takes the field with him.' }
    },

    /* ---------------- NULL-9 (surprise, villainous) ---------------- */
    {
      id: 'null9',
      name: 'null-9',
      aka: 'the ninth child of the snap',
      role: 'tank',
      callsign: 'void',
      surprise: true,
      color: '#7a3ab0',
      hp: 2800, armor: 0.3, atk: 40, spd: 0.95, crit: 0.1,
      passive: { id: 'void', name: 'void mass', blurb: 'does not die at zero. it has to be pushed past it, and it is very hard to push.' },
      bio: 'the snap was supposed to be even. something kept the change.',
      powers: [
        { id: 'voidlance', name: 'void lance',  verb: 'projectile', cd: 5,  cost: 12, range: 30, desc: 'a spear of folded dark. ignores shields entirely.' },
        { id: 'crush',     name: 'crush',       verb: 'slam',       cd: 8,  cost: 16, range: 12, desc: 'ground impact. stuns and marks everything caught by it.' },
        { id: 'half',      name: 'the half',    verb: 'control',     cd: 16, cost: 18, range: 26, desc: 'half of a person, a door, a street. a target is briefly half there.' }
      ],
      super1: { id: 'null_s1', name: 'event horizon', verb: 'burst', cd: 42, cost: 0, range: 0, desc: 'a black sphere at the centre of the field. it does not hold. it folds.' },
      super2: { id: 'null_s2', name: 'the last nine', verb: 'stormcrown', cd: 60, cost: 0, range: 0, desc: 'the void armour thickens. nothing it touches leaves the field in one piece.' },
      ultimate: { id: 'null_ult', name: 'a snap that only takes one', verb: 'overload', cd: 90, cost: 0, range: 0,
        comic: 'not a gauntlet. a copy of the idea, filed in the wrong archive, with one finger still raised. (the snap, ch. 6, read backwards)',
        desc: 'it has had the original idea this whole time. it is not taking half. it is taking the one in front of it.' }
    },

    /* ---------------- ERIS / the girl who waited (surprise, villainous) ---------------- */
    {
      id: 'eris',
      name: 'eris',
      aka: 'she waited five years',
      role: 'dps',
      callsign: 'dust',
      surprise: true,
      color: '#b03a3a',
      hp: 1900, armor: 0.18, atk: 46, spd: 1.1, crit: 0.12,
      passive: { id: 'dust', name: 'dust of the vanished', blurb: 'every hit she lands leaves ash on the field that heals her. the snap is her resource.' },
      bio: 'her brother came back. five hundred other floridans did not. she has been counting.',
      powers: [
        { id: 'whip',   name: 'black whip',  verb: 'pierce',     cd: 5,  cost: 12, range: 28, desc: 'a line of compressed dust. walks through a line of enemies.' },
        { id: 'ash',    name: 'ash fall',     verb: 'nova',       cd: 9,  cost: 18, range: 20, desc: 'ashes down. everything caught in them is healed by her and slowed.' },
        { id: 'vanish', name: 'vanish',       verb: 'blink',      cd: 12, cost: 12, range: 0,  desc: 'she is not there any more. neither is the thing she was about to do to you.' }
      ],
      super1: { id: 'eris_s1', name: 'five years of it', verb: 'burst', cd: 42, cost: 0, range: 0, desc: 'every name she ever said out loud comes back as an impact.' },
      super2: { id: 'eris_s2', name: 'the dust remembers', verb: 'sweepheal', cd: 60, cost: 0, range: 0, desc: 'the field is full of ash. she is very hard to kill while it is.' },
      ultimate: { id: 'eris_ult', name: 'the un-snapped', verb: 'overload', cd: 90, cost: 0, range: 0,
        comic: 'not a comic. a Florida five years after the snap: every name on the wall, at once, and the wall does not hold. (the ones still waiting, 2026)',
        desc: 'she counts them out loud. the number in the field stops being a number after that.' }
    }
  ];

  /* ---------- enemy archetypes ---------- */
  const FOES = {
    outrider:  { id: 'outrider',  name: 'outrider',     role: 'dps',     hp: 900,  atk: 20, spd: 1.0,  ranged: false, color: '#5a5a5a' },
    marauder:  { id: 'marauder',  name: 'marauder',     role: 'dps',     hp: 1500, atk: 26, spd: 0.9,  ranged: true,  range: 22, color: '#7a5a3a' },
    centuri:   { id: 'centuri',   name: 'centurion',    role: 'tank',    hp: 3000, atk: 24, spd: 0.75, ranged: false, color: '#4a6a8a' },
    prowler:   { id: 'prowler',   name: 'prowler',      role: 'dps',     hp: 1100, atk: 34, spd: 1.25, ranged: false, color: '#8a3a3a' },
    drone:     { id: 'drone',     name: 'sentinel drone',role: 'dps',     hp: 700,  atk: 18, spd: 1.15, ranged: true,  range: 26, color: '#6a6a8a' },
    leviathan: { id: 'leviathan', name: 'leviathan',    role: 'boss',    hp: 9000, atk: 40, spd: 0.7,  ranged: false, color: '#8a5a2a' },
    thanoshand:{ id: 'thanoshand', name: 'sentinel hand', role: 'boss',   hp: 7000, atk: 46, spd: 0.8,  ranged: true,  range: 24, color: '#7a3a6a' }
  };

  /* ---------- florida ground layer ----------
     space: true  -> the location is off-world and requires a flight vehicle
     home: true  -> central florida home base                                */

  const FLORIDA = [
    { id: 'avenue',    name: 'new avengers compound',   region: 'west palm beach',  space: false, home: false, hideout: 'safehouse',
      blurb: 'a farm house with a bunker under it. four vans, one landing pad, and a landing pad the neighbours think is a pool house.' },
    { id: 'wakanda',   name: 'golden city balcony',     region: 'wakanda, above florida', space: true, home: false, hideout: 'ally',
      blurb: 'ten minutes from the compound, if you count going straight up. the panther society flies an escort.' },
    { id: 'miami',     name: 'little havana rooftop',   region: 'miami',             space: false, home: false, hideout: 'lair',
      blurb: 'a roof of pastel warehouses. good sightlines, worse neighbours, excellent radio shadow.' },
    { id: 'stone',     name: 'cape canaveral pad 14',  region: 'merritt island',    space: false, home: false, hideout: 'lair',
      blurb: 'pad 14 is not on the map. it is on a screen at cape canaveral, and the screen does not agree with itself.' },
    { id: 'aero',      name: 'aeroplane over orlando', region: 'orlando',           space: true,  home: false, hideout: 'lair',
      blurb: 'a quinjet parked on a landing strip nobody uses, wearing a theme park as camouflage.' },
    { id: 'hulk',      name: 'gamma basin',            region: 'keystone heights',  space: false, home: false, hideout: 'lair',
      blurb: 'the facility was closed in 1991. it was never closed. it is under a slightly angry hill.' },
    { id: 'magic',     name: 'sanctum, florida branch',region: 'orlando',           space: false, home: true,  hideout: 'ally',
      blurb: 'a shopping plaza with a doorway that does not lead to the parking lot. lease documents: "dry cleaners".' },
    { id: 'titan',     name: 'titan orb fragment',     region: 'everglades',        space: false, home: false, hideout: 'objective',
      blurb: 'half a sphere in a bed of limestone, behind a chain-link fence with a sign nobody believes.' },
    { id: 'staug',     name: 'st. augustine',          region: 'st. augustine',     space: false, home: false, hideout: 'neutral',
      blurb: 'the oldest city in the state of florida. it has walls. tonight they matter.' },
    { id: 'keys',      name: 'florida keys drydock',   region: 'big pine key',      space: false, home: false, hideout: 'lair',
      blurb: 'a shipyard that used to build fishing boats and now builds things with a lot of thrusters.' },
    { id: 'tampa',     name: 'tampa bay shipyard',      region: 'tampa',             space: false, home: false, hideout: 'neutral',
      blurb: 'the largest dry dock in florida. big enough to hide a ship. it is currently hiding a ship.' },
    { id: 'panhandle', name: 'panhandle listening post', region: 'pensacola',       space: false, home: false, hideout: 'lair',
      blurb: 'a listening post that stopped listening a while ago and started transmitting.' },
    { id: 'gulf',      name: 'gulf platform nine',     region: 'gulf of mexico',     space: true,  home: false, hideout: 'objective',
      blurb: 'a drilling platform, repurposed, lit like a lighthouse. somebody is broadcasting a countdown from it.' },
    { id: 'clemson',   name: 'vanishing point',         region: 'key largo',         space: true,  home: false, hideout: 'objective',
      blurb: 'the empty space where a ship used to be. it is still there. it is just not there.' }
  ];

  /* ---------- vehicles ----------
     kind: ground | air | space
     reach: ids of florida locations it can open

     combat block, added on top of the travel layer above:
       combat.hull   hit points on the vehicle's own bar
       combat.atk     damage per attack, before the verb multiplier.
                      sized UNDER a hero's basic swing (atk 24-50) and far
                      under a super (2.4x charge-scaled) or an ultimate
                      (5.5x+ over a whole field). a vehicle is a third
                      gun in a fight the heroes are already winning.
       combat.rate    seconds between automatic attacks
       combat.passive stat shift applied to every hero in the battle
       combat.attack  the vehicle's own action, same verb table as heroes
       combat.ability the one loud thing it can do, on a real cooldown
     every ability costs vehicle energy out of the vehicle's own pool.
     heroes never spend it, and heroes are never the reason to have it. */

  const VEHICLES = [
    { id: 'quinjet', name: 'quinjet', kind: 'space', comic: true, crew: 5,
      desc: 'two engines, no wings, and a shape that only makes sense in a comic book. fast everywhere, calm in a fight.',
      reach: ['aero','gulf','clemson','wakanda','avenue'],
      mods: { speed: 2.2, atk: 1.1, armor: 1.0 },
      combat: {
        color: '#7fa9d8', hull: 900, atk: 11, rate: 0.95, range: 0.34, energyRate: 6,
        passive: { id: 'gunship', name: 'gunship running hot', blurb: 'heroes in this fight hit 8% harder — the jets keep their hands steady', mods: { atk: 1.08 } },
        attack: { id: 'strafe', name: 'strafing run', verb: 'vprojectile', cost: 0, cd: 0, range: 0.34, mult: 1.6, desc: 'one pass down the line, nose on, hitting everything in the corridor.' },
        ability: { id: 'skywrite', name: 'skywrite', verb: 'vnova', cost: 35, cd: 14, rad: 0.2, mult: 2.7, desc: 'cuts a line of fire through everything close to the flight path.' }
      } },
    { id: 'talon', name: 'royal talon fighter', kind: 'space', comic: true, crew: 1,
      desc: 'wakandan. single seat, no windows, a hull pattern that reads as a bird even when it is going very fast.',
      reach: ['aero','gulf','clemson','wakanda','avenue'],
      mods: { speed: 3.0, atk: 1.25, armor: 1.15 },
      combat: {
        color: '#d8c07f', hull: 780, atk: 12, rate: 0.8, range: 0.3, energyRate: 7,
        passive: { id: 'firstshot', name: 'first shot free', blurb: 'the first thing the fighter hits every 4 seconds crits, and heroes crit 5% more', mods: { crit: 1.05 }, firstHit: true },
        attack: { id: 'cannon', name: 'cannon', verb: 'vprojectile', cost: 0, cd: 0, range: 0.3, mult: 1.5, desc: 'one round, straight line, no lead. the fighter does not miss and does not aim.' },
        ability: { id: 'talonbreath', name: 'talon breath', verb: 'vburst', cost: 40, cd: 16, rad: 0.24, mult: 2.4, desc: 'opens the throttle and blows through a cluster in one pass.' }
      } },
    { id: 'tesseract', name: 'tesseract', kind: 'space', comic: true, crew: 1,
      desc: 'a cube. a door. a shortcut between two places that should be far apart.',
      reach: ['avenue','aero','gulf','clemson','wakanda','miami','tampa','keys','titan','staug','magic','stone'],
      mods: { speed: 4.0, atk: 1.0, armor: 0.9 },
      combat: {
        color: '#9a7fd8', hull: 700, atk: 9, rate: 1.15, range: 0.26, energyRate: 8,
        passive: { id: 'doorway', name: 'a door in the fight', blurb: 'heroes take 8% less from everything while the cube holds', mods: {}, teamArmor: 0.08 },
        attack: { id: 'cubejab', name: 'cube jab', verb: 'vmelee', cost: 0, cd: 0, range: 0.26, mult: 1.9, desc: 'a corner of it arrives at the same place twice. it hurts more both times.' },
        ability: { id: 'shortcut', name: 'shortcut', verb: 'vblink', cost: 30, cd: 12, mult: 3.0, drift: 1.5, desc: 'the fight steps sideways and a hero is already standing in the place the next hit was going.' }
      } },
    { id: 'spitfire', name: 's.h.i.e.l.d. hover bikes', kind: 'ground', comic: true, crew: 1,
      desc: 'loud, fast, absurd over sand. two bikes, two riders, no brakes worth mentioning.',
      reach: ['avenue','miami','stone','hulk','aero','tampa','staug','panhandle','keys','magic'],
      mods: { speed: 2.6, atk: 1.3, armor: 0.75 },
      combat: {
        color: '#d87f9a', hull: 620, atk: 8, rate: 0.7, range: 0.2, energyRate: 7,
        passive: { id: 'overrev', name: 'over-revved', blurb: 'heroes act 10% faster: cooldowns come back sooner and the field moves quicker', mods: { cd: 0.9, energy: 1.1 } },
        attack: { id: 'ram', name: 'ram', verb: 'vmelee', cost: 0, cd: 0, range: 0.2, mult: 2.2, desc: 'no brakes, full lean, arrives before the target finishes turning.' },
        ability: { id: 'burnout', name: 'burnout', verb: 'vdash', cost: 32, cd: 11, mult: 3.9, dur: 1.5, desc: 'both bikes run past the whole line and come back ready to do it again.' }
      } },
    { id: 'nighthawk', name: 'nighthawk', kind: 'air', comic: true, crew: 1,
      desc: 'a black vtOL with a pilot who has been awake for two days and is winning anyway.',
      reach: ['aero','gulf','clemson','tampa','keys','miami','staug','panhandle','magic','hulk','avenue'],
      mods: { speed: 2.8, atk: 1.15, armor: 1.05 },
      combat: {
        color: '#4f6f7f', hull: 1050, atk: 11, rate: 1.05, range: 0.36, energyRate: 5,
        passive: { id: 'cover', name: 'hard cover overhead', blurb: 'heroes take 6% less. it is parked a hundred feet up and they all know it', mods: {}, teamArmor: 0.06 },
        attack: { id: 'rockets', name: 'rocket pod', verb: 'vprojectile', cost: 0, cd: 0, range: 0.36, mult: 1.4, desc: 'a four-round burst, grouped, accurate, and far too loud for a stealth bird.' },
        ability: { id: 'flak', name: 'flak curtain', verb: 'vnova', cost: 34, cd: 15, rad: 0.28, mult: 2.4, desc: 'sets a wall of chaff and blows it in the middle of the field.' }
      } },
    { id: 'gator', name: 'swamp gator hauler', kind: 'ground', comic: false, crew: 3,
      desc: 'flat-bottomed, mud-tired, amphibious. it crosses the glades like a boat and the highway like a bad idea.',
      reach: ['avenue','titan','keys','miami','tampa','magic','stone','hulk','staug','panhandle'],
      mods: { speed: 1.5, atk: 1.0, armor: 1.35 },
      combat: {
        color: '#7f9a6f', hull: 1400, atk: 9, rate: 1.25, range: 0.28, energyRate: 5,
        passive: { id: 'bulwark', name: 'bulwark', blurb: 'heroes take 10% less. the hauler is across the front of them and it is not moving', mods: {}, teamArmor: 0.10 },
        attack: { id: 'cabram', name: 'cab ram', verb: 'vmelee', cost: 0, cd: 0, range: 0.28, mult: 1.7, desc: 'the cab comes round and adds it. it is not subtle and it does not need to be.' },
        ability: { id: 'bulwarkline', name: 'bulwark line', verb: 'vbastion', cost: 38, cd: 18, dur: 6, mult: 2.6, desc: 'parks across the front. for six seconds the team is behind something that is not them.' }
      } },
    { id: 'coronet', name: 'the coronet', kind: 'space', comic: true, crew: 2,
      desc: 'a falcon that flies. shuri built it, t\'challa named it, and it answers to both.',
      reach: ['aero','gulf','clemson','wakanda','avenue','miami','tampa'],
      mods: { speed: 2.9, atk: 1.3, armor: 1.2 },
      combat: {
        color: '#c9a227', hull: 850, atk: 12, rate: 0.85, range: 0.32, energyRate: 6,
        passive: { id: 'kinetic', name: 'kinetic shields', blurb: 'heroes take 5% less and hit 6% harder — the falcon banks into everything they throw', mods: { atk: 1.06 }, teamArmor: 0.05 },
        attack: { id: 'pulse', name: 'pulse cannon', verb: 'vbeam', cost: 0, cd: 0, range: 0.32, mult: 1.3, dur: 0.9, desc: 'a continuous coil of energy. it tracks slowly, so it only works if nobody is moving much.' },
        ability: { id: 'falcondive', name: 'falcon dive', verb: 'vdash', cost: 36, cd: 13, mult: 2.2, dur: 1.6, desc: 'the falcon comes down through the middle of them and pulls up somewhere useful.' }
      } },
    { id: 'lifeguard', name: 'lifeguard tower skiff', kind: 'ground', comic: false, crew: 2,
      desc: 'a tower truck with the truck part taken off. it is technically faster on water and technically illegal on sand.',
      reach: ['keys','miami','tampa','staug','avenue','titan'],
      mods: { speed: 2.0, atk: 1.0, armor: 0.95 },
      combat: {
        color: '#5fb0c9', hull: 700, atk: 14, rate: 1.1, range: 0.3, energyRate: 7,
        passive: { id: 'triage', name: 'first aid at the tower', blurb: 'heroes in this fight regenerate 1.5% hp a second while the skiff is on scene', mods: { regen: 0.015 } },
        attack: { id: 'taser', name: 'deck taser', verb: 'vprojectile', cost: 0, cd: 0, range: 0.3, mult: 1.1, stun: 0.5, desc: 'a rescue-tower prod. it barely hurts and it holds things still for half a second.' },
        ability: { id: 'tidal', name: 'tidal drag', verb: 'vsweepheal', cost: 30, cd: 15, frac: 0.28, mult: 2.0, dur: 1.4, desc: 'sweeps the front with the winch and the wake, and everyone on our side gets back up a bit.' }
      } },
    { id: 'piston', name: 'piston coupe', kind: 'ground', comic: true, crew: 1,
      desc: 'a muscle car from a decade that would be embarrassed to be seen next to this. it is a transport, and it is a statement.',
      reach: ['avenue','miami','stone','hulk','aero','tampa','staug','panhandle','keys','magic'],
      mods: { speed: 1.9, atk: 1.05, armor: 0.9 },
      combat: {
        color: '#c96f5f', hull: 640, atk: 9, rate: 0.8, range: 0.28, energyRate: 7,
        passive: { id: 'crowd', name: 'the whole car in this', blurb: 'heroes hit 7% harder — the coupe is in the fight, not parked at the edge of it', mods: { atk: 1.07 } },
        attack: { id: 'nose', name: 'nose first', verb: 'vmelee', cost: 0, cd: 0, range: 0.28, mult: 1.8, desc: 'arrives at speed, transfers it, and does not slow down afterwards.' },
        ability: { id: 'burnoutdrag', name: 'burnout drag', verb: 'vdash', cost: 28, cd: 10, mult: 3.2, dur: 1.1, desc: 'spins both rear tyres and comes in sideways. nobody in this game brakes for that.' }
      } },
    { id: 'lilboat', name: 'lil\' boat', kind: 'ground', comic: false, crew: 2,
      desc: 'a forty-foot Chris-craft with a jet engine welded to the back. loud is the only spec that matters.',
      reach: ['keys','miami','tampa','staug','titan','avenue'],
      mods: { speed: 2.2, atk: 1.1, armor: 0.8 },
      combat: {
        color: '#e0e04f', hull: 580, atk: 12, rate: 0.95, range: 0.3, energyRate: 8,
        passive: { id: 'awp', name: 'over the horizon', blurb: 'heroes take 4% less from everything, and the boat is fast enough to keep picking them off', mods: {}, teamArmor: 0.04 },
        attack: { id: 'cannon', name: 'cannon', verb: 'vprojectile', cost: 0, cd: 0, range: 0.3, mult: 1.4, desc: 'the big gun, once every few seconds, from a hull that is not built for it.' },
        ability: { id: 'torpedo', name: 'torpedo run', verb: 'vpierce', cost: 33, cd: 12, mult: 2.2, desc: 'one wake straight up the middle of the field. it goes through the whole line and does not stop.' }
      } },
    { id: 'sunspear', name: 'sun spear interceptor', kind: 'space', comic: true, crew: 1,
      desc: 'small, bright, and quick enough to be inside a fight before the bigger ships have finished aligning.',
      reach: ['aero','gulf','clemson','wakanda','avenue','miami','tampa'],
      mods: { speed: 3.2, atk: 1.2, armor: 1.0 },
      combat: {
        color: '#f0f0f0', hull: 560, atk: 11, rate: 0.65, range: 0.34, energyRate: 8,
        passive: { id: 'interceptor', name: 'interceptor screen', blurb: 'heroes take 7% less and hit 5% harder — the needle is inside the fight, not above it', mods: { atk: 1.05 }, teamArmor: 0.07 },
        attack: { id: 'needle', name: 'needle runs', verb: 'vprojectile', cost: 0, cd: 0, range: 0.34, mult: 1.3, desc: 'two solid rounds, fast, accurate, and mostly because it is already in the air.' },
        ability: { id: 'splinter', name: 'splinter', verb: 'vblink', cost: 26, cd: 9, mult: 2.8, dur: 1.0, desc: 'breaks formation, comes through from an angle nobody was watching, and is gone before the shot lands.' }
      } },
    { id: 'keysmobile', name: 'seven-mile bridge mobile', kind: 'ground', comic: false, crew: 1,
      desc: 'built to cross the keys fast, and it does. it also does not stop for anything, including traffic.',
      reach: ['keys','miami','tampa','staug','avenue','titan','panhandle'],
      mods: { speed: 2.1, atk: 1.05, armor: 1.0 },
      combat: {
        color: '#c9c94f', hull: 800, atk: 10, rate: 0.85, range: 0.32, energyRate: 6,
        passive: { id: 'runners', name: 'runners', blurb: 'heroes act 8% faster: cooldowns come back sooner and they keep more energy in the bank', mods: { cd: 0.92, energy: 1.08 } },
        attack: { id: 'bumper', name: 'bumper', verb: 'vmelee', cost: 0, cd: 0, range: 0.32, mult: 1.6, dur: 0.4, desc: 'a lot of chrome, applied at speed, with a whole lot of people watching.' },
        ability: { id: 'sunrun', name: 'sun run', verb: 'vdash', cost: 30, cd: 12, mult: 2.7, rad: 0.3, desc: 'the whole seven miles of it, end to end, in one line through whatever is in the way.' }
      } }
  ];

  /* ---------- story ----------
     each act has a location, a set of live parallel battles, and a
     reveal that unlocks on the act's completion. */

  const STORY = [
    { act: 1, id: 'tunein', title: 'five years of static',
      location: 'avenue', objective: 'hold the compound, get a line out of the signal',
      deploy: ['piston', 'gator', 'quinjet'],
      beats: [
        { who: 'nick fury', line: 'i left a light on. somebody finally looked at it.' },
        { who: 'marvel', line: 'i passed over florida at 04:00 this morning. whatever is transmitting is coming from the gulf, and it is not a ship.' },
        { who: 'rogers', line: 'five years. there is a signal. that is a direction. i will take a direction.' }
      ],
      reveal: 'the signal is a countdown. it is counting down, and it has been counting since the snap.' },

    { act: 2, id: 'cannon', title: 'pad 14',
      location: 'stone', objective: 'cut the launch window before the next window closes',
      deploy: ['piston', 'spitfire', 'tesseract'],
      beats: [
        { who: 'the director', line: 'there is a launch window on nobody\'s manifest. it is warm. it has a crew of zero.' },
        { who: 'cap', line: 'i have waited five years for a door. this is a bad door and i am still taking it.' },
        { who: 'cap', line: 'rogers, vance. you can stop moving like a man with a plan and start moving like a man with a shield.' }
      ],
      reveal: 'pad 14 is not on the manifest because pad 14 was filled in. somebody is launching from a building that no longer exists.' },

    { act: 3, id: 'crossroads', title: 'castle in the glades',
      location: 'titan', objective: 'recover the fragment, keep it off their side',
      deploy: ['gator', 'keysmobile', 'lifeguard'],
      beats: [
        { who: 'bruce banner', line: 'i kept a piece of it in a cooler in a national park. it was the only place i could think of that the world would not check.' },
        { who: 'thanos hand', line: 'you have all been guessing. i was not random. i was an instruction.' },
        { who: 'cap', line: 'then somebody wrote the instruction, and that somebody is on a platform in the gulf.' }
      ],
      reveal: 'the titan fragment is warm. the fragment does not do that. something is standing on the other side of it.' },

    { act: 4, id: 'pressure', title: 'under the castle',
      location: 'magic', objective: 'defend the sanctum threshold through the masquerade',
      deploy: ['piston', 'nighthawk', 'tesseract'],
      beats: [
        { who: 'wong', line: 'the sanctum does not have a florida branch. you are in the plaza because i allowed it, and that has an expiration.' },
        { who: 'strange', line: 'a masked one, a crowned one, and something with no face in it. that is three problems and one floor.' },
        { who: 'strange', line: 'if it crosses the threshold it does not open a door. it replaces the address.' }
      ],
      reveal: 'the thing at the sanctum is not a person. it is a nine-word file, and it is being served to florida like a legal notice.' },

    { act: 5, id: 'longthirty', title: 'long thirty',
      location: 'aero', objective: 'take the aero in the sky before it reaches the quinjet',
      deploy: ['nighthawk', 'piston', 'sunspear'],
      beats: [
        { who: 't\'challa', line: 'my sister is in that craft. she went in on her own. that is very her.' },
        { who: 'shuri', line: 'captain, i can hold the pattern for ninety seconds. after that the air is not mine and it is only yours.' },
        { who: 'cap', line: 'ninety seconds. i have held worse with worse.' }
      ],
      reveal: 'the aero was not stolen. it was flown. by someone who learned it in a dream.' },

    { act: 6, id: 'flip', title: 'the flip',
      location: 'gulf', objective: 'stop the countdown at platform nine',
      deploy: ['nighthawk', 'talon', 'sunspear'],
      beats: [
        { who: 'dr strange', line: 'i have seen this. not this moment. this shape of moment. it is the one i could not look up.' },
        { who: 'bruce banner', line: 'i ran the numbers in the gamma basin and then i stopped running them, because the numbers were asking me to.' },
        { who: 'carol danvers', line: 'the countdown is not a weapon. it is an appointment, and the man keeping it is already here.' }
      ],
      reveal: 'the countdown is a snap. a second one. smaller, aimed, and it has one finger on it, and it is not aimed at the galaxy.' },

    { act: 7, id: 'service', title: 'the service',
      location: 'staug', objective: 'hold the wall, one at a time, out of the old city',
      deploy: ['piston', 'spitfire', 'lilboat'],
      beats: [
        { who: 'bruce banner', line: 'you all would not, so you would. that is the whole of it. that is the whole of us.' },
        { who: 'cap', line: 'banners. on every rooftop in this city. we are here.' },
        { who: 'peter parker', line: 'i was a kid when it happened. i have had five years to be somebody and i did not become somebody.' }
      ],
      reveal: 'the ones who came back were not chosen. they were answered. the snap is a call, and something is picking up.' },

    { act: 8, id: 'assault', title: 'zero to none',
      location: 'clemson', objective: 'cross the vanishing point and end the appointment',
      deploy: ['talon', 'coronet', 'quinjet'],
      beats: [
        { who: 'carol danvers', line: 'it is a hand. it is only ever a hand. i have been fighting a hand.' },
        { who: 'thanos hand', line: 'you took everything and gave it back and now you want to take it again. that is not courage. that is a bill.' },
        { who: 'cap', line: 'i know how this ends. i have the shield, and i have the field, and i have you.' }
      ],
      reveal: 'the hand at the vanishing point is not thanos. thanos lost a finger. this is the one he did not lose, and it has been waiting on a platform in the gulf for five years.' }
  ];

  /* ---------- random cinematic interruptions ----------
     these are the story beats that cut across play as footage.
     `kind` picks the visual grammar the renderer uses. */

  const FOOTAGE = [
    { id: 'f1', kind: 'replay',   dur: 4.2, tag: 'cape canaveral // pad 14', title: 'pad 14 // 03:14:02', text: 'the launch window opened and the manifest was empty. there was a crew of zero and a countdown of one.' },
    { id: 'f2', kind: 'glitch',   dur: 3.6, tag: 'orb // titanic fragment', title: 'orb recovery, live', text: 'the fragment is warm. the fragment has no business being warm. it is sitting in a cooler behind a sign that says do not enter, in a national park, in florida.' },
    { id: 'f3', kind: 'signal',   dur: 3.8, tag: 'gulf platform nine', title: 'transmission, partial', text: '...five years. the count is correct. the next one is not a general. it is a local. it is in the old city in st. augustine and it is under the wall...' },
    { id: 'f4', kind: 'replay',   dur: 4.0, tag: 'avengers compound', title: 'the farm house, dusk', text: 'four vans, one bunker, and a landing pad the neighbours think is a pool house. everybody is here. nobody is calm.' },
    { id: 'f5', kind: 'glitch',   dur: 3.4, tag: 'recovered // reel 9', title: 'reel 9, 5 years of nobody', text: 'camera found a street in key west. the street is the same street. there is one chair on it that was two.' },
    { id: 'f6', kind: 'signal',   dur: 3.6, tag: 'aeroplane // orlando', title: 'pattern, inverted', text: 'shuri is holding the pattern for ninety seconds. after that the air belongs to whoever is in the craft, and it learned how to fly in a dream.' },
    { id: 'f7', kind: 'replay',   dur: 4.2, tag: 'st. augustine // the wall', title: 'the wall, long thirty', text: 'banners on every rooftop in the oldest city in florida. the oldest city in florida has walls, and tonight they matter.' },
    { id: 'f8', kind: 'glitch',   dur: 3.4, tag: 'sanctum branch // orlando', title: 'doorway, plaza', text: 'the address was replaced. the plaza is still a plaza. it is a plaza that is somewhere else underneath.' }
  ];

  /* ---------- surprise characters ----------
     they roll rarely: the gate is explicit, so the player knows why
     nothing happened for four minutes. */

  const SURPRISE = {
    heroChance: 0.055,   // ~one every 18s of continuous fight, then the roll cools down
    villainChance: 0.045,
    cooldownMs: 26000,   // hard floor between any two surprise entries
    minAct: 2,           // no surprises in the opening act
    intro: {
      okayo: 'okayo, drops out of a vent that was not there',
      null9: 'null-9 comes in from the outside of the fight',
      eris: 'eris steps up out of the ash'
    }
  };

  /* ============================================================
     CLUES — evidence collected across florida.
     nothing here explains itself. the board only draws a line
     between two of them once you have enough to justify it.
     ============================================================ */

  const CLUES = [
    { id: 'manifest', at: 'stone', label: 'pad 14 manifest',
      line: 'a launch window with a crew of zero and a weight of eleven thousand pounds',
      hand: 'the manifest is clean. pad 14 was decommissioned in 1991. the paperwork says so in three places, all signed, all dated, all in the same hand.' },

    { id: 'cooler', at: 'titan', label: 'cooler code',
      line: 'eight characters scratched into the limestone under the orb fragment',
      hand: 'scratched into limestone, which takes an hour per character. somebody sat there. somebody had time and expected to come back.' },

    { id: 'wallmap', at: 'staug', label: 'wall survey',
      line: 'nineteen tunnel mouths under the st. augustine wall, and one that is not on the survey',
      hand: 'the eighteenth is a cistern. the nineteenth is drawn in a different pencil by a different hand, and it is annotated "warm".' },

    { id: 'tape', at: 'tampa', label: 'dock camera 4',
      line: 'a hull in dry dock nine at 02:40, and the flag is not a country',
      hand: 'thirty-one seconds. the ship is in frame for twenty-six of them. it never leaves frame. it is not docked. it is parked.' },

    { id: 'radio', at: 'panhandle', label: 'loop transmission',
      line: 'the countdown is not a threat. it is a queue, and it has a name on it',
      hand: 'a man reading eleven names. not a general\'s voice. a dispatcher. he reads them the way you read a bus list.' },

    { id: 'doorway', at: 'magic', label: 'replaced address',
      line: 'the sanctum branch lease was filed in a plaza that was not built until four years after the lease',
      hand: 'somebody did not move a door. somebody moved where the door says it is. the plaza has a doorway that leads to the parking lot. most days.' },

    { id: 'swing', at: 'avenue', label: 'a swing at the park',
      line: 'the last verified sighting in this state, ninety minutes before the count',
      hand: 'orbit of florida keeps the schedule. a child was on a swing, and the swing was still moving, and the child was not on it any more.' }
  ];

  /* ---------- deduction threads ----------
     a thread needs a minimum number of clues before the board will
     even show it. solving a thread advances what the story knows. */

  const THREADS = [
    { id: 'origin', need: 2, act: 1, question: 'where is the signal coming from',
      options: [
        { t: 'orbit — the satellites are repeating it', ok: false, why: 'the loop is terrestrial. a satellite does not read eleven names.' },
        { t: 'a platform in the gulf, on a schedule, reading names', ok: true, why: 'the count is a queue with a man on it. that is a room, not a sky.' },
        { t: 'the sanctum, through the doorway', ok: false, why: 'the doorway carries people. it does not carry a countdown for five years.' }
      ] },

    { id: 'writer', need: 3, act: 2, question: 'who wrote the instruction',
      options: [
        { t: 'a surviving scribe, working alone', ok: false, why: 'one hand wrote the manifest, the wall survey and the lease. one hand is not a loner.' },
        { t: 'an office — a filing system, with clerks, that never closed', ok: true, why: 'three documents, three locations, one hand, and a filing number. that is an institution.' },
        { t: 'thanos, before the snap', ok: false, why: 'the hand left a finger behind. this is not the hand that kept it.' }
      ] },

    { id: 'method', need: 4, act: 4, question: 'what happens at the end of the countdown',
      options: [
        { t: 'a second snap, smaller, aimed at florida', ok: true, why: 'aimed. local. a bill, not a general.' },
        { t: 'the doorway replaces the address of the state', ok: false, why: 'it is doing that already, and slowly. it does not need the queue to do it.' },
        { t: 'the count comes back — the return half, with the wrong list', ok: false, why: 'the list is the point. whoever wrote it knows exactly who is on it.' }
      ] },

    { id: 'who', need: 5, act: 6, question: 'who is keeping it',
      options: [
        { t: 'a cancelled program and the man still running it', ok: true, why: 'a dispatcher, not a general. somebody is holding a clipboard five years after the paperwork died.' },
        { t: 'the void', ok: false, why: 'the void does not need a list. it needs a number, and it already has both.' },
        { t: 'the returned, acting together', ok: false, why: 'they came back to a bus. they did not come back to a platform.' }
      ] }
  ];

  /* ============================================================
     MISSIONS — the non-combat work.
     every one of these gates the act's fronts: you do not deploy
     until it is solved or until it has cost you something.
     kind picks the puzzle verb the engine runs.
     ============================================================ */

  const MISSIONS = [
    { act: 1, id: 'intercept', kind: 'wheel', verb: 'decrypt', hero: 'marvel',
      title: 'the interception', where: 'new avengers compound',
      brief: 'marvel came back through the compound roof with a burst of signal on a plate and ninety seconds of daylight left on it. four rotating symbol rings. align them.',
      stakes: 'a girl in orlando is on the list. the burst names her twice.',
      timer: 75,
      onSucceed: { clues: ['radio'], mod: { foeHp: -0.18, charge: 30, banner: 'the burst named every man on the platform — their heads are lit up' } },
      onFail: { cost: 'life', who: 'Eden Cho, 6', lose: 'E06', mod: { foeHp: 0.3, charge: -20, banner: 'the burst burned out unread. they know you are coming.' } } },

    { act: 2, id: 'pad14', kind: 'grid', verb: 'hack', hero: 'cap',
      title: 'pad 14, access', where: 'cape canaveral pad 14',
      brief: 'twenty moves on a security grid that does not know pad 14 exists. every alarm node you step on tells somebody a man is on the roof. three alarms and the window closes.',
      stakes: 'the launch window is the only one tonight. close it and they fly whatever is on the manifest.',
      timer: 95,
      onSucceed: { clues: ['manifest'], mod: { foeAtk: -0.2, extraWave: -1, banner: 'you killed the window before it opened. they are improvising now' } },
      onFail: { cost: 'front', mod: { extraWave: 1, foeHp: 0.2, banner: 'the window closed with them on the pad' } } },

    { act: 3, id: 'cooler', kind: 'order', verb: 'decrypt', hero: 'hulk',
      title: 'the cooler', where: 'everglades, limestone bed',
      brief: 'eight characters under the fragment. they are in the right order somewhere. put them in it before the water comes over the rock and takes them.',
      stakes: 'the code is the only thing that says who is on the other side of the orb. read it wrong and the next five years start here.',
      timer: 70,
      onSucceed: { clues: ['cooler'], mod: { foeHp: -0.15, charge: 45, banner: 'the code names an office, not a man. you can work with an office' } },
      onFail: { cost: 'life', who: 'Tomas Reyes, 52', lose: 'T52', mod: { foeAtk: 0.25, banner: 'you got the order wrong. something is laughing on the other side of the rock' } } },

    { act: 4, id: 'masquerade', kind: 'talk', verb: 'negotiate', hero: 'strange',
      title: 'the masquerade', where: 'sanctum, florida branch',
      brief: 'wong allows this plaza for exactly as long as you can make it worth his afternoon. you have three things you are able to say without lying. spend them well.',
      stakes: 'if he closes the branch, the doorway stops being a threshold and starts being a street. florida loses a door it cannot get back.',
      timer: 80,
      onSucceed: { clues: ['doorway'], mod: { charge: 50, foeHp: -0.2, banner: 'the branch stays open. so does the road behind it' } },
      onFail: { cost: 'place', place: 'magic', mod: { foeAtk: 0.3, foeHp: 0.15, banner: 'the branch is closed. the address has been replaced' } } },

    { act: 5, id: 'ninety', kind: 'lock', verb: 'hold the signal', hero: 'shuri',
      title: 'ninety seconds', where: 'aeroplane, over orlando', live: true,
      brief: 'shuri can hold the flight pattern for ninety seconds. the hold is drifting and it fights back. you keep the lock inside the tolerance. the fronts do not wait for you.',
      stakes: 'she is in the craft. the hold is the only thing between her and an airframe that learned to fly in a dream.',
      timer: 90,
      onSucceed: { clues: ['tape'], mod: { surprise: 'okayo', charge: 60, banner: 'the pattern held. and somebody on the ground noticed, and liked it' } },
      onFail: { cost: 'hero', who: 'shuri', mod: { surprise: 'null9', extraWave: 1, banner: 'the hold broke at sixty-one. shuri did not come down with the plane' } } },

    { act: 6, id: 'appointment', kind: 'deduce', verb: 'deduce', hero: 'cap',
      title: 'the appointment', where: 'gulf platform nine', live: true,
      brief: 'the countdown has one finger on it. you have a board, some evidence, and about four minutes. draw the line from the evidence to the answer, in order, while the platform keeps running.',
      stakes: 'get the room wrong and the bill gets paid in the state instead of the galaxy. there is no draft after that.',
      timer: 150,
      onSucceed: { clues: ['wallmap'], mod: { charge: 100, foeHp: -0.25, banner: 'you know which room. you know who is holding the clipboard. now go and take it off him' } },
      onFail: { cost: 'place', place: 'staug', mod: { extraWave: 2, foeAtk: 0.35, banner: 'wrong room. the wall went under the water and the bill stands' } } },

    { act: 7, id: 'wall', kind: 'timing', verb: 'rescue', hero: 'cap',
      title: 'under the wall', where: 'st. augustine, cistern nineteen',
      brief: 'there are people under the old city in the eighteenth cistern and the water is coming in. three passes. stop the sweep in the safe band each time. three is all it holds.',
      stakes: 'the twentieth pass is not survivable and you only have three.',
      timer: 80,
      onSucceed: { clues: ['swing'], mod: { charge: 70, heal: 0.5, banner: 'sixteen people are on the street and the count is the same count it was' } },
      onFail: { cost: 'life', who: 'Hana Okonkwo, 19', mod: { foeHp: 0.2, charge: -30, banner: 'pass two did not hold. the count is one lower than it was this morning' } } }
  ];

  /* ---------- the survivors ledger ----------
     the count is the story's whole subject, so the game keeps it
     as a visible list that can get shorter. */

  const LEDGER = [
    { id: 'A11', who: 'Alva Ackerman, 11', note: 'counted first. one hundred percent, and then an accident.' },
    { id: 'S09', who: 'Samuel Ackerman, 9', note: 'asleep in a car seat. did not wake up.' },
    { id: 'P34', who: 'Priya Rao, 34', note: 'her card still works everywhere in central florida.' },
    { id: 'M27', who: 'Marisol Vega, 27', note: 'was mid-sentence. the sentence is still in her phone.' },
    { id: 'K41', who: 'Kwame Boateng, 41', note: 'called it in. called it in twice.' },
    { id: 'E06', who: 'Eden Cho, 6', note: 'was on a swing at the park.' },
    { id: 'T52', who: 'Tomas Reyes, 52', note: 'no dependents. the mail still goes to his door.' },
    { id: 'H19', who: 'Hana Okonkwo, 19', note: 'first day of college. the dorm room is still assigned.' },
    { id: 'B08', who: 'Bo Whittaker, 8', note: 'counted his wands out loud. got to four.' },
    { id: 'R63', who: 'Ruth Delgado, 63', note: 'kept bees. the bees are fine.' }
  ];

  /* ---------- helper maps ---------- */
  const BY_ID = {};
  HEROES.forEach(function (h) { BY_ID[h.id] = h; });
  const FLORIDA_BY_ID = {};
  FLORIDA.forEach(function (f) { FLORIDA_BY_ID[f.id] = f; });
  const VEH_BY_ID = {};
  VEHICLES.forEach(function (v) { VEH_BY_ID[v.id] = v; });
  const CLUE_BY_ID = {};
  CLUES.forEach(function (c) { CLUE_BY_ID[c.id] = c; });

  const HEROES_ID = HEROES.filter(function (h) { return !h.surprise; });
  const SURPRISE_ID = HEROES.filter(function (h) { return h.surprise; });

  root.GD = {
    ROLES: ROLES,
    HEROES: HEROES,
    HEROES_ID: HEROES_ID,
    SURPRISE_ID: SURPRISE_ID,
    BY_ID: BY_ID,
    FOES: FOES,
    FLORIDA: FLORIDA,
    FLORIDA_BY_ID: FLORIDA_BY_ID,
    VEHICLES: VEHICLES,
    VEH_BY_ID: VEH_BY_ID,
    STORY: STORY,
    FOOTAGE: FOOTAGE,
    SURPRISE: SURPRISE,
    CLUES: CLUES,
    CLUE_BY_ID: CLUE_BY_ID,
    THREADS: THREADS,
    MISSIONS: MISSIONS,
    LEDGER: LEDGER
  };
})(window);
