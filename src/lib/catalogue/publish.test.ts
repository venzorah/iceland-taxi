import assert from 'node:assert/strict'
import test from 'node:test'
import { OFFICIAL_CATALOGUE_VERSION, publishOfficialCatalogue } from './publish'

test('a start after the price list is live does not write again', async () => {
  let writes = 0
  const db = {
    siteBlock: {
      findUnique: async () => ({ value: OFFICIAL_CATALOGUE_VERSION }),
      upsert: async () => { writes += 1 },
    },
  }
  const result = await publishOfficialCatalogue(db as never)
  assert.deepEqual(result, { applied: false, reason: 'already-live' })
  assert.equal(writes, 0)
})
