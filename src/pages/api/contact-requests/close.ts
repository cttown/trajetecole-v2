import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

type CloseBody = {
  contact_request_id: string
  outcome: 'agreement_found' | 'no_agreement'
}

type ContactRequestRow = {
  id: string
  requester_family_id: string
  target_family_id: string
  status:
    | 'pending'
    | 'accepted'
    | 'declined'
    | 'expired'
    | 'cancelled'
    | 'closed_no_agreement'
    | 'closed_with_agreement'
  created_at: string
  accepted_at: string | null
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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = req.body as CloseBody
    const contactRequestId = body?.contact_request_id
    const outcome = body?.outcome

    if (!contactRequestId) {
      return res.status(400).json({ error: 'contact_request_id is required' })
    }

    if (outcome !== 'agreement_found' && outcome !== 'no_agreement') {
      return res.status(400).json({ error: 'outcome must be agreement_found or no_agreement' })
    }

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

    const { data: requestData, error: requestError } = await supabaseAdmin
      .from('contact_requests')
      .select('id, requester_family_id, target_family_id, status, created_at, accepted_at')
      .eq('id', contactRequestId)
      .single()

    if (requestError || !requestData) {
      return res.status(404).json({ error: 'Request not found' })
    }

    const requestRow = requestData as ContactRequestRow

    if (requestRow.requester_family_id !== ownFamily.id) {
      return res.status(403).json({
        error: 'Only the requester family can close this request with an outcome',
      })
    }

    if (requestRow.status !== 'accepted') {
      return res.status(409).json({
        error: 'Only an accepted request can be closed with an outcome',
      })
    }

    const nowIso = new Date().toISOString()

    const nextStatus =
      outcome === 'agreement_found'
        ? 'closed_with_agreement'
        : 'closed_no_agreement'

    const closeReason =
      outcome === 'agreement_found'
        ? 'Agreement confirmed by requester family'
        : 'No agreement found after contact'

    const { error: updateError } = await supabaseAdmin
      .from('contact_requests')
      .update({
        status: nextStatus,
        closed_at: nowIso,
        close_reason: closeReason,
      })
      .eq('id', requestRow.id)

    if (updateError) {
      return res.status(500).json({ error: updateError.message })
    }

    return res.status(200).json({
      ok: true,
      status: nextStatus,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected server error'

    return res.status(500).json({ error: message })
  }
}