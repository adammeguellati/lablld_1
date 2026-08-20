# LABLLD Build Board - specification

Governs the **LABLLD Build Board**. Authored by YELLOW (docs and governance).
YELLOW never merges its own PR.

**Ported from the OsteoJP board system.** Every patch applied on the way in is
listed in `docs/board/PORT-NOTES.md`; that file, not this one, is the record of
what changed. Where a rule below carries an argument for itself, the argument is
kept verbatim from upstream because it is the reason the rule exists, not
decoration.

A second file, **`docs/board/BOARD-TEMPLATE.json`**, is this same schema with
every project fact removed: one example card, eight placeholder gates, and typed
placeholder values throughout. It exists so this system can be reused on another
project without copying LABLLD's content, and it **must never carry project
content of its own**. It is not registered in `board-config.mjs` and nothing here
reads it; `validate-board.mjs` reports exactly one violation against it, the
board-name allowlist, which is the single line a new project changes to make its
own board live. See `docs/board/BOARD-TEMPLATE.README.md`.

## Why this file exists

Ground truth lives in committed repo files. A board that lives only as a
claude.ai artifact is not one.

- **Source of truth:** `docs/board/lablld-board.json` (committed).
- **The artifact is a RENDER of the JSON**, nothing more. The JSON leads; the
  artifact follows.
- **A board claim is never truth on its own.** The `evidence` field carries the
  proof. A card that says "shipped" with no evidence is not shipped; it is a lie
  the validator rejects.
- **The executor updates the JSON at every checkpoint and re-renders.** The
  render step never invents state the JSON does not have.

## The board's own definition of done

`docs/board/validate-board.mjs`. Run it from the repo root:

```
node docs/board/validate-board.mjs docs/board/lablld-board.json
```

Exit 0 = the board is well-formed and every shipped/passed claim carries
evidence. Exit non-zero = at least one violation, all printed. This script IS the
board's definition of done: the board is only "green" when the validator is green.
Wire it into CI or a pre-commit hook the same way the app gates run; a red
validator is a red gate. (LABLLD has no CI yet - see card `INFRA-ci-and-tests` -
so today it is run by hand.)

The single non-negotiable rule it enforces: **a card may not enter
`status=shipped` with `evidence=null`** (and, symmetrically, a launch gate may
not be `state=pass` with `evidence=null` - a passed gate without proof is the
same anti-pattern). Zero dependencies, read-only, never writes.

## Card schema

Every entry in `cards[]` has these fields. The first block is required; the
second is optional and a card carrying none of it is an ordinary card.

| field | type | notes |
|---|---|---|
| `id` | string | unique across the board |
| `title` | string | non-empty, plain language |
| `lane` | enum | **DERIVED, never hand-set** - see "Lane is derived" below |
| `home_lane` | enum | the card's KIND: `in_flight` \| `adam_batch` \| `incidents` \| `loose_ends` |
| `priority` | enum | `high` \| `medium` \| `low` (default `medium`) |
| `status` | enum | `todo` \| `in_flight` \| `halted` \| `blocked` \| `shipped` |
| `owner_terminal` | string | which terminal owns the card (yellow / ivan / adam ...) |
| `gate` | enum | `green_self_merge` \| `ivan_merge` \| `adam_authorizes` \| `stakeholder` |
| `evidence` | null or object | `null`, or `{ kind, ref, at }` |
| `blocked_on` | enum | `null` \| `ivan` \| `adam` \| `infra` |
| `last_checkpoint` | ISO 8601 | date or timestamp of the last update to this card |
| `notes` | string | context; quote the reporter verbatim where relevant |

**Optional fields.** Absent on almost every card. Each was added for a rule that
needed somewhere to record its exemption or its payload, and each is validated
only when present.

