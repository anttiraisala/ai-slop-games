// Level definitions. Planet mass is derived from its radius.
// type: "rock" attracts, "anti" repels (harmless to touch? no: still crashes).
var LEVELS = [
  { name: "First Delivery", shots: 6, start: { x: 90, y: 300 }, target: { x: 850, y: 300, r: 36 },
    planets: [ { x: 470, y: 390, r: 40 } ] },
  { name: "Over the Hill", shots: 6, start: { x: 90, y: 480 }, target: { x: 860, y: 120, r: 34 },
    planets: [ { x: 480, y: 440, r: 55 } ] },
  { name: "Two Worlds", shots: 6, start: { x: 90, y: 300 }, target: { x: 870, y: 300, r: 26 },
    planets: [ { x: 360, y: 190, r: 45 }, { x: 600, y: 420, r: 50 } ] },
  { name: "Repulsion", shots: 6, start: { x: 90, y: 500 }, target: { x: 870, y: 100, r: 34 },
    planets: [ { x: 430, y: 420, r: 36, type: "anti" }, { x: 700, y: 330, r: 36, type: "anti" } ] },
  { name: "Behind the Giant", shots: 7, start: { x: 90, y: 110 }, target: { x: 800, y: 520, r: 32 },
    planets: [ { x: 520, y: 230, r: 80 }, { x: 250, y: 470, r: 28 } ] },
  { name: "Slalom", shots: 7, start: { x: 80, y: 300 }, target: { x: 880, y: 300, r: 24 },
    planets: [ { x: 280, y: 180, r: 40 }, { x: 480, y: 430, r: 42 }, { x: 680, y: 180, r: 40 } ] },
  { name: "Binary Trap", shots: 7, start: { x: 90, y: 540 }, target: { x: 860, y: 90, r: 22 },
    planets: [ { x: 440, y: 260, r: 45 }, { x: 600, y: 370, r: 45 }, { x: 760, y: 220, r: 30, type: "anti" } ] },
  { name: "Grand Tour", shots: 8, start: { x: 70, y: 300 }, target: { x: 890, y: 560, r: 20 },
    planets: [ { x: 250, y: 160, r: 40 }, { x: 330, y: 450, r: 38 }, { x: 560, y: 300, r: 55 },
              { x: 760, y: 480, r: 30, type: "anti" }, { x: 800, y: 150, r: 38 } ] }
];
