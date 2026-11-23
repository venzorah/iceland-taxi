export type ToastKind = 'success' | 'error' | 'info' | 'warning'
export function noticeKind(message: string): ToastKind | null {
  if (!message.trim() || /^(loading|saving|sending|publishing|preparing|working)\b/i.test(message) || /^\d+ (payments|bookings|changes)\b/i.test(message)) return null
  if (/\b(could not|failed|incorrect|invalid|error|expired|too many|must|required|cannot|not available|unavailable)\b/i.test(message)) return 'error'
  if (/^(if\b|check\b|enter\b|requesting\b)|\b(unpaid|not verified|awaiting|pending)\b/i.test(message)) return 'info'
  if (/\b(saved|sent|deleted|updated|confirmed|created|published|restored|activated|paused|archived|cancelled|removed|successfully)\b/i.test(message)) return 'success'
  return 'info'
}
export function notify(message: string, kind: ToastKind = 'info') {
  if (typeof window !== 'undefined' && message.trim()) window.dispatchEvent(new CustomEvent('itb-toast', { detail: { message, kind } }))
}