| field | type | notes |
|---|---|---|
| `open_on_purpose` | string | an explicit exemption: why this card stays open after its evidence exists. Non-empty or absent - a bare `true` would silence a rule without saying why |
| `deferred` | string | an owner ruling that this card is not to be built YET. Non-empty or absent, and it must say who ruled it and when. A shipped card may not carry it. A FIELD and not a sentence in `notes`, because a deferral matched out of prose fails OPEN, and a sweep would then build the deferred thing |
| `external_agenda` | `true` | the owner tracks this somewhere else. The card stays in the JSON (the ledger is the point) but is not rendered and not counted. `true` or absent, never `false` |
| `card_kind` | enum | `loop`. A card that declares itself a loop, so the loop-spec rule below can find it. Absent on an ordinary card |
| `spec` | object | the Loop Package: the seven sections below, each a non-empty string, plus an optional `briefing`. Only valid on a card whose `card_kind` is `loop` |

### The loop spec

**The board card IS the loop spec.** The seven sections are the Loop Package,
keyed: `scope_and_ground_truth`, `ordered_steps`, `definition_of_done`,
`verification`, `restrictions_and_scope_boundary`, `halt_loud_protocol`,
`report_back_format`. `briefing` is an allowed, optional eighth.

**The rule the validator enforces: a loop card at `in_flight` or `shipped` must
carry all seven sections, each non-empty.** A card is ready-or-doing once it has
left `todo` for work. `todo`, `blocked` and `halted` are states of not-working
and owe no spec yet.

**Loop-ness is DECLARED, never inferred from the presence of `spec`.** Inferring
it would fail open in exactly the case the rule names - a loop card with no spec
at all would be indistinguishable from an ordinary card. So the two half-states
are both rejected: a `spec` without `card_kind: "loop"` is a missing marker, and
`card_kind: "loop"` without a full spec is not startable. **What remains open,
and is named rather than papered over:** a loop card authored with neither field
is invisible to the rule, because loop-ness is a fact about intent that nothing
mechanical can read.

`evidence`, when present, is `{ kind, ref, at }`:

- `kind`: `pr` \| `journal` \| `sha256` \| `e2e` \| `screenshot`
- `ref`: non-empty string (PR number, journal entry, hash, spec path, image path)
- `at`: ISO 8601 date or timestamp

## Lane is derived

A card's lane is a FUNCTION of what is true about the card. It is not a field a
human sets, and the validator rejects a file where the two disagree:

```
lane(card) =
  status = shipped                                      -> shipped
  home_lane = in_flight AND status = blocked
                       AND blocked_on in ivan|adam      -> blocked_on_people
  otherwise                                             -> home_lane
```

`home_lane` is the card's KIND and the only lane fact anyone sets: is this a work
item, an incident, something waiting on an Adam decision, or a loose end?
Incidents and inbox items keep their kind while blocked - they are categories,
not states - which is why the derivation only routes `in_flight` work into the
people lane.

**`home_lane` is a KIND, not an activity claim.** A card can sit in `in_flight`
(kind: work item) with `status: "todo"`; the status is what says whether anyone
is executing it. Reading `home_lane: "in_flight"` as "being worked on right now"
would leave every queued work item nowhere to live but Loose ends, which is the
lane for things deliberately NOT queued.

Consequences, and the reason the rule exists:

- Marking a card done MOVES it to Shipped. It cannot sit in "In flight" wearing a
  "Shipped" badge.
- Naming a person on a blocked work item moves it under that person.
- Clearing the blocker moves it back.
- The portal computes this on every change; `validate-board.mjs` computes the
  same function and fails the build if the stored `lane` disagrees. One rule, two
  independent implementations, no drift.

### Rules the validator enforces (beyond field types)

- `status=shipped` requires non-null `evidence`. **No exceptions.**
- `state=pass` (launch gate) requires non-null `evidence`.
- `status=blocked` requires `blocked_on != null` - name who or what we wait on.
- A card in the `blocked_on_people` lane requires `blocked_on` in `ivan | adam`
  (that lane is split by person).
- Card `id`s are unique; gate `id`s are unique.
- `lane` values are real lanes; cards never live in `launch_gate` (the gate has
  its own `conditions[]`).
- `lane` equals `deriveLane(card)` - a stored lane that contradicts the card's own
  status is a red gate, not a cosmetic issue.
- `home_lane` is one of the four KIND lanes; `shipped` and `blocked_on_people` are
  states, so they are never a home.
