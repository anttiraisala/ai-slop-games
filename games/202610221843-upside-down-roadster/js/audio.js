/* Tiny synthesized sound effects (Web Audio, no files). */
(function (root) {
  'use strict';
  var ctx = null, master = null, engine = null, engineGain = null, jetGain = null, noiseBuf = null;
  var muted = false;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      var len = ctx.sampleRate * 1;
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

      engine = ctx.createOscillator();
      engine.type = 'sawtooth';
      engine.frequency.value = 60;
      var f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 700;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engine.connect(f); f.connect(engineGain); engineGain.connect(master);
      engine.start();

      var jet = ctx.createBufferSource();
      jet.buffer = noiseBuf; jet.loop = true;
      var jf = ctx.createBiquadFilter();
      jf.type = 'bandpass'; jf.frequency.value = 2400; jf.Q.value = 0.6;
      jetGain = ctx.createGain();
      jetGain.gain.value = 0;
      jet.connect(jf); jf.connect(jetGain); jetGain.connect(master);
      jet.start();
    } catch (e) { ctx = null; }
  }

  function setEngine(speed01, on) {
    if (!ctx) return;
    var t = ctx.currentTime;
    engine.frequency.setTargetAtTime(55 + speed01 * 380, t, 0.05);
    engineGain.gain.setTargetAtTime(on ? 0.05 + speed01 * 0.07 : 0, t, 0.08);
  }

  function setJet(level) {
    if (!ctx) return;
    jetGain.gain.setTargetAtTime(level * 0.35, ctx.currentTime, 0.03);
  }

  function noise(dur, freq, vol) {
    if (!ctx) return;
    var s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    var f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = freq;
    var g = ctx.createGain();
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(); s.stop(ctx.currentTime + dur);
  }

  function tone(freq, dur, type, vol, delay) {
    if (!ctx) return;
    var t = ctx.currentTime + (delay || 0);
    var o = ctx.createOscillator();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    var g = ctx.createGain();
    g.gain.setValueAtTime(vol || 0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur);
  }

  function sfx(name) {
    if (!ctx) return;
    if (name === 'crash') { noise(0.9, 900, 0.9); tone(70, 0.5, 'sawtooth', 0.3); }
    else if (name === 'land') { noise(0.2, 500, 0.6); tone(90, 0.15, 'sine', 0.3); }
    else if (name === 'launch') { noise(0.35, 3000, 0.3); tone(200, 0.3, 'triangle', 0.1); }
    else if (name === 'star') { tone(880, 0.1, 'square', 0.1); tone(1320, 0.15, 'square', 0.1, 0.07); }
    else if (name === 'tank') { tone(440, 0.1, 'triangle', 0.2); tone(660, 0.1, 'triangle', 0.2, 0.08); tone(990, 0.2, 'triangle', 0.2, 0.16); }
    else if (name === 'bonus') { tone(660, 0.12, 'square', 0.12); tone(880, 0.18, 'square', 0.12, 0.1); }
    else if (name === 'win') { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.25, 'square', 0.14, i * 0.12); }); }
    else if (name === 'beep') { tone(600, 0.1, 'square', 0.1); }
    else if (name === 'go') { tone(1000, 0.3, 'square', 0.12); }
  }

  function toggleMute() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 0.5;
    return muted;
  }

  root.RRAudio = { init: init, setEngine: setEngine, setJet: setJet, sfx: sfx, toggleMute: toggleMute };
})(window);
