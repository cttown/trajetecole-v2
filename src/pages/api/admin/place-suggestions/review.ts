import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const adminSupabase = createClient(supabaseUrl, serviceRoleKey)

type Body =
  | {
      action: 'approve_new_place'
      suggestionId: string
      reviewNote?: string
    }
  | {
      action: 'map_to_existing_place'
      suggestionId: string
      resolvedPlaceId: string
      reviewNote?: string
    }
  | {
      action: 'reject'
      suggestionId: string
      reviewNote?: string
    }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing access token' })
    }

    const accessToken = authHeader.slice('Bearer '.length)

    const userSupabase = createClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      }
    )

    const {
      data: { user },
      error: userError,
    } = await userSupabase.auth.getUser()

    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid user session' })
    }

    const { data: adminRow, error: adminError } = await adminSupabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (adminError) {
      return res.status(500).json({ error: adminError.message })
    }

    if (!adminRow) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const body = req.body as Body

    const { data: suggestion, error: suggestionError } = await adminSupabase
      .from('place_suggestions')
      .select('*')
      .eq('id', body.suggestionId)
      .single()

    if (suggestionError || !suggestion) {
      return res.status(404).json({ error: 'Suggestion not found' })
    }

    let resolvedPlaceId: string | null = null

    if (body.action === 'approve_new_place') {
      const { data: newPlace, error: insertPlaceError } = await adminSupabase
        .from('places')
        .insert({
          name: suggestion.suggested_name,
          kind: suggestion.kind,
          city: suggestion.city,
          exact_address: suggestion.exact_address,
          postal_code: suggestion.postal_code,
          is_active: true,
        })
        .select()
        .single()

      if (insertPlaceError || !newPlace) {
        return res.status(500).json({ error: insertPlaceError?.message || 'Failed to create place' })
      }

      resolvedPlaceId = newPlace.id

      const { error: updateSuggestionError } = await adminSupabase
        .from('place_suggestions')
        .update({
          status: 'approved_new_place',
          resolved_place_id: resolvedPlaceId,
          review_note: body.reviewNote ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', suggestion.id)

      if (updateSuggestionError) {
        return res.status(500).json({ error: updateSuggestionError.message })
      }
    }

    if (body.action === 'map_to_existing_place') {
      resolvedPlaceId = body.resolvedPlaceId

      const { error: updateSuggestionError } = await adminSupabase
        .from('place_suggestions')
        .update({
          status: 'mapped_to_existing_place',
          resolved_place_id: resolvedPlaceId,
          review_note: body.reviewNote ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', suggestion.id)

      if (updateSuggestionError) {
        return res.status(500).json({ error: updateSuggestionError.message })
      }
    }

    if (body.action === 'reject') {
      const { error: updateSuggestionError } = await adminSupabase
        .from('place_suggestions')
        .update({
          status: 'rejected',
          review_note: body.reviewNote ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', suggestion.id)

      if (updateSuggestionError) {
        return res.status(500).json({ error: updateSuggestionError.message })
      }

      return res.status(200).json({ ok: true })
    }

    if (!resolvedPlaceId) {
      return res.status(500).json({ error: 'Resolved place id missing' })
    }

    const { error: updateFromTripsError } = await adminSupabase
      .from('trips')
      .update({
        from_place_id: resolvedPlaceId,
        from_place_suggestion_id: null,
      })
      .eq('from_place_suggestion_id', suggestion.id)

    if (updateFromTripsError) {
      return res.status(500).json({ error: updateFromTripsError.message })
    }

    const { error: updateToTripsError } = await adminSupabase
      .from('trips')
      .update({
        to_place_id: resolvedPlaceId,
        to_place_suggestion_id: null,
      })
      .eq('to_place_suggestion_id', suggestion.id)

    if (updateToTripsError) {
      return res.status(500).json({ error: updateToTripsError.message })
    }

    return res.status(200).json({
      ok: true,
      resolvedPlaceId,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}