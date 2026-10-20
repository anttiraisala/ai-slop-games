(function () {
  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d");

  var state = "title";            // title | aim | fly | levelwin | levellose | allwin
  var levelIndex = 0;
  var shotsLeft = 0;
  var shotsUsed = 0;
  var stars = [];                 // stars earned per level
  var probe = null;
  var trail = [];
  var drag = null;
  var message = "";
  var time = 0;
  var bgStars = [];
  for (var i = 0; i < 140; i++) {
    bgStars.push({ x: Math.random() * W, y: Math.random() * H, s: Math.random() * 1.6 + 0.3, t: Math.random() * 6 });
  }

  function level() { return LEVELS[levelIndex]; }

  function startLevel(idx) {
    levelIndex = idx;
    shotsLeft = level().shots;
    shotsUsed = 0;
    probe = null;
    trail = [];
    drag = null;
    message = "";
    state = "aim";
  }

  function newGame() { stars = []; startLevel(0); }

  function starsFor(used, total) {
    if (used <= 1) return 3;
    if (used <= Math.ceil(total / 2)) return 2;
    return 1;
  }

  function totalStars() { return stars.reduce(function (a, b) { return a + b; }, 0); }

  function launch() {
    if (!drag) return;
    var dx = level().start.x - drag.x, dy = level().start.y - drag.y;
    var len = Math.hypot(dx, dy);
    if (len < 12) { drag = null; return; }
    var power = Math.min(1, len / 160);
    probe = makeProbe(level(), Math.atan2(dy, dx), power);
    trail = [];
    shotsLeft--;
    shotsUsed++;
    state = "fly";
    drag = null;
  }

  function endShot(result) {
    probe = null;
    if (result === "hit") {
      var s = starsFor(shotsUsed, level().shots);
      stars[levelIndex] = s;
      message = "Delivered! " + s + (s === 1 ? " star" : " stars");
      state = levelIndex === LEVELS.length - 1 ? "allwin" : "levelwin";
    } else if (shotsLeft <= 0) {
      message = (result === "crash" ? "Parcel destroyed." : "Parcel lost in space.") + " No parcels left!";
      state = "levellose";
    } else {
      message = result === "crash" ? "Crashed into a planet!" : "Lost in space!";
      state = "aim";
    }
  }

  function pointerPos(e) {
    var r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
  }

  canvas.addEventListener("pointerdown", function (e) {
    var p = pointerPos(e);
    if (state === "title") { newGame(); return; }
    if (state === "levelwin") { startLevel(levelIndex + 1); return; }
    if (state === "levellose") { startLevel(levelIndex); return; }
    if (state === "allwin") { state = "title"; return; }
    if (state === "aim") {
      drag = p;
      message = "";
      canvas.setPointerCapture(e.pointerId);
    }
  });
  canvas.addEventListener("pointermove", function (e) { if (drag) drag = pointerPos(e); });
  canvas.addEventListener("pointerup", function () { if (state === "aim") launch(); });

  window.addEventListener("keydown", function (e) {
    if (e.key === "r" || e.key === "R") {
      if (state !== "title" && state !== "allwin") startLevel(levelIndex);
    } else if (e.key === "Enter" || e.key === " ") {
      if (state === "title") newGame();
      else if (state === "levelwin") startLevel(levelIndex + 1);
      else if (state === "levellose") startLevel(levelIndex);
      else if (state === "allwin") state = "title";
    } else if (e.key === "Escape") {
      drag = null;
    }
  });

  function update() {
    time += 1;
    if (state === "fly" && probe) {
      for (var k = 0; k < 2 && probe; k++) {
        var r = stepProbe(level(), probe);
        if (probe) trail.push({ x: probe.x, y: probe.y });
        if (trail.length > 400) trail.shift();
        if (r) endShot(r);
        else if (trail.length > 1400) endShot("lost");
      }
    }
  }

  function drawPlanet(p) {
    var anti = p.type === "anti";
    var g = ctx.createRadialGradient(p.x - p.r * 0.35, p.y - p.r * 0.35, p.r * 0.1, p.x, p.y, p.r);
    if (anti) { g.addColorStop(0, "#ff9ad5"); g.addColorStop(1, "#6a1b5e"); }
    else { g.addColorStop(0, "#9ad0ff"); g.addColorStop(1, "#1d3a6a"); }
    // field glow
    var gl = ctx.createRadialGradient(p.x, p.y, p.r, p.x, p.y, p.r * 2.2);
    gl.addColorStop(0, anti ? "rgba(255,90,200,0.25)" : "rgba(90,160,255,0.2)");
    gl.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gl;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 2.2, 0, 7); ctx.fill();
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
    if (anti) {
      ctx.strokeStyle = "rgba(255,200,240,0.6)"; ctx.lineWidth = 2; ctx.setLineDash([4, 5]);
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 8 + Math.sin(time / 15) * 3, 0, 7); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function text(str, x, y, size, color, align) {
    ctx.font = "bold " + size + "px system-ui, sans-serif";
    ctx.textAlign = align || "center";
    ctx.fillStyle = color || "#fff";
    ctx.fillText(str, x, y);
  }

  function panel(lines, hint) {
    ctx.fillStyle = "rgba(5,6,15,0.78)";
    ctx.fillRect(0, 0, W, H);
    var y = H / 2 - (lines.length - 1) * 22;
    lines.forEach(function (l, i) { text(l.t, W / 2, y + i * 44, l.s, l.c); });
    text(hint, W / 2, H - 50, 20, "#9fb4ff");
  }

  function draw() {
    ctx.fillStyle = "#05060f";
    ctx.fillRect(0, 0, W, H);
    bgStars.forEach(function (s) {
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(time / 40 + s.t);
      ctx.fillStyle = "#cfe0ff";
      ctx.fillRect(s.x, s.y, s.s, s.s);
    });
    ctx.globalAlpha = 1;

    if (state === "title") {
      panel([
        { t: "ORBIT COURIER", s: 64, c: "#ffd86b" },
        { t: "Slingshot parcels past planets to the delivery station.", s: 22, c: "#dfe8ff" },
        { t: "Blue planets pull. Pink planets push. Don't touch either.", s: 22, c: "#dfe8ff" },
        { t: "Drag back from the launch pad, release to fire.", s: 22, c: "#dfe8ff" }
      ], "Click or press Enter to start");
      return;
    }

    var lv = level();
    lv.planets.forEach(drawPlanet);

    // delivery station
    var t = lv.target;
    var pulse = Math.sin(time / 12) * 3;
    ctx.strokeStyle = "#ffd86b"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r + pulse, 0, 7); ctx.stroke();
    ctx.fillStyle = "rgba(255,216,107,0.25)";
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, 7); ctx.fill();
    ctx.fillStyle = "#ffd86b";
    ctx.fillRect(t.x - 6, t.y - 6, 12, 12);

    // launch pad
    ctx.strokeStyle = "#7dffb0"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(lv.start.x, lv.start.y, 12, 0, 7); ctx.stroke();

    // aim preview
    if (drag && state === "aim") {
      var dx = lv.start.x - drag.x, dy = lv.start.y - drag.y;
      var len = Math.hypot(dx, dy);
      var power = Math.min(1, len / 160);
      ctx.strokeStyle = "rgba(125,255,176,0.5)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(lv.start.x, lv.start.y);
      ctx.lineTo(lv.start.x - Math.cos(Math.atan2(dy, dx)) * Math.min(len, 160), lv.start.y - Math.sin(Math.atan2(dy, dx)) * Math.min(len, 160));
      ctx.stroke();
      if (len >= 12) {
        var pp = makeProbe(lv, Math.atan2(dy, dx), power);
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        for (var i = 0; i < 70; i++) {
          if (stepProbe(lv, pp)) break;
          if (i % 3 === 0) ctx.fillRect(pp.x - 1.5, pp.y - 1.5, 3, 3);
        }
      }
      text("Power " + Math.round(power * 100) + "%", lv.start.x, lv.start.y + 32, 14, "#7dffb0");
    }

    // trail and probe
    for (var j = 1; j < trail.length; j++) {
      ctx.strokeStyle = "rgba(255,160,90," + (j / trail.length) * 0.8 + ")";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(trail[j - 1].x, trail[j - 1].y); ctx.lineTo(trail[j].x, trail[j].y); ctx.stroke();
    }
    if (probe) {
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(probe.x, probe.y, PROBE_R, 0, 7); ctx.fill();
    }

    // HUD
    text("Level " + (levelIndex + 1) + "/" + LEVELS.length + ": " + lv.name, 16, 28, 20, "#dfe8ff", "left");
    text("Stars: " + totalStars(), W - 16, 28, 20, "#ffd86b", "right");
    for (var k = 0; k < lv.shots; k++) {
      ctx.fillStyle = k < shotsLeft ? "#ff9d5c" : "#2a2f4a";
      ctx.beginPath(); ctx.arc(24 + k * 24, 52, 7, 0, 7); ctx.fill();
    }
    text("Parcels", 24 + lv.shots * 24 + 4, 57, 14, "#8a97c4", "left");
    text("R = restart level", W - 16, H - 14, 14, "#6c78a3", "right");
    if (message && state === "aim") text(message, W / 2, H - 20, 22, "#ff8a8a");

    if (state === "levelwin") {
      panel([{ t: message, s: 44, c: "#ffd86b" }, { t: "Parcels used: " + shotsUsed + "/" + lv.shots, s: 22, c: "#dfe8ff" }], "Click or press Enter for the next level");
    } else if (state === "levellose") {
      panel([{ t: message, s: 40, c: "#ff8a8a" }], "Click or press Enter to retry the level");
    } else if (state === "allwin") {
      panel([
        { t: "ALL DELIVERED!", s: 56, c: "#ffd86b" },
        { t: "Total stars: " + totalStars() + " / " + LEVELS.length * 3, s: 28, c: "#dfe8ff" },
        { t: totalStars() === LEVELS.length * 3 ? "Perfect courier!" : "Can you get every star?", s: 22, c: "#9fb4ff" }
      ], "Click or press Enter to return to the title");
    }
  }

  function loop() { update(); draw(); requestAnimationFrame(loop); }
  loop();
})();
