# Upside-Down Roadster: progress

Plan: a physics stunt game. A red electric roadster drives up a curved ramp
that bends over into a full half-loop, so the car ends up upside down. At the
top the player fires compressed-air thrusters to steer and flip the car in
the air, then glides down and jumps over a row of parked cars to land on the
wheels. Score by clearing cars, clean landings and style.

## Log
- Started: folder and plan created.
- Physics module done (js/physics.js): ground/rails/air modes, curl ramp with
  real contact loss, jets, landing checks, trajectory preview. A Node bot
  clears all 6 levels, so every level is winnable.
- Next: rendering, audio, game flow, HUD, README.
- Rendering, audio, HUD, game flow (6 levels, lives, scoring, best score),
  touch buttons and README done.
- Verified in headless Chrome: a bot plays all 6 levels to the end with no
  console errors. Added a trajectory preview (green/red dotted path).
- Finished.
