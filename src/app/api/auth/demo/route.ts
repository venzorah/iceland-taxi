import { apiHandler, jsonError } from '@/lib/api'
export { GET } from '@/app/api/auth/session/route'
async function handlePOST() {
  return jsonError(410, 'DEMO_DISABLED', 'Sign in securely at /login.')
}

export const POST = apiHandler(handlePOST)
