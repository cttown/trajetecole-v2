import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`)
  }
  return value
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
      .or(`name.ilike.%${q}%,city.ilike.%${q}%`)
      .order('name', { ascending: true })
      .limit(8)

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({
      results: data ?? [],
    })
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unexpected server error',
    })
  }
}