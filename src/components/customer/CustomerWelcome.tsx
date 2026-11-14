'use client'
import { useEffect, useState } from 'react'
import { CloudSun, MapPin } from 'lucide-react'
import { useSiteSession } from '@/components/providers/SessionProvider'

function condition(symbol: string) {
  const value = symbol.replace(/_(day|night|polartwilight)$/, '')
  const labels: Record<string, string> = { clearsky: 'Clear sky', fair: 'Fair', partlycloudy: 'Partly cloudy', cloudy: 'Cloudy', fog: 'Foggy', rain: 'Rain', lightrain: 'Light rain', heavyrain: 'Heavy rain', snow: 'Snow', lightsnow: 'Light snow', heavysnow: 'Heavy snow', sleet: 'Sleet' }
  return labels[value] || (value.includes('thunder') ? 'Thunderstorms' : value.includes('snow') ? 'Snow showers' : value.includes('sleet') ? 'Sleet' : value.includes('rain') ? 'Rain showers' : 'Local forecast')
}
export function CustomerWelcome() {
  const { user } = useSiteSession()
  const [now, setNow] = useState<Date | null>(null)
  const [place, setPlace] = useState('Location not shared')
  const [weather, setWeather] = useState('Enable location for local weather')
  const [busy, setBusy] = useState(false)
  useEffect(() => { setNow(new Date()); const timer = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(timer) }, [])
  function locate() {
    if (!navigator.geolocation) { setPlace('Location unavailable'); return }
    setBusy(true)
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      const latitude = coords.latitude.toFixed(2), longitude = coords.longitude.toFixed(2)
      setPlace('Your current location')
      const results = await Promise.allSettled([
        fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=en`, { signal: AbortSignal.timeout(10000) }).then(async r => { if (!r.ok) throw new Error(); return r.json() }),
        fetch(`/api/account/weather?latitude=${latitude}&longitude=${longitude}`).then(async r => { if (!r.ok) throw new Error(); return r.json() }),
      ])
      if (results[0].status === 'fulfilled') { const p = results[0].value; setPlace([p.city || p.locality || p.principalSubdivision, p.countryName].filter(Boolean).join(', ') || 'Your current location') }
      if (results[1].status === 'fulfilled') { const w = results[1].value; setWeather(`${Math.round(w.temperature)}°C · ${condition(w.condition)}`) }
      else setWeather('Weather temporarily unavailable')
      setBusy(false)
    }, error => { setPlace(error.code === 1 ? 'Location permission denied' : 'Location unavailable'); setWeather('Allow location to see local weather'); setBusy(false) }, { timeout: 10000, maximumAge: 300000 })
  }
  return <div>
    <p className="text-sm text-muted" suppressHydrationWarning>{now ? `${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}` : 'Your local time'}</p>
    <h1 className="mt-1 font-display text-2xl font-bold text-heading sm:text-3xl">{user?.name || user?.email || 'My account'}</h1>
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted"><span className="inline-flex items-center gap-1"><MapPin size={14} />{place}</span><span className="inline-flex items-center gap-1"><CloudSun size={14} />{weather}</span></div>
    <button type="button" onClick={locate} disabled={busy} className="mt-2 text-xs font-semibold text-link disabled:opacity-60">{busy ? 'Finding your location…' : 'Use my location'}</button>
    {weather.includes('°C') && <a href="https://www.met.no/en" target="_blank" rel="noreferrer" className="ml-3 text-[10px] text-muted">Forecast data from MET Norway</a>}
  </div>
}
