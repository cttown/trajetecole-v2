import { Resend } from 'resend'
import crypto from 'crypto'

type SendEmailArgs = {
  to: string
  subject: string
  html: string
}

type EmailSection = {
  title?: string
  lines: string[]
}

type EmailButton = {
  label: string
  url: string
  kind?: 'primary' | 'secondary'
}

type ContactRequestEmailActionPayload = {
  requestId: string
  targetFamilyId: string
  action: 'accept' | 'decline'
  exp: number
}

type DeletionActionPayload = {
  requestId: string
  email: string
  exp: number
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`)
  }
  return value
}

function getResendClient() {
  const apiKey = requireEnv('RESEND_API_KEY')
  return new Resend(apiKey)
}

function getFromAddress() {
  return requireEnv('EMAIL_FROM')
}

function getEmailActionSecret() {
  return requireEnv('EMAIL_ACTION_SECRET')
}

function getDeletionActionSecret() {
  return requireEnv('DELETION_ACTION_SECRET')
}

export async function sendEmail({ to, subject, html }: SendEmailArgs) {
  const resend = getResendClient()
  const from = getFromAddress()

  const { error } = await resend.emails.send({
    from,
    to: [to],
    subject,
    html,
  })

  if (error) {
    throw new Error(error.message || 'Failed to send email')
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function signWithSecret(value: string, secret: string) {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url')
}

export function hashText(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

export function createContactRequestEmailActionToken(
  payload: ContactRequestEmailActionPayload
) {
  const encodedPayload = encodeBase64Url(JSON.stringify(payload))
  const signature = signWithSecret(encodedPayload, getEmailActionSecret())
  return `${encodedPayload}.${signature}`
}

export function verifyContactRequestEmailActionToken(token: string) {
  const [encodedPayload, providedSignature] = token.split('.')

  if (!encodedPayload || !providedSignature) {
    throw new Error('Invalid token format')
  }

  const expectedSignature = signWithSecret(encodedPayload, getEmailActionSecret())
  const providedBuffer = Buffer.from(providedSignature)
  const expectedBuffer = Buffer.from(expectedSignature)

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    throw new Error('Invalid token signature')
  }

  const parsed = JSON.parse(
    decodeBase64Url(encodedPayload)
  ) as ContactRequestEmailActionPayload

  if (!parsed.requestId || !parsed.targetFamilyId || !parsed.action || !parsed.exp) {
    throw new Error('Invalid token payload')
  }

  if (parsed.action !== 'accept' && parsed.action !== 'decline') {
    throw new Error('Invalid token action')
  }

  if (Date.now() > parsed.exp) {
    throw new Error('Token expired')
  }

  return parsed
}

export function createDeletionActionToken(payload: DeletionActionPayload) {
  const encodedPayload = encodeBase64Url(JSON.stringify(payload))
  const signature = signWithSecret(encodedPayload, getDeletionActionSecret())
  return `${encodedPayload}.${signature}`
}

export function verifyDeletionActionToken(token: string) {
  const [encodedPayload, providedSignature] = token.split('.')

  if (!encodedPayload || !providedSignature) {
    throw new Error('Invalid token format')
  }

  const expectedSignature = signWithSecret(encodedPayload, getDeletionActionSecret())
  const providedBuffer = Buffer.from(providedSignature)
  const expectedBuffer = Buffer.from(expectedSignature)

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    throw new Error('Invalid token signature')
  }

  const parsed = JSON.parse(decodeBase64Url(encodedPayload)) as DeletionActionPayload

  if (!parsed.requestId || !parsed.email || !parsed.exp) {
    throw new Error('Invalid token payload')
  }

  if (Date.now() > parsed.exp) {
    throw new Error('Token expired')
  }

  return parsed
}

export function buildEmailLayout(args: {
  title: string
  intro: string
  lines?: string[]
  sections?: EmailSection[]
  buttons?: EmailButton[]
  footerNote?: string
}) {
  const title = escapeHtml(args.title)
  const intro = escapeHtml(args.intro)

  const legacySection: EmailSection[] =
    args.lines && args.lines.length > 0
      ? [
          {
            lines: args.lines,
          },
        ]
      : []

  const sections: EmailSection[] = [...legacySection, ...(args.sections ?? [])]

  const renderedSections = sections
    .map((section) => {
      const sectionTitle = section.title
        ? `<h2 style="font-size:16px;margin:20px 0 8px 0;">${escapeHtml(section.title)}</h2>`
        : ''

      const lines = section.lines
        .map((line) => `<li style="margin:0 0 8px 0;">${escapeHtml(line)}</li>`)
        .join('')

      return `
        <div style="margin-top:16px;">
          ${sectionTitle}
          <ul style="font-size:15px;line-height:1.7;padding-left:20px;margin:8px 0 0 0;">
            ${lines}
          </ul>
        </div>
      `
    })
    .join('')

  const buttons = (args.buttons ?? [])
    .map((button) => {
      const background = button.kind === 'secondary' ? '#ffffff' : '#111827'
      const color = button.kind === 'secondary' ? '#111827' : '#ffffff'
      const border = button.kind === 'secondary' ? '1px solid #d1d5db' : '1px solid #111827'

      return `
        <a
          href="${escapeHtml(button.url)}"
          style="
            display:inline-block;
            padding:12px 18px;
            border-radius:8px;
            background:${background};
            color:${color};
            text-decoration:none;
            font-weight:600;
            border:${border};
            margin:0 10px 10px 0;
          "
        >
          ${escapeHtml(button.label)}
        </a>
      `
    })
    .join('')

  const footerNote = escapeHtml(
    args.footerNote ||
      'Cet email est une notification. Les informations à jour sont visibles dans votre dashboard TrajetEcole.'
  )

  return `
    <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:24px;color:#111827;">
      <h1 style="font-size:22px;margin-bottom:16px;">${title}</h1>
      <p style="font-size:15px;line-height:1.6;">${intro}</p>

      ${renderedSections}

      ${
        buttons
          ? `
        <div style="margin:24px 0 8px 0;">
          ${buttons}
        </div>
      `
          : ''
      }

      <p style="font-size:13px;color:#6b7280;margin-top:24px;">
        ${footerNote}
      </p>
    </div>
  `
}