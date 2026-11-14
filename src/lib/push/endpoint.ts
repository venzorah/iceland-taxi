/** Restrict outbound Web Push to public browser push providers; never arbitrary caller URLs. */
export function safePushEndpoint(value:string){
 try{const u=new URL(value);if(value.length>4096||u.protocol!=='https:'||u.username||u.password||u.hash||(u.port&&u.port!=='443'))return false
 const h=u.hostname.toLowerCase()
 return h==='fcm.googleapis.com'||h==='updates.push.services.mozilla.com'||h==='web.push.apple.com'||h.endsWith('.notify.windows.com')
 }catch{return false}
}
export function validPushKeys(p256dh:string,auth:string){
 if(!/^[A-Za-z0-9_-]+={0,2}$/.test(p256dh)||!/^[A-Za-z0-9_-]+={0,2}$/.test(auth))return false
 const p=Buffer.from(p256dh,'base64url'),a=Buffer.from(auth,'base64url')
 return p.length===65&&p[0]===4&&a.length===16
}
