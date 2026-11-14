import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiHandler, jsonError, jsonOk } from '@/lib/api'
async function handlePOST(_req: Request) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signOut()
  return error ? jsonError(503, 'SIGNOUT_FAILED', 'Could not sign out. Please try again.') : jsonOk({ ok: true })
}

export const POST = apiHandler(handlePOST)
