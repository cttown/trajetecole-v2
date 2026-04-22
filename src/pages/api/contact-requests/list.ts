import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

type ContactRequestStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'cancelled'

type ContactRequestListItem = {
  id: string
  requester_family_id: string
  target_family_id: string
  status: ContactRequestStatus
  request_message: string | null
  created_at: string
  expires_at: string
  responded_at: string | null
  accepted_at: string | null
  closed_at: string | null
  close_reason: string | null
  other_family: {
    id: string
    parent_first_name: string | null
    parent_last_name: string | null
    email: string
  } | null
  trip_links: any[]
}

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
    const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
    const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization token' })
    }

    const accessToken = authHeader.slice('Bearer '.length)

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(accessToken)

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { data: ownFamily, error: ownFamilyError } = await supabaseAdmin
      .from('families')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (ownFamilyError || !ownFamily) {
      return res.status(404).json({ error: 'Family not found' })
    }

    const commonSelect = `
      id,
      requester_family_id,
      target_family_id,
      status,
      request_message,
      created_at,
      expires_at,
      responded_at,
      accepted_at,
      closed_at,
      close_reason,
      trip_links:contact_request_trips (
        id,
        contact_request_id,
        requester_trip_id,
        target_trip_id,
        created_at,
        requester_trip:trips!contact_request_trips_requester_trip_id_fkey (
          id,
          day_of_week,
          from_time,
          to_time,
          trip_group_id,
          child:children (
            first_name
          ),
          from_place:places!trips_from_place_id_fkey (
            name,
            city
          ),
          to_place:places!trips_to_place_id_fkey (
            name,
            city
          ),
          from_suggestion:place_suggestions!trips_from_place_suggestion_id_fkey (
            suggested_name,
            city
          ),
          to_suggestion:place_suggestions!trips_to_place_suggestion_id_fkey (
            suggested_name,
            city
          )
        ),
        target_trip:trips!contact_request_trips_target_trip_id_fkey (
          id,
          day_of_week,
          from_time,
          to_time,
          trip_group_id,
          child:children (
            first_name
          ),
          from_place:places!trips_from_place_id_fkey (
            name,
            city
          ),
          to_place:places!trips_to_place_id_fkey (
            name,
            city
          ),
          from_suggestion:place_suggestions!trips_from_place_suggestion_id_fkey (
            suggested_name,
            city
          ),
          to_suggestion:place_suggestions!trips_to_place_suggestion_id_fkey (
            suggested_name,
            city
          )
        )
      )
    `

    const { data: sentRows, error: sentError } = await supabaseAdmin
      .from('contact_requests')
      .select(`
        ${commonSelect},
        target_family:families!contact_requests_target_family_id_fkey (
          id,
          parent_first_name,
          parent_last_name,
          email
        )
      `)
      .eq('requester_family_id', ownFamily.id)
      .order('created_at', { ascending: false })

    if (sentError) {
      return res.status(500).json({ error: sentError.message })
    }

    const { data: receivedRows, error: receivedError } = await supabaseAdmin
      .from('contact_requests')
      .select(`
        ${commonSelect},
        requester_family:families!contact_requests_requester_family_id_fkey (
          id,
          parent_first_name,
          parent_last_name,
          email
        )
      `)
      .eq('target_family_id', ownFamily.id)
      .order('created_at', { ascending: false })

    if (receivedError) {
      return res.status(500).json({ error: receivedError.message })
    }

    const sent: ContactRequestListItem[] = (sentRows ?? []).map((row: any) => ({
      id: row.id,
      requester_family_id: row.requester_family_id,
      target_family_id: row.target_family_id,
      status: row.status,
      request_message: row.request_message,
      created_at: row.created_at,
      expires_at: row.expires_at,
      responded_at: row.responded_at,
      accepted_at: row.accepted_at,
      closed_at: row.closed_at,
      close_reason: row.close_reason,
      other_family: row.target_family
        ? {
            id: row.target_family.id,
            parent_first_name: row.target_family.parent_first_name,
            parent_last_name: row.target_family.parent_last_name,
            email: row.target_family.email,
          }
        : null,
      trip_links: row.trip_links ?? [],
    }))

    const received: ContactRequestListItem[] = (receivedRows ?? []).map((row: any) => ({
      id: row.id,
      requester_family_id: row.requester_family_id,
      target_family_id: row.target_family_id,
      status: row.status,
      request_message: row.request_message,
      created_at: row.created_at,
      expires_at: row.expires_at,
      responded_at: row.responded_at,
      accepted_at: row.accepted_at,
      closed_at: row.closed_at,
      close_reason: row.close_reason,
      other_family: row.requester_family
        ? {
            id: row.requester_family.id,
            parent_first_name: row.requester_family.parent_first_name,
            parent_last_name: row.requester_family.parent_last_name,
            email: row.requester_family.email,
          }
        : null,
      trip_links: row.trip_links ?? [],
    }))

    return res.status(200).json({
      sent,
      received,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected server error'

    return res.status(500).json({ error: message })
  }
}