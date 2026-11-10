const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function makeBookingRef(prefix = 'ITB') {
  let out = `${prefix}-`
  for (let i = 0; i < 6; i++) out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  return out
}
