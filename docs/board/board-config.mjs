// board-config.mjs - the per-board display configuration, in one place.
//
// PORTED from the OsteoJP board system; see docs/board/PORT-NOTES.md for every
// patch applied. Upstream this file carried two boards (Pre-Launch and Portal)
// and existed so the two could share ONE client runtime (board-app.js) and ONE
// renderer (render-board.mjs) without forking either. LABLLD has one board so
// far; the structure is kept because the argument for it does not depend on the
// count - the first bug fixed in one copy and not the other is a board that lies.
//
// TWO KINDS OF FIELD, and the difference is the whole design:
//
//   JSON-SOURCED, computed by deriveConfig() from the board file, because the
//   JSON already carries the fact in a usable form: `people`, `denominator`,
//   `boardName`.
//
//   PINNED per board, because the JSON does NOT carry it usably. Lane titles in
//   the JSON are shouty ("ADAM BATCH", "IN FLIGHT") while the app's labels are
//   sentence case ("Adam batch", "In flight"); sourcing labels from the titles
//   would rewrite visible platform copy in three places. And deriving a display
//   name from an id turns `adam` into "Adam" only by luck - it turned `jp` into
//   "Jp" upstream, which is why the mapping is explicit.
//
// Zero dependencies, zero side effects: a test can import this without
// rendering anything.

/** The people who can owe an answer, used when a board's lane omits `columns`. */
export const DEFAULT_PEOPLE = ["ivan", "adam"];

/** LABLLD's launch gate: EIGHT go/no-go conditions (BOARD-SPEC.md). Kept in
 *  lock-step with LAUNCH_GATE_DENOMINATOR in validate-board.mjs. */
export const DEFAULT_DENOMINATOR = 8;

// Prose spells the denominator out ("Eight go/no-go conditions", "All eight
// cleared."). Derived from the number so the two can never disagree.
export const NUMBER_WORD = {
  1: "One", 2: "Two", 3: "Three", 4: "Four", 5: "Five",
  6: "Six", 7: "Seven", 8: "Eight", 9: "Nine", 10: "Ten",
};

/**
 * Per-board pinned blocks, keyed on the JSON's own `board` value.
 *
 * The lane IDs are structure; the titles are display text. Upstream pinned the
 * inbox lane's id as `rodica_batch` on both of its boards because they shared
 * one deployed app and an id change in one would have desynced the other. That
 * constraint does not exist here - this repo has one board and no OsteoJP
 * history to stay compatible with - so the id was renamed to `adam_batch`
 * rather than shipping a client's board with another project's person in its
 * schema. See PORT-NOTES.md, patch P3.
 */
export const BOARD_CONFIGS = {
  "LABLLD Build Board": {
    owner: "ivan",
    whoLabels: { ivan: "Ivan", adam: "Adam", infra: "Infra" },
    laneLabels: {
      blocked_on_people: "Blocked on people",
      in_flight: "In flight",
      adam_batch: "Adam batch",
      incidents: "Incidents",
      loose_ends: "Loose ends",
      shipped: "Shipped",
    },
    laneHints: {
      blocked_on_people: "someone owes an answer",
      in_flight: "the active work queue",
      adam_batch: "waiting on an Adam decision",
      incidents: "live problems",
      loose_ends: "tracked, not queued",
      shipped: "done, with proof",
    },
    kindLabels: {
      in_flight: "Work item",
      adam_batch: "Adam decision",
      incidents: "Incident",
      loose_ends: "Loose end",
    },
    brandmark: "LABLLD · Build",
    footerLabel: "lablld · build board",
    briefTitle: "Made in the LABLLD Build Board",
    pageTitle: "LABLLD · Build Board",
    sourcePath: "docs/board/lablld-board.json",
    outputPath: "lablld-board.rendered.html",
    exportFilename: "lablld-board.json",
    validateCommand: "node docs/board/validate-board.mjs docs/board/lablld-board.json",
    ownerTerminalDefault: "yellow",
    ownerTerminalPlaceholder: "yellow / ivan / adam",
    newIdPrefix: "NEW-",
  },
};

/**
 * Merge the JSON-sourced fields over a board's pinned block.
 *
 * `people` comes from the BLOCKED ON PEOPLE lane's own `columns`, the same read
 * validate-board.mjs does, with the same fallback discipline: a board that omits
 * `columns` keeps DEFAULT_PEOPLE.
 *
 * An unknown board name is a hard error. Falling back to the first block would
 * silently brand a second board with this one's identity and point its Export at
 * the wrong file.
 */
export function deriveConfig(board) {
  const name = board && board.board;
  const pinned = BOARD_CONFIGS[name];
  if (!pinned) {
    throw new Error(
      `board-config: no configuration for board "${name}". ` +
        `Known boards: ${Object.keys(BOARD_CONFIGS).map((b) => `"${b}"`).join(", ")}. ` +
        `Add a block to BOARD_CONFIGS rather than falling back, or the board renders under another board's identity.`,
    );
  }

  const lanes = Array.isArray(board.lanes) ? board.lanes : [];
  const peopleLane = lanes.find((l) => l && l.id === "blocked_on_people");
  const people =
    Array.isArray(peopleLane?.columns) && peopleLane.columns.length > 0
      ? peopleLane.columns.slice()
      : (pinned.people ?? DEFAULT_PEOPLE).slice();

  const denominator = board.launch_gate?.denominator ?? DEFAULT_DENOMINATOR;

  return {
    ...pinned,
    boardName: name || "board",
    people,
    // `blocked_on`'s full domain: nobody, this board's people, or infra.
    whoOrder: [null, ...people, "infra"],
    denominator,
    denominatorWord: NUMBER_WORD[denominator] || String(denominator),
  };
}
