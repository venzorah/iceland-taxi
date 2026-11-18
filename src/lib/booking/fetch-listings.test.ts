import assert from 'node:assert/strict'
import test from 'node:test'
import {fetchPublishedListings} from './fetch-listings'
test('HTML server errors and malformed success bodies produce a controlled catalogue failure',async()=>{
 for(const response of [new Response('<!DOCTYPE html>Internal Server Error',{status:500}),new Response('<!DOCTYPE html>Bad proxy response',{status:200}),Response.json({ok:false}),Response.json({ok:true,listings:null})]){
  await assert.rejects(()=>fetchPublishedListings(undefined,(async()=>response) as typeof fetch),{message:'LISTINGS_UNAVAILABLE'})
 }
})
test('empty and published catalogue responses remain distinct from a failed fetch',async()=>{
 assert.deepEqual(await fetchPublishedListings(undefined,(async()=>Response.json({ok:true,listings:[]})) as typeof fetch),[])
 const listing={id:'saved-route',kind:'route',fromIsk:10000}
 assert.deepEqual(await fetchPublishedListings(undefined,(async()=>Response.json({ok:true,listings:[listing]})) as typeof fetch),[listing])
})
