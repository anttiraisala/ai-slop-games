// Pure physics, shared by the game and the solvability test.
var G_CONST = 0.55;     // gravity strength
var MAX_SPEED = 11;     // launch speed at full power
var PROBE_R = 5;
var W = 960, H = 600;

function accel(planets, x, y) {
  var ax = 0, ay = 0;
  for (var i = 0; i < planets.length; i++) {
    var p = planets[i];
    var dx = p.x - x, dy = p.y - y;
    var d2 = dx * dx + dy * dy + 400;
    var d = Math.sqrt(d2);
    var s = (p.type === "anti" ? -1 : 1) * G_CONST * p.r * p.r / d2 / 12;
    ax += s * dx / d; ay += s * dy / d;
  }
  return { x: ax, y: ay };
}

// Advances one step. Returns "crash", "hit", "lost" or null.
function stepProbe(level, pr) {
  var a = accel(level.planets, pr.x, pr.y);
  pr.vx += a.x; pr.vy += a.y;
  pr.x += pr.vx; pr.y += pr.vy;
  for (var i = 0; i < level.planets.length; i++) {
    var p = level.planets[i];
    if (Math.hypot(p.x - pr.x, p.y - pr.y) < p.r + PROBE_R) return "crash";
  }
  var t = level.target;
  if (Math.hypot(t.x - pr.x, t.y - pr.y) < t.r + PROBE_R) return "hit";
  if (pr.x < -200 || pr.x > W + 200 || pr.y < -200 || pr.y > H + 200) return "lost";
  return null;
}

function makeProbe(level, angle, power) {
  var sp = MAX_SPEED * power;
  return { x: level.start.x, y: level.start.y, vx: Math.cos(angle) * sp, vy: Math.sin(angle) * sp };
}

if (typeof module !== "undefined") module.exports = { stepProbe: stepProbe, makeProbe: makeProbe };
