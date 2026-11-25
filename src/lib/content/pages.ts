import { HERO_SLIDES } from './hero'
import { SITE_BLOCKS } from './blocks'

export type ContentSection = { title: string; keys: string[] }
export type ContentPage = { id: string; title: string; description: string; href?: string; sections: ContentSection[] }
const prefix = (value: string) => SITE_BLOCKS.filter(block => block.key.startsWith(value)).map(block => block.key)
const image = (...names: string[]) => names.map(name => `image.${name}`)
export const CONTENT_PAGES: ContentPage[] = [
 {id:'home',title:'Homepage',description:'Hero slides, introductory sections, photos and frequently asked questions.',href:'/',sections:[
  ...HERO_SLIDES.map((slide,index)=>({title:`Hero slide ${index+1}`,keys:[`image.${slide.image}`,...SITE_BLOCKS.filter(block=>block.key.startsWith(`${slide.key}.`)&&!block.key.slice(slide.key.length+1).includes('.')&&block.key!=='home.hero.whatsappLabel').map(block=>block.key)]})),
  {title:'Hero WhatsApp button',keys:['home.hero.whatsappLabel']},
  {title:'Airport transfers section',keys:[...prefix('home.airport.'),...image('airport')]},
  {title:'Private tours section',keys:prefix('home.tours.')},
  {title:'Private driver section',keys:[...prefix('home.driver.'),...image('privateDriver')]},
  {title:'Destinations and fleet photos',keys:image('reykjavik','glacierLagoon','blueLagoon','southCoast','fleet')},
  {title:'Frequently asked questions',keys:prefix('faq.')},
 ]},
 {id:'about',title:'About page',description:'Company introduction, values and page photos.',href:'/about',sections:[{title:'Introduction',keys:[...prefix('about.'),...image('reykjavik','privateDriver')]}]},
 {id:'airport',title:'Airport transfers page',description:'Page heading, introduction, arrival information and photo.',href:'/airport-transfer',sections:[{title:'Page hero',keys:['airport.hero.title','airport.hero.body',...image('airport')]},{title:'Transfer information',keys:prefix('airport.').filter(key=>!key.startsWith('airport.hero.'))}]},
 {id:'tours',title:'Private tours page',description:'Page heading, introduction and hero photo.',href:'/private-tours',sections:[{title:'Page hero',keys:[...prefix('tours.'),...image('goldenCircle')]}]},
 {id:'driver',title:'Private driver page',description:'Page introduction, service descriptions and hero photo.',href:'/private-driver',sections:[{title:'Page hero',keys:[...prefix('driver.hero.'),...image('privateDriver')]},{title:'Hire options',keys:prefix('driver.').filter(key=>!key.startsWith('driver.hero.'))}]},
 {id:'services',title:'Services page',description:'Service introductions and their photos.',href:'/services',sections:[{title:'Service sections',keys:[...prefix('services.'),...image('airport','reykjavik','goldenCircle','privateDriver','fleet')]}]},
 {id:'faqs',title:'FAQs page',description:'Questions and answers, also shown on the homepage.',href:'/faqs',sections:[{title:'Questions and answers',keys:prefix('faq.')}]},
 {id:'destinations',title:'Destinations page',description:'Destination photos, also used in the homepage preview.',href:'/destinations',sections:[{title:'Destination photos',keys:image('goldenCircle','glacierLagoon','blueLagoon','reykjavik','southCoast')}]},
 {id:'fleet',title:'Fleet page',description:'Fleet introduction photo. Vehicle records remain in Fleet management.',href:'/fleet',sections:[{title:'Fleet photo',keys:image('fleet')}]},
 {id:'shared',title:'Branding and shared images',description:'Logos and photos reused in more than one part of the website.',sections:[{title:'Brand logos',keys:image('logoLight','logoDark')},{title:'Shared photos',keys:prefix('image.').filter(key=>!key.startsWith('image.logo'))}]},
]
export function pageKeys(page: ContentPage) { return [...new Set(page.sections.flatMap(section=>section.keys))] }
export function sharedContentKey(key: string) { return CONTENT_PAGES.filter(page=>page.id!=='shared'&&pageKeys(page).includes(key)).length>1 }
