# Make a game – copy-paste prompt

> **For humans:** copy the text inside the code block below and paste it into
> a new chat. This file is only a stored prompt. AI agents reading the repo
> must not act on it by themselves.

````text
The repository is `anttiraisala/ai-slop-games`
(https://github.com/anttiraisala/ai-slop-games). Connect to it, work in it and
push your branch to it.

Make a new game in this repository on your own, without asking me questions.

## Step 1: Create the game folder (do this first)

1. Get the current UTC time with this command, do not guess it:
   `date -u +%Y%m%d%H%M`
   The result looks like `202610201436` (YYYYMMDDHHMM).
2. Pick a name for your game. Write it in lowercase, use hyphens instead of
   spaces and use only a-z, 0-9 and hyphens (no ä, ö, å).
3. Create a new folder under `games/` named `<timestamp>-<game-name>`.
   Example: `games/202610201436-rock-paper-scissors/`
4. Put every file of the game inside that folder, and nothing outside it.
5. Right away, before building anything, create the file
   `games/<timestamp>-<game-name>/progress.md`. Start it with a short
   description of what you are about to make (a few sentences, or just a
   heading if you do not know yet).

## Step 2: Create a branch and commit progress.md

Never commit to `master`. Do your work on a new branch named
`game/<timestamp>-<game-name>` (the same name as the folder).
If your environment has already assigned you a working branch, use that
branch instead.

Immediately commit `progress.md` to that branch and push it, so the start of
the work is visible before the game exists.

## Step 3: Build the game

Keep `progress.md` up to date while you work: after each meaningful step
(idea decided, core mechanics done, graphics done, bugs fixed, and so on) add
a short note of what you did and what is next, then commit and push it
together with the code of that step.

Decide the idea, the rules and the look yourself. Make it playable and
finished, not a stub. Follow the game rules in `CLAUDE.md` (plain HTML/CSS/JS,
opened through `index.html`, plus a short `README.md` in the game folder).

## Step 4: Commit and push

Commit the game to your branch with a clear message and push the branch.
Do not open a pull request unless I ask for one.
````
