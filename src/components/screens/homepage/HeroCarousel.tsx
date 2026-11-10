'use client'

import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight, MessageCircle, Pause, Play } from 'lucide-react'

import { IMG } from '@/lib/design/data'
import { t, type Lang } from '@/lib/design/i18n'
import type { SearchPayload } from './BookingSearch'

const INTERVAL = 6500
const EASE = [0.23, 1, 0.32, 1] as const

export function HeroCarousel({ language, autoplay, onSearch }: { language: Lang; autoplay: boolean; onSearch?: (p: SearchPayload) => void }) {
  const reduce = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(!autoplay)
  const [hovered, setHovered] = useState(false)
  const touchX = useRef<number | null>(null)

  const go = (category: string, pickup: string, destination: string) => () =>
    onSearch?.({ category, pickup, destination, date: '', time: '', passengers: 2, luggage: 2 })

  const slides = [
    {
      img: IMG.hero,
      alt: 'Private car on a highland road beneath a glacier in Iceland',
      title: t(language, 'heroTitle'),
      body: t(language, 'heroBody'),
      cta: 'Book Your Ride',
      action: go('airport', 'Keflavík Airport (KEF)', 'Reykjavík city centre'),
    },
    {
      img: IMG.airport,
      alt: 'Chauffeur loading luggage outside Keflavík Airport',
      title: 'Met at Keflavík arrivals.',
      body: 'Private airport transfers to Reykjavík, the Blue Lagoon or your hotel. Your driver tracks your flight and waits with your name sign.',
      cta: 'Book Airport Transfer',
      action: go('airport', 'Keflavík Airport (KEF)', 'Reykjavík city centre'),
    },
    {
      img: IMG.goldenCircle,
      alt: 'Gullfoss waterfall on the Golden Circle',
      title: 'The Golden Circle, at your pace.',
      body: 'Þingvellir, Geysir and Gullfoss with your own driver and vehicle. Stop where you want, stay as long as you like.',
      cta: 'Discover Private Tours',
      action: go('tour', 'Reykjavík hotel', 'Golden Circle Private Tour'),
    },
    {
      img: IMG.northernLights,
      alt: 'Northern lights over snowy mountains with an SUV on the road',
      title: 'Chase the northern lights.',
      body: 'Your driver follows the aurora forecast and heads away from the city lights, so you can simply look up.',
      cta: 'Book Northern Lights',
      action: go('tour', 'Reykjavík hotel', 'Northern Lights Experience'),
    },
    {
      img: IMG.privateDriver,
      alt: 'View from the back seat of a chauffeured car along an Icelandic fjord',
      title: 'Your Journey Across Iceland Starts Here.',
      body: 'Hire a private driver by the hour, the day or for your whole stay — or send us your itinerary for a custom quote.',
      cta: 'Hire a Private Driver',
      action: go('driver', 'Reykjavík hotel', 'Custom itinerary'),
    },
  ]
  const n = slides.length
  const slide = slides[index]
  const running = !paused && !hovered && !reduce

  useEffect(() => setPaused(!autoplay), [autoplay])
  useEffect(() => {
    if (!running) return
    const id = setTimeout(() => setIndex((i) => (i + 1) % n), INTERVAL)
    return () => clearTimeout(id)
  }, [running, index, n])

  const prev = () => setIndex((i) => (i - 1 + n) % n)
  const next = () => setIndex((i) => (i + 1) % n)

  return (
    <section
      className="relative isolate overflow-hidden bg-navy"
      aria-roledescription="carousel"
      aria-label="Featured journeys"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return
        const dx = e.changedTouches[0].clientX - touchX.current
        touchX.current = null
        if (Math.abs(dx) > 45) (dx < 0 ? next : prev)()
      }}
    >
      {/* Images: crossfade, all preloaded */}
      {slides.map((s, i) => (
        <img
          key={s.img}
          src={s.img}
          alt={i === index ? s.alt : ''}
          aria-hidden={i !== index}
          className={`absolute inset-0 -z-10 h-full w-full object-cover transition-opacity duration-300 ease-out ${i === index ? 'opacity-100' : 'opacity-0'}`}
        />
      ))}
      <div className="absolute inset-0 -z-10 bg-navy/50" />

      <div className="mx-auto max-w-7xl px-4 pb-36 pt-10 sm:px-6 sm:pb-40 sm:pt-28 lg:px-8 lg:pb-48 lg:pt-32">
        <div className="min-h-[318px] sm:min-h-[340px] lg:min-h-[360px]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={index}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: EASE }}
              aria-live="polite"
            >
              {index === 0 ? (
                <h1 className="max-w-3xl font-display text-[2.1rem] font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">{slide.title}</h1>
              ) : (
                <p className="max-w-3xl font-display text-[2.1rem] font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">{slide.title}</p>
              )}
              <p className="mt-4 line-clamp-3 max-w-xl text-[15px] leading-relaxed text-white/90 sm:mt-6 sm:line-clamp-none sm:text-lg">{slide.body}</p>
              <div className="mt-6 flex flex-wrap gap-3 sm:mt-8">
                <button onClick={slide.action} className="whitespace-nowrap rounded-full bg-primary px-6 py-3 text-sm font-bold text-on-primary transition-colors duration-150 hover:bg-primary-hover">
                  {slide.cta}
                </button>
                <a href="#" aria-label="Chat on WhatsApp" className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-white/40 px-4 py-3 sm:px-6 text-sm font-semibold text-white transition-colors duration-150 hover:bg-white/10">
                  <MessageCircle size={16} /> <span className="hidden sm:inline">Chat on WhatsApp</span><span className="sm:hidden">WhatsApp</span>
                </a>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="mt-4 flex items-center gap-3 sm:mt-8">
          <button onClick={prev} aria-label="Previous slide" className="hidden h-10 w-10 sm:grid place-items-center rounded-full border border-white/30 text-white transition-colors duration-150 hover:bg-white/10">
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-2" role="tablist" aria-label="Choose slide">
            {slides.map((s, i) => (
              <button
                key={s.img}
                role="tab"
                aria-selected={i === index}
                aria-label={`Slide ${i + 1}`}
                onClick={() => setIndex(i)}
                className="relative h-1.5 overflow-hidden rounded-full bg-white/30 transition-[width] duration-200 ease-out"
                style={{ width: i === index ? 40 : 12 }}
              >
                {i === index && (
                  <span
                    key={`${index}-${running}`}
                    className="absolute inset-y-0 left-0 rounded-full bg-primary"
                    style={running ? { animation: `hero-progress ${INTERVAL}ms linear forwards` } : { width: '100%' }}
                  />
                )}
              </button>
            ))}
          </div>
          <button onClick={next} aria-label="Next slide" className="hidden h-10 w-10 sm:grid place-items-center rounded-full border border-white/30 text-white transition-colors duration-150 hover:bg-white/10">
            <ChevronRight size={18} />
          </button>
          <button onClick={() => setPaused((p) => !p)} aria-label={paused ? 'Play slideshow' : 'Pause slideshow'} className="ml-1 grid h-10 w-10 place-items-center rounded-full text-white/80 transition-colors duration-150 hover:text-white">
            {paused ? <Play size={16} /> : <Pause size={16} />}
          </button>
        </div>
      </div>

      <style>{`@keyframes hero-progress { from { width: 0% } to { width: 100% } }`}</style>
    </section>
  )
}
