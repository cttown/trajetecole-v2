import type { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import {
  buildEmailLayout,
  createDeletionActionToken,
  hashText,
  sendEmail,
} from '../../../lib/email'

type RequestBody = {
  email?: string
  website?: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

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

function isValidEmail(value: string) {
  return EMAIL_REGEX.test(value)
}

function trimOrEmpty(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = req.body as RequestBody
    const email = trimOrEmpty(body.email).toLowerCase()
    const website = trimOrEmpty(body.website)

    if (website) {
      return res.status(200).json({ ok: true })
    }

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Format erroné.' })
    }

    const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
    const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
    const appBaseUrl = getAppBaseUrl()

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const { data: family } = await supabaseAdmin
      .from('families')
      .select('id, email')
      .eq('email', email)
      .maybeSingle()

    if (!family) {
      return res.status(200).json({
        ok: true,
        message:
          'Si cette adresse correspond à un compte TrajetEcole, un email de confirmation vient d’être envoyé.',
      })
    }

    const requestId = crypto.randomUUID()
    const exp = Date.now() + 60 * 60 * 1000
    const token = createDeletionActionToken({
      requestId,
      email,
      exp,
    })

    const tokenHash = hashText(token)
    const expiresAt = new Date(exp).toISOString()

    const { error: insertError } = await supabaseAdmin
      .from('deletion_requests')
      .insert({
        id: requestId,
        email,
        token_hash: tokenHash,
        status: 'pending_verification',
        expires_at: expiresAt,
        matched_family_id: family.id,
      })

    if (insertError) {
      return res.status(500).json({ error: insertError.message })
    }

    const confirmUrl = `${appBaseUrl}/delete-my-data-confirm?token=${encodeURIComponent(token)}`

    try {
      await sendEmail({
        to: email,
        subject: 'Confirmez la suppression de vos données — TrajetEcole',
        html: buildEmailLayout({
          title: 'Confirmation requise',
          intro:
            'Nous avons reçu une demande de suppression de vos données sur TrajetEcole.',
          sections: [
            {
              title: 'Important',
              lines: [
                'Cette action supprimera vos données actives du site.',
                'Une copie d’archive sera conservée hors des fonctionnalités de matching et de connexion.',
                'Ce lien est valable pendant 1 heure.',
              ],
            },
          ],
          buttons: [
            {
              label: 'Confirmer la suppression',
              url: confirmUrl,
              kind: 'primary',
            },
          ],
          footerNote:
            'Si vous n’êtes pas à l’origine de cette demande, ignorez simplement cet email.',
        }),
      })
    } catch (emailError) {
      console.error('Failed to send deletion email:', emailError)
      return res.status(500).json({
        error: 'La demande a été enregistrée, mais l’email de confirmation n’a pas pu être envoyé.',
      })
    }

    return res.status(200).json({
      ok: true,
      message:
        'Si cette adresse correspond à un compte TrajetEcole, un email de confirmation vient d’être envoyé.',
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected server error'
    return res.status(500).json({ error: message })
  }
}