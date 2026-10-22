/* Canvas rendering for Upside-Down Roadster. */
(function (root) {
  'use strict';
  var P = root.RR;
  var W = 1280, H = 720;

  // ---- deterministic background data
  function rng(seed) {
    var s = seed;
    return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  }
  var rand = rng(12345);
  var stars = [];
  for (var i = 0; i < 120; i++) stars.push({ x: rand() * W, y: rand() * 380, r: rand() * 1.4 + 0.3, p: rand() * 6 });
  function makeSkyline(period, minH, maxH, minW, maxW) {
    var list = [], x = 0;
    while (x < period) {
      var w = minW + rand() * (maxW - minW);
      var h = minH + rand() * (maxH - minH);
      var wins = [];
      for (var wy = 14; wy < h - 8; wy += 16) {
        for (var wx = 8; wx < w - 10; wx += 14) if (rand() > 0.55) wins.push([wx, wy]);
      }
      list.push({ x: x, w: w, h: h, wins: wins });
      x += w + rand() * 12;
    }
    return { list: list, period: x };
  }
  var farCity = makeSkyline(2600, 120, 300, 50, 110);
  var nearCity = makeSkyline(2400, 90, 220, 60, 130);

  var crowd = [];
  for (var c = 0; c < 400; c++) crowd.push({ x: c * 17 + rand() * 8, h: 14 + rand() * 8, hue: Math.floor(rand() * 360), ph: rand() * 6 });

  function drawSkyline(ctx, sky, cam, par, base, color, winColor, t) {
    var off = -((cam.x * par) % sky.period);
    for (var rep = -1; rep < 3; rep++) {
      var ox = off + rep * sky.period;
      if (ox > W || ox + sky.period < 0) continue;
      for (var i = 0; i < sky.list.length; i++) {
        var b = sky.list[i];
        var bx = ox + b.x;
        if (bx > W || bx + b.w < 0) continue;
        ctx.fillStyle = color;
        ctx.fillRect(bx, base - b.h, b.w, b.h);
        ctx.fillStyle = winColor;
        for (var k = 0; k < b.wins.length; k++) {
          ctx.fillRect(bx + b.wins[k][0], base - b.h + b.wins[k][1], 6, 8);
        }
      }
    }
  }

  function drawBackground(ctx, cam, t) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0b0724');
    g.addColorStop(0.55, '#2a1150');
    g.addColorStop(1, '#6b2a6e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2 + s.p);
      ctx.fillStyle = '#fff';
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }
    ctx.globalAlpha = 1;
    // moon
    ctx.fillStyle = '#fdf3d0';
    ctx.beginPath(); ctx.arc(1030 - cam.x * 0.01, 120, 46, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.beginPath(); ctx.arc(1015 - cam.x * 0.01, 108, 10, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(1048 - cam.x * 0.01, 136, 7, 0, 7); ctx.fill();
    var horizon = H * 0.62 + (-cam.y) * 0.25 * 0 + 40;
    horizon = Math.min(horizon, H - 40);
    drawSkyline(ctx, farCity, cam, 0.12, horizon, '#1a0f3d', 'rgba(255,214,120,0.35)', t);
    drawSkyline(ctx, nearCity, cam, 0.28, horizon + 30, '#120a2b', 'rgba(255,190,90,0.55)', t);
    // searchlights
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = '#9fd8ff';
    for (var k = 0; k < 3; k++) {
      var bx = 200 + k * 430 - cam.x * 0.05;
      var ang = Math.sin(t * 0.6 + k * 2) * 0.35;
      ctx.beginPath();
      ctx.moveTo(bx, horizon + 30);
      ctx.lineTo(bx + Math.sin(ang - 0.08) * 800, horizon + 30 - Math.cos(ang) * 800);
      ctx.lineTo(bx + Math.sin(ang + 0.08) * 800, horizon + 30 - Math.cos(ang) * 800);
      ctx.fill();
    }
    ctx.restore();
  }

  // ---- parked cars
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawParked(ctx, car, crushed) {
    var cx = car.cx, ch = car.ch;
    var baseH = Math.round(ch * 0.52);
    var top = -8 - baseH;
    ctx.save();
    if (crushed) { ctx.translate(0, 0); }
    ctx.fillStyle = car.color;
    rr(ctx, cx - 60, top, 120, baseH, 8); ctx.fill();
    // cabin
    var cabin = { hatch: [-44, 36, 0.8], sedan: [-30, 30, 0.8], van: [-58, 44, 0.95], coupe: [-34, 22, 0.8] }[car.type];
    ctx.beginPath();
    ctx.moveTo(cx + cabin[0] - 8, top);
    ctx.lineTo(cx + cabin[0] + 12, -ch);
    ctx.lineTo(cx + cabin[1] - 10, -ch);
    ctx.lineTo(cx + cabin[1] + (car.type === 'van' ? 0 : 14), top);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(190,230,255,0.85)';
    ctx.beginPath();
    ctx.moveTo(cx + cabin[0] + 2, top - 1);
    ctx.lineTo(cx + cabin[0] + 15, -ch + 5);
    ctx.lineTo(cx + cabin[1] - 12, -ch + 5);
    ctx.lineTo(cx + cabin[1] + (car.type === 'van' ? -4 : 6), top - 1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(cx - 60, top + baseH - 7, 120, 5);
    ctx.fillStyle = '#ffeaa0';
    ctx.fillRect(cx + 54, top + 4, 6, 5);
    ctx.fillStyle = '#ff4a4a';
    ctx.fillRect(cx - 60, top + 4, 5, 5);
    [-38, 38].forEach(function (dx) {
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(cx + dx, -11, 11, 0, 7); ctx.fill();
      ctx.fillStyle = '#9aa';
      ctx.beginPath(); ctx.arc(cx + dx, -11, 5, 0, 7); ctx.fill();
    });
    ctx.restore();
  }

  // ---- ramps
  function drawKicker(ctx, lv) {
    ctx.beginPath();
    ctx.moveTo(lv.xK, 0);
    for (var x = lv.xK; x <= lv.xLip; x += 8) ctx.lineTo(x, P.terrainY(lv, x));
    ctx.lineTo(lv.xLip, P.terrainY(lv, lv.xLip));
    ctx.lineTo(lv.xLip, 0);
    ctx.closePath();
    var g = ctx.createLinearGradient(0, -lv.kH, 0, 0);
    g.addColorStop(0, '#59607a'); g.addColorStop(1, '#2b2f40');
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 5; ctx.strokeStyle = '#ffd23f'; ctx.setLineDash([16, 12]);
    ctx.beginPath();
    for (var x2 = lv.xK; x2 <= lv.xLip; x2 += 8) {
      var y = P.terrainY(lv, x2) - 1;
      if (x2 === lv.xK) ctx.moveTo(x2, y); else ctx.lineTo(x2, y);
    }
    ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#ff4a4a';
    ctx.fillRect(lv.xLip - 6, -lv.kH, 6, lv.kH);
  }

  function drawCurl(ctx, lv, t) {
    var R = lv.R, cx = lv.xr, cy = -R;
    // supports
    ctx.strokeStyle = '#2b2f40'; ctx.lineWidth = 10;
    for (var th = 0.5; th < lv.thEnd; th += 0.55) {
      var px = cx + (R + 8) * Math.sin(th), py = cy + (R + 8) * Math.cos(th);
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 40, 0); ctx.stroke();
    }
    ctx.lineCap = 'butt';
    ctx.strokeStyle = '#5b6380'; ctx.lineWidth = 18;
    ctx.beginPath(); ctx.arc(cx, cy, R + 9, Math.PI / 2, Math.PI / 2 - lv.thEnd, true); ctx.stroke();
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 4; ctx.setLineDash([14, 14]);
    ctx.beginPath(); ctx.arc(cx, cy, R + 1, Math.PI / 2, Math.PI / 2 - lv.thEnd, true); ctx.stroke();
    ctx.setLineDash([]);
    // entry floor plate
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(cx - 4, -3, 8, 3);
    // end lip lights
    var ex = cx + R * Math.sin(lv.thEnd), ey = cy + R * Math.cos(lv.thEnd);
    ctx.fillStyle = Math.sin(t * 8) > 0 ? '#ff3b3b' : '#7a1d1d';
    ctx.beginPath(); ctx.arc(ex, ey - 2, 6, 0, 7); ctx.fill();
  }

  function drawRoad(ctx, cam, zoom, lv, t) {
    var left = cam.x - W / zoom, right = cam.x + W / zoom;
    // far barrier + crowd
    ctx.fillStyle = '#1a1030';
    ctx.fillRect(left, -170, right - left, 120);
    for (var i = 0; i < crowd.length; i++) {
      var p = crowd[i];
      var px = (p.x - ((cam.x * 0.9) % 6800)) ;
      var wx = Math.floor((left - p.x) / 6800) ;
      for (var rep = Math.floor(left / 6800) - 1; rep <= Math.ceil(right / 6800); rep++) {
        var x = p.x + rep * 6800;
        if (x < left || x > right) continue;
        var bob = Math.abs(Math.sin(t * 3 + p.ph)) * 5;
        ctx.fillStyle = 'hsl(' + p.hue + ',45%,40%)';
        ctx.fillRect(x, -80 - p.h - bob, 8, p.h);
        ctx.fillStyle = '#e8b890';
        ctx.beginPath(); ctx.arc(x + 4, -84 - p.h - bob, 4.5, 0, 7); ctx.fill();
      }
    }
    ctx.fillStyle = '#3a2f5a';
    ctx.fillRect(left, -80, right - left, 10);
    ctx.fillStyle = '#ffd23f';
    for (var bx = Math.floor(left / 60) * 60; bx < right; bx += 120) ctx.fillRect(bx, -80, 60, 10);
    // pavement
    var g = ctx.createLinearGradient(0, 0, 0, 160);
    g.addColorStop(0, '#34344a'); g.addColorStop(1, '#1c1c2a');
    ctx.fillStyle = g;
    ctx.fillRect(left, 0, right - left, 400);
    ctx.fillStyle = '#6c6c8a';
    ctx.fillRect(left, 0, right - left, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (var dx = Math.floor(left / 100) * 100; dx < right; dx += 100) ctx.fillRect(dx, 62, 50, 5);
    // start line
    ctx.fillStyle = '#fff';
    ctx.fillRect(lv.startX + 30, 2, 8, 120);
    ctx.fillStyle = '#111';
    for (var cy = 0; cy < 8; cy++) ctx.fillRect(lv.startX + 30 + (cy % 2) * 4, 2 + cy * 15, 4, 15);
    // painted safe zone in the free area
    ctx.fillStyle = 'rgba(80,255,160,0.16)';
    ctx.fillRect(lv.xc1 + 10, 2, lv.xr - lv.xc1 - 40, 120);
    ctx.fillStyle = 'rgba(120,255,190,0.7)';
    ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LANDING ZONE', (lv.xc1 + lv.xr - 30) / 2, 36);
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(lv.xc1 + 10, 2, 5, 120);
  }

  // ---- player car
  var wheelAngle = 0;
  function drawPlayer(ctx, c, t, lv) {
    var sag = c.mode === 'ground' ? c.sag : 0;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.a);
    // shadow glow when jets are on
    if (c.jets) {
      ctx.save();
      [-30, 30].forEach(function (nx) {
        var len = 38 + Math.random() * 18;
        var g = ctx.createLinearGradient(0, 18, 0, 18 + len);
        g.addColorStop(0, 'rgba(255,255,255,0.95)');
        g.addColorStop(0.4, 'rgba(120,200,255,0.7)');
        g.addColorStop(1, 'rgba(120,200,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(nx - 7, 18); ctx.lineTo(nx + 7, 18); ctx.lineTo(nx + 2, 18 + len); ctx.lineTo(nx - 2, 18 + len);
        ctx.fill();
      });
      ctx.restore();
    }
    // wheels
    var spin = (c.mode === 'ground' ? c.s : (c.mode === 'rails' ? c.s : c.vx)) * 0.016;
    wheelAngle += spin * 0.016;
    [-36, 36].forEach(function (wx) {
      ctx.save();
      ctx.translate(wx, 5);
      ctx.fillStyle = '#0d0d12';
      ctx.beginPath(); ctx.arc(0, 0, 15, 0, 7); ctx.fill();
      ctx.rotate(wheelAngle);
      ctx.fillStyle = '#c9d2e6';
      ctx.beginPath(); ctx.arc(0, 0, 9, 0, 7); ctx.fill();
      ctx.strokeStyle = '#59607a'; ctx.lineWidth = 2;
      for (var k = 0; k < 5; k++) {
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(9 * Math.cos(k * 1.2566), 9 * Math.sin(k * 1.2566)); ctx.stroke();
      }
      ctx.restore();
    });
    // body
    var bg = ctx.createLinearGradient(0, -14, 0, 14);
    bg.addColorStop(0, '#ff5a4a'); bg.addColorStop(0.6, '#d3202a'); bg.addColorStop(1, '#7d1018');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(-63, 8);
    ctx.lineTo(-62, -5);
    ctx.quadraticCurveTo(-48, -12, -22, -12);
    ctx.lineTo(8, -12);
    ctx.quadraticCurveTo(40, -8, 62, 0);
    ctx.lineTo(63, 9);
    ctx.quadraticCurveTo(56, 14, 48, 14);
    ctx.lineTo(-52, 14);
    ctx.quadraticCurveTo(-62, 14, -63, 8);
    ctx.closePath();
    ctx.fill();
    // wheel arches
    ctx.fillStyle = '#0d0d12';
    [-36, 36].forEach(function (wx) {
      ctx.beginPath(); ctx.arc(wx, 4, 16, Math.PI, 0); ctx.fill();
    });
    [-36, 36].forEach(function (wx) {
      ctx.fillStyle = '#c9d2e6';
      ctx.beginPath(); ctx.arc(wx, 5, 8, 0, 7); ctx.fill();
      ctx.fillStyle = '#59607a';
      ctx.beginPath(); ctx.arc(wx, 5, 3, 0, 7); ctx.fill();
    });
    // stripe
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-56, -2); ctx.lineTo(44, -2); ctx.stroke();
    // windscreen + driver
    ctx.fillStyle = 'rgba(160,220,255,0.75)';
    ctx.beginPath(); ctx.moveTo(8, -12); ctx.lineTo(0, -22); ctx.lineTo(4, -22); ctx.lineTo(20, -10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2a2a3a';
    ctx.fillRect(-18, -16, 14, 6);
    ctx.fillStyle = '#f2f2f2';
    ctx.beginPath(); ctx.arc(-8, -20, 6.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#1b1b30';
    ctx.fillRect(-6, -22, 6, 4);
    // lights
    ctx.fillStyle = '#fff6b0';
    ctx.beginPath(); ctx.ellipse(58, 1, 5, 3, 0.2, 0, 7); ctx.fill();
    ctx.fillStyle = '#ff2a2a';
    ctx.fillRect(-63, -3, 3, 6);
    // jet nozzles
    ctx.fillStyle = '#9aa4c0';
    [-30, 30].forEach(function (nx) { ctx.fillRect(nx - 5, 13, 10, 4); });
    ctx.restore();
  }

  function drawGhost(ctx, ghost) {
    if (!ghost || ghost.trace.length < 2) return;
    var ok = ghost.result === 'land';
    ctx.save();
    ctx.setLineDash([6, 10]);
    ctx.lineWidth = 4;
    ctx.strokeStyle = ok ? 'rgba(120,255,170,0.85)' : 'rgba(255,100,100,0.85)';
    ctx.beginPath();
    ctx.moveTo(ghost.trace[0][0], ghost.trace[0][1]);
    for (var i = 1; i < ghost.trace.length; i++) ctx.lineTo(ghost.trace[i][0], ghost.trace[i][1]);
    ctx.stroke();
    ctx.setLineDash([]);
    var last = ghost.trace[ghost.trace.length - 1];
    ctx.fillStyle = ok ? '#7dffb0' : '#ff6464';
    ctx.beginPath(); ctx.arc(last[0], Math.min(last[1], -4), 7, 0, 7); ctx.fill();
    ctx.restore();
  }

  function drawPickups(ctx, lv, t) {
    for (var i = 0; i < lv.pickups.length; i++) {
      var p = lv.pickups[i];
      if (p.got) continue;
      var bob = Math.sin(t * 3 + i) * 5;
      ctx.save();
      ctx.translate(p.x, p.y + bob);
      if (p.kind === 'star') {
        ctx.fillStyle = '#ffd23f';
        ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = 14;
        ctx.rotate(t * 1.5);
        ctx.beginPath();
        for (var k = 0; k < 10; k++) {
          var r = k % 2 ? 8 : 18;
          var a = k * Math.PI / 5;
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath(); ctx.fill();
      } else {
        ctx.fillStyle = '#4cc9ff';
        ctx.shadowColor = '#4cc9ff'; ctx.shadowBlur = 16;
        rr(ctx, -10, -17, 20, 34, 6); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 0;
        ctx.fillRect(-4, -22, 8, 6);
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#0b2a4a';
        ctx.fillText('AIR', 0, 4);
      }
      ctx.restore();
    }
  }

  function drawParticles(ctx, parts) {
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      var k = p.life / p.max;
      ctx.globalAlpha = Math.max(0, k);
      ctx.fillStyle = p.color;
      if (p.kind === 'confetti') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillRect(-p.size, -p.size / 2, p.size * 2, p.size);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (p.grow ? (2 - k) : k + 0.3), 0, 7);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawWorld(ctx, g, t) {
    var lv = g.lv, cam = g.cam, zoom = cam.zoom;
    drawBackground(ctx, cam, t);
    ctx.save();
    ctx.translate(W / 2, H * 0.64);
    ctx.scale(zoom, zoom);
    ctx.translate(-cam.x, -cam.y);
    drawRoad(ctx, cam, zoom, lv, t);
    drawKicker(ctx, lv);
    drawCurl(ctx, lv, t);
    for (var i = 0; i < lv.cars.length; i++) drawParked(ctx, lv.cars[i], false);
    drawPickups(ctx, lv, t);
    drawGhost(ctx, g.ghost);
    if (g.car.mode !== 'crashed') drawPlayer(ctx, g.car, t, lv);
    drawParticles(ctx, g.parts);
    ctx.restore();
  }

  // ---- HUD
  function bar(ctx, x, y, w, h, v, color, label) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    rr(ctx, x, y, w, h, 6); ctx.fill();
    ctx.fillStyle = color;
    rr(ctx, x + 3, y + 3, Math.max(0, (w - 6) * Math.max(0, Math.min(1, v))), h - 6, 4); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 8, y + h - 7);
  }

  function drawHUD(ctx, g, t) {
    var c = g.car, lv = g.lv;
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    rr(ctx, 16, 14, 330, 74, 10); ctx.fill();
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('Level ' + (lv.index + 1) + ': ' + lv.name, 30, 42);
    ctx.fillStyle = '#fff';
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText('Score ' + (g.score + g.levelScore), 30, 70);
    // lives
    for (var i = 0; i < g.lives; i++) {
      ctx.fillStyle = '#ff4a4a';
      ctx.fillRect(250 + i * 20, 56, 14, 8);
      ctx.fillStyle = '#ffd';
      ctx.fillRect(254 + i * 20, 52, 6, 5);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Best ' + g.best + '   [M] sound   [T] path hint ' + (g.showGhost ? 'on' : 'off') + '   [R] restart level', W - 18, 28);
    ctx.textAlign = 'left';

    // speed + air
    var sp = c.mode === 'air' ? Math.hypot(c.vx, c.vy) : Math.abs(c.s);
    bar(ctx, W / 2 - 230, H - 52, 220, 28, sp / 1300, '#ff8a3d', 'SPEED ' + Math.round(sp * 0.18) + ' km/h');
    bar(ctx, W / 2 + 10, H - 52, 220, 28, c.fuel, '#4cc9ff', 'AIR TANK ' + Math.round(c.fuel * 100) + '%');

    // hint line
    var hint = '';
    if (c.mode === 'ground' && c.stage === 0) hint = 'Hold RIGHT to accelerate. Hit the kicker fast enough to clear the cars, but not so fast you overshoot the landing zone.';
    else if (c.mode === 'ground' && c.stage === 2) hint = 'Cars cleared! Get to the curl at 150+ km/h (green path = good). RIGHT to speed up, DOWN to brake.';
    else if (c.mode === 'air' && c.flight === 1) hint = 'In the air: LEFT / RIGHT spin, UP lift jets, DOWN stabilise. Land on your wheels!';
    else if (c.mode === 'air' && c.flight === 2) hint = 'Upside down! Use the air jets to finish the loop and land on your wheels in the landing zone.';
    if (hint && g.state === 'play') {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.font = '16px system-ui, sans-serif';
      var tw = ctx.measureText(hint).width + 28;
      rr(ctx, W / 2 - tw / 2, H - 92, tw, 28, 8); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(hint, W / 2, H - 73);
    }

    // popups
    ctx.textAlign = 'center';
    for (var k = 0; k < g.popups.length; k++) {
      var p = g.popups[k];
      var a = Math.min(1, p.life / 0.5);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.font = 'bold 34px system-ui, sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 8;
      ctx.fillText(p.text, W / 2, 150 + k * 42 - (1.8 - p.life) * 12);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;

    if (g.state === 'ready') {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 120px system-ui, sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 16;
      ctx.fillText(g.countText, W / 2, H / 2 - 20);
      ctx.shadowBlur = 0;
    }
  }

  root.RRRender = { W: W, H: H, drawWorld: drawWorld, drawHUD: drawHUD };
})(window);
