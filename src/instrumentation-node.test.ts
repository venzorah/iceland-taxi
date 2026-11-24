import assert from 'node:assert/strict'
import test from 'node:test'
import { PHASE_PRODUCTION_BUILD } from 'next/constants'
import { publishCatalogueOnStart } from './instrumentation-node'

test('instrumentation only loads publishing dependencies for explicit production-runtime opt-in', async () => {
 const original={...process.env}
 let loads=0, publishes=0
 const load=async()=>{loads++;return async()=>{publishes++;return {applied:false as const,reason:'already-live' as const}}}
 try {
  Object.assign(process.env,{NODE_ENV:'production',DATABASE_URL:'postgresql://fixture:fixture@127.0.0.1:1/unused'})
  delete process.env.PUBLISH_OFFICIAL_CATALOGUE_ON_START
  await publishCatalogueOnStart(load)
  process.env.PUBLISH_OFFICIAL_CATALOGUE_ON_START='false';await publishCatalogueOnStart(load)
  process.env.PUBLISH_OFFICIAL_CATALOGUE_ON_START='true';process.env.NEXT_PHASE=PHASE_PRODUCTION_BUILD;await publishCatalogueOnStart(load)
  delete process.env.NEXT_PHASE;Object.assign(process.env,{NODE_ENV:'development'});await publishCatalogueOnStart(load)
  assert.equal(loads,0);assert.equal(publishes,0)
  Object.assign(process.env,{NODE_ENV:'production'});await publishCatalogueOnStart(load)
  assert.equal(loads,1);assert.equal(publishes,1)
 } finally {for(const key of Object.keys(process.env))if(!(key in original))delete process.env[key];Object.assign(process.env,original)}
})
