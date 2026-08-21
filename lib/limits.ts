// Product limits that are BOTH enforced in code and displayed on screen.
//
// They live here, outside any 'use server' module, because a server-action file
// cannot export a plain constant and a limit written twice is a limit that will
// eventually be wrong in one of the two places — always the copy, because the
// check keeps working and nothing fails. See BOARD-SPEC.md, "Copy reads the
// constant that enforces it".

/** Mockup renders per merchant per calendar month. Adam ruling 2026-08-21. */
export const MOCKUP_LIMIT = 6
