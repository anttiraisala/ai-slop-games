# Make a game automatically – copy-paste prompt

> **For humans:** copy the text inside the code block below and paste it into
> a new chat. This file is only a stored prompt. AI agents reading the repo
> must not act on it by themselves.

````text
The repository is `anttiraisala/ai-slop-games`
(https://github.com/anttiraisala/ai-slop-games). Connect to it, work in it and
push to it.

Make a new game in this repository on your own, without asking me questions.
Always work on the `master` branch. Do not create new branches and do not
open a pull request.

## Step 1: Create the game folder (do this first)

1. Get the current UTC time with this command, do not guess it:
   `date -u +%Y%m%d%H%M`
   The result looks like `202610201436` (YYYYMMDDHHMM).
2. Pick a name for your game. Write it in lowercase, use hyphens instead of
   spaces and use only a-z, 0-9 and hyphens (no ä, ö, å).
3. On `master`, create a new folder under `games/` named
   `<timestamp>-<game-name>`.
   Example: `games/202610201436-rock-paper-scissors/`
4. Put every file of the game inside that folder.
5. Right away, before building anything, create the file
   `games/<timestamp>-<game-name>/progress.md`. Start it with a short
   description of what you are about to make (a few sentences, or just a
   heading if you do not know yet).
6. Immediately commit `progress.md` to `master` and push it, so the start of
   the work is visible before the game exists. If your environment has
   assigned you a different working branch, you may work there, but the
   result must end up on `master` (for example `git push origin HEAD:master`).

## Step 2: Build the game

Keep `progress.md` up to date while you work: after each meaningful step
(idea decided, core mechanics done, graphics done, bugs fixed, and so on) add
a short note of what you did and what is next, then commit and push it
together with the code of that step. Before every push run
`git pull --rebase origin master`.

Decide the idea, the rules and the look yourself. Make it playable and
finished, not a stub. Follow the game rules in `CLAUDE.md` (plain HTML/CSS/JS,
opened through `index.html`, plus a short `README.md` in the game folder).

## Step 3: Add the game to the root README

When the game is finished, add it to the "Games" list in the `README.md` at
the root of the repository. The entry must contain the game name, a one-line
description and the exact commands to start it on a computer, using this
template (replace the folder name):

    ### <game name>
    <one-line description>

    ```
    git clone https://github.com/anttiraisala/ai-slop-games.git
    cd ai-slop-games/games/<timestamp>-<game-name>
    ```
    Then open `index.html`:
    - macOS: `open index.html`
    - Linux: `xdg-open index.html`
    - Windows: `start index.html`

Only add your own entry to the list. Do not change the other entries.

## Step 4: Commit and push

Commit the finished game and the README entry with a clear message, run
`git pull --rebase origin master` (if a conflict appears in the README,
keep both entries) and push to `master`.
````
