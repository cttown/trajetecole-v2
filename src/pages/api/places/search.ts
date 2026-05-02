import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

type PlaceRow = {
  id: string
  name: string
  city: string
  kind: 'school' | 'activity' | 'other'
  exact_address: string | null
  postal_code: string | null
  lat: number | null
  lng: number | null
}

type SearchResult = {
  id: string
  name: string
  city: string
  kind: 'school' | 'activity' | 'other' | 'address'
  source: 'place' | 'address'
  label: string
  address: string | null
  lat: number
  lng: number
  score?: number | null
}

type GeocodeFeature = {
  geometry?: {
    coordinates?: [number, number]
  }
  properties?: {
    label?: string
    name?: string
    city?: string
    postcode?: string
    score?: number
    type?: string
  }
}

const ALLOWED_POSTCODES = new Set([
  '92340', // Bourg-la-Reine
  '92330', // Sceaux
  '92160', // Antony
  '92220', // Bagneux
  '94230', // Cachan
  '94240', // L'Haÿ-les-Roses
  '92320', // Châtillon
  '92120', // Montrouge
  '94250', // Gentilly
  '94110', // Arcueil
])

const ALLOWED_CITY_NAMES = new Set(
  [
    'Bourg-la-Reine',
    'Sceaux',
    'Antony',
    'Bagneux',
    'Cachan',
    "L'Haÿ-les-Roses",
    'Châtillon',
    'Montrouge',
    'Gentilly',
    'Arcueil',
  ].map(normalizeText)
)

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`)
  }
  return value
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshtein(a: string, b: string) {
  const matrix = Array.from({ length: b.length + 1 }, () =>
    Array(a.length + 1).fill(0)
  )

  for (let i = 0; i <= b.length; i += 1) matrix[i][0] = i
  for (let j = 0; j <= a.length; j += 1) matrix[0][j] = j

  for (let i = 1; i <= b.length; i += 1) {
    for (let j = 1; j <= a.length; j += 1) {
      const indicator = a[j - 1] === b[i - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i][j - 1] + 1,
        matrix[i - 1][j] + 1,
        matrix[i - 1][j - 1] + indicator
      )
    }
  }

  return matrix[b.length][a.length]
}

function scoreText(query: string, candidate: string, city: string) {
  const normalizedQuery = normalizeText(query)
  const normalizedName = normalizeText(candidate)
  const normalizedCity = normalizeText(city)
  const combined = `${normalizedName} ${normalizedCity}`.trim()

  if (!normalizedQuery) return 0

  if (normalizedName === normalizedQuery) return 100
  if (combined === normalizedQuery) return 96
  if (normalizedName.startsWith(normalizedQuery)) return 92
  if (combined.startsWith(normalizedQuery)) return 88
  if (normalizedName.includes(normalizedQuery)) return 84
  if (combined.includes(normalizedQuery)) return 80

  // Recherche simple par mots, en ignorant les petits mots fréquents.
  // Exemple : "mairie bourg la reine" trouve "Mairie de Bourg-la-Reine".
  const stopWords = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'l', 'd'])

  const queryTokens = normalizedQuery
    .split(' ')
    .filter((token) => token.length >= 2 && !stopWords.has(token))

  const combinedTokens = combined
    .split(' ')
    .filter((token) => token.length >= 2 && !stopWords.has(token))

  const matchedTokens = queryTokens.filter((queryToken) =>
    combinedTokens.some(
      (candidateToken) =>
        candidateToken === queryToken ||
        candidateToken.startsWith(queryToken) ||
        queryToken.startsWith(candidateToken)
    )
  )

  if (queryTokens.length > 0 && matchedTokens.length === queryTokens.length) {
    return 78
  }

  const sliceName = normalizedName.slice(0, normalizedQuery.length)
  const sliceCombined = combined.slice(0, normalizedQuery.length)

  const bestDistance = Math.min(
    levenshtein(normalizedQuery, sliceName),
    levenshtein(normalizedQuery, sliceCombined)
  )

  if (bestDistance === 1) return 72
  if (bestDistance === 2) return 60

  return 0
}



function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isAddressLikeQuery(query: string) {
  const normalized = normalizeText(query)
  const tokens = normalized.split(' ')

  const hasStreetNumber = /\b\d{1,4}\b/.test(normalized)

  const hasStreetKeyword = [
    'rue',
    'avenue',
    'av',
    'boulevard',
    'bd',
    'place',
    'impasse',
    'allee',
    'chemin',
    'route',
    'square',
    'passage',
    'quai',
    'sentier',
    'villa',
    'residence',
  ].some((word) => tokens.includes(normalizeText(word)))

  return hasStreetNumber || hasStreetKeyword
}

function buildPlaceLabel(place: PlaceRow) {
  const details = [
    place.exact_address,
    [place.postal_code, place.city].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .join(', ')

  if (!details) return `${place.name} (${place.city})`
  return `${place.name} — ${details}`
}

function buildAddressId(label: string, lat: number, lng: number) {
  const raw = `${label}-${lat.toFixed(6)}-${lng.toFixed(6)}`
  return `address-${Buffer.from(raw).toString('base64url').slice(0, 32)}`
}

function isAllowedAddress(feature: GeocodeFeature) {
  const postcode = feature.properties?.postcode || ''
  const city = feature.properties?.city || ''

  if (postcode && ALLOWED_POSTCODES.has(postcode)) {
    return true
  }

  if (city && ALLOWED_CITY_NAMES.has(normalizeText(city))) {
    return true
  }

  return false
}

async function fetchGeoplateformeAddresses(q: string): Promise<SearchResult[]> {
  const url = new URL('https://data.geopf.fr/geocodage/search')
  url.searchParams.set('q', q)
  url.searchParams.set('limit', '10')

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    return []
  }

  const payload = await response.json().catch(() => null)
  const features = (payload?.features ?? []) as GeocodeFeature[]

  const results: SearchResult[] = []

  for (const feature of features) {
    if (!isAllowedAddress(feature)) continue

    const coordinates = feature.geometry?.coordinates

    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      continue
    }

    const [lng, lat] = coordinates

    if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) {
      continue
    }

    const label =
      feature.properties?.label ||
      feature.properties?.name ||
      q

    const city = feature.properties?.city || ''
    const postcode = feature.properties?.postcode || ''
    const cityLabel = [postcode, city].filter(Boolean).join(' ').trim()

    results.push({
      id: buildAddressId(label, lat, lng),
      name: label,
      city: cityLabel || city || 'Adresse',
      kind: 'address',
      source: 'address',
      label,
      address: label,
      lat,
      lng,
      score: feature.properties?.score ?? null,
    })

    if (results.length >= 5) {
      break
    }
  }

  return results
}



async function fetchKnownPlaces(q: string): Promise<SearchResult[]> {
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const { data, error } = await supabaseAdmin
    .from('places')
    .select('id, name, city, kind, exact_address, postal_code, lat, lng')
    .eq('is_active', true)
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .limit(500)

  if (error) {
    throw new Error(error.message)
  }

  const scoredResults: Array<SearchResult & { _score: number }> = []

  for (const place of (data ?? []) as PlaceRow[]) {
    if (!isFiniteNumber(place.lat) || !isFiniteNumber(place.lng)) {
      continue
    }

    const score = scoreText(q, place.name, place.city)

    if (score <= 0) {
      continue
    }

    scoredResults.push({
      id: place.id,
      name: place.name,
      city: place.city,
      kind: place.kind,
      source: 'place',
      label: buildPlaceLabel(place),
      address: place.exact_address,
      lat: place.lat,
      lng: place.lng,
      _score: score,
    })
  }

  return scoredResults
    .sort((a, b) => b._score - a._score || a.name.localeCompare(b.name))
    .slice(0, 8)
    .map(({ _score, ...item }) => item)
}





export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const q = String(req.query.q || '').trim()

    if (q.length < 2) {
      return res.status(200).json({
        mode: 'empty',
        results: [],
        message: null,
      })
    }

    const addressLike = isAddressLikeQuery(q)

    if (addressLike) {
      const results = await fetchGeoplateformeAddresses(q)

      return res.status(200).json({
        mode: 'address',
        results,
        message:
          results.length === 0
            ? 'Aucune adresse trouvée. Essayez avec une adresse plus complète.'
            : null,
      })
    }

    const results = await fetchKnownPlaces(q)

    return res.status(200).json({
      mode: 'place',
      results,
      message:
        results.length === 0
          ? 'Aucun lieu préenregistré trouvé. Vous pouvez saisir une adresse complète.'
          : null,
    })
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unexpected server error',
    })
  }
}