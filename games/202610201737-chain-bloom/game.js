(function () {
  'use strict';

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;
  var overlay = document.getElementById('overlay');
  var ovTitle = document.getElementById('ovTitle');
  var ovText = document.getElementById('ovText');
  var ovButton = document.getElementById('ovButton');
  var hudLevel = document.getElementById('hudLevel');
  var hudGoal = document.getElementById('hudGoal');
  var hudScore = document.getElementById('hudScore');

  // total spores, required pops, bloom radius, spore speed
  var LEVELS = [
    { n: 20, goal: 3, r: 85, speed: 40 },
    { n: 24, goal: 6, r: 76, speed: 45 },
    { n: 30, goal: 10, r: 68, speed: 50 },
    { n: 36, goal: 15, r: 62, speed: 55 },
    { n: 36, goal: 19, r: 56, speed: 60 },
    { n: 42, goal: 25, r: 54, speed: 65 },
    { n: 48, goal: 32, r: 52, speed: 70 },
    { n: 54, goal: 40, r: 50, speed: 75 },
    { n: 60, goal: 48, r: 48, speed: 80 },
    { n: 70, goal: 60, r: 46, speed: 85 }
  ];
  var GROW = 0.5, HOLD = 1.6, SHRINK = 0.5;
  var COLORS = ['#ff6b8b', '#ffd36b', '#6bffb5', '#6bc7ff', '#c78bff'];

  var state = 'menu'; // menu, aim, running, done
  var levelIndex = 0, totalScore = 0, levelScore = 0, popped = 0;
  var spores = [], blooms = [], particles = [];
  var mouse = { x: W / 2, y: H / 2 };

  function rand(a, b) { return a + Math.random() * (b - a); }

  function setupLevel() {
    var L = LEVELS[levelIndex];
    spores = []; blooms = []; particles = [];
    popped = 0; levelScore = 0;
    for (var i = 0; i < L.n; i++) {
      var a = rand(0, Math.PI * 2);
      var s = L.speed * rand(0.6, 1.3);
      spores.push({ x: rand(20, W - 20), y: rand(20, H - 20), vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: 8, c: COLORS[i % COLORS.length] });
    }
    state = 'aim';
    updateHud();
  }

  function updateHud() {
    var L = LEVELS[levelIndex];
    hudLevel.textContent = 'Level ' + (levelIndex + 1) + ' / ' + LEVELS.length;
    hudGoal.textContent = 'Goal: ' + popped + ' / ' + L.goal + ' (of ' + L.n + ')';
    hudScore.textContent = 'Score: ' + (totalScore + levelScore);
  }

  function addBloom(x, y, c) {
    blooms.push({ x: x, y: y, t: 0, c: c, max: LEVELS[levelIndex].r });
  }

  function burst(x, y, c) {
    for (var i = 0; i < 10; i++) {
      var a = rand(0, Math.PI * 2), s = rand(30, 120);
      particles.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.6, c: c });
    }
  }

  function bloomRadius(b) {
    if (b.t < GROW) return b.max * (b.t / GROW);
    if (b.t < GROW + HOLD) return b.max;
    return b.max * Math.max(0, 1 - (b.t - GROW - HOLD) / SHRINK);
  }

  function update(dt) {
    var i, j;
    for (i = 0; i < spores.length; i++) {
      var s = spores[i];
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.x < s.r) { s.x = s.r; s.vx = Math.abs(s.vx); }
      if (s.x > W - s.r) { s.x = W - s.r; s.vx = -Math.abs(s.vx); }
      if (s.y < s.r) { s.y = s.r; s.vy = Math.abs(s.vy); }
      if (s.y > H - s.r) { s.y = H - s.r; s.vy = -Math.abs(s.vy); }
    }
    if (state === 'running') {
      for (i = 0; i < blooms.length; i++) {
        var b = blooms[i];
        b.t += dt;
        var br = bloomRadius(b);
        for (j = spores.length - 1; j >= 0; j--) {
          var sp = spores[j];
          var dx = sp.x - b.x, dy = sp.y - b.y;
          if (dx * dx + dy * dy <= (br + sp.r) * (br + sp.r)) {
            spores.splice(j, 1);
            popped++;
            levelScore += 100 * popped; // longer chains are worth more
            burst(sp.x, sp.y, sp.c);
            addBloom(sp.x, sp.y, sp.c);
          }
        }
      }
      blooms = blooms.filter(function (b) { return b.t < GROW + HOLD + SHRINK; });
      updateHud();
      if (blooms.length === 0) finishLevel();
    }
    for (i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function finishLevel() {
    var L = LEVELS[levelIndex];
    state = 'done';
    if (popped >= L.goal) {
      totalScore += levelScore;
      updateHud();
      if (levelIndex === LEVELS.length - 1) {
        show('You Win!', 'Every level is bloomed.\nFinal score: ' + totalScore, 'Play again', function () {
          levelIndex = 0; totalScore = 0; setupLevel();
        });
      } else {
        show('Level cleared', 'Popped ' + popped + ' of ' + L.n + ' (goal ' + L.goal + ').\nLevel score: ' + levelScore, 'Next level', function () {
          levelIndex++; setupLevel();
        });
      }
    } else {
      show('Fizzled out', 'Popped ' + popped + ', but the goal was ' + L.goal + '.\nTry again!', 'Retry level', function () {
        setupLevel();
      });
    }
  }

  var overlayAction = null;
  function show(title, text, button, action) {
    ovTitle.textContent = title; ovText.textContent = text; ovButton.textContent = button;
    overlayAction = action;
    overlay.classList.remove('hidden');
  }
  ovButton.addEventListener('click', function () {
    overlay.classList.add('hidden');
    if (overlayAction) overlayAction();
  });

  function canvasPos(e) {
    var r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
  }
  canvas.addEventListener('mousemove', function (e) { mouse = canvasPos(e); });
  canvas.addEventListener('click', function (e) {
    if (state !== 'aim') return;
    mouse = canvasPos(e);
    state = 'running';
    addBloom(mouse.x, mouse.y, '#ffffff');
  });
  window.addEventListener('keydown', function (e) {
    if (e.key === 'r' || e.key === 'R') {
      if (overlay.classList.contains('hidden') && state !== 'menu') setupLevel();
    }
  });

  function draw() {
    ctx.clearRect(0, 0, W, H);
    var i;
    for (i = 0; i < blooms.length; i++) {
      var b = blooms[i], br = bloomRadius(b);
      var g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, Math.max(br, 1));
      g.addColorStop(0, b.c); g.addColorStop(1, 'rgba(255,255,255,0.05)');
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(b.x, b.y, br, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = b.c; ctx.lineWidth = 2; ctx.stroke();
    }
    for (i = 0; i < spores.length; i++) {
      var s = spores[i];
      ctx.fillStyle = s.c;
      ctx.shadowColor = s.c; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowBlur = 0;
    for (i = 0; i < particles.length; i++) {
      var p = particles[i];
      ctx.globalAlpha = Math.max(0, p.life / 0.6);
      ctx.fillStyle = p.c;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;
    if (state === 'aim' && overlay.classList.contains('hidden')) {
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(mouse.x, mouse.y, LEVELS[levelIndex].r, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  show('Chain Bloom', 'Click once to plant a bloom.\nIt pops any spore it touches, and every popped spore blooms too.\nPop enough spores to clear each of the 10 levels.\nPress R to restart a level.', 'Start', function () {
    levelIndex = 0; totalScore = 0; setupLevel();
  });
  setupLevel(); state = 'menu';
  requestAnimationFrame(frame);
})();
