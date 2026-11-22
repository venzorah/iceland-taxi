// Synthetic, local-only timing benchmark. No environment loading, network, database or SMTP.
import { performance } from 'node:perf_hooks'
import { writeFileSync } from 'node:fs'
import { deliverBounded } from '../../src/lib/email/bounded-delivery'
const delay=(ms:number)=>new Promise<void>(r=>setTimeout(r,ms))
const measure=async(work:()=>Promise<void>)=>{const start=performance.now();await work();return Math.round(performance.now()-start)}
async function run(){
 const before:number[]=[],after:number[]=[]
 for(let i=0;i<5;i++){
  before.push(await measure(async()=>{await delay(15);await delay(15);for(const _ of [1,2,3,4]){void _;await delay(50)}await delay(75);await delay(125)}))
  after.push(await measure(async()=>{await Promise.all([delay(15),delay(15)]);await deliverBounded([1,2,3,4],()=>delay(50));await delay(75);await delay(125)}))
 }
 const result={conditions:'Fixture scheduling only: two 15ms reads, four 50ms deliveries, OAuth75ms, provider125ms. Sequential reads+mail versus parallel reads+bounded2 awaited mail. Not VPS/Teya timings.',beforeMs:before,afterMs:after}
 writeFileSync('docs/performance/checkout-synthetic.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result))
}
void run()
