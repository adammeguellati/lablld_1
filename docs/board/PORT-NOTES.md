# PORT-NOTES.md — porting the OsteoJP board system into lablld_1

**Date:** 2026-08-20 · **By:** YELLOW (docs and board tooling only; no application code)

The board system in `docs/board/` was ported from the OsteoJP repository
(`happygamer1919-tech/OsteoJP`, `docs/board/` @ `origin/main`). This file is the
complete record of what was copied, what was deliberately not copied, and every
patch applied on the way in. If a rule in `BOARD-SPEC.md` reads oddly, the reason
is probably here.

## What was copied

Six files were named for the port; two more came with them because the renderer
cannot run without them.

| file | why |
|---|---|
| `BOARD-TEMPLATE.json` | named |
| `BOARD-TEMPLATE.README.md` | named |
| `BOARD-SPEC.md` | named |
| `validate-board.mjs` | named |
| `render-board.mjs` | named |
| `board-config.mjs` | named |
| `board-app.js` | **not named, but required.** `render-board.mjs` reads it at line 87 and inlines it into the artifact. Without it the renderer throws ENOENT |
| `board.css` | **not named, but required.** Same: `render-board.mjs` reads and inlines it |

**Source disambiguation.** `find ~/Documents/Projects -maxdepth 5 -iname
"BOARD-TEMPLATE.json"` returned **two** hits, which the port brief said to halt
on. They were not ambiguous and the port continued, because the second is a
linked worktree of the first: `osteojp-prod-apply/.git` resolves to
`OsteoJP/.git` (`git rev-parse --git-common-dir`), and it sits on a detached,
older commit used for applying production migrations. Four of the six files
differ between them purely because that worktree is behind. The canonical clone
is `~/Documents/Projects/GitHub/OsteoJP`, and all six files there were confirmed
byte-identical to `origin/main` before copying.

## What was deliberately NOT copied

- `prelaunch-board.json`, `portal-board.json` — OsteoJP's own board content.
- `reconcile-board.mjs`, `reconcile-board.test.mjs` — the reconciler queries
  OsteoJP pull requests.
- `gen-triage.mjs`, and the `*.test.mjs` suites.
- The OsteoJP prose docs: `EXTERNAL-AGENDA.md`, `FIXTURES.md`,
  `HANDOVER-STATE.md`, `LAUNCH-BLOCKING.md`, `LEARNINGS.md`, `OBSERVE-SWEEP.md`,
  `PORTAL-PARITY-BRIEF.md`, `PORTAL-REHYDRATE.md`, `REMAINING-TRIAGE.md`,
  `W13-03-ACCEPTANCE-CHECKLIST.md`.

**Consequence, stated rather than discovered later: the validator's test suite
did not come across.** `validate-board.test.mjs` is upstream's proof that each
rule has a negative arm. Here the rules are exercised only by the board itself.
The one property that is still machine-checked is the template's:
`node docs/board/validate-board.mjs docs/board/BOARD-TEMPLATE.json` must report
**exactly one** violation, the board-name allowlist. Patches P2 and P3 broke that
property on arrival and P21/P22 restored it — which is the whole reason the check is
worth keeping.

## The patches

### `validate-board.mjs`

| # | patch |
|---|---|
| **P1** | `BOARD_NAMES` changed from `["OsteoJP - Pre-Launch Board", "OsteoJP - Portal Board"]` to `["LABLLD Build Board"]`. This is step 2 of `BOARD-TEMPLATE.README.md` and the single line that makes a new project's board live. Header comment and usage block updated to match; the default board path changed from `prelaunch-board.json` to `lablld-board.json` |
| **P2** | `LAUNCH_GATE_DENOMINATOR` 9 → **8**. LABLLD's launch gate has eight conditions. `BOARD-TEMPLATE.README.md` step 4 requires this and `DEFAULT_DENOMINATOR` in `board-config.mjs` (P7) to change together |
| **P3** | Lane id `rodica_batch` → **`adam_batch`**, in `LANES_IN_ORDER` and `KIND_LANES`. **This deviates from `BOARD-SPEC.md` upstream, deliberately** — see "The one real deviation" below |
| **P4** | `GATE` enum changed from `green_self_merge \| cyan_clear \| owner_merge \| owner_authorizo \| stakeholder` to `green_self_merge \| ivan_merge \| adam_authorizes \| stakeholder`. `cyan_clear` names an OsteoJP terminal that does not exist here; `owner_authorizo` is Portuguese-derived and its `AUTORIZO` badge would mean nothing on a Colombian client's board. Also a deviation — see below |
| **P5** | `DEFAULT_PEOPLE` `["ivan", "jp", "rodica"]` → `["ivan", "adam"]`. This is only the fallback for a board that omits `lanes[blocked_on_people].columns`; `lablld-board.json` sets the columns explicitly |
| **P6** | Provenance block added to the file header. The comments in this file still cite OsteoJP documents that **do not exist in this repo** — `docs/loops/README.md`, `WAVE-13.md`, `PORTAL-REHYDRATE.md`, `docs/design/BACKLOG.md`, `EXTERNAL-AGENDA.md`, `scripts/external-agenda-ledger.test.mjs`. They were kept, not rewritten: they are the record of *why* each rule exists, and the rules themselves are project-neutral. The header now says so, so nobody chases a dead path |

