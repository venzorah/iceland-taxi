import assert from 'node:assert/strict'
import test from 'node:test'

import { ANNOUNCEMENTS_SEED } from '@/lib/design/announcements'

import { announcementWrites, announcementsFromRows, appearanceFromJson, barWrite, slugify } from './content'

test('announcement saves round-trip text without dropping the Icelandic line', () => {
  const writes = announcementWrites(ANNOUNCEMENTS_SEED)
  assert.ok(writes.length >= 1)
  assert.equal(writes[0]?.textEn, ANNOUNCEMENTS_SEED.items[0]?.text)
  const restored = announcementsFromRows(
    writes.map((row, index) => ({
      id: `row-${index}`,
      textEn: row.textEn,
      textIs: row.textIs,
      href: row.href,
      linkLabel: row.linkLabel,
      enabled: row.enabled,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
    })),
    barWrite(ANNOUNCEMENTS_SEED),
  )
  assert.equal(restored.items[0]?.textIs, ANNOUNCEMENTS_SEED.items[0]?.textIs)
  assert.equal(restored.settings.style, 'navy')
})

test('appearance keeps the official colours when nothing is stored', () => {
  const appearance = appearanceFromJson(null)
  assert.equal(appearance.navy, '#061B3A')
  assert.equal(appearance.yellow, '#FFC400')
  assert.equal(appearance.defaultLang, 'en')
})

test('slugs stay url-safe', () => {
  assert.equal(slugify('Keflavík Airport Transfer'), 'keflavik-airport-transfer')
})
