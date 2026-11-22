import assert from 'node:assert/strict'
import test from 'node:test'
import { photoDelivery } from './delivery'
test('direct responsive Cloudinary delivery leaves signed/transformed/foreign/local URLs unchanged',()=>{
 assert.equal(photoDelivery('https://res.cloudinary.com/demo/image/upload/v123/photo.jpg',768),'https://res.cloudinary.com/demo/image/upload/c_limit,w_768/f_auto/q_auto/v123/photo.jpg')
 for(const value of ['/photos/hero.jpg','https://res.cloudinary.com/demo/image/upload/c_fill,w_200/v123/photo.jpg','https://res.cloudinary.com/demo/image/upload/s--signature--/v123/photo.jpg','https://foreign.example/image/upload/v123/photo.jpg'])assert.equal(photoDelivery(value,768),value)
})
