import assert from 'node:assert/strict'
import test from 'node:test'
import { createRouteSchema, updateRouteSchema } from './route-schema'
test('route creation rejects incomplete/blank/invalid fields and preserves complete metadata', () => {
 for (const body of [{}, {fromLabel:' ',toLabel:'Airport',fromIsk:1},{fromLabel:'Hotel',toLabel:' ',fromIsk:1},{fromLabel:'Hotel',toLabel:'Airport',fromIsk:0},{fromLabel:'Hotel',toLabel:'Airport',fromIsk:1,minutes:-2}]) assert.equal(createRouteSchema.safeParse(body).success,false)
 const result=createRouteSchema.parse({fromLabel:' Hotel ',toLabel:' Airport ',fromIsk:22900,serviceId:'service',minutes:45,km:49,override:false,returnTrip:true,active:true})
 assert.equal(result.fromLabel,'Hotel');assert.equal(result.toLabel,'Airport');assert.equal(result.minutes,45);assert.equal(result.km,49);assert.equal(result.serviceId,'service');assert.equal(result.override,false)
})
test('route patches clear optional fields, retain omitted values, and reject empty updates', () => {
 assert.deepEqual(updateRouteSchema.parse({serviceId:null,km:null,minutes:null}),{serviceId:null,km:null,minutes:null})
 assert.deepEqual(updateRouteSchema.parse({active:false}),{active:false})
 assert.equal(updateRouteSchema.safeParse({}).success,false)
 assert.equal(updateRouteSchema.safeParse({toLabel:'  '}).success,false)
})
