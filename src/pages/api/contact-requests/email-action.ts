import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import {
  buildEmailLayout,
  sendEmail,
  verifyContactRequestEmailActionToken,
} from '../../../lib/email'

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
  expires_at: string
  accepted_at: string | null
}

type FamilyRow = {
  id: string
  parent_first_name: string | null
  parent_last_name: string | null
  email: string
  phone?: string | null
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

function redirectToDashboard(
  res: NextApiResponse,
  status: 'accepted' | 'declined' | 'already_done' | 'error'
) {
  const appBaseUrl = getAppBaseUrl()
  res.redirect(`${appBaseUrl}/dashboard?contact_request_email_action=${status}`)
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const token = typeof req.query.token === 'string' ? req.query.token : ''

    if (!token) {
      return redirectToDashboard(res, 'error')
    }

    const payload = verifyContactRequestEmailActionToken(token)

    const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
    const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const { data: requestData, error: requestError } = await supabaseAdmin
      .from('contact_requests')
      .select('id, requester_family_id, target_family_id, status, created_at, expires_at, accepted_at')
      .eq('id', payload.requestId)
      .single()

    if (requestError || !requestData) {
      return redirectToDashboard(res, 'error')
    }

    const requestRow = requestData as ContactRequestRow

    if (requestRow.target_family_id !== payload.targetFamilyId) {
      return redirectToDashboard(res, 'error')
    }

    if (requestRow.status !== 'pending') {
      return redirectToDashboard(res, 'already_done')
    }

    const { data: requesterFamily, error: requesterFamilyError } = await supabaseAdmin
      .from('families')
      .select('id, parent_first_name, parent_last_name, email, phone')
      .eq('id', requestRow.requester_family_id)
      .single()

    const { data: targetFamily, error: targetFamilyError } = await supabaseAdmin
      .from('families')
      .select('id, parent_first_name, parent_last_name, email, phone')
      .eq('id', requestRow.target_family_id)
      .single()

    if (requesterFamilyError || !requesterFamily || targetFamilyError || !targetFamily) {
      return redirectToDashboard(res, 'error')
    }

    const nowIso = new Date().toISOString()

    const nextStatus = payload.action === 'accept' ? 'accepted' : 'declined'

    const updatePayload =
      payload.action === 'accept'
        ? {
            status: nextStatus,
            responded_at: nowIso,
            accepted_at: nowIso,
          }
        : {
            status: nextStatus,
            responded_at: nowIso,
            close_reason: 'Declined by target family via email',
          }

    const { error: updateError } = await supabaseAdmin
      .from('contact_requests')
      .update(updatePayload)
      .eq('id', requestRow.id)

    if (updateError) {
      return redirectToDashboard(res, 'error')
    }

    try {
      const appBaseUrl = getAppBaseUrl()

      if (payload.action === 'accept') {
        await sendEmail({
          to: requesterFamily.email,
          subject: 'Votre demande a été acceptée sur TrajetEcole',
          html: buildEmailLayout({
            title: 'Demande acceptée',
            intro: `Bonne nouvelle : ${displayParentName(
              targetFamily as FamilyRow
            )} a accepté votre demande de mise en relation.`,
            sections: [
              {
                title: 'Coordonnées partagées',
                lines: [
                  `Parent : ${displayParentName(targetFamily as FamilyRow)}`,
                  `Email : ${targetFamily.email}`,
                  ...(targetFamily.phone ? [`Téléphone : ${targetFamily.phone}`] : []),
                ],
              },
              {
                title: 'Prochaine étape',
                lines: [
                  'Vous pouvez maintenant contacter cet autre parent pour organiser le trajet ensemble.',
                  'Nous vous conseillons de prendre contact rapidement afin de définir l’organisation la plus adaptée pour vos enfants.',
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
              'Les coordonnées et le statut à jour sont également disponibles dans votre espace TrajetEcole.',
          }),
        })
      } else {
        await sendEmail({
          to: requesterFamily.email,
          subject: 'Votre demande a été refusée sur TrajetEcole',
          html: buildEmailLayout({
            title: 'Demande refusée',
            intro: `${displayParentName(
              targetFamily as FamilyRow
            )} a refusé votre demande de mise en relation.`,
            sections: [
              {
                title: 'Suite possible',
                lines: [
                  'Vous pouvez poursuivre votre recherche et contacter une autre famille compatible depuis votre espace TrajetEcole.',
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
      console.error('Failed to send response email from email action:', emailError)
    }

    return redirectToDashboard(res, payload.action === 'accept' ? 'accepted' : 'declined')
  } catch (error) {
    console.error('Email action failed:', error)
    return redirectToDashboard(res, 'error')
  }
}