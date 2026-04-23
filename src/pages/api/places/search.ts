import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

type PlaceRow = {
  id: string
  name: string
  city: string
  kind: string
}

type SuggestionRow = {
  id: string
  suggested_name: string
  city: string
  kind: string
  status: string
}

type SearchResult = {
  id: string
  name: string
  city: string
  kind: string
  source: 'place' | 'suggestion'
  provisional?: boolean
}

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
      return res.status(200).json({ results: [] })
    }

    const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
    const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const [placesResponse, suggestionsResponse] = await Promise.all([
      supabaseAdmin
        .from('places')
        .select('id, name, city, kind')
        .eq('is_active', true)
        .limit(300),
      supabaseAdmin
        .from('place_suggestions')
        .select('id, suggested_name, city, kind, status')
        .eq('status', 'pending')
        .limit(300),
    ])

    if (placesResponse.error) {
      return res.status(500).json({ error: placesResponse.error.message })
    }

    if (suggestionsResponse.error) {
      return res.status(500).json({ error: suggestionsResponse.error.message })
    }

    const places = ((placesResponse.data ?? []) as PlaceRow[]).map((place) => ({
      id: place.id,
      name: place.name,
      city: place.city,
      kind: place.kind,
      source: 'place' as const,
    }))

    const suggestions = ((suggestionsResponse.data ?? []) as SuggestionRow[]).map((item) => ({
      id: item.id,
      name: item.suggested_name,
      city: item.city,
      kind: item.kind,
      source: 'suggestion' as const,
      provisional: true,
    }))

    const results = [...places, ...suggestions]
      .map((item) => ({
        ...item,
        _score: scoreText(q, item.name, item.city),
      }))
      .filter((item) => item._score > 0)
      .sort((a, b) => b._score - a._score || a.name.localeCompare(b.name))
      .slice(0, 8)
      .map(({ _score, ...item }) => item)

    return res.status(200).json({ results })
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unexpected server error',
    })
  }
}