- `priority` is `high` \| `medium` \| `low`.
- `deferred`, when present, is a non-empty string, and the card is not `shipped`.
- `external_agenda`, when present, is exactly `true`.
- `card_kind`, when present, is `loop`.
- A card carrying `spec` must also carry `card_kind: "loop"`, and every key in
  `spec` must be a Loop Package section with a non-empty string value.
- A `card_kind: "loop"` card at `in_flight` or `shipped` carries all seven
  sections.

## Lanes, in render order

1. **LAUNCH GATE** - the explicit go/no-go conditions, each pass or fail, nothing
   else. Lives in `launch_gate.conditions[]`, not in `cards[]`.
2. **BLOCKED ON PEOPLE** - split into **Ivan / Adam** columns. Answer latency is
   `now - last_checkpoint`, rendered per card so a stalled question is visible.
3. **IN FLIGHT** - the active work queue. Work items, whatever their status.
4. **ADAM BATCH** - the live inbox: cards whose next move is a decision only Adam
   can make. Cards move OUT of this lane into In flight when he rules and the
   work is dispatched. Lane id `adam_batch`.
5. **INCIDENTS** - live incidents.
6. **LOOSE ENDS** - tracked, but deliberately not queued: hygiene, cleanup, open
   questions, deferred work.
7. **SHIPPED** - collapsed by default, **count only**, expandable. Every card
   here carries evidence (the validator guarantees it).

## Launch gate

Eight conditions, each **pass or fail, no partial credit**:

| id | condition |
|---|---|
| G1 | parity - Adam's account registered, seeded, admin + merchant click-through clean on Adam's stack |
| G2 | schema - reconstruction applied, seed applied, no runtime schema errors across the parity test |
| G3 | env-real - all REQUIRED env vars carry real values, zero placeholders in scope (Wompi may stay sandbox until G4) |
| G4 | accounts-owned - Wompi, Resend and the Shopify app under Adam's ownership; the previous developer is not locked out until this passes |
| G5 | security-p0 - `SEC-shopify-fulfillment-endpoint`, `SEC-admin-layout-gate` and `SEC-labels-bucket` all closed |
| G6 | infra-paid - Vercel Pro active, Supabase paid tier with backups active |
| G7 | domain-cutover - `app.lablld.com` serves Adam's Vercel project, auth URLs updated |
| G8 | operator-ready - Adam has run one full PINK card cycle himself, end to end |

**Launch readiness = gates passed / 8.** It is COUNTED, never estimated. It is
NOT a percentage of work done: eight independent conditions, each proven pass
with evidence or it is fail. `launch_gate.readiness_passed` must equal the number
of `state=pass` conditions or the validator fails. Fail-closed: a condition is
`fail` until its evidence exists.

**The gate count is 8, and three files must agree on it:** this table,
`LAUNCH_GATE_DENOMINATOR` in `validate-board.mjs`, and `DEFAULT_DENOMINATOR` in
`board-config.mjs`. The validator fails the board if `launch_gate.denominator`
disagrees with its own constant, which is what stops the three from drifting.

## Gate vocabulary

The `gate` field says who clears the merge. The enum is fixed and its words are
read literally, so this project states what each one means:

| value | meaning |
|---|---|
| `green_self_merge` | an executor terminal merges its own PR once the required checks are green. Routine code and docs work |
| `ivan_merge` | Ivan clears the merge. Anything touching production data, money, credentials, security boundaries, or visual work he reviews on a deployed screen |
| `adam_authorizes` | the owner authorises before anything is built or spent: product decisions, paid-tier upgrades, account ownership changes |
| `stakeholder` | an outside party signs off - Shopify app review, a payment processor, counsel. Reserved; no card carries it yet |

## The portal (what the artifact is)

The artifact is a working surface, not a picture of one. It renders from the JSON
and gives five views over the same data:

| view | what it answers |
|---|---|
| **Focus** | what needs YOU, then what waits on others, then what is moving |
| **Board** | the lanes, with drag-and-drop between them |
| **Launch gate** | the eight go/no-go conditions in full, with their notes |
| **List** | every card, sortable, for scanning |
| **Timeline** | every card by its last checkpoint, newest first |

