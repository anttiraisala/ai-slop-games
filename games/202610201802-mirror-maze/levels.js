// Level legend:
//   #  wall
//   .  empty floor
//   > < ^ v  laser source facing that direction (acts as a wall for beams)
//   T  target that must be hit by a beam
//   / \  fixed mirror
//   a  rotatable mirror that starts as "/"
//   b  rotatable mirror that starts as "\"
//   P  prism: beam continues straight and also splits off as a "/" reflection
var LEVELS = [
  { name: "First Light", map: [
    "#######",
    "#.....#",
    "#...bT#",
    "#...\\<#",
    "#######" ] },
  { name: "Two Birds", map: [
    "#########",
    "#.....P.#",
    "#../.a..#",
    "#..T.^.a#",
    "#.......#",
    "#########" ] },
  { name: "Zigzag", map: [
    "#########",
    "#.......#",
    "#./.....#",
    "#a.##..\\#",
    "#...bT..#",
    "#..>b...#",
    "#########" ] },
  { name: "Behind the Wall", map: [
    "##########",
    "#........#",
    "#.#...v..#",
    "#..\\.b/..#",
    "##..aaT..#",
    "#.#......#",
    "##########" ] },
  { name: "Crossfire", map: [
    "###########",
    "#....a....#",
    "#..v#...\\.#",
    "#.........#",
    "#....#./bP#",
    "#..a....b.#",
    "#/.....T..#",
    "###########" ] },
  { name: "Prism Hall", map: [
    "###########",
    "#...../...#",
    "#.......aa#",
    "#..\\/a#T..#",
    "#......a.P#",
    "#......#^.#",
    "#.P....#.T#",
    "###########" ] },
  { name: "Fixed Points", map: [
    "###########",
    "##....../T#",
    "#......#T.#",
    "#.#.b\\#...#",
    "#.>.P....b#",
    "#/........#",
    "#a...b..b.#",
    "###########" ] },
  { name: "Double Agent", map: [
    "############",
    "#..>.a/.#..#",
    "#..........#",
    "#....\\...b.#",
    "#.T...a.P..#",
    "#....\\.#..##",
    "#.a...b..b##",
    "############" ] },
  { name: "The Labyrinth", map: [
    "############",
    "#..../...b.#",
    "#......../.#",
    "#...#..#.v.#",
    "#......b.ab#",
    "#........aP#",
    "#...#\\#...T#",
    "#..#...aT.##",
    "############" ] },
  { name: "Grand Finale", map: [
    "#############",
    "#...T.......#",
    "##./b..b<.#.#",
    "#.T....P#...#",
    "#...\\..a..a.#",
    "#......##...#",
    "#P.b......b.#",
    "#.....#...b\\#",
    "#############" ] }
];
if (typeof module !== "undefined") module.exports = LEVELS;
