import { getAuth } from '@/lib/auth/server'
import { apiHandler, jsonError } from '@/lib/api'
export const POST = apiHandler(async (req: Request) => {
  try {
    const auth = getAuth()
    const session = await auth.api.getSession({ headers: req.headers })
    // Preserve the previous global logout behavior; copied session cookies stop working too.
    if (session) await auth.api.revokeSessions({ headers: req.headers })
    return await auth.api.signOut({ headers: req.headers, asResponse: true })
  } catch { return jsonError(503,'SIGNOUT_FAILED','Could not sign out. Please try again shortly.') }
})
