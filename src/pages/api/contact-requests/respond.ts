import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { buildEmailLayout, sendEmail } from '../../../lib/email'

type RespondBody = {
  contact_request_id: string
  action: 'accept' | 'decline'
}

type ContactRequestRow = {
  id: string
  requester_family_id: string
  target_family_id: string
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled'
  created_at: string
  expires_at: string
  accepted_at: string | null
}

type FamilyRow = {
  id: string
  parent_first_name: string | null
  parent_last_name: string | null
  email: string
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`)
  }
  return value
}

function getAppBaseUrl() {
  return requireEnv('APP_BASE_URL')
}

function displayParentName(family: FamilyRow) {
  const full = `${family.parent_first_name ?? ''} ${family.parent_last_name ?? ''}`.trim()
  return full || family.email
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = req.body as RespondBody
    const contactRequestId = body?.contact_request_id
    const action = body?.action

    if (!contactRequestId) {
      return res.status(400).json({ error: 'contact_request_id is required' })
    }

    if (action !== 'accept' && action !== 'decline') {
      return res.status(400).json({ error: 'action must be accept or decline' })
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
      .select('id, parent_first_name, parent_last_name, email')
      .eq('auth_user_id', user.id)
      .single()

    if (ownFamilyError || !ownFamily) {
      return res.status(404).json({ error: 'Family not found' })
    }

    const { data: requestData, error: requestError } = await supabaseAdmin
      .from('contact_requests')
      .select('id, requester_family_id, target_family_id, status, created_at, expires_at, accepted_at')
      .eq('id', contactRequestId)
      .single()

    if (requestError || !requestData) {
      return res.status(404).json({ error: 'Request not found' })
    }

    const requestRow = requestData as ContactRequestRow

    if (requestRow.target_family_id !== ownFamily.id) {
      return res.status(403).json({
        error: 'Only the target family can respond to this request',
      })
    }

    if (requestRow.status !== 'pending') {
      return res.status(409).json({
        error: 'Only a pending request can be answered',
      })
    }

    const { data: requesterFamily, error: requesterFamilyError } = await supabaseAdmin
      .from('families')
      .select('id, parent_first_name, parent_last_name, email')
      .eq('id', requestRow.requester_family_id)
      .single()

    if (requesterFamilyError || !requesterFamily) {
      return res.status(404).json({ error: 'Requester family not found' })
    }

    const nowIso = new Date().toISOString()

    const nextStatus = action === 'accept' ? 'accepted' : 'declined'

    const updatePayload =
      action === 'accept'
        ? {
            status: nextStatus,
            responded_at: nowIso,
            accepted_at: nowIso,
          }
        : {
            status: nextStatus,
            responded_at: nowIso,
            close_reason: 'Declined by target family',
          }

    const { error: updateError } = await supabaseAdmin
      .from('contact_requests')
      .update(updatePayload)
      .eq('id', requestRow.id)

    if (updateError) {
      return res.status(500).json({ error: updateError.message })
    }

    try {
      const appBaseUrl = getAppBaseUrl()

      if (action === 'accept') {
        await sendEmail({
          to: requesterFamily.email,
          subject: 'Votre demande a été acceptée sur TrajetEcole',
          html: buildEmailLayout({
            title: 'Demande acceptée',
            intro: `${displayParentName(
              ownFamily as FamilyRow
            )} a accepté votre demande de mise en relation.`,
            sections: [
              {
                title: 'Informations utiles',
                lines: [
                  `Email partagé : ${ownFamily.email}`,
                  `Date de réponse : ${new Date(nowIso).toLocaleString('fr-FR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`,
                ],
              },
            ],
            buttons: [
              {
                label: 'Voir mon espace',
                url: `${appBaseUrl}/dashboard`,
                kind: 'primary',
              },
            ],
            footerNote:
              'Les coordonnées et le statut à jour sont visibles dans votre espace TrajetEcole.',
          }),
        })
      } else {
        await sendEmail({
          to: requesterFamily.email,
          subject: 'Votre demande a été refusée sur TrajetEcole',
          html: buildEmailLayout({
            title: 'Demande refusée',
            intro: `${displayParentName(
              ownFamily as FamilyRow
            )} a refusé votre demande de mise en relation.`,
            sections: [
              {
                title: 'Informations utiles',
                lines: [
                  `Date de réponse : ${new Date(nowIso).toLocaleString('fr-FR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`,
                ],
              },
            ],
            buttons: [
              {
                label: 'Voir mon espace',
                url: `${appBaseUrl}/dashboard`,
                kind: 'primary',
              },
            ],
            footerNote:
              'Les informations à jour sont visibles dans votre espace TrajetEcole.',
          }),
        })
      }
    } catch (emailError) {
      console.error('Failed to send response email:', emailError)
    }

    return res.status(200).json({
      ok: true,
      status: nextStatus,
      responded_at: nowIso,
      accepted_at: action === 'accept' ? nowIso : null,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected server error'

    return res.status(500).json({ error: message })
  }
}