import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

type PlaceRow = {
  id: string
  name: string
  city: string
  kind: string
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

function scorePlace(query: string, place: PlaceRow) {
  const normalizedQuery = normalizeText(query)
  const normalizedName = normalizeText(place.name)
  const normalizedCity = normalizeText(place.city)
  const combined = `${normalizedName} ${normalizedCity}`.trim()

  if (!normalizedQuery) return 0

  if (normalizedName === normalizedQuery) return 100
  if (combined === normalizedQuery) return 95
  if (normalizedName.startsWith(normalizedQuery)) return 90
  if (combined.startsWith(normalizedQuery)) return 88
  if (normalizedName.includes(normalizedQuery)) return 82
  if (combined.includes(normalizedQuery)) return 80

  const nameDistance = levenshtein(normalizedQuery, normalizedName.slice(0, normalizedQuery.length))
  const combinedDistance = levenshtein(
    normalizedQuery,
    combined.slice(0, normalizedQuery.length)
  )
  const bestDistance = Math.min(nameDistance, combinedDistance)

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

    const { data, error } = await supabaseAdmin
      .from('places')
      .select('id, name, city, kind')
      .eq('is_active', true)
      .limit(300)

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    const scoredResults = ((data ?? []) as PlaceRow[])
      .map((place) => ({
        ...place,
        _score: scorePlace(q, place),
      }))
      .filter((place) => place._score > 0)
      .sort((a, b) => b._score - a._score || a.name.localeCompare(b.name))
      .slice(0, 8)
      .map(({ _score, ...place }) => place)

    return res.status(200).json({
      results: scoredResults,
    })
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unexpected server error',
    })
  }
}