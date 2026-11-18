/** A redirect never substitutes for invalidating the verified session. */
export async function endSession() {
  const response = await fetch('/api/auth/signout', { method: 'POST' })
  if (!response.ok) throw new Error('Could not sign out. Please try again.')
  if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel('iceland-taxi-auth')
    channel.postMessage('signed-out'); channel.close()
  }
}
export async function signOutToHome() { await endSession(); window.location.assign('/') }
