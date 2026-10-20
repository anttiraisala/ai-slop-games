(function () {
  var canvas = document.getElementById("board");
  var ctx = canvas.getContext("2d");
  var STORAGE_KEY = "mirror-maze-progress";

  var levelIndex = 0, level, state, moves, solved, hintMirror, flash = 0;
  var best = loadBest();

  function loadBest() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveBest() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(best)); } catch (e) { /* storage unavailable */ }
  }

  function startLevel(i) {
    levelIndex = i;
    level = G.parseLevel(LEVELS[i]);
    level.par = G.parMoves(level);
    state = level.mirrors.map(function (m) { return m.slash; });
    moves = 0; solved = false; hintMirror = -1;
    hideOverlay();
    buildLevelButtons();
    updateStats();
  }

  var G = { parseLevel: parseLevel, parMoves: parMoves, trace: trace, isSolved: isSolved };

  function cellSize() {
    return Math.min(Math.floor((canvas.width - 40) / level.w), Math.floor((canvas.height - 40) / level.h));
  }
  function origin(cs) {
    return { x: Math.floor((canvas.width - cs * level.w) / 2), y: Math.floor((canvas.height - cs * level.h) / 2) };
  }

  function updateStats() {
    var r = G.trace(level, state);
    var lit = level.targets.filter(function (t) { return r.lit[t.x + "," + t.y]; }).length;
    document.getElementById("levelLabel").textContent = "Level " + (levelIndex + 1) + "/" + LEVELS.length + ": " + level.name;
    document.getElementById("movesLabel").textContent = "Moves: " + moves + " (par " + level.par + ")";
    document.getElementById("targetsLabel").textContent = "Targets: " + lit + "/" + level.targets.length;
    return r;
  }

  function buildLevelButtons() {
    var box = document.getElementById("levelButtons");
    box.innerHTML = "";
    LEVELS.forEach(function (l, i) {
      var b = document.createElement("button");
      b.textContent = i + 1;
      b.title = l.name;
      if (i === levelIndex) b.className = "current";
      else if (best[i] !== undefined) b.className = "done";
      b.onclick = function () { startLevel(i); };
      box.appendChild(b);
    });
  }

  function showOverlay(title, text, buttonText, handler) {
    document.getElementById("overlayTitle").textContent = title;
    document.getElementById("overlayText").textContent = text;
    var btn = document.getElementById("overlayButton");
    btn.textContent = buttonText;
    btn.onclick = handler;
    document.getElementById("overlay").className = "";
  }
  function hideOverlay() { document.getElementById("overlay").className = "hidden"; }

  function checkWin() {
    if (solved || !G.isSolved(level, state)) return;
    solved = true;
    if (best[levelIndex] === undefined || moves < best[levelIndex]) best[levelIndex] = moves;
    saveBest();
    buildLevelButtons();
    var rating = moves <= level.par ? "Perfect! Par or better." : "Solved in " + moves + " moves (par " + level.par + ").";
    if (levelIndex + 1 < LEVELS.length) {
      showOverlay("Level cleared", rating, "Next level (N)", function () { startLevel(levelIndex + 1); });
    } else {
      showOverlay("You win!", "All " + LEVELS.length + " levels cleared. " + rating, "Play again", function () { startLevel(0); });
    }
  }

  function flip(i) {
    state[i] = !state[i];
    moves++;
    hintMirror = -1;
    flash = 1;
    updateStats();
    checkWin();
  }

  canvas.addEventListener("click", function (e) {
    if (solved) return;
    var rect = canvas.getBoundingClientRect();
    var px = (e.clientX - rect.left) * canvas.width / rect.width;
    var py = (e.clientY - rect.top) * canvas.height / rect.height;
    var cs = cellSize(), o = origin(cs);
    var cx = Math.floor((px - o.x) / cs), cy = Math.floor((py - o.y) / cs);
    for (var i = 0; i < level.mirrors.length; i++) {
      if (level.mirrors[i].x === cx && level.mirrors[i].y === cy) { flip(i); return; }
    }
  });

  // Hint: finds a best solution and highlights one mirror that must be flipped.
  function hint() {
    if (solved) return;
    var n = level.mirrors.length, bestMask = -1, bestBits = 99;
    for (var mask = 0; mask < (1 << n); mask++) {
      var st = state.map(function (v, i) { return (mask >> i & 1) ? !v : v; });
      if (G.isSolved(level, st)) {
        var bits = 0;
        for (var i = 0; i < n; i++) bits += mask >> i & 1;
        if (bits < bestBits) { bestBits = bits; bestMask = mask; }
      }
    }
    for (var j = 0; j < n; j++) if (bestMask >> j & 1) { hintMirror = j; return; }
  }

  document.getElementById("resetButton").onclick = function () { startLevel(levelIndex); };
  document.getElementById("hintButton").onclick = hint;
  document.addEventListener("keydown", function (e) {
    var k = e.key.toLowerCase();
    if (k === "r") startLevel(levelIndex);
    else if (k === "h") hint();
    else if (k === "n" && solved && levelIndex + 1 < LEVELS.length) startLevel(levelIndex + 1);
  });

  // ---------- rendering ----------
  function draw(time) {
    var cs = cellSize(), o = origin(cs);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var r = G.trace(level, state);
    function cx(x) { return o.x + (x + 0.5) * cs; }

    // floor and walls
    for (var y = 0; y < level.h; y++) for (var x = 0; x < level.w; x++) {
      var c = level.grid[y][x];
      if (c === "#") {
        ctx.fillStyle = "#2a2f55"; ctx.fillRect(o.x + x * cs, o.y + y * cs, cs, cs);
        ctx.fillStyle = "#3a4180"; ctx.fillRect(o.x + x * cs + 3, o.y + y * cs + 3, cs - 6, cs - 6);
      } else {
        ctx.strokeStyle = "#1a2040"; ctx.strokeRect(o.x + x * cs + 0.5, o.y + y * cs + 0.5, cs - 1, cs - 1);
      }
    }

    // beams
    ctx.lineCap = "round";
    [[10, "rgba(255,60,90,0.25)"], [4, "#ff5a78"], [1.5, "#fff2f5"]].forEach(function (pass) {
      ctx.lineWidth = pass[0]; ctx.strokeStyle = pass[1];
      ctx.beginPath();
      r.segments.forEach(function (s) {
        ctx.moveTo(cx(s.x1), cx(s.y1) - o.x + o.y);
        ctx.lineTo(cx(s.x2), cx(s.y2) - o.x + o.y);
      });
      ctx.stroke();
    });

    // objects
    var pulse = 0.5 + 0.5 * Math.sin(time / 250);
    for (y = 0; y < level.h; y++) for (x = 0; x < level.w; x++) {
      c = level.grid[y][x];
      var mx = cx(x), my = o.y + (y + 0.5) * cs, h = cs * 0.38;
      if (c === "T") {
        var on = r.lit[x + "," + y];
        ctx.fillStyle = on ? "#7dffb0" : "#3b4276";
        ctx.shadowColor = on ? "#3dff90" : "transparent"; ctx.shadowBlur = on ? 18 : 0;
        ctx.beginPath(); ctx.arc(mx, my, cs * 0.28, 0, 7); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = on ? "#eafff2" : "#8a93d6"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(mx, my, cs * 0.28 + 4, 0, 7); ctx.stroke();
      } else if ("^>v<".indexOf(c) >= 0) {
        ctx.save(); ctx.translate(mx, my); ctx.rotate("^>v<".indexOf(c) * Math.PI / 2);
        ctx.fillStyle = "#ff5a78"; ctx.fillRect(-h, -h, 2 * h, 2 * h);
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(0, -h * 0.8); ctx.lineTo(h * 0.5, 0); ctx.lineTo(-h * 0.5, 0); ctx.fill();
        ctx.restore();
      } else if (c === "/" || c === "\\") {
        drawMirror(mx, my, h, c === "/", false, false);
      } else if (c === "P") {
        ctx.fillStyle = "rgba(190,150,255,0.55)"; ctx.strokeStyle = "#d8c4ff"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(mx, my - h); ctx.lineTo(mx + h, my + h * 0.8); ctx.lineTo(mx - h, my + h * 0.8); ctx.closePath();
        ctx.fill(); ctx.stroke();
      }
    }
    level.mirrors.forEach(function (m, i) {
      drawMirror(cx(m.x), o.y + (m.y + 0.5) * cs, cs * 0.38, state[i], true, i === hintMirror && pulse > 0.4);
    });
    requestAnimationFrame(draw);
  }

  function drawMirror(x, y, h, slash, rotatable, glow) {
    ctx.save();
    if (rotatable) {
      ctx.fillStyle = glow ? "rgba(255,226,127,0.5)" : "rgba(127,231,255,0.12)";
      ctx.beginPath(); ctx.arc(x, y, h * 1.15, 0, 7); ctx.fill();
    }
    ctx.lineWidth = rotatable ? 6 : 5; ctx.lineCap = "round";
    ctx.strokeStyle = rotatable ? "#7fe7ff" : "#aab2d8";
    ctx.beginPath();
    if (slash) { ctx.moveTo(x - h, y + h); ctx.lineTo(x + h, y - h); }
    else { ctx.moveTo(x - h, y - h); ctx.lineTo(x + h, y + h); }
    ctx.stroke();
    ctx.restore();
  }

  startLevel(0);
  requestAnimationFrame(draw);
})();
