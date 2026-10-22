(() => {
  'use strict';

  // ---------------------------------------------------------------------------
  // Banana Peel Ambush
  // You are a banana peel. Make pedestrians slip. Hold still to hide.
  // ---------------------------------------------------------------------------

  const W = 900;
  const H = 520;
  const SIDEWALK_TOP = 250;
  const SIDEWALK_BOTTOM = 468;
  const GOAL = 5000;
  const HIDE_AFTER = 0.5;       // seconds of stillness before the peel is camouflaged
  const PIGEON_AFTER = 4;       // seconds of stillness before a pigeon shows up
  const DECAY_PER_SECOND = 2.0; // freshness lost every second
  const SLIP_FRESHNESS = 20;    // freshness gained per slip
  const COMBO_WINDOW = 3.2;     // seconds to chain the next slip

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  // ------------------------------- helpers -----------------------------------
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  // ------------------------------- audio -------------------------------------
  let audio = null;
  let muted = false;

  function ensureAudio() {
    if (!audio) {
      try {
        audio = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        audio = null;
      }
    }
    if (audio && audio.state === 'suspended') audio.resume();
  }

  function tone(f0, f1, dur, type, vol, delay) {
    if (!audio || muted) return;
    const t0 = audio.currentTime + (delay || 0);
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(f0, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    gain.gain.setValueAtTime(vol || 0.08, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  const sfx = {
    slip() { tone(1300, 160, 0.55, 'sawtooth', 0.07); tone(200, 90, 0.2, 'square', 0.08, 0.5); },
    honk() { tone(330, 300, 0.18, 'square', 0.09); tone(250, 240, 0.18, 'square', 0.09, 0.05); },
    poke() { tone(140, 50, 0.25, 'triangle', 0.18); },
    peck() { tone(600, 300, 0.07, 'square', 0.06); },
    dodge() { tone(500, 900, 0.12, 'triangle', 0.06); },
    spot() { tone(900, 900, 0.07, 'square', 0.05); },
    win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.2, 'square', 0.08, i * 0.15)); },
    lose() { [400, 330, 260, 180].forEach((f, i) => tone(f, f * 0.9, 0.25, 'sawtooth', 0.08, i * 0.2)); },
    start() { tone(400, 800, 0.15, 'square', 0.06); },
  };

  // ------------------------------- input -------------------------------------
  const keys = {};
  let pointerTarget = null;

  window.addEventListener('keydown', (e) => {
    ensureAudio();
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (e.repeat) { keys[k] = true; return; }
    keys[k] = true;
    if (k === 'm') muted = !muted;
    if (k === 'p' && game.state === 'play') game.paused = !game.paused;
    if (k === ' ' || k === 'enter') {
      if (game.state !== 'play') startGame();
    }
  });
  window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  function canvasPoint(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
  }
  canvas.addEventListener('pointerdown', (e) => {
    ensureAudio();
    if (game.state !== 'play') { startGame(); return; }
    pointerTarget = canvasPoint(e);
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (pointerTarget) pointerTarget = canvasPoint(e);
  });
  const releasePointer = () => { pointerTarget = null; };
  canvas.addEventListener('pointerup', releasePointer);
  canvas.addEventListener('pointercancel', releasePointer);

  // ------------------------------- data --------------------------------------
  const TYPES = {
    walker: { weight: 45, speed: [65, 100], points: 100, alert: true,
      yells: ['WHOA!', 'AAAH!', 'OOF!', 'NOOO!', 'WAAAH!'] },
    texter: { weight: 28, speed: [45, 65], points: 200, alert: false,
      yells: ['MY PHONE!', 'NEW MESSAGE: AAAH', 'NO SIGNAL!', 'UNREAD!'] },
    suit: { weight: 14, speed: [100, 130], points: 300, alert: true,
      yells: ['MY BRIEFCASE!', 'SYNERGY!!', 'LEGAL WILL HEAR OF THIS', 'QUARTERLY LOSS!'] },
    clown: { weight: 8, speed: [80, 100], points: 500, alert: false,
      yells: ['HONK HONK!', 'THE IRONY!', 'PIE?!', 'HONK?!'] },
    granny: { weight: 10, speed: [32, 40], points: 0, alert: false, yells: [] },
  };

  const SHIRTS = ['#d94f4f', '#4f8fd9', '#4fd98c', '#d9a24f', '#a24fd9', '#d94fa2', '#e8e8e8'];
  const SKINS = ['#f5cfa0', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];

  const RANKS = [
    { score: 0, name: 'Fresh Peel' },
    { score: 800, name: 'Mildly Slippery' },
    { score: 1800, name: 'Sidewalk Hazard' },
    { score: 3000, name: 'Local Menace' },
    { score: 4200, name: 'Enemy of Dignity' },
  ];

  // ------------------------------- state -------------------------------------
  const game = {
    state: 'title', // title | play | win | lose
    paused: false,
    time: 0,
    score: 0,
    slips: 0,
    bestCombo: 1,
    freshness: 100,
    combo: 1,
    comboTimer: 0,
    spawnTimer: 1,
    shake: 0,
    peel: null,
    peds: [],
    pigeon: null,
    particles: [],
    texts: [],
    loseReason: '',
    best: 0,
  };

  function newPeel() {
    return { x: W / 2, y: 360, still: 0, hidden: false, squish: 0, wobble: 0 };
  }

  function startGame() {
    sfx.start();
    game.state = 'play';
    game.paused = false;
    game.time = 0;
    game.score = 0;
    game.slips = 0;
    game.bestCombo = 1;
    game.freshness = 100;
    game.combo = 1;
    game.comboTimer = 0;
    game.spawnTimer = 0.8;
    game.shake = 0;
    game.peel = newPeel();
    game.peds = [];
    game.pigeon = null;
    game.particles = [];
    game.texts = [];
    pointerTarget = null;
    addText(W / 2, 300, 'HOLD STILL TO HIDE', '#fff', 2.4, 22);
  }

  // ------------------------------- spawning ----------------------------------
  function chooseType() {
    const entries = Object.entries(TYPES).filter(([name]) => name !== 'granny' || game.time > 12);
    const total = entries.reduce((sum, [, t]) => sum + t.weight, 0);
    let roll = Math.random() * total;
    for (const [name, t] of entries) {
      roll -= t.weight;
      if (roll <= 0) return name;
    }
    return 'walker';
  }

  function spawnPedestrian() {
    const type = chooseType();
    const def = TYPES[type];
    const dir = Math.random() < 0.5 ? 1 : -1;
    game.peds.push({
      type,
      dir,
      x: dir === 1 ? -30 : W + 30,
      y: rand(SIDEWALK_TOP + 40, SIDEWALK_BOTTOM),
      speed: rand(def.speed[0], def.speed[1]) * (1 + Math.min(0.35, game.time / 400)),
      state: 'walk', // walk | jump | slip | done
      t: 0,
      phase: rand(0, 6),
      decided: false,
      immune: false,
      cooldown: 0,
      shirt: pick(SHIRTS),
      skin: pick(SKINS),
      bubble: null,
    });
  }

  // ------------------------------- effects -----------------------------------
  function addText(x, y, text, color, life, size) {
    game.texts.push({ x, y, text, color: color || '#fff', life: life || 1.2, max: life || 1.2, size: size || 18 });
  }

  function burst(x, y, count, colors) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(60, 220);
      game.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80,
        life: rand(0.4, 0.9), max: 0.9, color: pick(colors), size: rand(2, 5),
      });
    }
  }

  // ------------------------------- update ------------------------------------
  function updatePeel(dt) {
    const p = game.peel;
    let dx = 0;
    let dy = 0;
    if (keys['arrowleft'] || keys['a']) dx -= 1;
    if (keys['arrowright'] || keys['d']) dx += 1;
    if (keys['arrowup'] || keys['w']) dy -= 1;
    if (keys['arrowdown'] || keys['s']) dy += 1;
    if (pointerTarget) {
      const tx = pointerTarget.x - p.x;
      const ty = pointerTarget.y - p.y;
      const dist = Math.hypot(tx, ty);
      if (dist > 6) { dx = tx / dist; dy = ty / dist; }
    }
    const len = Math.hypot(dx, dy);
    if (len > 0) {
      dx /= len;
      dy /= len;
      const speed = 150;
      p.x += dx * speed * dt;
      p.y += dy * speed * dt;
      p.still = 0;
      p.wobble += dt * 14;
    } else {
      p.still += dt;
    }
    p.x = clamp(p.x, 24, W - 24);
    p.y = clamp(p.y, SIDEWALK_TOP + 40, SIDEWALK_BOTTOM);
    p.hidden = p.still >= HIDE_AFTER;
    p.squish = Math.max(0, p.squish - dt * 3);
  }

  function slipPedestrian(ped) {
    const def = TYPES[ped.type];
    const p = game.peel;
    ped.state = 'slip';
    ped.t = 0;
    ped.immune = true;
    game.slips++;
    game.combo = game.comboTimer > 0 ? Math.min(5, game.combo + 1) : 1;
    game.comboTimer = COMBO_WINDOW;
    game.bestCombo = Math.max(game.bestCombo, game.combo);
    const gained = def.points * game.combo;
    game.score += gained;
    game.freshness = Math.min(100, game.freshness + SLIP_FRESHNESS);
    game.shake = 0.25;
    p.squish = 1;
    const yell = pick(def.yells);
    ped.bubble = { text: yell, t: 0 };
    addText(ped.x, ped.y - 110, '+' + gained + (game.combo > 1 ? '  x' + game.combo : ''), '#ffe45c', 1.4, 22);
    burst(ped.x, ped.y - 10, 16, ['#ffe45c', '#fff', '#ff9c3b']);
    sfx.slip();
    if (ped.type === 'clown') sfx.honk();
  }

  function updatePedestrians(dt) {
    const peel = game.peel;
    for (const ped of game.peds) {
      ped.cooldown = Math.max(0, ped.cooldown - dt);
      if (ped.state === 'walk') {
        ped.x += ped.dir * ped.speed * dt;
        ped.phase += ped.speed * dt * 0.1;
        const dx = (peel.x - ped.x) * ped.dir; // positive: peel is ahead
        const dy = Math.abs(peel.y - ped.y);
        const def = TYPES[ped.type];

        if (ped.type === 'granny') {
          if (ped.cooldown <= 0 && Math.abs(dx) < 34 && dy < 22) {
            ped.cooldown = 1.6;
            game.freshness -= 25;
            game.shake = 0.3;
            peel.x = clamp(peel.x + ped.dir * 110, 24, W - 24);
            peel.still = 0;
            peel.squish = 1;
            ped.bubble = { text: pick(['BACK IN MY DAY...', 'SHOO!', 'TAKE THAT!', 'LITTERBUG!']), t: 0 };
            addText(peel.x, peel.y - 40, 'POKED! -25', '#ff5a5a', 1.3, 22);
            burst(peel.x, peel.y - 8, 10, ['#ff5a5a', '#c78a2b']);
            sfx.poke();
          }
        } else if (!ped.immune) {
          // Alert pedestrians decide once, right before reaching the peel.
          if (def.alert && !ped.decided && dx > 0 && dx < 48 && dy < 30) {
            ped.decided = true;
            if (!peel.hidden) {
              ped.state = 'jump';
              ped.t = 0;
              ped.bubble = { text: pick(['NICE TRY!', 'I SEE YOU!', 'HA!', 'NOT TODAY!']), t: 0 };
              sfx.spot();
              sfx.dodge();
            }
          }
          if (ped.state === 'walk' && Math.abs(dx) < 15 && dy < 21) {
            slipPedestrian(ped);
          }
        }
      } else if (ped.state === 'jump') {
        ped.t += dt;
        ped.x += ped.dir * ped.speed * 1.3 * dt;
        ped.phase += ped.speed * dt * 0.1;
        if (ped.t >= 0.6) {
          ped.state = 'walk';
          ped.immune = true;
        }
      } else if (ped.state === 'slip') {
        ped.t += dt;
        ped.x += ped.dir * ped.speed * 1.6 * Math.max(0, 1 - ped.t / 1.2) * dt;
        if (ped.t >= 2.3) ped.state = 'walk';
      }
      if (ped.bubble) {
        ped.bubble.t += dt;
        if (ped.bubble.t > 1.6) ped.bubble = null;
      }
    }
    game.peds = game.peds.filter((ped) => ped.x > -80 && ped.x < W + 80);
  }

  function updatePigeon(dt) {
    const peel = game.peel;
    let pg = game.pigeon;
    if (!pg && peel.still > PIGEON_AFTER) {
      const side = Math.random() < 0.5 ? -1 : 1;
      pg = game.pigeon = { x: clamp(peel.x + side * 420, -40, W + 40), y: -30, state: 'in', peckTimer: 0.5, flap: 0, targetX: peel.x + 30, targetY: peel.y + 2 };
      addText(peel.x, peel.y - 50, 'PIGEON!', '#cfd8ff', 1.2, 20);
    }
    if (!pg) return;
    pg.flap += dt * 20;
    if (peel.still < 0.15 && pg.state !== 'out') pg.state = 'out';
    if (pg.state === 'in') {
      const tx = pg.targetX - pg.x;
      const ty = pg.targetY - pg.y;
      const d = Math.hypot(tx, ty);
      if (d < 6) {
        pg.state = 'peck';
      } else {
        pg.x += (tx / d) * 260 * dt;
        pg.y += (ty / d) * 260 * dt;
      }
    } else if (pg.state === 'peck') {
      pg.peckTimer -= dt;
      if (pg.peckTimer <= 0) {
        pg.peckTimer = 0.8;
        game.freshness -= 9;
        peel.squish = 0.8;
        addText(peel.x + 10, peel.y - 28, 'PECK -9', '#ff9c9c', 0.9, 16);
        sfx.peck();
      }
    } else if (pg.state === 'out') {
      pg.y -= 300 * dt;
      pg.x += (pg.x < W / 2 ? -1 : 1) * 120 * dt;
      if (pg.y < -60) game.pigeon = null;
    }
  }

  function update(dt) {
    game.time += dt;
    updatePeel(dt);

    game.spawnTimer -= dt;
    if (game.spawnTimer <= 0) {
      spawnPedestrian();
      game.spawnTimer = Math.max(0.6, 1.7 - game.time * 0.012) * rand(0.7, 1.3);
    }

    updatePedestrians(dt);
    updatePigeon(dt);

    game.comboTimer = Math.max(0, game.comboTimer - dt);
    if (game.comboTimer === 0) game.combo = 1;
    game.freshness -= DECAY_PER_SECOND * dt;
    game.shake = Math.max(0, game.shake - dt);

    for (const pt of game.particles) {
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vy += 400 * dt;
    }
    game.particles = game.particles.filter((pt) => pt.life > 0);
    for (const tx of game.texts) {
      tx.life -= dt;
      tx.y -= 28 * dt;
    }
    game.texts = game.texts.filter((tx) => tx.life > 0);

    if (game.score >= GOAL) {
      endGame('win');
    } else if (game.freshness <= 0) {
      game.freshness = 0;
      game.loseReason = game.pigeon && game.pigeon.state === 'peck'
        ? 'A pigeon ate you. Nobody will ever know.'
        : 'You rotted. Brown. Forgotten.';
      endGame('lose');
    }
  }

  function endGame(result) {
    game.state = result;
    game.best = Math.max(game.best, game.score);
    pointerTarget = null;
    if (result === 'win') sfx.win(); else sfx.lose();
  }

  // ------------------------------- drawing -----------------------------------
  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, 120);
    sky.addColorStop(0, '#7cc8ff');
    sky.addColorStop(1, '#d8f0ff');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, 130);

    // Sun with sunglasses, because why not
    ctx.fillStyle = '#fff3a0';
    ctx.beginPath();
    ctx.arc(780, 52, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.fillRect(765, 45, 14, 8);
    ctx.fillRect(782, 45, 14, 8);
    ctx.fillRect(778, 47, 5, 3);
    ctx.fillStyle = '#c94';
    ctx.beginPath();
    ctx.arc(780, 62, 7, 0.1, Math.PI - 0.1);
    ctx.stroke();

    // Buildings
    const colors = ['#8e5a5a', '#5a6e8e', '#7e8e5a', '#8e7a5a', '#6a5a8e', '#5a8e84'];
    for (let i = 0; i < 6; i++) {
      const bx = i * 150;
      ctx.fillStyle = colors[i];
      ctx.fillRect(bx, 70, 150, 150);
      ctx.fillStyle = '#ffeaa0';
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 4; c++) {
          if ((i + r * 3 + c) % 4 !== 0) ctx.fillRect(bx + 14 + c * 34, 82 + r * 34, 20, 22);
        }
      }
    }
    // Shop awnings
    for (let i = 0; i < 6; i++) {
      const bx = i * 150;
      for (let s = 0; s < 6; s++) {
        ctx.fillStyle = s % 2 ? '#ffffff' : '#e04848';
        ctx.fillRect(bx + 8 + s * 22, 180, 22, 24);
      }
    }

    // Sidewalk
    ctx.fillStyle = '#b9b4ad';
    ctx.fillRect(0, 210, W, 270);
    ctx.strokeStyle = '#a29d96';
    ctx.lineWidth = 2;
    for (let y = 230; y < 480; y += 44) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    for (let x = 0; x < W; x += 90) {
      ctx.beginPath(); ctx.moveTo(x, 210); ctx.lineTo(x, 480); ctx.stroke();
    }

    // Curb and road
    ctx.fillStyle = '#d6d2cb';
    ctx.fillRect(0, 480, W, 10);
    ctx.fillStyle = '#3a3a42';
    ctx.fillRect(0, 490, W, 30);
    ctx.fillStyle = '#e8d44c';
    for (let x = 10; x < W; x += 80) ctx.fillRect(x, 503, 40, 4);
  }

  function drawShadow(x, y, scale) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(x, y + 1, 14 * scale, 5 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function limb(x1, y1, x2, y2, color, width) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // Draws a pedestrian with the feet at the current origin.
  function drawFigure(ped, flail) {
    const d = ped.dir;
    const swing = Math.sin(ped.phase) * (flail ? 0 : 6);
    const pants = ped.type === 'suit' ? '#23232e' : ped.type === 'granny' ? '#6a4a7a' : '#3a4a6b';
    const shirt = ped.type === 'suit' ? '#2c2c3a' : ped.type === 'clown' ? '#ff5fa2' : ped.type === 'granny' ? '#b07ad0' : ped.shirt;

    // legs
    if (flail) {
      const w = Math.sin(game.time * 30) * 8;
      limb(-3, -26, -10 + w, -4, pants, 6);
      limb(3, -26, 10 - w, -6, pants, 6);
    } else {
      limb(-3, -26, -3 + swing, -2, pants, 6);
      limb(3, -26, 3 - swing, -2, pants, 6);
    }
    // shoes
    ctx.fillStyle = ped.type === 'clown' ? '#ffcf1a' : '#1d1d1d';
    const shoeW = ped.type === 'clown' ? 11 : 6;
    if (flail) {
      ctx.fillRect(-14, -8, shoeW, 5);
      ctx.fillRect(8, -10, shoeW, 5);
    } else {
      ctx.fillRect(-3 + swing - 2 + (d > 0 ? 0 : -shoeW + 6), -4, shoeW, 4);
      ctx.fillRect(3 - swing - 2 + (d > 0 ? 0 : -shoeW + 6), -4, shoeW, 4);
    }

    // torso
    ctx.fillStyle = shirt;
    ctx.beginPath();
    ctx.roundRect(-9, -52, 18, 28, 4);
    ctx.fill();
    if (ped.type === 'suit') {
      ctx.fillStyle = '#d33';
      ctx.fillRect(-2, -50, 4, 18);
      ctx.fillStyle = '#fff';
      ctx.fillRect(-4, -52, 8, 3);
    }
    if (ped.type === 'clown') {
      ctx.fillStyle = '#3ad';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.arc(0, -46 + i * 8, 2.5, 0, Math.PI * 2); ctx.fill();
      }
    }

    // arms
    if (flail) {
      const w = Math.sin(game.time * 26) * 10;
      limb(-9, -48, -18, -66 + w, ped.skin, 4);
      limb(9, -48, 18, -66 - w, ped.skin, 4);
    } else if (ped.type === 'texter') {
      limb(d * 6, -46, d * 14, -42, ped.skin, 4);
      limb(-d * 4, -46, d * 12, -40, ped.skin, 4);
      ctx.fillStyle = '#58f';
      ctx.fillRect(d * 12 - 2, -48, 5, 9);
    } else if (ped.type === 'suit') {
      limb(-9, -48, -9 - swing * 0.5, -32, ped.skin, 4);
      limb(9, -48, 9 + swing * 0.5, -32, ped.skin, 4);
      ctx.fillStyle = '#6b3b1b';
      ctx.fillRect(d * 9 - 7 + swing * 0.5, -32, 14, 10);
    } else if (ped.type === 'granny') {
      limb(-9, -48, -9, -32, ped.skin, 4);
      limb(d * 9, -48, d * 15, -34, ped.skin, 4);
      limb(d * 15, -34, d * 17, -2, '#6b4a1b', 3);
    } else {
      limb(-9, -48, -9 - swing, -32, ped.skin, 4);
      limb(9, -48, 9 + swing, -32, ped.skin, 4);
    }

    // head
    const hx = ped.type === 'texter' ? d * 3 : 0;
    const hy = ped.type === 'texter' ? -57 : -60;
    ctx.fillStyle = ped.skin;
    ctx.beginPath();
    ctx.arc(hx, hy, 8, 0, Math.PI * 2);
    ctx.fill();
    // eyes
    ctx.fillStyle = '#111';
    if (flail) {
      ctx.beginPath(); ctx.arc(hx - 3, hy - 1, 2.4, 0, Math.PI * 2); ctx.arc(hx + 3, hy - 1, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#400';
      ctx.beginPath(); ctx.ellipse(hx, hy + 4, 3, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillRect(hx + d * 3 - 1, hy - 2, 2, 3);
    }

    // hair and accessories
    if (ped.type === 'walker' || ped.type === 'texter') {
      ctx.fillStyle = ped.type === 'walker' ? '#3b2a1a' : '#e8c15a';
      ctx.beginPath(); ctx.arc(hx, hy - 3, 8, Math.PI, Math.PI * 2); ctx.fill();
    } else if (ped.type === 'suit') {
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(hx, hy - 3, 8, Math.PI, Math.PI * 2); ctx.fill();
    } else if (ped.type === 'clown') {
      const cols = ['#ff4040', '#40d060', '#4090ff'];
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = cols[i];
        ctx.beginPath(); ctx.arc(hx - 9 + i * 9, hy - 8 + (i === 1 ? -3 : 0), 6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#e22';
      ctx.beginPath(); ctx.arc(hx + (flail ? 0 : d * 7), hy + 1, 3.4, 0, Math.PI * 2); ctx.fill();
    } else if (ped.type === 'granny') {
      ctx.fillStyle = '#ddd';
      ctx.beginPath(); ctx.arc(hx, hy - 3, 8, Math.PI, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(hx - d * 4, hy - 12, 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(hx + d * 3 - 3, hy - 3, 6, 5);
    }
  }

  function drawPedestrian(ped) {
    let lift = 0;
    let rot = 0;
    let flail = false;
    let scale = 1;
    if (ped.state === 'jump') {
      lift = 46 * Math.sin((ped.t / 0.6) * Math.PI);
      scale = 1 - lift / 160;
    } else if (ped.state === 'slip') {
      const t = ped.t;
      if (t < 0.8) {
        lift = 85 * Math.sin((t / 0.8) * Math.PI);
        rot = -ped.dir * (t / 0.8) * (Math.PI * 2 + Math.PI / 2);
        flail = true;
        scale = 1 - lift / 220;
      } else if (t < 1.8) {
        rot = -ped.dir * (Math.PI / 2);
        flail = true;
      } else {
        const k = (t - 1.8) / 0.5;
        rot = -ped.dir * (Math.PI / 2) * (1 - clamp(k, 0, 1));
      }
    }
    drawShadow(ped.x, ped.y, Math.max(0.4, scale));
    ctx.save();
    ctx.translate(ped.x, ped.y - lift - (rot !== 0 ? 28 : 0));
    if (rot !== 0) {
      ctx.rotate(rot);
      ctx.translate(0, 28);
    }
    drawFigure(ped, flail);
    ctx.restore();

    if (ped.bubble) {
      const a = 1 - ped.bubble.t / 1.6;
      ctx.globalAlpha = clamp(a * 2, 0, 1);
      ctx.font = 'bold 14px "Trebuchet MS", Verdana, sans-serif';
      const tw = ctx.measureText(ped.bubble.text).width;
      const bx = clamp(ped.x, tw / 2 + 12, W - tw / 2 - 12);
      const by = ped.y - 92 - lift;
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(bx - tw / 2 - 8, by - 16, tw + 16, 24, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#111';
      ctx.textAlign = 'center';
      ctx.fillText(ped.bubble.text, bx, by);
      ctx.globalAlpha = 1;
    }
  }

  function peelColor(f) {
    // yellow when fresh, brown when rotten
    const t = clamp(1 - f / 100, 0, 1);
    const r = Math.round(lerp(247, 100, t));
    const g = Math.round(lerp(216, 66, t));
    const b = Math.round(lerp(58, 24, t));
    return `rgb(${r},${g},${b})`;
  }

  function drawPeel() {
    const p = game.peel;
    const color = peelColor(game.freshness);
    const sq = 1 + p.squish * 0.25;
    const wob = Math.sin(p.wobble) * (p.still === 0 ? 0.15 : 0);

    drawShadow(p.x, p.y + 4, 1.1);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(wob);
    ctx.scale(sq, 1 / sq);

    if (p.hidden) {
      // camouflage shimmer
      ctx.strokeStyle = 'rgba(120, 255, 160, 0.55)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.ellipse(0, -2, 22, 11, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // three petals
    ctx.fillStyle = color;
    ctx.strokeStyle = 'rgba(60, 30, 0, 0.7)';
    ctx.lineWidth = 1.5;
    const petals = [
      [-1, [-24, -10, -18, 8, -4, 2]],
      [0, [0, -16, 14, -14, 6, 0]],
      [1, [26, -4, 22, 10, 4, 4]],
    ];
    for (const [, c] of petals) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(c[0], c[1], c[2], c[3], c[4], c[5]);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    // inner peel
    ctx.fillStyle = '#f6efc8';
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // stem
    ctx.fillStyle = '#5a4a1a';
    ctx.fillRect(-2, -4, 4, 5);

    // rotten spots
    if (game.freshness < 55) {
      ctx.fillStyle = 'rgba(50, 25, 5, 0.65)';
      ctx.beginPath(); ctx.arc(-12, -2, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(14, 2, 2, 0, Math.PI * 2); ctx.fill();
      if (game.freshness < 30) { ctx.beginPath(); ctx.arc(4, -8, 2.5, 0, Math.PI * 2); ctx.fill(); }
    }

    // face
    ctx.fillStyle = '#111';
    if (p.hidden) {
      // tiny sunglasses
      ctx.fillRect(-7, -3, 6, 3);
      ctx.fillRect(1, -3, 6, 3);
      ctx.fillRect(-1, -2, 2, 1);
    } else {
      ctx.beginPath(); ctx.arc(-3, -1.5, 1.4, 0, Math.PI * 2); ctx.arc(3, -1.5, 1.4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, 2, 2.2, 0.2, Math.PI - 0.2); ctx.stroke();
    }
    ctx.restore();

    if (p.hidden) {
      ctx.font = 'bold 11px "Trebuchet MS", Verdana, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(120, 255, 160, 0.95)';
      ctx.fillText('HIDDEN', p.x, p.y - 20);
    }
  }

  function drawPigeon() {
    const pg = game.pigeon;
    if (!pg) return;
    const flying = pg.state !== 'peck';
    const peckDip = pg.state === 'peck' ? Math.max(0, Math.sin(game.time * 14)) * 5 : 0;
    ctx.save();
    ctx.translate(pg.x, pg.y);
    if (!flying) drawShadow(0, 6, 0.8);
    // legs
    if (!flying) {
      limb(-3, 2, -3, 8, '#e08a8a', 2);
      limb(3, 2, 3, 8, '#e08a8a', 2);
    }
    // body
    ctx.fillStyle = '#8a8fa6';
    ctx.beginPath(); ctx.ellipse(0, -2, 13, 8, 0, 0, Math.PI * 2); ctx.fill();
    // wing
    const wingY = flying ? Math.sin(pg.flap) * 10 : 0;
    ctx.fillStyle = '#6c7188';
    ctx.beginPath(); ctx.ellipse(-3, -4 - wingY * 0.4, 9, flying ? 4 + Math.abs(wingY) * 0.5 : 5, -0.3, 0, Math.PI * 2); ctx.fill();
    // head
    ctx.fillStyle = '#7a8fb8';
    ctx.beginPath(); ctx.arc(-11, -8 + peckDip, 6, 0, Math.PI * 2); ctx.fill();
    // beak
    ctx.fillStyle = '#f0a030';
    ctx.beginPath();
    ctx.moveTo(-16, -9 + peckDip); ctx.lineTo(-23, -6 + peckDip * 1.5); ctx.lineTo(-16, -6 + peckDip);
    ctx.fill();
    // eye
    ctx.fillStyle = '#f33';
    ctx.beginPath(); ctx.arc(-13, -10 + peckDip, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawHud() {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    // top bar
    ctx.fillStyle = 'rgba(20, 10, 30, 0.75)';
    ctx.fillRect(0, 0, W, 52);

    ctx.font = 'bold 16px "Trebuchet MS", Verdana, sans-serif';
    ctx.fillStyle = '#ffe45c';
    ctx.fillText('HUMILIATION  ' + game.score + ' / ' + GOAL, 14, 21);
    ctx.fillStyle = '#333';
    ctx.fillRect(14, 29, 280, 12);
    ctx.fillStyle = '#ff6a3d';
    ctx.fillRect(14, 29, 280 * clamp(game.score / GOAL, 0, 1), 12);
    ctx.strokeStyle = '#ffe45c';
    ctx.lineWidth = 1;
    ctx.strokeRect(14, 29, 280, 12);

    // freshness
    ctx.fillStyle = '#ffe45c';
    ctx.fillText('FRESHNESS', 330, 21);
    ctx.fillStyle = '#333';
    ctx.fillRect(330, 29, 200, 12);
    const f = clamp(game.freshness / 100, 0, 1);
    ctx.fillStyle = f > 0.5 ? '#6adf5a' : f > 0.25 ? '#e0c030' : '#e04030';
    ctx.fillRect(330, 29, 200 * f, 12);
    ctx.strokeStyle = '#ffe45c';
    ctx.strokeRect(330, 29, 200, 12);

    // rank
    let rank = RANKS[0].name;
    for (const r of RANKS) if (game.score >= r.score) rank = r.name;
    ctx.textAlign = 'right';
    ctx.fillStyle = '#d9c9f0';
    ctx.font = '14px "Trebuchet MS", Verdana, sans-serif';
    ctx.fillText('Rank: ' + rank, W - 14, 21);
    ctx.fillText('Slips: ' + game.slips + (muted ? '   [muted]' : ''), W - 14, 41);

    // combo
    if (game.combo > 1) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 26px "Trebuchet MS", Verdana, sans-serif';
      ctx.fillStyle = '#ff9c3b';
      ctx.fillText('COMBO x' + game.combo, 640, 40);
      ctx.fillStyle = '#ff9c3b';
      ctx.fillRect(560, 44, 160 * (game.comboTimer / COMBO_WINDOW), 3);
    }

    // stillness warning
    const p = game.peel;
    if (p.still > PIGEON_AFTER - 1.5 && !game.pigeon && game.state === 'play') {
      ctx.textAlign = 'center';
      ctx.font = 'bold 15px "Trebuchet MS", Verdana, sans-serif';
      ctx.fillStyle = '#cfd8ff';
      ctx.fillText('pigeons are watching...', p.x, p.y + 30);
    }
  }

  function drawOverlay(title, lines, color, top, lineGap = 30) {
    ctx.fillStyle = 'rgba(15, 5, 25, 0.82)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.font = 'bold 52px "Trebuchet MS", Verdana, sans-serif';
    ctx.fillText(title, W / 2, top || 170);
    ctx.font = '20px "Trebuchet MS", Verdana, sans-serif';
    let y = (top || 170) + 50;
    for (const line of lines) {
      if (line.startsWith('!')) {
        ctx.fillStyle = '#ffe45c';
        ctx.font = 'bold 22px "Trebuchet MS", Verdana, sans-serif';
        ctx.fillText(line.slice(1), W / 2, y);
        ctx.font = '20px "Trebuchet MS", Verdana, sans-serif';
      } else {
        ctx.fillStyle = '#e8ddf8';
        ctx.fillText(line, W / 2, y);
      }
      y += lineGap;
    }
  }

  function drawTitle() {
    // a slowly bobbing peel on the title screen
    game.peel = game.peel || newPeel();
    const t = performance.now() / 1000;
    game.peel.x = W / 2;
    game.peel.y = 440 + Math.sin(t * 2) * 4;
    game.peel.hidden = Math.floor(t / 2) % 2 === 1;
    game.peel.squish = 0;
    game.peel.wobble = 0;
    game.peel.still = 1;
    drawPeel();
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px "Trebuchet MS", Verdana, sans-serif';
    ctx.fillStyle = '#ffe45c';
    ctx.fillText('Press SPACE or click to begin your career', W / 2, 508);
  }

  function render() {
    ctx.save();
    if (game.shake > 0) {
      const s = game.shake * 14;
      ctx.translate(rand(-s, s), rand(-s, s));
    }
    ctx.clearRect(-20, -20, W + 40, H + 40);
    drawBackground();

    if (game.state === 'title') {
      drawOverlay('BANANA PEEL AMBUSH', [
        'You are a banana peel.',
        'Your only purpose: make pedestrians slip.',
        '',
        '!Hold still for half a second to become invisible.',
        'Moving peels get spotted and jumped over.',
        'Texters and clowns never look down.',
        'Avoid Granny\'s cane. Avoid pigeons. Avoid rotting.',
        'Reach ' + GOAL + ' humiliation points to win.',
      ], '#ffe45c', 120, 26);
      drawTitle();
      ctx.restore();
      return;
    }

    const drawables = [];
    drawables.push({ y: game.peel.y, draw: drawPeel });
    for (const ped of game.peds) drawables.push({ y: ped.y, draw: () => drawPedestrian(ped) });
    drawables.sort((a, b) => a.y - b.y);
    for (const d of drawables) d.draw();
    drawPigeon();

    for (const pt of game.particles) {
      ctx.globalAlpha = clamp(pt.life / pt.max, 0, 1);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;

    for (const tx of game.texts) {
      ctx.globalAlpha = clamp(tx.life / tx.max * 1.5, 0, 1);
      ctx.font = 'bold ' + tx.size + 'px "Trebuchet MS", Verdana, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#000';
      ctx.strokeText(tx.text, tx.x, tx.y);
      ctx.fillStyle = tx.color;
      ctx.fillText(tx.text, tx.x, tx.y);
    }
    ctx.globalAlpha = 1;

    drawHud();

    if (game.state === 'play' && game.paused) {
      drawOverlay('PAUSED', ['Press P to resume. The pedestrians are waiting.'], '#cfd8ff');
    } else if (game.state === 'win') {
      drawOverlay('SIDEWALK LEGEND!', [
        'You humiliated ' + game.slips + ' innocent pedestrians.',
        'Best combo: x' + game.bestCombo + '   Score: ' + game.score,
        'Your mother would be so proud.',
        '',
        '!Press SPACE or click to slip again',
      ], '#6adf5a');
    } else if (game.state === 'lose') {
      drawOverlay('PEEL OVER', [
        game.loseReason,
        'Slips: ' + game.slips + '   Score: ' + game.score + '   Best: ' + game.best,
        'Goal was ' + GOAL + '. You were ' + Math.max(0, GOAL - game.score) + ' short.',
        '',
        '!Press SPACE or click to be reborn as another peel',
      ], '#ff6a6a');
    }
    ctx.restore();
  }

  // ------------------------------- main loop ---------------------------------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (game.state === 'play' && !game.paused) update(dt);
    render();
    requestAnimationFrame(frame);
  }

  game.peel = newPeel();
  requestAnimationFrame(frame);

  // Small hook for automated testing.
  window.__peelGame = { game, startGame };
})();
