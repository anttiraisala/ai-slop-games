// Calm the Square - game logic (no DOM access, so it can be tested in Node).
(function (root) {
  'use strict';

  var WIDTH = 900;
  var HEIGHT = 560;
  var DAY_LENGTH = 30; // seconds per day
  var TOTAL_DAYS = 7;
  var SQUARE = { x: 450, y: 280, r: 70 };
  var MAX_BUDGET = 100;
  var MAX_FIRES = 8;
  var COSTS = { repair: 25, mediate: 10, extinguish: 6, shield: 12, police: 8 };

  function mulberry32(seed) {
    var a = seed | 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
  }

  function dist(ax, ay, bx, by) {
    return Math.hypot(ax - bx, ay - by);
  }

  function makeSchools() {
    var defs = [
      { id: 0, name: 'Northwest High', x: 120, y: 95, condition: 72 },
      { id: 1, name: 'Northeast High', x: 780, y: 95, condition: 62 },
      { id: 2, name: 'Southwest College', x: 120, y: 465, condition: 78 },
      { id: 3, name: 'Southeast College', x: 780, y: 465, condition: 58 }
    ];
    return defs.map(function (d) {
      d.w = 120;
      d.h = 72;
      var dx = SQUARE.x - d.x;
      var dy = SQUARE.y - d.y;
      var len = Math.hypot(dx, dy);
      d.doorX = d.x + (dx / len) * 80;
      d.doorY = d.y + (dy / len) * 80;
      return d;
    });
  }

  function makeShops() {
    var defs = [
      { id: 0, name: 'Bakery', x: 300, y: 110 },
      { id: 1, name: 'Cafe', x: 600, y: 110 },
      { id: 2, name: 'Pharmacy', x: 300, y: 450 },
      { id: 3, name: 'Bookshop', x: 600, y: 450 },
      { id: 4, name: 'Market', x: 450, y: 500 },
      { id: 5, name: 'Florist', x: 190, y: 280 },
      { id: 6, name: 'Newsstand', x: 710, y: 280 }
    ];
    return defs.map(function (d) {
      d.w = 76;
      d.h = 44;
      d.health = 100;
      d.shield = 0;
      d.looted = false;
      d.hit = false;
      return d;
    });
  }

  function createState(seed) {
    return {
      status: 'playing', // playing | won | lost
      time: 0,
      day: 1,
      dayTime: 0,
      calm: 80,
      budget: 60,
      schools: makeSchools(),
      shops: makeShops(),
      crowds: [],
      fires: [],
      nextId: 1,
      stats: { repairs: 0, mediations: 0, extinguished: 0, police: 0, looted: 0, fires: 0 },
      messages: [],
      score: 0,
      rng: mulberry32(seed === undefined ? Date.now() : seed)
    };
  }

  function say(state, text) {
    state.messages.push(text);
  }

  function spawnCrowd(state, school, size, anger) {
    var rng = state.rng;
    var angle = rng() * Math.PI * 2;
    var radius = 15 + rng() * 35;
    var crowd = {
      id: state.nextId++,
      schoolId: school.id,
      x: school.doorX,
      y: school.doorY,
      tx: SQUARE.x + Math.cos(angle) * radius,
      ty: SQUARE.y + Math.sin(angle) * radius,
      size: size,
      anger: anger,
      age: 0,
      fireTimer: 3 + rng() * 3,
      slow: 0,
      dead: false
    };
    state.crowds.push(crowd);
    return crowd;
  }

  function spawnFire(state, x, y) {
    if (state.fires.length >= MAX_FIRES) {
      return;
    }
    var rng = state.rng;
    state.fires.push({
      id: state.nextId++,
      x: clamp(x + (rng() - 0.5) * 50, 30, WIDTH - 30),
      y: clamp(y + (rng() - 0.5) * 50, 30, HEIGHT - 30),
      age: 0
    });
    state.stats.fires++;
    say(state, 'A car is burning near the crowd.');
  }

  function onNewDay(state) {
    var rng = state.rng;
    var school;
    if (state.day === 4) {
      school = state.schools[Math.floor(rng() * state.schools.length)];
      spawnCrowd(state, school, 12, 50);
      say(state, 'Day 4: the students\' union calls for blockades in every school.');
    } else if (state.day === 7) {
      say(state, 'Day 7: a big weekend march is heading for the square!');
      for (var i = 0; i < 2; i++) {
        school = state.schools[Math.floor(rng() * state.schools.length)];
        spawnCrowd(state, school, 16, 55);
      }
    } else {
      say(state, 'Day ' + state.day + ' begins. Tension is rising in the city.');
    }
  }

  function average(list, key) {
    var sum = 0;
    for (var i = 0; i < list.length; i++) {
      sum += list[i][key];
    }
    return sum / list.length;
  }

  function finish(state, status) {
    state.status = status;
    if (status === 'won') {
      state.score = Math.max(0, Math.round(
        state.calm * 10 + average(state.shops, 'health') * 3 +
        average(state.schools, 'condition') * 3 + state.budget * 2 + 500 -
        state.stats.police * 25
      ));
      say(state, 'The weekend arrives and the city is still standing.');
    } else {
      state.score = 0;
      say(state, 'The city slipped out of control.');
    }
  }

  function update(state, dt) {
    if (state.status !== 'playing') {
      return;
    }
    var rng = state.rng;
    var i;
    var j;
    var s;
    var c;
    var f;
    var shop;

    state.time += dt;
    state.dayTime += dt;
    if (state.dayTime >= DAY_LENGTH) {
      state.dayTime -= DAY_LENGTH;
      if (state.day >= TOTAL_DAYS) {
        finish(state, 'won');
        return;
      }
      state.day++;
      onNewDay(state);
    }

    var diff = 1 + 0.28 * (state.day - 1);
    state.budget = Math.min(MAX_BUDGET, state.budget + 3.0 * dt);

    // Schools decay and may start a blockade crowd.
    for (i = 0; i < state.schools.length; i++) {
      s = state.schools[i];
      s.condition = Math.max(0, s.condition - 0.7 * diff * dt);
      var hasCrowd = false;
      for (j = 0; j < state.crowds.length; j++) {
        if (state.crowds[j].schoolId === s.id) {
          hasCrowd = true;
          break;
        }
      }
      if (!hasCrowd && s.condition < 55) {
        var p = ((55 - s.condition) / 55) * 0.12 * diff;
        if (rng() < p * dt) {
          spawnCrowd(state, s, 8 + Math.floor(rng() * 7), 30);
          say(state, s.name + ': students blockade the entrance.');
        }
      }
    }

    for (j = 0; j < state.shops.length; j++) {
      state.shops[j].hit = false;
    }

    // Crowds.
    for (i = 0; i < state.crowds.length; i++) {
      c = state.crowds[i];
      s = state.schools[c.schoolId];
      c.age += dt;
      var grievance = 1 - s.condition / 100;
      var atSquare = dist(c.x, c.y, c.tx, c.ty) < 12;
      c.anger = clamp(c.anger + (-0.3 + grievance * 3.2 + (atSquare ? 2.5 : 0)) * dt, 0, 100);

      if (c.slow > 0) {
        c.slow -= dt;
      } else if (!atSquare) {
        var speed = 10 + c.anger * 0.25;
        var dx = c.tx - c.x;
        var dy = c.ty - c.y;
        var len = Math.hypot(dx, dy) || 1;
        c.x += (dx / len) * speed * dt;
        c.y += (dy / len) * speed * dt;
      }

      if (c.anger <= 4 && c.age > 5) {
        c.dead = true;
        state.calm = Math.min(100, state.calm + 1);
        say(state, 'A crowd drifts home.');
        continue;
      }

      if (c.anger > 70) {
        c.fireTimer -= dt;
        if (c.fireTimer <= 0) {
          spawnFire(state, c.x, c.y);
          c.fireTimer = (5 + rng() * 4) / Math.sqrt(diff);
        }
      }

      if (c.anger > 55) {
        var sizeFactor = clamp(c.size / 10, 0.6, 1.6);
        for (j = 0; j < state.shops.length; j++) {
          shop = state.shops[j];
          if (shop.shield > 0 || dist(c.x, c.y, shop.x, shop.y) > 90) {
            continue;
          }
          shop.health -= ((c.anger - 50) / 50) * 5 * sizeFactor * dt;
          shop.hit = true;
        }
      }
    }
    state.crowds = state.crowds.filter(function (crowd) {
      return !crowd.dead;
    });

    // Fires.
    for (i = 0; i < state.fires.length; i++) {
      f = state.fires[i];
      f.age += dt;
      if (f.age > 8) {
        for (j = 0; j < state.shops.length; j++) {
          shop = state.shops[j];
          if (shop.shield > 0 || dist(f.x, f.y, shop.x, shop.y) > 90) {
            continue;
          }
          shop.health -= 4 * (1 + Math.min(1.5, f.age / 15)) * dt;
          shop.hit = true;
        }
      }
    }

    // Shops: shields, regeneration, looting.
    for (j = 0; j < state.shops.length; j++) {
      shop = state.shops[j];
      shop.shield = Math.max(0, shop.shield - dt);
      if (shop.health <= 0 && !shop.looted) {
        shop.looted = true;
        shop.health = 0;
        state.calm = Math.max(0, state.calm - 5);
        state.stats.looted++;
        say(state, shop.name + ' has been ransacked.');
      }
      if (!shop.hit) {
        shop.health = Math.min(100, shop.health + 1.2 * dt);
      }
      if (shop.looted && shop.health >= 25) {
        shop.looted = false;
      }
    }

    // Calm meter.
    var drain = 0;
    var angryCrowds = 0;
    for (i = 0; i < state.crowds.length; i++) {
      c = state.crowds[i];
      if (c.anger > 35) {
        angryCrowds++;
        drain += ((c.anger - 35) / 65) * (c.size / 10) * 0.8;
      }
    }
    for (i = 0; i < state.fires.length; i++) {
      drain += 0.45 * (1 + Math.min(1.5, state.fires[i].age / 15));
    }
    for (j = 0; j < state.shops.length; j++) {
      if (state.shops[j].health < 60) {
        drain += ((60 - state.shops[j].health) / 60) * 0.12;
      }
    }
    var recover = 0.5 * (average(state.schools, 'condition') / 100);
    if (angryCrowds === 0 && state.fires.length === 0) {
      recover += 0.4;
    }
    state.calm = clamp(state.calm + (recover - drain) * dt, 0, 100);
    if (state.calm <= 0) {
      finish(state, 'lost');
    }
  }

  // ---- Target lookup ----

  function crowdRadius(crowd) {
    return 14 + crowd.size * 1.3;
  }

  function schoolAt(state, x, y) {
    for (var i = 0; i < state.schools.length; i++) {
      var s = state.schools[i];
      if (Math.abs(x - s.x) <= s.w / 2 + 8 && Math.abs(y - s.y) <= s.h / 2 + 8) {
        return s;
      }
    }
    return null;
  }

  function shopAt(state, x, y) {
    for (var i = 0; i < state.shops.length; i++) {
      var s = state.shops[i];
      if (Math.abs(x - s.x) <= s.w / 2 + 8 && Math.abs(y - s.y) <= s.h / 2 + 8) {
        return s;
      }
    }
    return null;
  }

  function crowdAt(state, x, y) {
    var best = null;
    var bestDist = Infinity;
    for (var i = 0; i < state.crowds.length; i++) {
      var c = state.crowds[i];
      var d = dist(x, y, c.x, c.y);
      if (d <= crowdRadius(c) + 14 && d < bestDist) {
        best = c;
        bestDist = d;
      }
    }
    return best;
  }

  function fireAt(state, x, y) {
    var best = null;
    var bestDist = Infinity;
    for (var i = 0; i < state.fires.length; i++) {
      var f = state.fires[i];
      var d = dist(x, y, f.x, f.y);
      if (d <= 28 && d < bestDist) {
        best = f;
        bestDist = d;
      }
    }
    return best;
  }

  // ---- Player actions ----

  function fail(msg) {
    return { ok: false, msg: msg };
  }

  function pay(state, tool) {
    if (state.budget < COSTS[tool]) {
      return false;
    }
    state.budget -= COSTS[tool];
    return true;
  }

  function act(state, tool, x, y) {
    if (state.status !== 'playing') {
      return fail('');
    }
    var target;
    var i;
    if (tool === 'repair') {
      target = schoolAt(state, x, y);
      if (!target) {
        return fail('Click a school to repair it.');
      }
      if (target.condition >= 98) {
        return fail(target.name + ' is already in good shape.');
      }
      if (!pay(state, tool)) {
        return fail('Not enough budget.');
      }
      target.condition = Math.min(100, target.condition + 35);
      for (i = 0; i < state.crowds.length; i++) {
        if (state.crowds[i].schoolId === target.id) {
          state.crowds[i].anger = Math.max(0, state.crowds[i].anger - 12);
        }
      }
      state.calm = Math.min(100, state.calm + 1.5);
      state.stats.repairs++;
      return { ok: true, msg: target.name + ' repaired.' };
    }
    if (tool === 'mediate') {
      target = crowdAt(state, x, y);
      if (!target) {
        return fail('Click a crowd to talk to it.');
      }
      if (!pay(state, tool)) {
        return fail('Not enough budget.');
      }
      target.anger = Math.max(0, target.anger - 40);
      target.slow = 5;
      target.size = Math.max(4, target.size - 1);
      state.stats.mediations++;
      if (target.anger < 10) {
        target.dead = true;
        state.crowds = state.crowds.filter(function (crowd) {
          return !crowd.dead;
        });
        state.calm = Math.min(100, state.calm + 2);
        return { ok: true, msg: 'The crowd disperses peacefully.' };
      }
      return { ok: true, msg: 'Talks calmed the crowd.' };
    }
    if (tool === 'extinguish') {
      target = fireAt(state, x, y);
      if (!target) {
        return fail('Click a fire to put it out.');
      }
      if (!pay(state, tool)) {
        return fail('Not enough budget.');
      }
      state.fires = state.fires.filter(function (fire) {
        return fire !== target;
      });
      state.calm = Math.min(100, state.calm + 0.8);
      state.stats.extinguished++;
      return { ok: true, msg: 'Fire put out.' };
    }
    if (tool === 'shield') {
      target = shopAt(state, x, y);
      if (!target) {
        return fail('Click a shop to protect it.');
      }
      if (!pay(state, tool)) {
        return fail('Not enough budget.');
      }
      target.shield = 12;
      return { ok: true, msg: target.name + ' is protected for 12 seconds.' };
    }
    if (tool === 'police') {
      target = crowdAt(state, x, y);
      if (!target) {
        return fail('Click a crowd to break it up.');
      }
      if (!pay(state, tool)) {
        return fail('Not enough budget.');
      }
      target.dead = true;
      state.crowds = state.crowds.filter(function (crowd) {
        return !crowd.dead;
      });
      for (i = 0; i < state.crowds.length; i++) {
        state.crowds[i].anger = Math.min(100, state.crowds[i].anger + 15);
      }
      state.schools[target.schoolId].condition = Math.max(0, state.schools[target.schoolId].condition - 5);
      state.calm = Math.max(0, state.calm - 3);
      state.stats.police++;
      say(state, 'Police broke up a crowd, but the mood elsewhere turned sour.');
      return { ok: true, msg: 'Crowd dispersed by force. Other crowds are angrier.' };
    }
    return fail('Unknown tool.');
  }

  var api = {
    WIDTH: WIDTH,
    HEIGHT: HEIGHT,
    DAY_LENGTH: DAY_LENGTH,
    TOTAL_DAYS: TOTAL_DAYS,
    SQUARE: SQUARE,
    MAX_BUDGET: MAX_BUDGET,
    COSTS: COSTS,
    createState: createState,
    update: update,
    act: act,
    crowdRadius: crowdRadius,
    schoolAt: schoolAt,
    shopAt: shopAt,
    crowdAt: crowdAt,
    fireAt: fireAt
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.SquareLogic = api;
})(typeof window !== 'undefined' ? window : globalThis);
