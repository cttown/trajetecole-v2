import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'

type SearchPlaceRow = {
  id: string
  name: string
  city: string
  exact_address: string | null
  kind: 'school' | 'activity' | 'other'
  score: number
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SearchPlaceRow[] | { error: string; details?: unknown }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const query = Array.isArray(req.query.query) ? req.query.query[0] : req.query.query

  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    return res.status(200).json([])
  }

  const trimmedQuery = query.trim()

  console.log('[places/search] query =', trimmedQuery)

  const { data, error } = await supabaseAdmin.rpc('search_places', {
    search_query: trimmedQuery,
  })

  if (error) {
    console.error('[places/search] rpc error:', error)
    return res.status(500).json({
      error: 'Search failed',
      details: error.message,
    })
  }

  console.log('[places/search] result count =', data?.length ?? 0)

  return res.status(200).json((data ?? []) as SearchPlaceRow[])
}