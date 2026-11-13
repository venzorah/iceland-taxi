export async function endSession() {
  await fetch('/api/auth/demo', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ role: 'logout' }),
  }).catch(() => null)
}

export async function signOutToHome() {
  await endSession()
  window.location.assign('/')
}
