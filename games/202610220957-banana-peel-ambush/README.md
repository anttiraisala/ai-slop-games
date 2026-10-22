# Banana Peel Ambush

You are a banana peel on a sidewalk. Make pedestrians slip. That is the whole game.

## How to play
- Reach **5000 humiliation points** to win.
- Pedestrians walk across the sidewalk. Get in their lane and **hold still for half a second**: the peel puts on sunglasses and becomes invisible.
- A moving (visible) peel gets spotted by walkers and businessmen, who jump over it.
- Texters and clowns never look down, so they slip even if they can see you.
- Slipping someone chains a combo (up to x5) if you do it again within about 3 seconds, and restores freshness.
- Freshness drains all the time. At zero you rot and lose.
- Granny's cane pokes you away and costs freshness. She is immune to peels.
- Stay still for too long and a pigeon arrives to eat you. Move to scare it off.

## Controls
- Arrow keys or WASD: move the peel
- Mouse or touch: press and hold to move toward the pointer
- Space / Enter: start or restart
- P: pause, M: mute

## Points
Walker 100, texter 200, businessman 300, clown 500, all multiplied by the combo.

## Run
No build step. Serve the folder and open `index.html`:

```
npx http-server . -p 8080 -c-1 -o
```
