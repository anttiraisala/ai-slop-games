# AI Slop Games

A growing pile of games made entirely by AI. A human gives the AI one prompt,
the AI invents a game, builds it and pushes it to `master`. Quality is not
guaranteed, fun is hoped for.

## Setup (once)

The games are plain HTML, CSS and JavaScript. You need Git, Node.js and a web
browser. Install Git and Node.js once:

| System  | Install Git and Node.js |
|---------|-------------------------|
| macOS   | `brew install git node` (install [Homebrew](https://brew.sh) first if needed) |
| Linux (Debian/Ubuntu) | `sudo apt install git nodejs npm` |
| Linux (Fedora) | `sudo dnf install git nodejs` |
| Windows (PowerShell) | `winget install --id Git.Git -e` and `winget install --id OpenJS.NodeJS.LTS -e` |

Then clone the repository into your home directory (the game commands below
assume it is at `~/ai-slop-games`):

```
cd ~
git clone https://github.com/anttiraisala/ai-slop-games.git
```

Later, update the games with `cd ~/ai-slop-games` and `git pull`.

Every game is started the same way on every system: go to the game's folder,
stop any server left running from an earlier game, and start a new one:

```
cd ~/ai-slop-games/games/<game-folder>
npx --yes kill-port 8080
npx http-server . -p 8080 -c-1 -o
```

The game opens in your browser at `http://localhost:8080`. Stop it with
Ctrl+C. `kill-port` frees port 8080 first, so you never get an older game that
is still being served. `-c-1` turns off caching.

If the game you want is missing or looks old, update the repository first:

```
git -C ~/ai-slop-games pull
```

## How it works

1. Open [`prompts/create-game-autonomously.md`](prompts/create-game-autonomously.md)
   and copy the prompt.
2. Paste it into a new chat with an AI that has access to this repository.
3. The AI makes a new game on its own, without asking questions:
   - it creates the folder `games/YYYYMMDDHHMM-game-name/` on `master`
   - it keeps a `progress.md` in that folder up to date while it works
   - it adds the finished game to the list below

## Repository layout

```
CLAUDE.md        rules for AI agents (read automatically by the AI)
README.md        this file, including the list of games
prompts/         stored prompts, copied by a human into a chat
games/           one folder per game, named YYYYMMDDHHMM-game-name
```

## Folder naming

`YYYYMMDDHHMM` is the UTC time when the AI started the game, followed by a
lowercase, hyphenated game name, for example
`games/202610201436-rock-paper-scissors/`. The names sort by creation time.

## Games

Each finished game is listed here with its own start commands. Do the Setup above first.

### Lantern Keeper
Survive the night as a dimming lantern: collect oil, burn away shadows, reach dawn.

```
git -C ~/ai-slop-games pull   # optional: get the latest games
cd ~/ai-slop-games/games/202610201514-lantern-keeper
npx --yes kill-port 8080
npx http-server . -p 8080 -c-1 -o
```

### Orbit Courier
Slingshot parcels past attracting and repelling planets to the delivery station across 8 levels.

```
cd ~/ai-slop-games/games/202610201548-orbit-courier
npx http-server . -o
```
