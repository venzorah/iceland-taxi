import { t } from '@/lib/design/i18n'

export const HERO_SLIDES = [
 {id:'main',key:'home.hero',image:'hero',alt:'Private car on a highland road beneath a glacier in Iceland',title:'Discover Iceland. Travel Comfortably.',body:'From airport transfers to private tours and personalised vacation drivers, enjoy convenient transportation across Iceland with a booking experience designed around you.',cta:'Book Your Ride',href:'/search?category=airport',titleIs:t('is','heroTitle'),bodyIs:t('is','heroBody')},
 {id:'airport',key:'home.hero.airport',image:'airport',alt:'Chauffeur loading luggage outside Keflavík Airport',title:'Met at Keflavík arrivals.',body:'Private airport transfers to Reykjavík, the Blue Lagoon or your hotel. Your driver tracks your flight and waits with your name sign.',cta:'Book Airport Transfer',href:'/airport-transfer'},
 {id:'goldenCircle',key:'home.hero.goldenCircle',image:'goldenCircle',alt:'Gullfoss waterfall on the Golden Circle',title:'The Golden Circle, at your pace.',body:'Þingvellir, Geysir and Gullfoss with your own driver and vehicle. Stop where you want, stay as long as you like.',cta:'Discover Private Tours',href:'/private-tours'},
 {id:'northernLights',key:'home.hero.northernLights',image:'northernLights',alt:'Northern lights over snowy mountains with an SUV on the road',title:'Chase the northern lights.',body:'Your driver follows the aurora forecast and heads away from the city lights, so you can simply look up.',cta:'Book Northern Lights',href:'/private-tours'},
 {id:'privateDriver',key:'home.hero.privateDriver',image:'privateDriver',alt:'View from the back seat of a chauffeured car along an Icelandic fjord',title:'Your Journey Across Iceland Starts Here.',body:'Hire a private driver by the hour, the day or for your whole stay, or send us your itinerary for a custom quote.',cta:'Hire a Private Driver',href:'/private-driver'},
] as const

export function safeHeroHref(value: string) {
 if (!value || value.length > 2048 || /[\\\u0000-\u0020]/.test(value)) return false
 if (value.startsWith('/') && !value.startsWith('//')) return true
 try { const url=new URL(value);return url.protocol==='https:' && !url.username && !url.password } catch { return false }
}
