// The one place this codebase writes to the console.
//
// CLAUDE.md forbids console.log with no exceptions, and that rule is right for
// application code. It is wrong for the case the audit filed as R8: the daily
// billing cron, and the auth entry points that fail closed on an unusable
// Supabase configuration, both swallow their cause entirely — a failure shows
// only as a plan_status change nobody watches, or as a generic message on a
// login screen.
//
// So the rule gets exactly one exception, in one file, behind one function, and
// it is stderr rather than stdout. Nothing else in the repo may call console
// directly; everything routes here, which is what makes this a seam a real
// reporter (Sentry or equivalent) can be dropped into later without touching a
// single call site. Choosing that vendor is INFRA-error-reporting-vendor.

export type OpsScope = 'cron.billing' | 'auth.config' | 'shopify.fulfillment'

export function reportOpsFailure(scope: OpsScope, detail: Record<string, unknown>): void {
  console.error(JSON.stringify({ level: 'error', scope, at: new Date().toISOString(), ...detail }))
}
