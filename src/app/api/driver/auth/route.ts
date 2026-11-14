import { apiHandler, jsonError } from '@/lib/api'
async function handlePOST() { return jsonError(410, 'DEMO_DISABLED', 'Sign in securely at /login?next=/driver.') }
export { POST as DELETE } from '@/app/api/auth/signout/route'

export const POST = apiHandler(handlePOST)