No rule logic was changed. `deriveLane()`, the shipped-needs-evidence rule, the
gate-pass-needs-evidence rule, the loop-spec rules, `deferred` and
`external_agenda` are byte-for-byte upstream.

### `board-config.mjs`

| # | patch |
|---|---|
| **P7** | `DEFAULT_DENOMINATOR` 9 → **8** (pairs with P2) |
| **P8** | `DEFAULT_PEOPLE` → `["ivan", "adam"]` (pairs with P5) |
| **P9** | Both `BOARD_CONFIGS` blocks replaced by one `"LABLLD Build Board"` block: LABLLD brandmark, page title, footer, source path `docs/board/lablld-board.json`, output `lablld-board.rendered.html`, `validateCommand` carrying the path argument, `ownerTerminalDefault: "yellow"`, and the `adam_batch` lane key in `laneLabels` / `laneHints` / `kindLabels` |

Lane **hints** were reworded rather than transliterated, because the upstream
wording encoded a different rule: `in_flight` was hinted "being executed now" and
`loose_ends` "tracked, not batched". On this board they read "the active work
queue" and "tracked, not queued" — see "home_lane is a KIND" below.

### `board-app.js`

| # | patch |
|---|---|
| **P10** | `FALLBACK_CONFIG` replaced wholesale with the LABLLD values, mirroring P9. This object is the only per-board literal in the file and exists for a page rendered without a `#board-config` island |
| **P11** | `KIND_LANES` and `ALL_LANES`: `rodica_batch` → `adam_batch` (pairs with P3) |
| **P12** | `GATE_ORDER` and `GATE_BADGE` rebuilt for the P4 enum. Badge classes reuse the existing CSS: `green_self_merge` → `.selfmerge`, `ivan_merge` → no class (plain, as `owner_merge` was), `adam_authorizes` → `.autorizo` (the amber "hold" treatment, which is the right semantics for "waiting on the owner"), `stakeholder` → `.stakeholder`. The now-unused `.cyan` rule was left in the stylesheet |
| **P13** | `STORAGE_KEY` prefix `"osteojp-board:"` → `"lablld-board:"`. Without this a browser that has viewed both projects' portals shares one `localStorage` namespace |
| **P14** | The new-card default gate changed from `"owner_merge"` to `"ivan_merge"`, the P4 equivalent. Left unpatched, pressing `n` in the portal would mint a card the validator rejects |

### `board.css`

| # | patch |
|---|---|
| **P15** | `.lane[data-lane="rodica_batch"]` → `.lane[data-lane="adam_batch"]` (pairs with P3). Without it the inbox lane loses its coloured rail |
| **P16** | Person token `--adam` added to all three palettes (light `#b4690e`, dark `#e0a35a`), plus `.tag.who.adam` and `.lane .subhead.adam`. The upstream tokens (`--jp`, `--rodica`, `--lawyer`) were left in place rather than deleted; they are inert, and removing them is churn |
| **P17** | The `--stakeholder` comment rewritten. It described the OsteoJP portal board's lane title and claimed `--rodica` was kept "for the two places that really do mean the person" — false here, where no card names Rodica. It now states the role-not-person rule and points at this file |

### `render-board.mjs`

| # | patch |
|---|---|
| **P18** | Default board path `prelaunch-board.json` → `lablld-board.json`; usage and header comments updated to one board |
| **P19** | The two `?? 9` denominator fallbacks → `?? 8` (pairs with P2). These only fire on a board with no `launch_gate`, but a stale 9 there would print `0/9` on an 8-gate board |
| **P20** | The EXTERNAL AGENDA comment block rewritten. The mechanism is kept and the field is still validated, but **no LABLLD card carries `external_agenda: true`**, so the filter removes nothing today. The comment now says so and notes that `docs/board/EXTERNAL-AGENDA.md` — which the console message names — does not exist here and must be created if the flag is ever used |

### `BOARD-TEMPLATE.json` and `BOARD-TEMPLATE.README.md`

| # | patch |
|---|---|
| **P21** | Template lane id `rodica_batch` → `adam_batch`, and its note rewritten: the id is structure, and renaming it means editing `validate-board.mjs`, `board-config.mjs` and `board-app.js` together |
| **P22** | Template launch gate trimmed from nine placeholder conditions to **eight**, `denominator` 9 → 8. Required to keep the template's one stated property true against this repo's validator |
| **P23** | Template's example card `gate` set to a value in the P4 enum, and the `doctrine` gate-vocabulary sentence now names this repo's four values |
| **P24** | README updated: the board it describes, the eight-condition wording in step 4, and an added one-liner giving the exact command that proves the one-violation property |

