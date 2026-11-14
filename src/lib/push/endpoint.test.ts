import assert from 'node:assert/strict'
import test from 'node:test'
import {safePushEndpoint,validPushKeys} from './endpoint'
test('push destinations reject private networks, credentials, and lookalike hosts',()=>{
 for(const value of ['http://127.0.0.1','https://169.254.169.254/latest/meta-data','https://[::1]/','https://fcm.googleapis.com.evil.example/','https://evil.example/?fcm.googleapis.com','https://user:pass@fcm.googleapis.com/','https://fcm.googleapis.com:8443/'])assert.equal(safePushEndpoint(value),false,value)
 for(const value of ['https://fcm.googleapis.com/fcm/send/example','https://updates.push.services.mozilla.com/wpush/v2/example','https://web.push.apple.com/example'])assert.equal(safePushEndpoint(value),true)
})
test('push subscription keys require the browser encryption key shapes',()=>{
 const p=Buffer.alloc(65);p[0]=4
 assert.equal(validPushKeys(p.toString('base64url'),Buffer.alloc(16).toString('base64url')),true)
 assert.equal(validPushKeys('not-a-key','not-a-key'),false)
})
