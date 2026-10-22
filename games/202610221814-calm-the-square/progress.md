# Calm the Square - progress

## Plan
A real-time crisis-desk game set in a fictional French city. Inspired by news
coverage of the student protests and street unrest in France (crumbling
schools, blockades, burning cars, damaged shops). The game is non-partisan and
uses no real people: you run the city crisis desk for seven days and try to
keep the city calm by repairing schools, talking with crowds, putting out
fires and protecting shops.

## Log
- Idea decided, folder created.
- Core logic done (`logic.js`): schools decay, blockade crowds grow angry and
  march on the square, fires and looting drain the calm meter, five player
  tools. Balanced with a simple bot in Node (a careful bot wins 70-90% of runs,
  doing nothing always loses). Next: canvas rendering, HUD and menus.
- Canvas rendering, HUD, toolbar, menu, pause, win and lose screens done
  (`main.js`, `index.html`, `style.css`). Tested in headless Chromium with no
  console errors; idle play loses on day 3 as expected.
- Game README written. Next: add the root README entry and push.
