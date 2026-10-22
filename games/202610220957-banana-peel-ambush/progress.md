# Progress: Banana Peel Ambush

## Plan
The dumbest game possible: you are a banana peel lying on a sidewalk. Your only
purpose in life is to make pedestrians slip. Hold still to ambush them, because
they dodge anything that moves. Do not rot. Do not get poked by Granny.

## Log
- Idea decided: stealth-ambush on a sidewalk. Moving peels get dodged, still peels are invisible.
- Core mechanics done: pedestrian types (walker, texter, suit, clown, granny), dodge logic, combo, freshness, pigeon.
- Graphics done: canvas-drawn street, stick-figure pedestrians, slip animation, particles, speech bubbles.
- Sound done: WebAudio beeps, mute with M.
- Tested in headless Chromium: no console errors; a simple bot wins in about 100 seconds, so the balance is playable.
- Fixed title screen text overlap and tuned difficulty (spawn rate, hit box, decay).
- Next: add the game to the root README and push.