Interaction rules worth knowing before editing the app:

- **Evidence is enforced in the UI.** Marking a card done, or a gate PASS, opens
  a prompt for the evidence the validator will demand. The portal never records a
  state the repo would reject.
- **Drag-and-drop writes state, not position.** Dropping on Shipped ships the
  card (with the evidence prompt); dropping on Blocked-on-people blocks it and
  names a person; dropping on a kind lane sets its kind and reopens it if it was
  shipped.
- Edits live in the viewer's `localStorage`, keyed by board name + schema
  version. **Export** shows a diff against the committed seed, mirrors the
  validator, and offers the JSON plus a plain-language change brief to hand back.
- Everything is undoable (`Ctrl/Cmd+Z`, or the Undo button), and "Discard local
  changes" restores the committed board exactly.
- Keys: `/` search, `n` new card, `e` export, `u` undo, `1`-`5` views, `Esc` closes.

## Rendering the artifact

The artifact is regenerated FROM this JSON, never hand-edited. To render:

1. Run `node docs/board/validate-board.mjs docs/board/lablld-board.json` - must
   be green first.
2. `node docs/board/render-board.mjs docs/board/lablld-board.json`.
3. It writes `docs/board/lablld-board.rendered.html`, which is **a build product,
   gitignored, and never committed**.
4. Publish that file as the artifact. Update the existing artifact in place
   (`url=` param); never mint a new URL.

If the artifact and the JSON disagree, the JSON wins and the artifact is
re-rendered. The artifact is a mirror, not a second source.

**The fingerprint.** The board does not store one. It is derived at RENDER time
as `sha256(JSON.stringify(board))` truncated to 16 hex characters. It exists so a
browser holding an older snapshot can detect that a newer board was published,
which a date-based check could not do: every publish on the same day carries the
same `as_of`, so a date comparison silently reports "up to date" for all of them.
Storing it in the JSON would make it a hash of a file containing itself; do not
add the key.

## Checkpoint discipline

At every checkpoint: update the affected card(s) in the JSON (status, evidence,
`last_checkpoint`), run the validator, then re-render the artifact. Never mark a
card shipped before its evidence exists - the validator will reject the commit,
which is the point.

---

## Evidence standard: the disable-the-property arm (PREFERRED, not required)

Inherited from the OsteoJP board system, where the strongest evidence artifact on
the project was a concurrency suite that CI ran **twice**: once normally, and
once with the flag that disables the very property the suite exists to prove -
**requiring the second run to FAIL**.

### Why this is the template

A passing test proves the system behaves. **It does not prove the test would
notice if the system stopped.** Every vacuous guard that project catalogued -
counted-but-unasserted assertions, a self-mocking citation, a blanked anti-SQL
assertion, a `getByRole("button")` that could never match a `role="radio"` -
passed happily while proving nothing. **A negative arm is the only thing that
distinguishes an assertion from a sentence.**

What makes the pattern exceptional is that **the arm runs in CI on every commit**,
not once at authoring time. A negative arm proven by hand during a build is
evidence about the day it was run. One in CI is evidence about *today*.

### The standard

> **Any gate row whose property can be disabled by a flag, an env var or a
> one-line edit SHOULD carry a CI arm that disables it and requires the check to
> fail.**

**Preferred, not required**, and deliberately so: not every property has a clean
disable switch, and manufacturing one purely to satisfy a standard adds a
production code path that exists only for a test. Where the switch already exists
- or falls out naturally - use it.

### Where it applies on LABLLD

Nowhere yet: this repo has zero tests and zero CI (`INFRA-ci-and-tests`), so
there is no arm to hang on anything. It is recorded now so that the first suite
written for a gate-bearing property is written with its negative arm, rather than
retrofitted. Candidates once CI exists: the RLS policies (`SEC-apply-rls-policies`
- a policy that is not the boundary passes every read test), the Shopify
fulfillment HMAC check (`SEC-shopify-fulfillment-endpoint`), and the admin layout
gate (`SEC-admin-layout-gate`).

Where it does not fit, the fallback is unchanged and still binding: **negative
arms proven by deletion at authoring time, each recorded with what reddened.**
