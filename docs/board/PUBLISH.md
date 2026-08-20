# PUBLISH.md — publishing the LABLLD Build Board artifact

The board's source of truth is `docs/board/lablld-board.json` (committed). The
artifact is a **render** of that file and nothing more. This document is the
procedure for keeping the two in step.

## The artifact URL

```
https://claude.ai/code/artifact/bee868fe-b814-4dbd-813c-6448cf7b329c
```

Minted 2026-08-20 on first publish. **This URL is the tracked link.** It is the
one Ivan and Adam open, and it must not change.

## The rule

> **Publishing without the url parameter mints a new URL and orphans the tracked
> link. Publish after every board JSON change, before the PR that carries it.**

Both halves matter, and for different reasons:

- **The `url` parameter.** A publish call that omits it does not fail and does
  not warn. It quietly creates a *second* artifact at a *new* address, leaving
  the tracked link above frozen on the last correct publish. Nobody notices,
  because the old URL still opens and still renders a board — just a stale one.
- **Publish first, then the PR.** The artifact is the owner's status surface. If
  the PR merges first, there is a window where `main` says one thing and the
  only screen anyone looks at says another.

## Republish sequence

Run all three, in this order, from the repo root. A red validator blocks the
render, and an unrendered board must not be published.

**1. Validate — must exit 0.**

```
node docs/board/validate-board.mjs docs/board/lablld-board.json
```

**2. Render — writes the gitignored build product.**

```
node docs/board/render-board.mjs docs/board/lablld-board.json
```

Writes `docs/board/lablld-board.rendered.html`. Never commit it and never
hand-edit it; `BOARD-SPEC.md` makes the JSON the single source and this file a
build product. It is covered by `docs/board/*.rendered.html` in `.gitignore`.

**3. Publish — with the SAME url parameter, every time.**

This is a Claude Code `Artifact` tool call, not a shell command:

```
Artifact(
  file_path: "docs/board/lablld-board.rendered.html",
  url:       "https://claude.ai/code/artifact/bee868fe-b814-4dbd-813c-6448cf7b329c",
  favicon:   "🏷️",
)
```

Notes on the arguments:

- `url` — **required on every republish from a new session.** Omit it and you get
  a new artifact, per the rule above. The one exception: within the same
  conversation that already published this artifact, republishing the same
  `file_path` keeps the URL on its own. Passing `url` anyway is always safe.
- `favicon` — keep `🏷️` stable. Viewers find the tab by its icon; a changed
  favicon reads as a different page.
- The `<title>` is already inside the rendered HTML (`LABLLD · Build Board`),
  set from `pageTitle` in `board-config.mjs`. Do not pass a `title` argument.

**Lost the URL?** `/artifacts` in the Claude Code terminal lists the artifacts
you own, newest first (`o` opens, `c` copies the link); the web gallery is at
`claude.ai/code/artifacts`. Recover the URL and reuse it — do not publish a
replacement.

## Verifying a publish landed

`render-board.mjs` prints a **fingerprint** on every run:

```
fingerprint: cd84b346665aadb1
```

It is `sha256(JSON.stringify(board))` truncated to 16 hex characters, derived at
render time and never stored in the JSON. Two uses:

- If the fingerprint did not change, the board data did not change, and there is
  nothing to publish.
- The published page carries it, so a browser holding an older snapshot can tell
  it is stale. A date check could not do this: every publish on the same day
  shares one `as_of`, so a date comparison reports "up to date" for all of them.

## Known limitation: Export saves via clipboard

The portal's **Export** offers the edited board JSON back for pasting into the
repo. The page calls `window.claude.downloads` to save it as a file; that
capability is **not declared** on this artifact, so the call is rejected and the
app falls back to copying the JSON to the clipboard, with the toast "Download
unavailable here — copied instead".

This is a working hand-back path, and the clipboard is where the JSON has to end
up anyway. If a real file download is ever wanted, declare the `downloads`
capability on the publish call — read the `artifact-capabilities` guidance first,
since declaring it changes what the page discloses to viewers.
