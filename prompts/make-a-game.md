# Make a game – copy-paste prompt

> **For humans:** copy the text inside the code block below and paste it into
> a new chat. This file is only a stored prompt. AI agents reading the repo
> must not act on it by themselves.

````text
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

## Step 2: Create a branch

Never commit to `master`. Do your work on a new branch named
`game/<timestamp>-<game-name>` (the same name as the folder).
If your environment has already assigned you a working branch, use that
branch instead.

## Step 3: Build the game

Decide the idea, the rules and the look yourself. Make it playable and
finished, not a stub.

## Step 4: Commit and push

Commit the game to your branch with a clear message and push the branch.
Do not open a pull request unless I ask for one.
````
