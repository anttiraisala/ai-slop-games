# Calm the Square

A real-time crisis-desk game: keep a fictional French city calm for seven days
while crumbling schools, blockades, burning cars and looted shops push the
mood towards chaos. Inspired by news coverage of the student protests and
street unrest in France. The game is non-partisan and uses no real people.

## How to play

- Schools slowly decay. The worse a school gets, the more likely students
  blockade it, and the angrier the crowd becomes.
- Crowds march on the central square. Angry crowds start fires and ransack
  nearby shops. All of this drains the Calm meter.
- Survive all 7 days (30 seconds each) with Calm above zero to win.
- Your budget refills slowly, so choose where to spend it.

## Tools

| Key | Tool | Cost | Effect |
|-----|------|------|--------|
| 1 | Repair school | 25 | Restores a school and cools its crowd a little |
| 2 | Talk | 10 | Cools a crowd; a calm enough crowd disperses |
| 3 | Fire crew | 6 | Puts out a burning car |
| 4 | Guard shop | 12 | Protects a shop for 12 seconds |
| 5 | Police line | 8 | Disperses a crowd instantly, but angers all other crowds |

## Controls

- Mouse or touch: pick a tool, then click or tap the map.
- `1`-`5`: select a tool. `P`: pause. `Enter` or `Space`: start or restart.

## Run

Open `index.html` through a local web server, for example:

```
npx http-server . -p 8080 -c-1 -o
```

## Files

- `logic.js`: game rules and state (no DOM access).
- `main.js`: drawing, input and interface.
- `index.html`, `style.css`: page and styling.
