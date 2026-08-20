import { createClient } from './server'
import { createAdminClient } from './admin'

// The Supabase factories throw synchronously when their env vars are missing or
// malformed, before any network call. Unhandled inside a Server Action, that
// throw reaches the browser as a blank "Application error" page (INC-02), so
// these return null and let the caller fail closed with a readable message.

export function safeAdminClient() {
  try {
    return createAdminClient()
  } catch {
    return null
  }
}

export async function safeServerClient() {
  try {
    return await createClient()
  } catch {
    return null
  }
}
