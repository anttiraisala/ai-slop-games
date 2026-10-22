/* Upside-Down Roadster: game flow, input, camera, particles and scoring. */
(function () {
  'use strict';
  var P = window.RR, R = window.RRRender, A = window.RRAudio;
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var overlay = document.getElementById('overlay');
  var ovTitle = document.getElementById('ov-title');
  var ovText = document.getElementById('ov-text');
  var ovBtn = document.getElementById('ov-btn');

  var keys = { left: false, right: false, up: false, down: false };
  var KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up', Space: 'up', ArrowDown: 'down', KeyS: 'down'
  };

  var g = {
    state: 'title', lv: null, car: null, cam: { x: 0, y: -100, zoom: 0.9 },
    parts: [], popups: [], ghost: null, score: 0, levelScore: 0, lives: 3,
    best: 0, showGhost: true, levelIndex: 0, countText: '', stateT: 0, shake: 0,
    frame: 0, summary: ''
  };
  try { g.best = parseInt(localStorage.getItem('rr-best') || '0', 10) || 0; } catch (e) { g.best = 0; }

  function saveBest() {
    var total = g.score + g.levelScore;
    if (total > g.best) {
      g.best = total;
      try { localStorage.setItem('rr-best', String(total)); } catch (e) { /* ignore */ }
    }
  }

  // ------------------------------------------------------------ overlays
  function showOverlay(title, text, btn) {
    ovTitle.textContent = title;
    ovText.innerHTML = text;
    ovBtn.textContent = btn;
    overlay.classList.remove('hidden');
  }
  function hideOverlay() { overlay.classList.add('hidden'); }

  function showTitle() {
    g.state = 'title';
    g.levelIndex = 0; g.score = 0; g.levelScore = 0; g.lives = 3;
    loadLevel(0, true);
    g.state = 'title';
    showOverlay('Upside-Down Roadster',
      'A red electric roadster. A kicker ramp, a row of parked cars and a giant curl that turns you <b>upside down</b>.<br><br>' +
      '<b>1.</b> Floor it and jump the parked cars.<br>' +
      '<b>2.</b> Hit the curl ramp fast enough to go over the top.<br>' +
      '<b>3.</b> Fire the air jets, flip back over and land on your wheels.<br><br>' +
      '<span class="keys"><b>Right / D</b> accelerate &nbsp; <b>Left / A</b> brake, reverse, spin<br>' +
      '<b>Up / W / Space</b> lift jets &nbsp; <b>Down / S</b> brake, stabilise</span>',
      'Start (Enter)');
  }

  // --------------------------------------------------------------- levels
  function loadLevel(i, quiet) {
    g.levelIndex = i;
    g.lv = P.buildLevel(i);
    P.placePickups(g.lv);
    g.car = P.newCar(g.lv);
    g.parts = []; g.popups = []; g.ghost = null; g.levelScore = 0; g.shake = 0;
    g.cam.x = g.car.x + 200; g.cam.y = -100; g.cam.zoom = 0.9;
    g.stateT = 0;
    if (!quiet) { g.state = 'ready'; g.countText = '3'; A.sfx('beep'); }
  }

  // ------------------------------------------------------------ particles
  function emit(x, y, vx, vy, life, size, color, extra) {
    var p = { x: x, y: y, vx: vx, vy: vy, life: life, max: life, size: size, color: color, kind: 'dot', grow: false, rot: 0, vr: 0 };
    if (extra) for (var k in extra) p[k] = extra[k];
    if (g.parts.length < 900) g.parts.push(p);
  }

  function explosion(c) {
    for (var i = 0; i < 90; i++) {
      var a = Math.random() * Math.PI * 2, sp = 80 + Math.random() * 520;
      var col = ['#ff7a1a', '#ffd23f', '#ff3b1a', '#555', '#ddd'][Math.floor(Math.random() * 5)];
      emit(c.x, c.y, Math.cos(a) * sp, Math.sin(a) * sp - 150, 0.7 + Math.random() * 1.1, 3 + Math.random() * 9, col, { grav: 600, grow: i % 3 === 0 });
    }
    for (var j = 0; j < 14; j++) {
      emit(c.x, c.y, (Math.random() - 0.5) * 500, -Math.random() * 500, 1.6, 5 + Math.random() * 5, '#c8202a', { grav: 900, kind: 'confetti', rot: 0, vr: (Math.random() - 0.5) * 14 });
    }
  }

  function confetti() {
    var c = g.car;
    for (var i = 0; i < 120; i++) {
      var col = ['#ff4a4a', '#ffd23f', '#4cc9ff', '#7dffb0', '#c77dff'][i % 5];
      emit(c.x + (Math.random() - 0.5) * 300, c.y - 200 - Math.random() * 200, (Math.random() - 0.5) * 200, 50 + Math.random() * 120, 2.4 + Math.random(), 4, col,
        { grav: 160, kind: 'confetti', rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10 });
    }
  }

  function popup(text, color, pts) {
    g.popups.push({ text: text + (pts ? '  +' + pts : ''), color: color || '#fff', life: 1.8 });
    if (g.popups.length > 4) g.popups.shift();
    if (pts) g.levelScore += pts;
    A.sfx(pts ? 'bonus' : 'beep');
  }

  // -------------------------------------------------------------- events
  function landingQuality(d) {
    var a = Math.abs(d);
    if (a < 0.2) return ['PERFECT LANDING', 400];
    if (a < 0.45) return ['SMOOTH LANDING', 200];
    return ['ROUGH LANDING', 100];
  }

  function handle(e) {
    var c = g.car, lv = g.lv;
    if (e.type === 'launch') {
      A.sfx('launch');
      for (var i = 0; i < 20; i++) emit(c.x - 30, c.y + 20, -100 - Math.random() * 200, -Math.random() * 120, 0.5, 5, '#ffe0a0', { grav: 300 });
    } else if (e.type === 'land') {
      A.sfx('land');
      g.shake = Math.min(14, e.vn * 0.015);
      for (var k = 0; k < 26; k++) emit(c.x, c.y + 18, (Math.random() - 0.5) * 420 + e.speed * 0.2, -Math.random() * 260, 0.6, 4, k % 2 ? '#ffd23f' : '#fff', { grav: 700 });
      if (e.flight === 1) {
        var flips = Math.floor(Math.abs(e.rot) / (Math.PI * 2) + 0.2);
        popup('CARS CLEARED', '#7dffb0', 100 * lv.N);
        if (flips > 0) popup(flips + 'x FLIP', '#ffd23f', 500 * flips);
        var q = landingQuality(e.delta);
        popup(q[0], '#fff', Math.round(q[1] / 2));
      } else {
        var loops = Math.round(Math.abs(e.rot) / (Math.PI * 2));
        if (loops >= 1) popup('FULL LOOP', '#ff9bd0', 1000);
        if (loops > 1) popup((loops - 1) + 'x EXTRA FLIP', '#ffd23f', 750 * (loops - 1));
        var q2 = landingQuality(e.delta);
        popup(q2[0], '#fff', q2[1]);
        if (e.x < lv.xc0) popup('OVER THE CARS AGAIN!', '#4cc9ff', 2000);
      }
    } else if (e.type === 'curl') {
      popup('CURL!', '#c77dff', 0);
    } else if (e.type === 'loopexit') {
      popup(e.early ? 'LOST CONTACT!' : 'UPSIDE DOWN!', '#c77dff', e.early ? 0 : 300);
    } else if (e.type === 'finish') {
      var shave = (c.x - 60) - lv.xc1;
      if (shave < 60 && shave > 0) popup('CLOSE SHAVE', '#ff9bd0', 300);
      var fuelBonus = Math.round(c.fuel * 1000);
      if (fuelBonus > 0) popup('AIR LEFT', '#4cc9ff', fuelBonus);
      g.levelScore += 500;
      g.state = 'finishing';
      g.stateT = 0;
      A.sfx('win');
      confetti();
    } else if (e.type === 'crash') {
      A.sfx('crash');
      explosion(c);
      g.shake = 18;
      g.state = 'crashed';
      g.stateT = 0;
      g.lives--;
      var msg = { car: 'SMASHED INTO A PARKED CAR', angle: 'BAD LANDING ANGLE', flip: 'LANDED ON THE ROOF', hard: 'TOO HARD AN IMPACT', curl: 'OVERSHOT INTO THE CURL' }[e.cause] || 'CRASH';
      g.popups = [{ text: msg, color: '#ff6464', life: 2.4 }];
    }
  }

  // ---------------------------------------------------------------- loop
  function update(dt) {
    g.frame++;
    var c = g.car, lv = g.lv;
    g.stateT += dt;

    if (g.state === 'ready') {
      var n = 3 - Math.floor(g.stateT / 0.8);
      var txt = n > 0 ? String(n) : 'GO!';
      if (txt !== g.countText) { g.countText = txt; A.sfx(n > 0 ? 'beep' : 'go'); }
      if (g.stateT > 2.6) { g.state = 'play'; }
    }

    if (g.state === 'play' || g.state === 'finishing') {
      var inp = g.state === 'play' ? keys : P.NO_INPUT;
      var ev = [];
      var steps = Math.max(1, Math.round(dt / P.DT));
      for (var i = 0; i < steps; i++) {
        P.step(c, inp, P.DT, lv, ev);
        if (ev.length) { for (var k = 0; k < ev.length; k++) handle(ev[k]); ev.length = 0; }
        if (c.mode === 'crashed' || c.mode === 'done') break;
      }
      // pickups
      for (var j = 0; j < lv.pickups.length; j++) {
        var p = lv.pickups[j];
        if (!p.got && Math.hypot(p.x - c.x, p.y - c.y) < 44) {
          p.got = true;
          if (p.kind === 'star') { popup('STAR', '#ffd23f', 100); A.sfx('star'); }
          else { c.fuel = Math.min(1, c.fuel + 0.3); popup('AIR REFILL', '#4cc9ff', 50); A.sfx('tank'); }
          for (var q = 0; q < 14; q++) emit(p.x, p.y, (Math.random() - 0.5) * 300, (Math.random() - 0.5) * 300, 0.5, 5, p.kind === 'star' ? '#ffd23f' : '#4cc9ff', {});
        }
      }
      // jet / dust particles
      if (c.mode === 'air' && g.state === 'play') {
        var ca = Math.cos(c.a), sa = Math.sin(c.a);
        if (c.jets) {
          [-30, 30].forEach(function (nx) {
            var wx = c.x + nx * ca - 18 * sa, wy = c.y + nx * sa + 18 * ca;
            emit(wx, wy, -sa * -300 + c.vx * 0.3 + (Math.random() - 0.5) * 60, ca * 300 + c.vy * 0.3, 0.4, 7, 'rgba(210,235,255,0.9)', { grow: true });
          });
        }
        if (c.spin) {
          // clockwise (+1): nose pushed down, tail pushed up
          var sgn = c.spin;
          var noseX = c.x + 60 * ca - 0 * sa, noseY = c.y + 60 * sa;
          var tailX = c.x - 60 * ca, tailY = c.y - 60 * sa;
          var up = [sa, -ca];
          emit(noseX, noseY, up[0] * 260 * sgn + c.vx * 0.4, up[1] * 260 * sgn + c.vy * 0.4, 0.3, 5, 'rgba(255,255,255,0.85)', { grow: true });
          emit(tailX, tailY, -up[0] * 260 * sgn + c.vx * 0.4, -up[1] * 260 * sgn + c.vy * 0.4, 0.3, 5, 'rgba(255,255,255,0.85)', { grow: true });
        }
      }
      if (c.mode === 'ground' && Math.abs(c.s) > 350 && g.frame % 2 === 0 && keys.right) {
        emit(c.x - 40, c.y + 20, -c.s * 0.1 - Math.random() * 60, -Math.random() * 40, 0.5, 6, 'rgba(180,170,200,0.5)', { grow: true });
      }
      // audio
      var spd = c.mode === 'air' ? Math.hypot(c.vx, c.vy) : Math.abs(c.s);
      A.setEngine(Math.min(1, spd / 1200), c.mode !== 'air' && c.mode !== 'crashed' && g.state === 'play');
      A.setJet(c.mode === 'air' && (c.jets || c.spin || c.gyro) ? (c.jets ? 1 : 0.35) : 0);
    } else {
      A.setEngine(0, false); A.setJet(0);
    }

    if (g.state === 'crashed' && g.stateT > 1.9) {
      saveBest();
      if (g.lives > 0) loadLevel(g.levelIndex);
      else {
        g.state = 'over';
        showOverlay('Out of cars', 'The stunt crew ran out of roadsters.<br><br>Final score: <b>' + g.score + '</b><br>Best: <b>' + g.best + '</b>', 'Play again (Enter)');
      }
    }
    if (g.state === 'finishing' && g.stateT > 1.8) {
      g.score += g.levelScore;
      g.levelScore = 0;
      saveBest();
      g.state = 'clear';
      if (g.levelIndex >= P.LEVEL_DEFS.length - 1) {
        g.state = 'win';
        showOverlay('Stunt legend!', 'All ' + P.LEVEL_DEFS.length + ' stunts done. Final score: <b>' + g.score + '</b><br>Best: <b>' + g.best + '</b>', 'Play again (Enter)');
      } else {
        g.lives = Math.min(5, g.lives + 1);
        showOverlay('Level ' + (g.levelIndex + 1) + ' cleared!', 'Score: <b>' + g.score + '</b><br>+1 spare roadster (lives: ' + g.lives + ')<br>Next: ' + P.LEVEL_DEFS[g.levelIndex + 1].name + ' with ' + P.LEVEL_DEFS[g.levelIndex + 1].cars + ' cars.', 'Next level (Enter)');
      }
    }

    // particles
    for (var pi = g.parts.length - 1; pi >= 0; pi--) {
      var pp = g.parts[pi];
      pp.life -= dt;
      if (pp.life <= 0) { g.parts.splice(pi, 1); continue; }
      if (pp.grav) pp.vy += pp.grav * dt;
      pp.x += pp.vx * dt; pp.y += pp.vy * dt;
      pp.rot += pp.vr * dt;
      if (pp.y > 0 && pp.grav) { pp.y = 0; pp.vy *= -0.3; pp.vx *= 0.7; }
    }
    for (var po = g.popups.length - 1; po >= 0; po--) {
      g.popups[po].life -= dt;
      if (g.popups[po].life <= 0) g.popups.splice(po, 1);
    }

    // trajectory preview
    if (g.state === 'play' && g.showGhost && c.mode === 'ground' && (c.stage === 0 || c.stage === 2) && Math.abs(c.s) > 40) {
      if (g.frame % 3 === 0) {
        var sim = P.simulate(lv, c, 7, true);
        g.ghost = sim.result === 'timeout' ? null : sim;
      }
    } else if (!(g.state === 'play' && c.mode === 'ground')) {
      g.ghost = null;
    } else if (!(Math.abs(c.s) > 40)) {
      g.ghost = null;
    }

    // camera
    var vel = c.mode === 'air' ? c.vx : c.s;
    var alt = Math.max(0, -c.y - 20);
    var tx = c.x + Math.max(-1000, Math.min(1000, vel)) * 0.2;
    var ty = Math.min(-100, c.y * 0.7 - 50);
    var tz = 0.92 - Math.min(1, alt / 480) * 0.28;
    var k2 = Math.min(1, dt * 4);
    g.cam.x += (tx - g.cam.x) * Math.min(1, dt * 5);
    g.cam.y += (ty - g.cam.y) * k2;
    g.cam.zoom += (tz - g.cam.zoom) * Math.min(1, dt * 2.5);
    g.shake = Math.max(0, g.shake - dt * 30);
  }

  function render(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, R.W, R.H);
    ctx.save();
    if (g.shake > 0.2) ctx.translate((Math.random() - 0.5) * g.shake, (Math.random() - 0.5) * g.shake);
    R.drawWorld(ctx, g, t);
    ctx.restore();
    R.drawHUD(ctx, g, t);
  }

  var last = 0, acc = 0;
  function frame(ts) {
    var now = ts / 1000;
    var dt = Math.min(0.05, now - last || 0.016);
    last = now;
    update(dt);
    render(now);
    requestAnimationFrame(frame);
  }

  // --------------------------------------------------------------- input
  function startPressed() {
    A.init();
    if (g.state === 'title' || g.state === 'over' || g.state === 'win') {
      g.score = 0; g.lives = 3;
      hideOverlay();
      loadLevel(0);
    } else if (g.state === 'clear') {
      hideOverlay();
      loadLevel(g.levelIndex + 1);
    }
  }

  window.addEventListener('keydown', function (e) {
    var k = KEYMAP[e.code];
    if (k) { keys[k] = true; e.preventDefault(); A.init(); }
    if (e.code === 'Enter' || (e.code === 'Space' && !overlay.classList.contains('hidden'))) { e.preventDefault(); if (!overlay.classList.contains('hidden')) startPressed(); }
    if (e.code === 'KeyR' && (g.state === 'play' || g.state === 'crashed' || g.state === 'ready')) {
      if (g.state === 'play') { g.lives = Math.max(1, g.lives - 0); }
      loadLevel(g.levelIndex);
    }
    if (e.code === 'KeyT') g.showGhost = !g.showGhost;
    if (e.code === 'KeyM') A.toggleMute();
  });
  window.addEventListener('keyup', function (e) {
    var k = KEYMAP[e.code];
    if (k) { keys[k] = false; e.preventDefault(); }
  });
  window.addEventListener('blur', function () { for (var k in keys) keys[k] = false; });
  ovBtn.addEventListener('click', startPressed);

  Array.prototype.forEach.call(document.querySelectorAll('#touch button'), function (b) {
    var key = b.getAttribute('data-key');
    function on(e) { e.preventDefault(); keys[key] = true; A.init(); }
    function off(e) { e.preventDefault(); keys[key] = false; }
    b.addEventListener('pointerdown', on);
    b.addEventListener('pointerup', off);
    b.addEventListener('pointerleave', off);
    b.addEventListener('pointercancel', off);
  });

  // Test hook for automated checks.
  window.__rr = { g: g, keys: keys, startPressed: startPressed, loadLevel: loadLevel };

  showTitle();
  requestAnimationFrame(frame);
})();
