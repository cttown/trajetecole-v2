import crypto from 'crypto'
import { Resend } from 'resend'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`)
  }
  return value
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function hashText(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

export function createDeletionActionToken(payload: {
  requestId: string
  email: string
  exp: number
}) {
  const secret = requireEnv('EMAIL_ACTION_SECRET')
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto
    .createHmac('sha256', secret)
    .update(encoded)
    .digest('base64url')

  return `${encoded}.${signature}`
}

export function verifyDeletionActionToken(token: string) {
  const secret = requireEnv('EMAIL_ACTION_SECRET')
  const [encoded, signature] = token.split('.')

  if (!encoded || !signature) {
    throw new Error('Invalid token format')
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(encoded)
    .digest('base64url')

  if (signature !== expectedSignature) {
    throw new Error('Invalid token signature')
  }

  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as {
    requestId: string
    email: string
    exp: number
  }

  if (!payload.exp || Date.now() > payload.exp) {
    throw new Error('Token expired')
  }

  return payload
}

export function createContactRequestEmailActionToken(payload: {
  requestId: string
  targetFamilyId: string
  action: 'accept' | 'decline'
  exp: number
}) {
  const secret = requireEnv('EMAIL_ACTION_SECRET')
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto
    .createHmac('sha256', secret)
    .update(encoded)
    .digest('base64url')

  return `${encoded}.${signature}`
}

export function verifyContactRequestEmailActionToken(token: string) {
  const secret = requireEnv('EMAIL_ACTION_SECRET')
  const [encoded, signature] = token.split('.')

  if (!encoded || !signature) {
    throw new Error('Invalid token format')
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(encoded)
    .digest('base64url')

  if (signature !== expectedSignature) {
    throw new Error('Invalid token signature')
  }

  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as {
    requestId: string
    targetFamilyId: string
    action: 'accept' | 'decline'
    exp: number
  }

  if (!payload.exp || Date.now() > payload.exp) {
    throw new Error('Token expired')
  }

  return payload
}

type EmailButton = {
  label: string
  url: string
  kind?: 'primary' | 'secondary'
}

type EmailSection = {
  title?: string
  lines: string[]
}

export function buildEmailLayout({
  title,
  intro,
  sections = [],
  buttons = [],
  footerNote,
}: {
  title: string
  intro?: string
  sections?: EmailSection[]
  buttons?: EmailButton[]
  footerNote?: string
}) {
  const introHtml = intro
    ? `<p style="margin:0 0 18px;font-size:16px;line-height:1.7;color:#244a79;">${escapeHtml(
        intro
      )}</p>`
    : ''

  const sectionsHtml = sections
    .map((section) => {
      const titleHtml = section.title
        ? `<h2 style="margin:0 0 10px;font-size:18px;color:#17396a;">${escapeHtml(
            section.title
          )}</h2>`
        : ''

      const linesHtml = section.lines
        .map(
          (line) =>
            `<p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#35557d;">${escapeHtml(
              line
            )}</p>`
        )
        .join('')

      return `
        <div style="margin:0 0 22px;padding:18px 18px 10px;border:1px solid #dbe8f5;border-radius:16px;background:#f8fbff;">
          ${titleHtml}
          ${linesHtml}
        </div>
      `
    })
    .join('')

  const buttonsHtml = buttons.length
    ? `
      <div style="margin:24px 0 20px;">
        ${buttons
          .map((button) => {
            const isPrimary = button.kind !== 'secondary'
            const background = isPrimary ? '#1670dc' : '#ffffff'
            const color = isPrimary ? '#ffffff' : '#17396a'
            const border = isPrimary ? '#1670dc' : '#cfe0f2'

            return `
              <a
                href="${escapeHtml(button.url)}"
                style="display:inline-block;margin:0 10px 10px 0;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700;background:${background};color:${color};border:1px solid ${border};"
              >
                ${escapeHtml(button.label)}
              </a>
            `
          })
          .join('')}
      </div>
    `
    : ''

  const footerHtml = footerNote
    ? `<p style="margin:18px 0 0;font-size:14px;line-height:1.7;color:#5c7699;">${escapeHtml(
        footerNote
      )}</p>`
    : ''

  return `
    <div style="margin:0;padding:32px 16px;background:#edf3fb;font-family:Arial,sans-serif;">
      <div style="max-width:700px;margin:0 auto;background:#ffffff;border-radius:24px;border:1px solid #dbe8f5;overflow:hidden;">
        <div style="padding:28px 26px;background:linear-gradient(180deg,#f7fbff 0%,#edf3fb 100%);border-bottom:1px solid #dbe8f5;">
          <div style="display:inline-block;padding:8px 14px;border-radius:999px;background:#dff1ff;color:#1b5fae;font-size:13px;font-weight:700;margin-bottom:16px;">
            TrajetEcole
          </div>
          <h1 style="margin:0;font-size:28px;line-height:1.25;color:#17396a;">${escapeHtml(
            title
          )}</h1>
        </div>

        <div style="padding:26px;">
          ${introHtml}
          ${sectionsHtml}
          ${buttonsHtml}
          ${footerHtml}
        </div>
      </div>
    </div>
  `
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  const resend = new Resend(requireEnv('RESEND_API_KEY'))

  return resend.emails.send({
    from: requireEnv('EMAIL_FROM'),
    to,
    subject,
    html,
  })
}