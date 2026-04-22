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
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled'
  expires_at: string
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
  const token = String(req.query.token || '')

  if (!token) {
    return res.status(400).send('Lien invalide.')
  }

  try {
    const payload = verifyContactRequestEmailActionToken(token)

    const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
    const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const { data: requestData, error: requestError } = await supabaseAdmin
      .from('contact_requests')
      .select('id, requester_family_id, target_family_id, status, expires_at')
      .eq('id', payload.requestId)
      .single()

    if (requestError || !requestData) {
      return res.status(404).send('Demande introuvable.')
    }

    const requestRow = requestData as ContactRequestRow

    if (requestRow.target_family_id !== payload.targetFamilyId) {
      return res.status(403).send('Action non autorisée.')
    }

    if (requestRow.status !== 'pending') {
      return res.redirect(`${getAppBaseUrl()}/login`)
    }

    if (new Date(requestRow.expires_at).getTime() < Date.now()) {
      await supabaseAdmin
        .from('contact_requests')
        .update({
          status: 'expired',
        })
        .eq('id', requestRow.id)

      return res.send('Cette demande a expiré.')
    }

    const { data: requesterFamily, error: requesterFamilyError } = await supabaseAdmin
      .from('families')
      .select('id, parent_first_name, parent_last_name, email')
      .eq('id', requestRow.requester_family_id)
      .single()

    const { data: targetFamily, error: targetFamilyError } = await supabaseAdmin
      .from('families')
      .select('id, parent_first_name, parent_last_name, email')
      .eq('id', requestRow.target_family_id)
      .single()

    if (requesterFamilyError || !requesterFamily || targetFamilyError || !targetFamily) {
      return res.status(404).send('Famille introuvable.')
    }

    const nowIso = new Date().toISOString()
    const appBaseUrl = getAppBaseUrl()

    if (payload.action === 'accept') {
      const { error: updateError } = await supabaseAdmin
        .from('contact_requests')
        .update({
          status: 'accepted',
          responded_at: nowIso,
          accepted_at: nowIso,
        })
        .eq('id', requestRow.id)

      if (updateError) {
        return res.status(500).send(updateError.message)
      }

      try {
        await sendEmail({
          to: requesterFamily.email,
          subject: 'Votre demande a été acceptée sur TrajetEcole',
          html: buildEmailLayout({
            title: 'Demande acceptée',
            intro: `${displayParentName(
              targetFamily as FamilyRow
            )} a accepté votre demande de mise en relation.`,
            sections: [
              {
                title: 'Coordonnées',
                lines: [`Email : ${targetFamily.email}`],
              },
              {
                title: 'Suite',
                lines: [
                  'Vous pouvez maintenant contacter ce parent pour échanger directement.',
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
              'Les informations à jour restent disponibles dans votre espace TrajetEcole.',
          }),
        })
      } catch (emailError) {
        console.error('Failed to send acceptance email:', emailError)
      }

      return res.send('Demande acceptée. Vous pouvez fermer cette page.')
    }

    const { error: updateError } = await supabaseAdmin
      .from('contact_requests')
      .update({
        status: 'declined',
        responded_at: nowIso,
      })
      .eq('id', requestRow.id)

    if (updateError) {
      return res.status(500).send(updateError.message)
    }

    try {
      await sendEmail({
        to: requesterFamily.email,
        subject: 'Votre demande a été refusée sur TrajetEcole',
        html: buildEmailLayout({
          title: 'Demande refusée',
          intro: `${displayParentName(
            targetFamily as FamilyRow
          )} n’a pas donné suite à votre demande de mise en relation.`,
          sections: [
            {
              title: 'Suite',
              lines: [
                'Vous pouvez relancer une recherche ou contacter une autre famille compatible.',
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
            'Les informations à jour restent disponibles dans votre espace TrajetEcole.',
        }),
      })
    } catch (emailError) {
      console.error('Failed to send decline email:', emailError)
    }

    return res.send('Demande refusée. Vous pouvez fermer cette page.')
  } catch (error) {
    return res.status(400).send(
      error instanceof Error ? error.message : 'Lien invalide.'
    )
  }
}