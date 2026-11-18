// Local acceptance sink; rejects every recipient outside example.invalid. No outbound transport.
import net from 'node:net'
import {writeFile,rename} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {randomUUID} from 'node:crypto'
const output=join(tmpdir(),'itb-auth-smtp-messages.json'),sockets=new Set(),messages=[]
const server=net.createServer(socket=>{
 sockets.add(socket);socket.on('close',()=>sockets.delete(socket));socket.on('error',()=>{})
 socket.write('220 localhost fixture SMTP\r\n')
 let buffer='',inData=false,message=''
 socket.on('data',chunk=>{
  buffer+=chunk.toString();if(buffer.length+message.length>1024*1024){socket.destroy();return}
  for(;;){
   const end=buffer.indexOf('\r\n');if(end<0)break
   const line=buffer.slice(0,end);buffer=buffer.slice(end+2)
   if(inData){
    if(line==='.'){
     inData=false;messages.push(message);message=''
     if(messages.length>100){socket.end('452 Fixture sink full\r\n');return}
     const partial=output+'.'+randomUUID()
     // SMTP success is emitted only after an atomic write, so readers never see partial JSON.
     void writeFile(partial,JSON.stringify(messages),{mode:0o600}).then(()=>rename(partial,output)).then(()=>socket.write('250 accepted\r\n')).catch(()=>socket.end('451 Fixture persistence failed\r\n'))
    }else message+=line+'\n'
    continue
   }
   if(/^EHLO|^HELO/.test(line))socket.write('250-localhost\r\n250 8BITMIME\r\n')
   else if(/^RCPT TO:/.test(line))socket.write(/@example\.invalid>/i.test(line)?'250 recipient OK\r\n':'550 Fixture addresses only\r\n')
   else if(line==='DATA'){inData=true;socket.write('354 end with dot\r\n')}
   else if(line==='QUIT')socket.end('221 bye\r\n')
   else socket.write('250 OK\r\n')
  }
 })
})
server.listen(19027,'127.0.0.1',()=>console.log('Fixture-only SMTP sink ready on loopback 19027'))
function stop(){for(const socket of sockets)socket.destroy();server.close(()=>process.exit(0))}
process.on('SIGINT',stop);process.on('SIGTERM',stop)
