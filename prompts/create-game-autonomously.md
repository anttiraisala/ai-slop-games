# Make a game automatically – copy-paste prompt

> **For humans:** copy the text inside the code block below and paste it into
> a new chat. This file is only a stored prompt. AI agents reading the repo
> must not act on it by themselves.

````text
The repository is `anttiraisala/ai-slop-games`
(https://github.com/anttiraisala/ai-slop-games). Connect to it, work in it and
push to it.

Never ask me anything. Once you start, work on your own all the way to the
end. If something is unclear, decide it yourself and keep going. You may print
short progress updates while you work, but do not wait for my answers. While
you build the game you may also show me screenshots of it and tell me how the
work is going. When you are done, report the finished game here in the chat
and include the commands for installing and starting it (see Step 4).

Make a new game in this repository on your own.
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
opened through `index.html`, plus a short `README.md` in the game folder) and
the language rule in `language-rule.md` (everything you save to the
repository is in English; the text the player sees in the game is up to you).

## Step 3: Add the game to the root README

When the game is finished, add it to the "Games" list in the `README.md` at
the root of the repository. The general setup (installing Git, cloning the
repository and the per-system command for opening a file in the browser) is
already in the "Setup" section at the top of that README, so do not repeat
it. The entry contains only the game name, a one-line description and the
game-specific commands, using this template (replace the folder name):

    ### <game name>
    <one-line description>

    ```
    cd games/<timestamp>-<game-name>
    ```
    Then open `index.html` in the browser with the command for your system
    from the Setup section (for example `open index.html` on macOS).

If your game needs something beyond the Setup section, put the extra
commands in the entry too.

Only add your own entry to the list. Do not change the other entries.

## Step 4: Commit and push

Commit the finished game and the README entry with a clear message, run
`git pull --rebase origin master` (if a conflict appears in the README,
keep both entries) and push to `master`.

Finally, in your last message in this chat, report the finished game and give
me the install and start commands, the same ones you put in the README entry
plus the setup for my system from the "Setup" section of the README:

    git clone https://github.com/anttiraisala/ai-slop-games.git
    cd ai-slop-games/games/<timestamp>-<game-name>

and then the command that opens `index.html` for macOS, Linux and Windows.
````
