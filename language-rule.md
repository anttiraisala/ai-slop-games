# Language rule

This rule covers the files an AI saves to this repository. It does not
decide what language the game itself shows to the player. Choose that freely.

## Files the rule applies to

All files in a game folder `games/YYYYMMDDHHMM-game-name/` that are committed
to GitHub:

- source code identifiers (variables, functions, classes, CSS classes)
- code comments
- `README.md` and `progress.md` of the game
- file and folder names
- commit messages
- the game's entry in the root `README.md`

## The language

Write all of the above in **English**.

## What the rule does not cover

- Text the player sees in the game (menus, buttons, instructions, story,
  messages). It may be in any language, for example the language that suits
  the game.
- Replies to the user in the chat.

**Everything that goes into the project and its repository must be in English ( with a few exceptions )**, whatever language the conversation with the maintainer is in.

## Default / What must be in English
All content Claude writes to the repository MUST be in English. This covers:
source code, identifiers, code comments, documentation, README files,
commit messages, branch names, PR/MR descriptions, test names, config comments,
and generated reports.

- Source code: identifiers (variables, functions, classes, files, folders), string constants, log messages, error messages and exceptions
- Code comments: inline and block comments, docstrings, JSDoc/KDoc/Javadoc, TODO/FIXME notes
- User-facing text: UI texts, labels, buttons, menus, placeholders, tooltips, notifications, validation messages, empty and error states, in-game text
- Documentation: README, CONTRIBUTING, CHANGELOG, architecture and design documents, ADRs, API docs, setup guides, rule notes
- Configuration and metadata: config file comments, package descriptions, environment variable descriptions
- Tests: test names, descriptions, assertion messages and test data labels
- Data files: data labels, seed data, table and column names, migration descriptions
- Version control: commit messages, branch names, pull request titles and descriptions

## Conversation
- Reply to the maintainer in the language they write in (for example Finnish). This applies to explanations, questions and status updates in the chat.
- Write every project artifact in English, regardless of the chat language.


## Localization

- Do not write Finnish (or any other language) into the UI or code unless the maintainer explicitly asks for localization or i18n support.
- If localization is requested, keep English as the source and default language. Put translations in separate resource files (for example i18n JSON files). Source keys stay in English.

## Preserve user-provided material
- Never translate, rewrite, or "normalize" content the user supplied
  (documents, specs, data files, quoted text, existing files). It keeps its
  original language.
- When editing an existing file, write the new or changed text in the file's
  existing language. Do not convert the file to English.
- When quoting user material inside an English document, keep the quote
  verbatim in the original language and add an English summary if needed.

## Exceptions
Paths listed in `.language-exceptions` (gitignore-style globs) use the
language stated there. Create new content in those paths in that language.
If a task requires new content in a non-English language and the path is not
listed, ask the user once before writing it.

Example `.language-exceptions`:

```
# path-glob  language  note
**/locales/fi/**       fi   Finnish UI strings
**/*.fi.json           fi   Finnish localization
docs/customer/fi/**    fi   Finnish customer-facing docs
```

If the file does not exist, only the default and the preservation rules apply.

## Not covered
Chat replies follow the language the user writes in. This rule applies to
files and repository content only.

## Edge cases
- Proper nouns, product names, legal terms, and domain terms of art
  stay in their original form; add an English gloss on first use in
  English docs.
- If unsure whether a file is user-provided or Claude-generated, check
  `git log` for authorship. If still unclear, treat it as user-provided.

## Consistency check

Before reporting any task as done, verify that no non-English text has slipped into code, comments, docs, UI, data files or commit messages. Fix any such text first.
