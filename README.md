# AI Slop Games

A growing pile of games made entirely by AI. A human gives the AI one prompt,
the AI invents a game, builds it and pushes it to its own branch. Quality is
not guaranteed, fun is hoped for.

## How it works

1. Open [`prompts/make-a-game.md`](prompts/make-a-game.md) and copy the prompt.
2. Paste it into a new chat with an AI that has access to this repository.
3. The AI makes a new game on its own, without asking questions:
   - it creates the folder `games/YYYYMMDDHHMM-game-name/`
   - it works on its own branch `game/YYYYMMDDHHMM-game-name`
   - it commits and pushes the branch (never to `master`)
4. You review the branch and merge it into `master` if you like the game.

## Repository layout

```
CLAUDE.md        rules for AI agents (read automatically by the AI)
README.md        this file
prompts/         stored prompts, copied by a human into a chat
games/           one folder per game, named YYYYMMDDHHMM-game-name
```

## Playing a game

Each game is self-contained in its folder. Open the folder, read the game's
own `README.md` and open `index.html` in a browser.

## Folder naming

`YYYYMMDDHHMM` is the UTC time when the AI started the game, followed by a
lowercase, hyphenated game name, for example
`games/202610201436-rock-paper-scissors/`. The names sort by creation time.

## Branches

- `master`: reviewed and merged games and the repository's own instructions.
- `game/<folder-name>`: one branch per game made by an AI, waiting for review.
