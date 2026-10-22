# Upside-Down Roadster

A stunt game: jump a row of parked cars, ride a giant curl ramp upside down and use air jets to land back on your wheels.

## How to play
- Level goal: take off from the kicker ramp and clear all parked cars, land, drive into the curl ramp fast enough to go over the top, then flip with the air jets and land upright in the landing zone before the cars.
- The dotted path shows where the car will go if you stop steering. Green means a clean landing, red means a crash.
- Collect stars for points and blue AIR canisters to refill the air tank.
- Crashing costs a roadster; you have 3. Clearing a level gives a spare one. 6 levels in total.
- Bonus points: flips, full loop, landing quality, air left in the tank, close shave, jumping the cars again on the way back.

## Controls
- Right / D: accelerate (in the air: spin clockwise)
- Left / A: brake and reverse (in the air: spin counter-clockwise)
- Up / W / Space: lift jets in the air
- Down / S: brake on the ground, stabilise spin in the air
- R: restart the level, T: toggle path hint, M: sound on/off, Enter: start / continue
- Touch screens get on-screen buttons.

## Notes
Plain HTML, CSS and JavaScript, no build step. `js/physics.js` holds the physics and level data and can run in Node for testing.
