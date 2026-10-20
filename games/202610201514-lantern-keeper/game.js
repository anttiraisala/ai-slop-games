(function () {
  var cv = document.getElementById('c'), ctx = cv.getContext('2d');
  var W = cv.width, H = cv.height, msg = document.getElementById('msg');
  var tEl = document.getElementById('t'), oEl = document.getElementById('o');
  var DURATION = 90;
  var keys = {}, state = 'title', p, drops, shadows, time, oil, spawnT, dropT, best = 0;

  function reset() {
    p = { x: W / 2, y: H / 2, vx: 0, vy: 0 };
    drops = []; shadows = []; time = 0; oil = 100; spawnT = 0; dropT = 0;
    for (var i = 0; i < 4; i++) addDrop();
  }
  function addDrop() {
    drops.push({ x: 30 + Math.random() * (W - 60), y: 40 + Math.random() * (H - 70) });
  }
  function addShadow() {
    var s = Math.random() * 4 | 0, x, y;
    if (s == 0) { x = -20; y = Math.random() * H; }
    else if (s == 1) { x = W + 20; y = Math.random() * H; }
    else if (s == 2) { x = Math.random() * W; y = -20; }
    else { x = Math.random() * W; y = H + 20; }
    shadows.push({ x: x, y: y, sp: 45 + Math.random() * 25 + time * 0.6 });
  }
  function radius() { return 50 + oil * 1.5; }

  function show(text) { msg.textContent = text; msg.className = ''; }
  function start() { reset(); state = 'play'; msg.className = 'hidden'; }

  function update(dt) {
    var ax = (keys.ArrowRight || keys.d || 0) - (keys.ArrowLeft || keys.a || 0);
    var ay = (keys.ArrowDown || keys.s || 0) - (keys.ArrowUp || keys.w || 0);
    var len = Math.hypot(ax, ay) || 1;
    p.vx += ax / len * 900 * dt; p.vy += ay / len * 900 * dt;
    p.vx *= 0.88; p.vy *= 0.88;
    p.x = Math.max(8, Math.min(W - 8, p.x + p.vx * dt));
    p.y = Math.max(8, Math.min(H - 8, p.y + p.vy * dt));
    time += dt;
    oil -= dt * (1.6 + time * 0.03);
    spawnT -= dt;
    if (spawnT <= 0) { addShadow(); spawnT = Math.max(0.5, 2.2 - time * 0.017); }
    dropT -= dt;
    if (dropT <= 0 && drops.length < 5) { addDrop(); dropT = 2.5; }
    var R = radius();
    for (var i = drops.length - 1; i >= 0; i--) {
      if (Math.hypot(drops[i].x - p.x, drops[i].y - p.y) < 18) {
        drops.splice(i, 1); oil = Math.min(100, oil + 18);
      }
    }
    for (i = shadows.length - 1; i >= 0; i--) {
      var s = shadows[i], dx = p.x - s.x, dy = p.y - s.y, d = Math.hypot(dx, dy) || 1;
      if (d < R * 0.6) { // light scares them: they flee when close
        s.x -= dx / d * s.sp * 1.4 * dt; s.y -= dy / d * s.sp * 1.4 * dt;
        if (d < R * 0.35) { shadows.splice(i, 1); continue; } // burned away
      } else { s.x += dx / d * s.sp * dt; s.y += dy / d * s.sp * dt; }
      if (d < 14) return end(false, 'A shadow snuffed your flame.');
    }
    if (oil <= 0) return end(false, 'Your lantern ran dry.');
    if (time >= DURATION) return end(true, 'Dawn breaks. You kept the light alive!');
  }
  function end(win, text) {
    state = 'over';
    var t = Math.min(time, DURATION);
    if (t > best) best = t;
    show((win ? 'YOU WIN\n' : 'GAME OVER\n') + text + '\nSurvived ' + t.toFixed(1) + 's  (best ' + best.toFixed(1) + 's)\n\nClick or press Space to play again');
  }

  function draw() {
    var R = radius();
    ctx.fillStyle = '#04050a'; ctx.fillRect(0, 0, W, H);
    // lit area
    ctx.save();
    ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, 7); ctx.clip();
    var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R);
    g.addColorStop(0, '#5a4524'); g.addColorStop(1, '#0a0a10');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.restore();
    // oil drops glow faintly everywhere
    drops.forEach(function (d) {
      ctx.fillStyle = '#ffb347'; ctx.globalAlpha = 0.45 + 0.35 * Math.sin(performance.now() / 200 + d.x);
      ctx.beginPath(); ctx.arc(d.x, d.y, 7, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    });
    // shadows
    shadows.forEach(function (s) {
      var lit = Math.hypot(s.x - p.x, s.y - p.y) < R;
      ctx.fillStyle = lit ? '#2a1a3a' : '#150d1f';
      ctx.beginPath(); ctx.arc(s.x, s.y, 12, 0, 7); ctx.fill();
      ctx.fillStyle = '#c8a0ff';
      ctx.fillRect(s.x - 5, s.y - 3, 3, 3); ctx.fillRect(s.x + 2, s.y - 3, 3, 3);
    });
    // player
    ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, 7); ctx.fill();
    // dawn tint
    var dawn = Math.max(0, (time / DURATION - 0.7) / 0.3);
    if (dawn > 0) { ctx.fillStyle = 'rgba(255,170,90,' + dawn * 0.35 + ')'; ctx.fillRect(0, 0, W, H); }
  }

  var last = performance.now();
  function loop(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (state === 'play') {
      update(dt);
      tEl.textContent = 'Dawn in ' + Math.max(0, Math.ceil(DURATION - time));
      oEl.textContent = 'Oil ' + Math.max(0, Math.round(oil)) + '%';
    }
    if (state !== 'title') draw(); else { ctx.fillStyle = '#04050a'; ctx.fillRect(0, 0, W, H); }
    requestAnimationFrame(loop);
  }
  function act() { if (state !== 'play') start(); }
  window.addEventListener('keydown', function (e) {
    var k = e.key.length == 1 ? e.key.toLowerCase() : e.key;
    keys[k] = 1;
    if (k === ' ' || k === 'Enter') act();
    if (k.indexOf('Arrow') == 0 || k === ' ') e.preventDefault();
  });
  window.addEventListener('keyup', function (e) {
    delete keys[e.key.length == 1 ? e.key.toLowerCase() : e.key];
  });
  msg.addEventListener('click', act);
  show('LANTERN KEEPER\nYour flame dims as the night goes on.\nCollect orange oil drops to refill it.\nShadows hunt you: get close enough with a bright light and they burn away.\nSurvive 90 seconds until dawn.\n\nMove: WASD / Arrow keys\nClick or press Space to start');
  requestAnimationFrame(loop);
})();
