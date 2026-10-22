/*
 * Upside-Down Roadster: pure game physics and level data.
 * No DOM access here, so it can be tested in Node.
 *
 * World units are pixels. The road surface is y = 0, "up" is negative y.
 * The car has three movement modes:
 *   ground  - follows the terrain with a signed speed along the surface
 *   rails   - follows the circular curl ramp (kinematic, loses contact when
 *             the normal force would become negative)
 *   air     - free flight with gravity, air jets and rigid rotation
 */
(function (root) {
  'use strict';

  var G = 800;            // gravity, px/s^2
  var H0 = 20;            // ride height of the car origin above the surface
  var DT = 1 / 240;       // fixed physics step
  var SPIN_ACC = 16;      // rad/s^2 from the spin jets
  var MAX_W = 9;          // max rotation speed, rad/s
  var JET_ACC = 1450;     // lift jet acceleration, px/s^2
  var FUEL_LIFT = 0.26;   // tank per second while the lift jets burn
  var FUEL_SPIN = 0.05;   // tank per second while spinning
  var FUEL_GYRO = 0.04;   // tank per second while stabilising
  var HARD_IMPACT = 1050; // landing normal speed that wrecks the car

  // Points on the car in local coordinates (x forward, y down).
  var LAND_PTS = [[-36, H0], [36, H0], [62, 4], [-62, 4]];
  var ROOF_PTS = [[-26, -22], [26, -22], [0, -25], [-50, -8], [50, -8]];
  var ALL_PTS = LAND_PTS.concat(ROOF_PTS);

  var LEVEL_DEFS = [
    { name: 'Warm-up Lap',  cars: 3, free: 560, tank: 1.00, tol: 0.78 },
    { name: 'Night Market', cars: 4, free: 520, tank: 1.00, tol: 0.72 },
    { name: 'Neon Alley',   cars: 5, free: 500, tank: 0.90, tol: 0.68 },
    { name: 'Rush Hour',    cars: 6, free: 480, tank: 0.85, tol: 0.64 },
    { name: 'Traffic Jam',  cars: 7, free: 470, tank: 0.80, tol: 0.60 },
    { name: 'Grand Finale', cars: 8, free: 460, tank: 0.75, tol: 0.56 }
  ];

  var CAR_TYPES = [
    { type: 'hatch', ch: 44 },
    { type: 'sedan', ch: 40 },
    { type: 'van',   ch: 58 },
    { type: 'coupe', ch: 36 },
    { type: 'hatch', ch: 44 },
    { type: 'sedan', ch: 40 },
    { type: 'van',   ch: 58 },
    { type: 'coupe', ch: 36 }
  ];
  var CAR_COLORS = ['#3da5d9', '#f2c14e', '#7bc950', '#e8e8e8', '#9b5de5', '#f78154', '#2ec4b6', '#bdbdbd'];

  function wrap(a) {
    a = (a + Math.PI) % (2 * Math.PI);
    if (a < 0) a += 2 * Math.PI;
    return a - Math.PI;
  }

  function approach(v, target, amount) {
    if (v < target) return Math.min(target, v + amount);
    return Math.max(target, v - amount);
  }

  // ---------------------------------------------------------------- levels
  function buildLevel(index) {
    var d = LEVEL_DEFS[index];
    var n = d.cars;
    var lv = {
      index: index,
      name: d.name,
      N: n,
      R: 120,
      thEnd: Math.PI + 0.35,
      kH: 85,
      kLen: 240,
      tol: d.tol,
      tank: d.tank,
      startX: 80
    };
    lv.xK = lv.startX + 800 + 140 * (n - 3);
    lv.xLip = lv.xK + lv.kLen;
    lv.xc0 = lv.xLip + 70;
    lv.cars = [];
    for (var i = 0; i < n; i++) {
      var t = CAR_TYPES[(i + index) % CAR_TYPES.length];
      lv.cars.push({
        cx: lv.xc0 + 60 + i * 138,
        w: 120,
        ch: t.ch,
        type: t.type,
        color: CAR_COLORS[(i * 3 + index) % CAR_COLORS.length]
      });
    }
    lv.xc1 = lv.xc0 + n * 138 - 18;
    lv.xr = lv.xc1 + d.free;
    lv.xEnd = lv.xr + lv.R + 260;
    lv.pickups = [];
    return lv;
  }

  function terrainY(lv, x) {
    var u = (x - lv.xK) / lv.kLen;
    if (u > 0 && u <= 1) return -lv.kH * Math.pow(u, 1.8);
    return 0;
  }

  function terrainSlope(lv, x) {
    var u = (x - lv.xK) / lv.kLen;
    if (u > 0 && u <= 1) return -lv.kH * 1.8 * Math.pow(u, 0.8) / lv.kLen;
    return 0;
  }

  function hitParked(lv, wx, wy) {
    if (wy > 6) return false;
    for (var i = 0; i < lv.cars.length; i++) {
      var c = lv.cars[i];
      if (wx > c.cx - c.w / 2 && wx < c.cx + c.w / 2 && wy > -c.ch) return true;
    }
    return false;
  }

  // ------------------------------------------------------------------- car
  function newCar(lv) {
    return {
      mode: 'ground', x: lv.startX, y: -H0, a: 0, w: 0, vx: 0, vy: 0, s: 0,
      sigma: 0, sag: 0, sagV: 0, fuel: lv.tank, flight: 0, rot: 0, stage: 0,
      autoBrake: false, grace: 0, cause: '', t: 0, maxAlt: 0, jets: 0, spin: 0, gyro: 0
    };
  }

  function worldPoint(c, p) {
    var ca = Math.cos(c.a), sa = Math.sin(c.a);
    return [c.x + p[0] * ca - p[1] * sa, c.y + p[0] * sa + p[1] * ca];
  }

  function crash(c, cause, ev) {
    c.mode = 'crashed';
    c.cause = cause;
    c.vx = c.vx || 0;
    ev.push({ type: 'crash', cause: cause });
  }

  function softCap(s) {
    if (s < 1250) return 1;
    return Math.max(0, (1300 - s) / 50);
  }

  function stepGround(c, inp, dt, lv, ev) {
    var t = terrainSlope(lv, c.x);
    var n = Math.sqrt(1 + t * t);
    var s = c.s;
    var acc = G * t / n;

    if (c.autoBrake) {
      s = approach(s, 0, 1700 * dt);
    } else {
      if (inp.right) acc += s < 0 ? 900 : 620 * softCap(s);
      if (inp.down) {
        s = approach(s, 0, 1500 * dt);
      } else if (inp.left) {
        if (s > 5) s = approach(s, 0, 1500 * dt);
        else if (s > -260) acc -= 420;
      }
    }
    acc -= 0.08 * s;
    s += acc * dt;

    var vx = s / n, vy = s * t / n;
    var nx = c.x + vx * dt;
    var y0 = terrainY(lv, c.x);
    var yb = y0 + vy * dt + 0.5 * G * dt * dt;
    var ty = terrainY(lv, nx);
    c.s = s;

    if (ty > yb + 0.4) {
      // The ground falls away faster than free fall: take off.
      c.mode = 'air';
      c.x = nx;
      c.y = y0 - H0 + vy * dt + c.sag;
      c.vx = vx;
      c.vy = vy;
      c.w = 0;
      c.a = wrap(c.a);
      c.rot = 0;
      c.flight = 1;
      c.grace = 0.15;
      c.maxAlt = 0;
      if (c.stage === 0) c.stage = 1;
      ev.push({ type: 'launch', speed: Math.sqrt(vx * vx + vy * vy) });
      return;
    }

    c.x = nx;
    if (c.x < 40) { c.x = 40; if (c.s < 0) c.s = 0; }
    c.y = terrainY(lv, c.x) - H0 + c.sag;
    c.sagV += (-170 * c.sag - 13 * c.sagV) * dt;
    c.sag += c.sagV * dt;
    var th = Math.atan(terrainSlope(lv, c.x));
    var d = wrap(th - c.a);
    c.w += (110 * d - 16 * c.w) * dt;
    c.a += c.w * dt;

    if (c.x >= lv.xr && c.s > 0 && c.stage < 5) {
      c.mode = 'rails';
      c.sigma = 0;
      c.stage = 3;
      ev.push({ type: 'curl', speed: c.s });
      return;
    }
    if (c.stage === 5 && Math.abs(c.s) < 12) {
      c.mode = 'done';
      c.s = 0;
      ev.push({ type: 'finish' });
    }
  }

  function placeOnRails(c, lv) {
    var th = c.sigma / lv.R;
    c.x = lv.xr + lv.R * Math.sin(th) - Math.sin(th) * H0;
    c.y = -lv.R * (1 - Math.cos(th)) - Math.cos(th) * H0;
    c.a = -th;
  }

  function stepRails(c, inp, dt, lv, ev) {
    var R = lv.R;
    var th = c.sigma / R;
    c.s += G * Math.sin(-th) * dt;
    c.sigma += c.s * dt;
    th = c.sigma / R;

    if (th < 0) {
      // Rolled back out of the curl.
      c.mode = 'ground';
      c.stage = 2;
      c.x = lv.xr - 1;
      c.y = -H0;
      c.a = 0;
      c.w = 0;
      c.sag = 0;
      c.sagV = 0;
      return;
    }
    var normal = c.s * c.s / R + G * Math.cos(th);
    placeOnRails(c, lv);
    c.rot = c.a;
    if (normal < 0 || th >= lv.thEnd) {
      var phi = -th;
      c.mode = 'air';
      c.vx = c.s * Math.cos(phi);
      c.vy = c.s * Math.sin(phi);
      c.w = -c.s / R;
      c.flight = 2;
      c.stage = 4;
      c.maxAlt = 0;
      ev.push({ type: 'loopexit', speed: c.s, early: normal < 0 && th < lv.thEnd });
    }
  }

  function stepAir(c, inp, dt, lv, ev) {
    var used = 0;
    var tq = 0;
    c.jets = 0; c.spin = 0; c.gyro = 0;
    if (c.fuel > 0) {
      if (inp.left) tq -= 1;
      if (inp.right) tq += 1;
      if (tq !== 0) {
        c.w += tq * SPIN_ACC * dt;
        used += FUEL_SPIN * dt;
        c.spin = tq;
      } else if (inp.down) {
        c.w *= Math.exp(-6 * dt);
        used += FUEL_GYRO * dt;
        c.gyro = 1;
      }
      if (inp.up) {
        c.vx += Math.sin(c.a) * JET_ACC * dt;
        c.vy += -Math.cos(c.a) * JET_ACC * dt;
        used += FUEL_LIFT * dt;
        c.jets = 1;
      }
    }
    c.fuel = Math.max(0, c.fuel - used);
    c.vy += G * dt;
    if (c.w > MAX_W) c.w = MAX_W;
    if (c.w < -MAX_W) c.w = -MAX_W;
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    c.a += c.w * dt;
    c.rot += c.w * dt;
    if (c.grace > 0) c.grace -= dt;
    if (-c.y > c.maxAlt) c.maxAlt = -c.y;

    if (c.flight === 1 && c.x > lv.xr + 8) { crash(c, 'curl', ev); return; }

    var roof = false, land = false;
    for (var i = 0; i < ALL_PTS.length; i++) {
      var p = worldPoint(c, ALL_PTS[i]);
      if (hitParked(lv, p[0], p[1])) { crash(c, 'car', ev); return; }
      if (!(c.flight === 1 && p[0] < lv.xLip + 6) && p[1] > terrainY(lv, p[0])) {
        if (i < LAND_PTS.length) land = true; else roof = true;
      }
    }
    if (!roof && !land) return;
    if (roof) { crash(c, 'flip', ev); return; }

    var slope = terrainSlope(lv, c.x);
    var n = Math.sqrt(1 + slope * slope);
    var delta = wrap(c.a - Math.atan(slope));
    var vn = (c.vy - c.vx * slope) / n;
    if (Math.abs(delta) > (c.flight === 1 ? Math.max(0.85, lv.tol) : lv.tol)) { crash(c, 'angle', ev); return; }
    if (vn > HARD_IMPACT) { crash(c, 'hard', ev); return; }

    c.mode = 'ground';
    c.s = (c.vx + c.vy * slope) / n;
    c.sag = Math.min(14, Math.max(0, vn * 0.022));
    c.sagV = 0;
    c.a = wrap(c.a);
    c.w *= 0.35;
    c.y = terrainY(lv, c.x) - H0;
    var flightNo = c.flight;
    ev.push({
      type: 'land', flight: flightNo, delta: delta, vn: vn,
      rot: c.rot, x: c.x, speed: c.s, fuel: c.fuel
    });
    if (flightNo === 1) {
      c.stage = 2;
    } else {
      c.stage = 5;
      c.autoBrake = true;
    }
    c.flight = 0;
  }

  var NO_INPUT = { left: false, right: false, up: false, down: false };

  function step(c, inp, dt, lv, ev) {
    if (c.mode === 'crashed' || c.mode === 'done') return;
    inp = inp || NO_INPUT;
    c.t += dt;
    if (c.mode === 'ground') stepGround(c, inp, dt, lv, ev);
    else if (c.mode === 'rails') stepRails(c, inp, dt, lv, ev);
    else if (c.mode === 'air') stepAir(c, inp, dt, lv, ev);

    if (c.mode === 'ground' || c.mode === 'air') {
      for (var i = 0; i < ALL_PTS.length; i++) {
        var p = worldPoint(c, ALL_PTS[i]);
        if (hitParked(lv, p[0], p[1])) { crash(c, 'car', ev); return; }
      }
    }
  }

  function cloneCar(c) {
    var o = {};
    for (var k in c) o[k] = c[k];
    return o;
  }

  // Run the car forward with no input to preview where it goes.
  // Stops at the next landing, a crash, the finish or maxT seconds.
  function simulate(lv, car, maxT, wantTrace) {
    var c = cloneCar(car);
    var ev = [];
    var trace = [];
    var steps = Math.floor((maxT || 8) / DT);
    var result = 'timeout';
    var landX = null;
    var startFlight = c.flight;
    for (var i = 0; i < steps; i++) {
      ev.length = 0;
      step(c, NO_INPUT, DT, lv, ev);
      if (wantTrace && i % 5 === 0) trace.push([c.x, c.y]);
      var done = false;
      for (var k = 0; k < ev.length; k++) {
        if (ev[k].type === 'crash') { result = 'crash'; done = true; }
        if (ev[k].type === 'land') { result = 'land'; landX = ev[k].x; done = true; }
        if (ev[k].type === 'finish') { result = 'land'; done = true; }
      }
      if (done) break;
      if (c.mode === 'ground' && c.stage === 2 && startFlight === 0 && car.stage === 2 && c.s < -5) {
        result = 'stall';
        break;
      }
    }
    if (wantTrace) trace.push([c.x, c.y]);
    return { result: result, cause: c.cause, trace: trace, car: c, landX: landX };
  }

  // Place stars and air canisters along sensible flight paths.
  function placePickups(lv) {
    var list = [];
    var best = null;
    // Flight 1: scan launch speeds for a clean landing and keep the middle one.
    var good = [];
    for (var v = 400; v <= 1400; v += 10) {
      var c = newCar(lv);
      c.mode = 'air';
      var th = Math.atan(terrainSlope(lv, lv.xLip - 0.01));
      c.x = lv.xLip + 1;
      c.y = -lv.kH - H0;
      c.a = th;
      c.vx = v * Math.cos(th);
      c.vy = v * Math.sin(th);
      c.flight = 1;
      c.stage = 1;
      c.grace = 0.15;
      var r = simulate(lv, c, 5, true);
      if (r.result === 'land') good.push({ v: v, r: r });
    }
    lv.jumpWindow = good.length ? [good[0].v, good[good.length - 1].v] : [0, 0];
    if (good.length) best = good[Math.floor(good.length / 2)].r;
    if (best && best.trace.length > 8) {
      var tr = best.trace;
      [0.2, 0.4, 0.6, 0.8].forEach(function (f, idx) {
        var p = tr[Math.floor(tr.length * f)];
        list.push({ x: p[0], y: p[1] - 60, kind: idx === 1 ? 'tank' : 'star', got: false });
      });
    }
    // Flight 2: coast through the curl at a mid speed.
    var good2 = [];
    for (var s0 = 600; s0 <= 1250; s0 += 10) {
      var c2 = newCar(lv);
      c2.mode = 'rails';
      c2.sigma = 0;
      c2.s = s0;
      c2.stage = 3;
      var r2 = simulate(lv, c2, 6, true);
      if (r2.result === 'land') good2.push({ s: s0, r: r2 });
    }
    lv.curlWindow = good2.length ? [good2[0].s, good2[good2.length - 1].s] : [0, 0];
    if (good2.length) {
      var tr2 = good2[Math.floor(good2.length / 2)].r.trace;
      [0.35, 0.7].forEach(function (f, idx) {
        var p = tr2[Math.floor(tr2.length * f)];
        list.push({ x: p[0], y: p[1] - 55, kind: idx === 1 ? 'tank' : 'star', got: false });
      });
    }
    lv.pickups = list;
  }

  var api = {
    G: G, H0: H0, DT: DT, LEVEL_DEFS: LEVEL_DEFS, LAND_PTS: LAND_PTS, ROOF_PTS: ROOF_PTS,
    ALL_PTS: ALL_PTS, wrap: wrap, buildLevel: buildLevel, terrainY: terrainY,
    terrainSlope: terrainSlope, newCar: newCar, step: step, simulate: simulate,
    cloneCar: cloneCar, placePickups: placePickups, worldPoint: worldPoint,
    placeOnRails: placeOnRails, NO_INPUT: NO_INPUT
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RR = api;
})(typeof window !== 'undefined' ? window : this);
