import { createClient } from './server'
import { createAdminClient } from './admin'
import { reportOpsFailure } from '../ops-report'

// Next signals redirect(), notFound() and dynamic-rendering detection by
// THROWING, and marks those errors with a digest. Catching one silently is a bug
// dressed as resilience: it swallows control flow the framework needs back.
//
// The reporting seam is what exposed this — a build logged a configuration
// failure for /reset-password that was really Next saying "this route is
// dynamic". A channel that cries wolf on every build is worse than no channel,
// so these are re-thrown and never reported.
function isFrameworkControlFlow(err: unknown): boolean {
  return typeof (err as { digest?: unknown })?.digest === 'string'
}

// The Supabase factories throw synchronously when their env vars are missing or
// malformed, before any network call. Unhandled inside a Server Action, that
// throw reaches the browser as a blank "Application error" page (INC-02), so
// these return null and let the caller fail closed with a readable message.
//
// The cause is no longer swallowed: it goes to lib/ops-report.ts, so a login
// that fails on configuration leaves an operator-visible trace instead of none.

export function safeAdminClient() {
  try {
    return createAdminClient()
  } catch (err) {
    if (isFrameworkControlFlow(err)) throw err
    reportOpsFailure('auth.config', { client: 'admin', message: err instanceof Error ? err.message : String(err) })
    return null
  }
}

export async function safeServerClient() {
  try {
    return await createClient()
  } catch (err) {
    if (isFrameworkControlFlow(err)) throw err
    reportOpsFailure('auth.config', { client: 'server', message: err instanceof Error ? err.message : String(err) })
    return null
  }
}
