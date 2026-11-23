import assert from 'node:assert/strict'
import test from 'node:test'
import { createServiceSchema, updateServiceSchema } from './service-schema'
import { parseListQuery, bookingListWhere, paymentListWhere } from './list-query'
import { matchesAdminSearch } from './list-search'

test('service edits retain translated catalogue metadata and allow explicit clearing', () => {
 const patch={slug:'aurora-tour',titleIs:'Norðurljós',blurbEn:'Evening tour',blurbIs:'Kvöldferð',imageUrl:'https://res.cloudinary.com/example/image/upload/tour.webp',sortOrder:3}
 assert.deepEqual(updateServiceSchema.parse(patch),patch)
 assert.deepEqual(updateServiceSchema.parse({imageUrl:null,blurbIs:null}),{imageUrl:null,blurbIs:null})
 for(const patch of [{},{titleEn:'  '},{slug:'Bad identifier'},{sortOrder:-1},{imageUrl:'javascript:alert(1)'},{imageUrl:'https://secret:password@example.com/x'},{unknown:'field'}]) assert.equal(updateServiceSchema.safeParse(patch).success,false)
 assert.equal(createServiceSchema.safeParse({slug:'tour',kind:'TOUR',titleEn:'Tour'}).success,true)
})
test('database list filters are combined with search before pagination', () => {
 const result=parseListQuery(new URLSearchParams('q=Airport&filter=Needs+driver&status=CAPTURED'))
 assert.equal(result.success,true);if(!result.success)return
 const bookings=bookingListWhere(result.data)
 assert.equal(bookings.status,'CONFIRMED');assert.equal(bookings.driverId,null);assert.equal(bookings.OR?.length,6)
 const payments=paymentListWhere(result.data)
 assert.equal(payments.status,'CAPTURED');assert.equal(payments.OR?.length,3)
 assert.deepEqual(bookingListWhere(parseListQuery(new URLSearchParams()).data!),{})
 for(const query of ['filter=unknown','status=CANCELLED',`q=${'x'.repeat(201)}`]) assert.equal(parseListQuery(new URLSearchParams(query)).success,false)
})
test('admin search supports accents, mixed case and multiple terms', () => {
 assert.equal(matchesAdminSearch('reykjavik airport','Airport → Reykjavík'),true)
 assert.equal(matchesAdminSearch('airport unavailable','Airport → Reykjavík'),false)
 assert.equal(matchesAdminSearch('  ','Tour'),true)
})
