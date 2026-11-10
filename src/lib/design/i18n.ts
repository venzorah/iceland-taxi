export type Lang = 'en' | 'is'

const dict = {
  en: {
    services: 'Services',
    airport: 'Airport transfers',
    tours: 'Private tours',
    driver: 'Private driver',
    fleet: 'Our fleet',
    contact: 'Contact',
    signIn: 'Sign in',
    book: 'Book your ride',
    heroTitle: 'Discover Iceland. Travel Comfortably.',
    heroBody:
      'From airport transfers to private tours and personalised vacation drivers, enjoy convenient transportation across Iceland with a booking experience designed around you.',
    pickup: 'Pickup location',
    destination: 'Destination',
    date: 'Pickup date',
    time: 'Time',
    passengers: 'Passengers',
    luggage: 'Luggage',
    search: 'Search availability',
  },
  is: {
    services: 'Þjónusta',
    airport: 'Flugvallarakstur',
    tours: 'Einkaferðir',
    driver: 'Einkabílstjóri',
    fleet: 'Bílaflotinn',
    contact: 'Hafa samband',
    signIn: 'Innskráning',
    book: 'Bóka ferð',
    heroTitle: 'Uppgötvaðu Ísland. Ferðastu þægilega.',
    heroBody:
      'Frá flugvallarakstri til einkaferða og einkabílstjóra — þægilegar ferðir um allt Ísland með bókun sem er sniðin að þér.',
    pickup: 'Sóttstaður',
    destination: 'Áfangastaður',
    date: 'Dagsetning',
    time: 'Tími',
    passengers: 'Farþegar',
    luggage: 'Farangur',
    search: 'Leita að lausum ferðum',
  },
}

export type TKey = keyof typeof dict.en

export function t(lang: Lang, key: TKey) {
  return dict[lang][key] ?? dict.en[key]
}
