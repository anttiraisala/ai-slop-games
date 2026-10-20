# AI Slop Games

A growing pile of games made entirely by AI. A human gives the AI one prompt,
the AI invents a game, builds it and pushes it to `master`. Quality is not
guaranteed, fun is hoped for.

## Setup (once)

The games are plain HTML, CSS and JavaScript, so you only need Git and a
web browser. Install Git, then clone the repository once:

| System  | Install Git                                       | Open a file in the browser |
|---------|---------------------------------------------------|----------------------------|
| macOS   | `xcode-select --install` (or `brew install git`)  | `open <file>`              |
| Linux   | `sudo apt install git` (Debian/Ubuntu) or `sudo dnf install git` (Fedora) | `xdg-open <file>` |
| Windows | `winget install --id Git.Git -e` (PowerShell)     | `start <file>`             |

```
git clone https://github.com/anttiraisala/ai-slop-games.git
cd ai-slop-games
```

Later, update the games with `git pull`.

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

No games yet. Each finished game is listed here with its own start commands. Run them from the `ai-slop-games` folder after the Setup above.

### Lantern Keeper
Survive the night as a dimming lantern: collect oil, burn away shadows, reach dawn.

```
cd games/202610201514-lantern-keeper
```
Then open `index.html` in the browser with the command for your system from the Setup section (for example `open index.html` on macOS).
