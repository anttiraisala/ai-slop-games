// Calm the Square - rendering, input and UI.
(function () {
  'use strict';

  var L = window.SquareLogic;
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');

  var TOOLS = [
    { id: 'repair', name: 'Repair school', hint: 'Fix a crumbling school: the root cause of the anger.' },
    { id: 'mediate', name: 'Talk', hint: 'Talk with a crowd to cool it down.' },
    { id: 'extinguish', name: 'Fire crew', hint: 'Put out a burning car.' },
    { id: 'shield', name: 'Guard shop', hint: 'Protect a shop for 12 seconds.' },
    { id: 'police', name: 'Police line', hint: 'Cheap and instant, but angers every other crowd.' }
  ];

  var el = {
    dayText: document.getElementById('day-text'),
    dayBar: document.getElementById('day-bar'),
    calmText: document.getElementById('calm-text'),
    calmBar: document.getElementById('calm-bar'),
    budgetText: document.getElementById('budget-text'),
    budgetBar: document.getElementById('budget-bar'),
    toolbar: document.getElementById('toolbar'),
    hint: document.getElementById('hint'),
    ticker: document.getElementById('ticker'),
    overlay: document.getElementById('overlay'),
    overlayTitle: document.getElementById('overlay-title'),
    overlayText: document.getElementById('overlay-text'),
    overlayButton: document.getElementById('overlay-button')
  };

  var state = null;
  var mode = 'menu'; // menu | playing | paused | ended
  var tool = 'repair';
  var mouse = { x: -100, y: -100, inside: false };
  var effects = [];
  var lastTs = 0;
  var clock = 0;
  var toolButtons = {};
  var BEST_KEY = 'calmTheSquareBest';

  // ---- Static decoration (deterministic) ----

  var blocks = (function () {
    var list = [];
    var seed = 7;
    function rnd() {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    }
    for (var i = 0; i < 46; i++) {
      list.push({
        x: rnd() * L.WIDTH,
        y: rnd() * L.HEIGHT,
        w: 24 + rnd() * 40,
        h: 18 + rnd() * 30
      });
    }
    return list;
  })();

  // ---- Toolbar ----

  TOOLS.forEach(function (t, index) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'tool';
    b.innerHTML = '<span class="tool-key">' + (index + 1) + '</span>' +
      '<span class="tool-name">' + t.name + '</span>' +
      '<span class="tool-cost">cost ' + L.COSTS[t.id] + '</span>';
    b.addEventListener('click', function () {
      selectTool(t.id);
    });
    el.toolbar.appendChild(b);
    toolButtons[t.id] = b;
  });

  function selectTool(id) {
    tool = id;
    for (var i = 0; i < TOOLS.length; i++) {
      if (TOOLS[i].id === id) {
        el.hint.textContent = TOOLS[i].hint;
      }
    }
    refreshToolbar();
  }

  function refreshToolbar() {
    for (var i = 0; i < TOOLS.length; i++) {
      var id = TOOLS[i].id;
      var b = toolButtons[id];
      b.classList.toggle('selected', id === tool);
      b.classList.toggle('broke', !!state && state.budget < L.COSTS[id]);
    }
  }

  // ---- Overlay ----

  function showOverlay(title, text, buttonLabel) {
    el.overlayTitle.textContent = title;
    el.overlayText.textContent = text;
    el.overlayButton.textContent = buttonLabel;
    el.overlay.classList.remove('hidden');
  }

  function hideOverlay() {
    el.overlay.classList.add('hidden');
  }

  function bestScore() {
    try {
      return parseInt(window.localStorage.getItem(BEST_KEY) || '0', 10) || 0;
    } catch (e) {
      return 0;
    }
  }

  function saveBest(score) {
    try {
      window.localStorage.setItem(BEST_KEY, String(score));
    } catch (e) {
      // Storage may be unavailable; ignore.
    }
  }

  function showMenu() {
    mode = 'menu';
    showOverlay(
      'Calm the Square',
      'Schools across a French city are falling apart. Students blockade ' +
      'their entrances, crowds march on the central square, cars burn and ' +
      'shops get ransacked.\n\n' +
      'You run the city crisis desk. Survive 7 days with the Calm meter above ' +
      'zero.\n' +
      '- Repair schools to remove the cause of the anger.\n' +
      '- Talk to crowds to cool them down.\n' +
      '- Send fire crews and guard shops.\n' +
      '- The police line is cheap, but it angers every other crowd.\n\n' +
      'Your budget refills slowly, so choose carefully.',
      'Start'
    );
  }

  function startGame() {
    state = L.createState(Date.now() % 100000);
    effects = [];
    el.ticker.innerHTML = '';
    mode = 'playing';
    hideOverlay();
    selectTool('repair');
    pushTicker('Day 1 begins. Classrooms are crumbling and tempers are short.');
  }

  function endGame() {
    mode = 'ended';
    var s = state.stats;
    var summary = 'Repairs: ' + s.repairs + '   Talks: ' + s.mediations +
      '   Fires put out: ' + s.extinguished + '   Police lines: ' + s.police +
      '   Shops ransacked: ' + s.looted;
    if (state.status === 'won') {
      var best = bestScore();
      var newBest = state.score > best;
      if (newBest) {
        saveBest(state.score);
      }
      showOverlay(
        'The city holds',
        'You got through all 7 days. Score: ' + state.score +
        (newBest ? ' (new best!)' : ' (best: ' + best + ')') + '\n\n' + summary,
        'Play again'
      );
    } else {
      showOverlay(
        'The city lost control',
        'The Calm meter hit zero on day ' + state.day + '.\n\n' + summary,
        'Try again'
      );
    }
  }

  function resumeGame() {
    mode = 'playing';
    hideOverlay();
  }

  function pauseGame() {
    mode = 'paused';
    showOverlay('Paused', 'Press P or the button to continue.', 'Resume');
  }

  el.overlayButton.addEventListener('click', function () {
    if (mode === 'paused') {
      resumeGame();
    } else {
      startGame();
    }
  });

  // ---- Ticker ----

  function pushTicker(text) {
    var li = document.createElement('li');
    li.textContent = text;
    el.ticker.insertBefore(li, el.ticker.firstChild);
    while (el.ticker.children.length > 4) {
      el.ticker.removeChild(el.ticker.lastChild);
    }
  }

  function addEffect(x, y, text, color) {
    effects.push({ x: x, y: y, text: text, color: color, age: 0 });
  }

  // ---- Input ----

  function toCanvas(e) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (L.WIDTH / rect.width),
      y: (e.clientY - rect.top) * (L.HEIGHT / rect.height)
    };
  }

  canvas.addEventListener('pointermove', function (e) {
    var p = toCanvas(e);
    mouse.x = p.x;
    mouse.y = p.y;
    mouse.inside = true;
  });

  canvas.addEventListener('pointerleave', function () {
    mouse.inside = false;
  });

  canvas.addEventListener('pointerdown', function (e) {
    if (mode !== 'playing') {
      return;
    }
    var p = toCanvas(e);
    mouse.x = p.x;
    mouse.y = p.y;
    mouse.inside = true;
    var result = L.act(state, tool, p.x, p.y);
    if (result.msg) {
      addEffect(p.x, p.y - 14, result.msg, result.ok ? '#8be0b2' : '#ff9d8a');
    }
    refreshToolbar();
  });

  window.addEventListener('keydown', function (e) {
    var key = e.key.toLowerCase();
    if (key >= '1' && key <= '5') {
      selectTool(TOOLS[parseInt(key, 10) - 1].id);
    } else if (key === 'p') {
      if (mode === 'playing') {
        pauseGame();
      } else if (mode === 'paused') {
        resumeGame();
      }
    } else if ((key === 'enter' || key === ' ') && (mode === 'menu' || mode === 'ended')) {
      e.preventDefault();
      startGame();
    } else if (key === 'r' && mode === 'ended') {
      startGame();
    }
  });

  // ---- Drawing ----

  function conditionColor(v) {
    var hue = Math.round((v / 100) * 120);
    return 'hsl(' + hue + ', 70%, 50%)';
  }

  function drawBackground() {
    ctx.fillStyle = '#11161f';
    ctx.fillRect(0, 0, L.WIDTH, L.HEIGHT);

    ctx.fillStyle = '#161d29';
    blocks.forEach(function (b) {
      ctx.fillRect(b.x, b.y, b.w, b.h);
    });

    // Roads from every school to the square.
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#212b3b';
    ctx.lineWidth = 26;
    state.schools.forEach(function (s) {
      ctx.beginPath();
      ctx.moveTo(s.doorX, s.doorY);
      ctx.lineTo(L.SQUARE.x, L.SQUARE.y);
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.moveTo(60, L.SQUARE.y);
    ctx.lineTo(L.WIDTH - 60, L.SQUARE.y);
    ctx.moveTo(L.SQUARE.x, 30);
    ctx.lineTo(L.SQUARE.x, L.HEIGHT - 30);
    ctx.stroke();

    // Central square.
    ctx.beginPath();
    ctx.arc(L.SQUARE.x, L.SQUARE.y, L.SQUARE.r, 0, Math.PI * 2);
    ctx.fillStyle = '#2a3446';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#3a4860';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(L.SQUARE.x, L.SQUARE.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#3a4860';
    ctx.fill();
    ctx.fillStyle = '#5c6d8a';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('THE SQUARE', L.SQUARE.x, L.SQUARE.y + L.SQUARE.r - 12);
  }

  function drawSchools() {
    state.schools.forEach(function (s) {
      var x = s.x - s.w / 2;
      var y = s.y - s.h / 2;
      ctx.fillStyle = '#3b4a63';
      ctx.fillRect(x, y, s.w, s.h);
      ctx.fillStyle = '#26324a';
      ctx.fillRect(x, y, s.w, 14);
      // Windows
      ctx.fillStyle = s.condition < 40 ? '#2b3447' : '#9fb7e0';
      for (var i = 0; i < 5; i++) {
        ctx.fillRect(x + 8 + i * 22, y + 24, 14, 12);
        ctx.fillRect(x + 8 + i * 22, y + 44, 14, 12);
      }
      // Cracks on decayed buildings
      if (s.condition < 50) {
        ctx.strokeStyle = '#0c1018';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 30, y + 14);
        ctx.lineTo(x + 38, y + 30);
        ctx.lineTo(x + 30, y + 44);
        ctx.lineTo(x + 40, y + 62);
        ctx.moveTo(x + 84, y + 14);
        ctx.lineTo(x + 78, y + 34);
        ctx.lineTo(x + 90, y + 50);
        ctx.stroke();
      }
      ctx.fillStyle = '#e6ebf5';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(s.name, s.x, y + 11);
      // Condition bar
      ctx.fillStyle = '#0c1018';
      ctx.fillRect(x, y + s.h + 4, s.w, 7);
      ctx.fillStyle = conditionColor(s.condition);
      ctx.fillRect(x + 1, y + s.h + 5, (s.w - 2) * (s.condition / 100), 5);
    });
  }

  function drawShops() {
    state.shops.forEach(function (s) {
      var x = s.x - s.w / 2;
      var y = s.y - s.h / 2;
      ctx.fillStyle = s.looted ? '#2a2020' : '#5a4a3a';
      ctx.fillRect(x, y, s.w, s.h);
      ctx.fillStyle = s.looted ? '#3a2a2a' : '#8a6f55';
      ctx.fillRect(x, y, s.w, 10);
      ctx.fillStyle = '#e6ebf5';
      ctx.font = '10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(s.name, s.x, y + 9);
      if (s.looted) {
        ctx.strokeStyle = '#ff6b5a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + 18, y + 16);
        ctx.lineTo(x + s.w - 18, y + s.h - 6);
        ctx.moveTo(x + s.w - 18, y + 16);
        ctx.lineTo(x + 18, y + s.h - 6);
        ctx.stroke();
      }
      ctx.fillStyle = '#0c1018';
      ctx.fillRect(x, y + s.h + 3, s.w, 5);
      ctx.fillStyle = conditionColor(s.health);
      ctx.fillRect(x + 1, y + s.h + 4, (s.w - 2) * (s.health / 100), 3);
      if (s.shield > 0) {
        ctx.strokeStyle = 'rgba(90, 210, 255, ' + (0.55 + 0.35 * Math.sin(clock * 6)) + ')';
        ctx.lineWidth = 3;
        ctx.strokeRect(x - 4, y - 4, s.w + 8, s.h + 8);
      }
    });
  }

  function drawFires() {
    state.fires.forEach(function (f) {
      var big = 1 + Math.min(1.5, f.age / 15);
      var flick = Math.sin(clock * 12 + f.id) * 2;
      // Burned car
      ctx.fillStyle = '#1b1b1f';
      ctx.fillRect(f.x - 13, f.y + 2, 26, 11);
      // Flames
      var h = (14 + flick) * big;
      ctx.fillStyle = '#ff7a1a';
      ctx.beginPath();
      ctx.moveTo(f.x - 11 * big, f.y + 4);
      ctx.quadraticCurveTo(f.x - 4, f.y - h, f.x, f.y - h * 1.2);
      ctx.quadraticCurveTo(f.x + 4, f.y - h, f.x + 11 * big, f.y + 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffd34a';
      ctx.beginPath();
      ctx.moveTo(f.x - 5 * big, f.y + 4);
      ctx.quadraticCurveTo(f.x - 1, f.y - h * 0.5, f.x, f.y - h * 0.7);
      ctx.quadraticCurveTo(f.x + 2, f.y - h * 0.5, f.x + 5 * big, f.y + 4);
      ctx.closePath();
      ctx.fill();
    });
  }

  function drawCrowds() {
    state.crowds.forEach(function (c) {
      var radius = L.crowdRadius(c);
      var hue = Math.round(60 - c.anger * 0.6);
      ctx.fillStyle = 'hsla(' + hue + ', 90%, 55%, 0.13)';
      ctx.beginPath();
      ctx.arc(c.x, c.y, radius + 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'hsl(' + hue + ', 90%, 58%)';
      for (var i = 0; i < c.size; i++) {
        var a = i * 2.4 + c.id;
        var r = Math.sqrt((i + 0.5) / c.size) * radius;
        var wobble = Math.sin(clock * 4 + i * 1.7) * (1 + c.anger / 40);
        ctx.beginPath();
        ctx.arc(c.x + Math.cos(a) * r + wobble, c.y + Math.sin(a) * r + Math.cos(clock * 3 + i) * 1.5, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
      // Anger bar
      var bw = 44;
      ctx.fillStyle = '#0c1018';
      ctx.fillRect(c.x - bw / 2, c.y - radius - 14, bw, 6);
      ctx.fillStyle = 'hsl(' + hue + ', 90%, 55%)';
      ctx.fillRect(c.x - bw / 2 + 1, c.y - radius - 13, (bw - 2) * (c.anger / 100), 4);
      if (c.slow > 0) {
        ctx.fillStyle = '#9fd8ff';
        ctx.font = '10px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('talking', c.x, c.y + radius + 12);
      }
    });
  }

  function drawCursor() {
    if (!mouse.inside || mode !== 'playing') {
      return;
    }
    var target = null;
    var color = '#8be0b2';
    if (tool === 'repair') {
      target = L.schoolAt(state, mouse.x, mouse.y);
    } else if (tool === 'shield') {
      target = L.shopAt(state, mouse.x, mouse.y);
    } else if (tool === 'extinguish') {
      target = L.fireAt(state, mouse.x, mouse.y);
    } else {
      target = L.crowdAt(state, mouse.x, mouse.y);
      if (tool === 'police') {
        color = '#ff9d8a';
      }
    }
    ctx.strokeStyle = target ? color : 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = target ? 3 : 1.5;
    ctx.beginPath();
    ctx.arc(mouse.x, mouse.y, target ? 16 : 10, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawEffects(dt) {
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    effects = effects.filter(function (fx) {
      fx.age += dt;
      return fx.age < 1.6;
    });
    effects.forEach(function (fx) {
      ctx.globalAlpha = Math.max(0, 1 - fx.age / 1.6);
      ctx.fillStyle = '#0c1018';
      ctx.fillText(fx.text, fx.x + 1, fx.y - fx.age * 24 + 1);
      ctx.fillStyle = fx.color;
      ctx.fillText(fx.text, fx.x, fx.y - fx.age * 24);
      ctx.globalAlpha = 1;
    });
  }

  function drawMood() {
    // Red vignette when the calm meter is low.
    if (state.calm < 35) {
      var alpha = (35 - state.calm) / 35 * 0.35;
      var grad = ctx.createRadialGradient(L.WIDTH / 2, L.HEIGHT / 2, 200, L.WIDTH / 2, L.HEIGHT / 2, 520);
      grad.addColorStop(0, 'rgba(255, 40, 20, 0)');
      grad.addColorStop(1, 'rgba(255, 40, 20, ' + alpha + ')');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, L.WIDTH, L.HEIGHT);
    }
  }

  function updateHud() {
    el.dayText.textContent = String(state.day);
    el.dayBar.style.width = Math.min(100, (state.dayTime / L.DAY_LENGTH) * 100) + '%';
    el.calmText.textContent = String(Math.round(state.calm));
    el.calmBar.style.width = state.calm + '%';
    el.calmBar.style.background = conditionColor(Math.min(100, state.calm * 1.1));
    el.budgetText.textContent = String(Math.floor(state.budget));
    el.budgetBar.style.width = (state.budget / L.MAX_BUDGET) * 100 + '%';
    refreshToolbar();
  }

  function drawIdle() {
    ctx.fillStyle = '#11161f';
    ctx.fillRect(0, 0, L.WIDTH, L.HEIGHT);
  }

  // ---- Main loop ----

  function frame(ts) {
    var dt = Math.min(0.05, (ts - lastTs) / 1000 || 0);
    lastTs = ts;
    clock += dt;

    if (!state) {
      drawIdle();
      requestAnimationFrame(frame);
      return;
    }

    if (mode === 'playing') {
      L.update(state, dt);
      while (state.messages.length) {
        pushTicker(state.messages.shift());
      }
      if (state.status !== 'playing') {
        endGame();
      }
    }

    drawBackground();
    drawSchools();
    drawShops();
    drawFires();
    drawCrowds();
    drawMood();
    drawCursor();
    drawEffects(mode === 'playing' ? dt : 0);
    updateHud();
    requestAnimationFrame(frame);
  }

  // Start with a visible, idle city behind the menu.
  state = L.createState(1);
  selectTool('repair');
  showMenu();
  requestAnimationFrame(frame);
})();
