import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { hashText, verifyDeletionActionToken } from '../../../lib/email'

type FamilyRow = {
  id: string
  auth_user_id: string | null
  email: string
  parent_first_name: string | null
  parent_last_name: string | null
  phone: string | null
  created_at: string
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`)
  }
  return value
}

type ConfirmBody = {
  token?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = req.body as ConfirmBody
    const token = typeof body.token === 'string' ? body.token : ''

    if (!token) {
      return res.status(400).json({ error: 'Token manquant.' })
    }

    const payload = verifyDeletionActionToken(token)
    const tokenHash = hashText(token)

    const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
    const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const { data: deletionRequest, error: requestError } = await supabaseAdmin
      .from('deletion_requests')
      .select('*')
      .eq('id', payload.requestId)
      .eq('token_hash', tokenHash)
      .maybeSingle()

    if (requestError || !deletionRequest) {
      return res.status(400).json({ error: 'Demande de suppression invalide.' })
    }

    if (deletionRequest.status === 'completed') {
      return res.status(200).json({
        ok: true,
        message: 'Cette demande a déjà été traitée.',
      })
    }

    if (deletionRequest.status !== 'pending_verification') {
      return res.status(400).json({
        error: 'Cette demande ne peut plus être confirmée.',
      })
    }

    if (new Date(deletionRequest.expires_at).getTime() < Date.now()) {
      await supabaseAdmin
        .from('deletion_requests')
        .update({
          status: 'expired',
          failure_reason: 'Confirmation link expired',
        })
        .eq('id', deletionRequest.id)

      return res.status(400).json({
        error: 'Le lien de confirmation a expiré.',
      })
    }

    const nowIso = new Date().toISOString()

    const { data: family, error: familyError } = await supabaseAdmin
      .from('families')
      .select('*')
      .eq('email', payload.email)
      .maybeSingle()

    if (familyError) {
      return res.status(500).json({ error: familyError.message })
    }

    if (!family) {
      await supabaseAdmin
        .from('deletion_requests')
        .update({
          status: 'no_match',
          verified_at: nowIso,
          completed_at: nowIso,
          failure_reason: 'No matching family found during confirmation',
        })
        .eq('id', deletionRequest.id)

      return res.status(200).json({
        ok: true,
        message: 'Aucune donnée active correspondante n’a été trouvée.',
      })
    }

    const typedFamily = family as FamilyRow

    const [
      { data: children, error: childrenError },
      { data: trips, error: tripsError },
      { data: placeSuggestions, error: suggestionsError },
      { data: contactRequests, error: contactRequestsError },
    ] = await Promise.all([
      supabaseAdmin.from('children').select('*').eq('family_id', typedFamily.id),
      supabaseAdmin.from('trips').select('*').eq('family_id', typedFamily.id),
      supabaseAdmin.from('place_suggestions').select('*').eq('family_id', typedFamily.id),
      supabaseAdmin
        .from('contact_requests')
        .select('*')
        .or(`requester_family_id.eq.${typedFamily.id},target_family_id.eq.${typedFamily.id}`),
    ])

    if (childrenError) return res.status(500).json({ error: childrenError.message })
    if (tripsError) return res.status(500).json({ error: tripsError.message })
    if (suggestionsError) return res.status(500).json({ error: suggestionsError.message })
    if (contactRequestsError) {
      return res.status(500).json({ error: contactRequestsError.message })
    }

    const tripIds = (trips ?? []).map((row: any) => row.id)
    const contactRequestIds = (contactRequests ?? []).map((row: any) => row.id)

    const { data: contactRequestTrips, error: contactRequestTripsError } =
      contactRequestIds.length > 0
        ? await supabaseAdmin
            .from('contact_request_trips')
            .select('*')
            .in('contact_request_id', contactRequestIds)
        : { data: [], error: null as any }

    if (contactRequestTripsError) {
      return res.status(500).json({ error: contactRequestTripsError.message })
    }

    const archiveRequestId = deletionRequest.id

    if (typedFamily) {
      const { error } = await supabaseAdmin.from('deleted_families_archive').insert({
        deletion_request_id: archiveRequestId,
        original_family_id: typedFamily.id,
        archived_data: typedFamily,
      })
      if (error) return res.status(500).json({ error: error.message })
    }

    if ((children ?? []).length > 0) {
      const { error } = await supabaseAdmin.from('deleted_children_archive').insert(
        (children ?? []).map((row: any) => ({
          deletion_request_id: archiveRequestId,
          original_child_id: row.id,
          archived_data: row,
        }))
      )
      if (error) return res.status(500).json({ error: error.message })
    }

    if ((trips ?? []).length > 0) {
      const { error } = await supabaseAdmin.from('deleted_trips_archive').insert(
        (trips ?? []).map((row: any) => ({
          deletion_request_id: archiveRequestId,
          original_trip_id: row.id,
          archived_data: row,
        }))
      )
      if (error) return res.status(500).json({ error: error.message })
    }

    if ((placeSuggestions ?? []).length > 0) {
      const { error } = await supabaseAdmin
        .from('deleted_place_suggestions_archive')
        .insert(
          (placeSuggestions ?? []).map((row: any) => ({
            deletion_request_id: archiveRequestId,
            original_place_suggestion_id: row.id,
            archived_data: row,
          }))
        )
      if (error) return res.status(500).json({ error: error.message })
    }

    if ((contactRequests ?? []).length > 0) {
      const { error } = await supabaseAdmin.from('deleted_contact_requests_archive').insert(
        (contactRequests ?? []).map((row: any) => ({
          deletion_request_id: archiveRequestId,
          original_contact_request_id: row.id,
          archived_data: row,
        }))
      )
      if (error) return res.status(500).json({ error: error.message })
    }

    if ((contactRequestTrips ?? []).length > 0) {
      const { error } = await supabaseAdmin
        .from('deleted_contact_request_trips_archive')
        .insert(
          (contactRequestTrips ?? []).map((row: any) => ({
            deletion_request_id: archiveRequestId,
            original_contact_request_trip_id: row.id,
            archived_data: row,
          }))
        )
      if (error) return res.status(500).json({ error: error.message })
    }

    if (contactRequestIds.length > 0) {
      const { error } = await supabaseAdmin
        .from('contact_request_trips')
        .delete()
        .in('contact_request_id', contactRequestIds)

      if (error) return res.status(500).json({ error: error.message })
    }

    if (contactRequestIds.length > 0) {
      const { error } = await supabaseAdmin
        .from('contact_requests')
        .delete()
        .in('id', contactRequestIds)

      if (error) return res.status(500).json({ error: error.message })
    }

    {
      const { error } = await supabaseAdmin
        .from('place_suggestions')
        .delete()
        .eq('family_id', typedFamily.id)

      if (error) return res.status(500).json({ error: error.message })
    }

    {
      const { error } = await supabaseAdmin.from('trips').delete().eq('family_id', typedFamily.id)
      if (error) return res.status(500).json({ error: error.message })
    }

    {
      const { error } = await supabaseAdmin.from('children').delete().eq('family_id', typedFamily.id)
      if (error) return res.status(500).json({ error: error.message })
    }

    {
      const { error } = await supabaseAdmin.from('families').delete().eq('id', typedFamily.id)
      if (error) return res.status(500).json({ error: error.message })
    }

    if (typedFamily.auth_user_id) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(typedFamily.auth_user_id)
      if (error) {
        await supabaseAdmin
          .from('deletion_requests')
          .update({
            status: 'failed',
            verified_at: nowIso,
            failure_reason: `Auth deletion failed: ${error.message}`,
          })
          .eq('id', archiveRequestId)

        return res.status(500).json({
          error:
            'Les données métier ont été archivées et supprimées, mais la suppression du compte Auth a échoué.',
        })
      }
    }

    await supabaseAdmin
      .from('deletion_requests')
      .update({
        status: 'completed',
        verified_at: nowIso,
        completed_at: nowIso,
        matched_family_id: typedFamily.id,
      })
      .eq('id', archiveRequestId)

    return res.status(200).json({
      ok: true,
      message: 'Vos données ont bien été supprimées et archivées.',
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected server error'
    return res.status(500).json({ error: message })
  }
}