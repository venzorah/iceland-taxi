// Real Nodemailer SMTP conversation with a loopback-only disposable sink. No email leaves the PC.
import assert from 'node:assert/strict'
import net from 'node:net'
import {sendMail} from '../../src/lib/email/mailer'
import {authenticationEmail,driverLoginEmail,styledEmail} from '../../src/lib/email/templates'

async function main() {
 const previous={smtp:process.env.SMTP_URL,from:process.env.MAIL_FROM,app:process.env.NEXT_PUBLIC_APP_URL}
 const sockets=new Set<net.Socket>(); let delivered=''; let recipients=0
 const server=net.createServer(socket=>{
  sockets.add(socket);socket.on('close',()=>sockets.delete(socket))
  socket.write('220 localhost fixture SMTP\r\n');let buffer='';let inData=false
  socket.on('data',chunk=>{
   buffer+=chunk.toString()
   for (;;) {
    const end=buffer.indexOf('\r\n');if(end<0)break
    const line=buffer.slice(0,end);buffer=buffer.slice(end+2)
    if(inData){if(line==='.') {inData=false;socket.write('250 accepted\r\n')}else delivered+=line+'\n';continue}
    if(/^EHLO|^HELO/.test(line))socket.write('250-localhost\r\n250 8BITMIME\r\n')
    else if(/^MAIL FROM:/.test(line))socket.write('250 sender OK\r\n')
    else if(/^RCPT TO:/.test(line)){assert.match(line,/@example\.invalid/i);recipients++;socket.write('250 recipient OK\r\n')}
    else if(line==='DATA'){inData=true;socket.write('354 end with dot\r\n')}
    else if(line==='QUIT'){socket.end('221 bye\r\n')}
    else socket.write('250 OK\r\n')
   }
  })
 })
 try {
  await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)})
  const address=server.address();assert(address&&typeof address!=='string')
  process.env.SMTP_URL=`smtp://127.0.0.1:${address.port}`;process.env.MAIL_FROM='fixture@example.invalid'
  const result=await sendMail({to:'recipient@example.invalid',replyTo:'reply@example.invalid',subject:'VPS mail fixture',text:'Plain booking notice fixture',html:'<p>HTML booking notice fixture</p>'})
  assert.deepEqual(result,{ok:true});assert.equal(recipients,1)
  assert.match(delivered,/Subject: VPS mail fixture/);assert.match(delivered,/Plain booking notice fixture/);assert.match(delivered,/HTML booking notice fixture/);assert.match(delivered,/Reply-To: reply@example.invalid/)
  process.env.NEXT_PUBLIC_APP_URL='https://taxi.example'
  for(const [subject,email] of [
   ['Driver invitation',driverLoginEmail({name:'Fixture Driver',email:'driver@example.invalid',password:'Fixture-password-only-123!'})],
   ['Password reset',authenticationEmail('Reset your Iceland Taxi password','https://taxi.example/api/auth/reset-password/fixture-token')],
   ['Booking notice',styledEmail({title:'Your fixture booking',paragraphs:['Your booking is saved.']})],
  ] as const){assert.deepEqual(await sendMail({to:'recipient@example.invalid',subject,...email}),{ok:true})}
  assert.equal(recipients,4)
  assert.match(delivered,/Fixture-password-only-123!/)
  assert.match(delivered,/driver-login/)
  assert.match(delivered,/Reset password/)
  assert.match(delivered,/ffc400/)
  process.env.SMTP_URL=''
  const missing=await sendMail({to:'recipient@example.invalid',subject:'fixture',text:'fixture',html:'fixture'})
  assert.equal(missing.ok,false);assert.equal(recipients,4)
  console.log('SMTP sink passed: styled driver invitation, password reset and booking notice; text/HTML, reply-to and missing-config behavior; no outbound email')
 } finally {
  if(previous.smtp===undefined)delete process.env.SMTP_URL;else process.env.SMTP_URL=previous.smtp
  if(previous.from===undefined)delete process.env.MAIL_FROM;else process.env.MAIL_FROM=previous.from
  if(previous.app===undefined)delete process.env.NEXT_PUBLIC_APP_URL;else process.env.NEXT_PUBLIC_APP_URL=previous.app
  for(const socket of sockets)socket.destroy()
  await new Promise<void>(resolve=>server.close(()=>resolve()))
 }
}
void main().catch((error: NodeJS.ErrnoException)=>{console.error('SMTP fixture check failed:', error.code || error.name);process.exitCode=1})
