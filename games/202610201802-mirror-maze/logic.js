// Pure game logic, shared by the browser and the Node level checker.
var DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // 0 up, 1 right, 2 down, 3 left

// "/" mirror: right->up, up->right, left->down, down->left
var SLASH = [1, 0, 3, 2];
// "\" mirror: right->down, down->right, left->up, up->left
var BACKSLASH = [3, 2, 1, 0];

function parseLevel(def) {
  var grid = [], mirrors = [], sources = [], targets = [];
  def.map.forEach(function (row, y) {
    var line = [];
    for (var x = 0; x < row.length; x++) {
      var c = row[x];
      if (c === "a" || c === "b") {
        mirrors.push({ x: x, y: y, slash: c === "a" });
        c = "m";
      } else if ("^>v<".indexOf(c) >= 0) {
        sources.push({ x: x, y: y, dir: "^>v<".indexOf(c) });
      } else if (c === "T") {
        targets.push({ x: x, y: y });
      }
      line.push(c);
    }
    grid.push(line);
  });
  return { name: def.name, w: grid[0].length, h: grid.length, grid: grid,
           mirrors: mirrors, sources: sources, targets: targets };
}

// Traces all beams. Returns { segments, lit } where segments are
// {x1,y1,x2,y2} in cell coordinates (cell centers) and lit maps "x,y" -> true.
function trace(level, state) {
  var mirrorAt = {};
  level.mirrors.forEach(function (m, i) { mirrorAt[m.x + "," + m.y] = state[i]; });
  var segments = [], lit = {}, seen = {}, queue = [];
  level.sources.forEach(function (s) { queue.push({ x: s.x, y: s.y, dir: s.dir }); });
  while (queue.length) {
    var b = queue.pop();
    var x = b.x, y = b.y, dir = b.dir;
    for (;;) {
      var nx = x + DIRS[dir][0], ny = y + DIRS[dir][1];
      var c = level.grid[ny] && level.grid[ny][nx];
      if (c === undefined || c === "#" || "^>v<".indexOf(c) >= 0) {
        segments.push({ x1: x, y1: y, x2: x + DIRS[dir][0] * 0.5, y2: y + DIRS[dir][1] * 0.5 });
        break;
      }
      segments.push({ x1: x, y1: y, x2: nx, y2: ny });
      x = nx; y = ny;
      var key = x + "," + y + "," + dir;
      if (seen[key]) break;
      seen[key] = true;
      if (c === "T") { lit[x + "," + y] = true; break; }
      if (c === "m") dir = (mirrorAt[x + "," + y] ? SLASH : BACKSLASH)[dir];
      else if (c === "/") dir = SLASH[dir];
      else if (c === "\\") dir = BACKSLASH[dir];
      else if (c === "P") queue.push({ x: x, y: y, dir: SLASH[dir] });
    }
  }
  return { segments: segments, lit: lit };
}

function isSolved(level, state) {
  var r = trace(level, state);
  return level.targets.every(function (t) { return r.lit[t.x + "," + t.y]; });
}

// Minimum number of mirror flips needed to solve (BFS over flip sets), or -1.
function parMoves(level) {
  var n = level.mirrors.length;
  var start = level.mirrors.map(function (m) { return m.slash; });
  var best = -1;
  for (var mask = 0; mask < (1 << n); mask++) {
    var st = start.map(function (v, i) { return (mask >> i & 1) ? !v : v; });
    if (isSolved(level, st)) {
      var bits = 0;
      for (var i = 0; i < n; i++) bits += mask >> i & 1;
      if (best < 0 || bits < best) best = bits;
    }
  }
  return best;
}
if (typeof module !== "undefined") module.exports = { parseLevel: parseLevel, trace: trace, isSolved: isSolved, parMoves: parMoves };
