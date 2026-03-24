import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { buildEmailLayout, sendEmail } from '../../lib/email'

type ContactAdminBody = {
  parent_first_name?: string
  parent_last_name?: string
  email?: string
  subject?: string
  message?: string
  website?: string
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`)
  }
  return value
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function trimOrEmpty(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function getAdminContactEmail() {
  return requireEnv('ADMIN_CONTACT_EMAIL')
}

function getAppBaseUrl() {
  return requireEnv('APP_BASE_URL')
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = req.body as ContactAdminBody

    const parentFirstName = trimOrEmpty(body.parent_first_name)
    const parentLastName = trimOrEmpty(body.parent_last_name)
    const email = trimOrEmpty(body.email).toLowerCase()
    const subject = trimOrEmpty(body.subject)
    const message = trimOrEmpty(body.message)
    const website = trimOrEmpty(body.website)

    if (website) {
      return res.status(200).json({ ok: true })
    }

    if (!email || !subject || !message) {
      return res.status(400).json({
        error: 'Email, sujet et message sont obligatoires.',
      })
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        error: 'Adresse email invalide.',
      })
    }

    if (subject.length > 200) {
      return res.status(400).json({
        error: 'Le sujet est trop long.',
      })
    }

    if (message.length < 10) {
      return res.status(400).json({
        error: 'Le message est trop court.',
      })
    }

    if (message.length > 5000) {
      return res.status(400).json({
        error: 'Le message est trop long.',
      })
    }

    const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
    const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const { error: insertError } = await supabaseAdmin
      .from('admin_contact_messages')
      .insert({
        parent_first_name: parentFirstName || null,
        parent_last_name: parentLastName || null,
        email,
        subject,
        message,
        status: 'new',
      })

    if (insertError) {
      return res.status(500).json({ error: insertError.message })
    }

    const adminEmail = getAdminContactEmail()
    const appBaseUrl = getAppBaseUrl()
    const parentDisplayName =
      `${parentFirstName} ${parentLastName}`.trim() || email

    try {
      await sendEmail({
        to: adminEmail,
        subject: `Nouveau message parent — ${subject}`,
        html: buildEmailLayout({
          title: 'Nouveau message reçu depuis le site',
          intro: `${parentDisplayName} a envoyé un message via le formulaire de contact.`,
          sections: [
            {
              title: 'Informations du parent',
              lines: [
                `Nom : ${parentDisplayName}`,
                `Email : ${email}`,
                `Sujet : ${subject}`,
              ],
            },
            {
              title: 'Message',
              lines: [message],
            },
          ],
          buttons: [
            {
              label: 'Ouvrir le site',
              url: `${appBaseUrl}/`,
              kind: 'secondary',
            },
          ],
          footerNote:
            'Ce message a été envoyé depuis le formulaire de contact TrajetEcole.',
        }),
      })
    } catch (adminEmailError) {
      console.error('Failed to send admin contact email:', adminEmailError)
    }

    try {
      await sendEmail({
        to: email,
        subject: 'Nous avons bien reçu votre message — TrajetEcole',
        html: buildEmailLayout({
          title: 'Message bien reçu',
          intro: `Bonjour ${parentFirstName || ''}`.trim() || 'Bonjour,',
          sections: [
            {
              title: 'Récapitulatif',
              lines: [
                `Sujet : ${subject}`,
                `Votre message a bien été transmis à l’administrateur du site.`,
              ],
            },
          ],
          buttons: [
            {
              label: 'Retour au site',
              url: `${appBaseUrl}/`,
              kind: 'primary',
            },
          ],
          footerNote:
            'Ceci est un accusé de réception automatique. Nous reviendrons vers vous dès que possible.',
        }),
      })
    } catch (parentEmailError) {
      console.error('Failed to send parent acknowledgement email:', parentEmailError)
    }

    return res.status(200).json({ ok: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected server error'

    return res.status(500).json({ error: message })
  }
}