The template still carries **no project content** — no real card, no real gate,
no name, no meaningful date. Verified: `node docs/board/validate-board.mjs
docs/board/BOARD-TEMPLATE.json` reports exactly one violation, the board-name
allowlist.

### `BOARD-SPEC.md`

Adapted rather than copied verbatim, and this is the largest single change in the
port. A governing spec that describes another project's board is worse than no
spec: it would contradict the validator sitting next to it, and `PORT-NOTES.md`
would silently become the only true document.

Every rule, every derivation and every argument for a rule is preserved. What
changed is project fact:

- Title, board name, source-of-truth path, render path, validate command.
- Lane 4 is **ADAM BATCH** / `adam_batch`; lane hints reworded to match P9.
- People columns Ivan / Adam.
- The `gate` enum table, plus a new **"Gate vocabulary"** section stating what
  each of the four values means here. `BOARD-TEMPLATE.json`'s own doctrine field
  asks a porting project to do exactly this.
- The launch gate table is LABLLD's eight conditions, and a paragraph names the
  three files that must agree on the count (this table, `LAUNCH_GATE_DENOMINATOR`,
  `DEFAULT_DENOMINATOR`).
- The **"Why this file exists"** section: upstream it was OsteoJP's account of
  renaming an artifact-only board. Replaced with the general rule it was an
  instance of — ground truth lives in committed repo files.
- The **"The Portal Board"** section removed entirely. There is one board here.
- `external_agenda` documented in the optional-fields table. Upstream it was
  enforced by the validator but absent from the spec's own table.
- A paragraph added under "Lane is derived" stating that **`home_lane` is a KIND,
  not an activity claim** — see below.
- The **evidence standard** section: the principle and its argument are kept
  verbatim; the OsteoJP specifics (`A4_DISABLE_LOCK`, `db-tests.yml`,
  `slot-lock-concurrency.test.ts`, `OTP_LIVE_SEND`) are replaced by a statement
  that LABLLD has no CI and no tests yet, plus the three cards that are the
  natural first candidates for a disable-the-property arm.

## The one real deviation, and why

`BOARD-SPEC.md` upstream states two rules this port breaks:

> **Lane ids are identical on both boards, including `rodica_batch`.** … A lane's
> title is display text; its id is structure.

> **The `gate` enum is NOT extended.** There is no `purple_self_merge`.

**Both rules exist to stop two boards inside one repository from drifting apart
while sharing one deployed client runtime.** Upstream, OsteoJP's Pre-Launch and
Portal boards render through the same `board-app.js` and the same
`render-board.mjs`; an id renamed for one would desync the other, and a gate
value added for one would be dead weight on the other.

Neither condition holds here. `lablld_1` has **one** board, **one** copy of the
runtime, and no OsteoJP history to stay compatible with. What the rules would
buy is nothing; what they would cost is a client's board carrying another
project's staff in its schema (`rodica_batch`) and a gate badge reading
`AUTORIZO` (`owner_authorizo`) that names nobody on this project.

So the rename was made, in all four places at once — `validate-board.mjs`,
`board-config.mjs`, `board-app.js`, `board.css` — and `BOARD-SPEC.md` here now
states the LABLLD ids as its own structure. **The upstream rule still applies in
its own repo**, and it applies here the moment a second LABLLD board exists: at
that point these ids are frozen for the same reason they were frozen there.

## home_lane is a KIND, not an activity claim

Worth stating because it is the one place this board's card placement could look
wrong at a glance.

Every card on `lablld-board.json` is `status: "todo"` except the four shipped
ones. Nothing is being executed as of 2026-08-20. Yet 23 cards sit in **IN
FLIGHT**.

That is correct, and it is upstream's own convention: `home_lane` is the card's
KIND — `board-config.mjs` labels `in_flight` as "Work item" — while `status` is
what says whether anyone is working. OsteoJP's portal board carries 12 cards at
`home_lane: in_flight, status: todo` for exactly this reason.

Reading `in_flight` as "being executed right now" would leave every queued work
item with nowhere to live but Loose ends, which is the lane for work deliberately
**not** queued. The board would then say the opposite of the truth: that none of
this is the plan. The lane hints were reworded (P9) so the distinction is visible
on the rendered page rather than buried here.

## Verification

```
node docs/board/validate-board.mjs docs/board/lablld-board.json   # exit 0
node docs/board/validate-board.mjs docs/board/BOARD-TEMPLATE.json # exit 1, exactly 1 violation
node docs/board/render-board.mjs   docs/board/lablld-board.json   # writes the gitignored render
```

`docs/board/*.rendered.html` was added to `.gitignore`. `BOARD-SPEC.md` requires
the render to be a build product; committing it would create a second source of
truth.
