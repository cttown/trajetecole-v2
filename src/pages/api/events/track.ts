import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'

type ApiResponse = { ok: true } | { error: string }

const ALLOWED_EVENT_TYPES = [
  'page_view',
  'trip_created',
  'match_request_sent',
  'contact_admin_sent',
  'signup',
] as const

type AllowedEventType = (typeof ALLOWED_EVENT_TYPES)[number]

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { event_type, page, path, metadata, user_id } = req.body ?? {}

    if (!event_type || typeof event_type !== 'string') {
      return res.status(400).json({ error: 'Missing event_type' })
    }

    if (!ALLOWED_EVENT_TYPES.includes(event_type as AllowedEventType)) {
      return res.status(400).json({ error: 'Invalid event_type' })
    }

    const { error } = await supabaseAdmin.from('site_events').insert({
      event_type,
      page: typeof page === 'string' ? page : null,
      path: typeof path === 'string' ? path : null,
      metadata: metadata && typeof metadata === 'object' ? metadata : null,
      user_id: typeof user_id === 'string' ? user_id : null,
    })

    if (error) throw error

    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error('Track event error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}