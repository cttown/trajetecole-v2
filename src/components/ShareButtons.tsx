import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { SITE_URL, SITE_NAME } from '../lib/site'

type ShareButtonsProps = {
  /** Lien à partager (par défaut : l'accueil du site). */
  url?: string
  /** Texte d'accompagnement pour le partage. */
  text?: string
}

const wrapStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 10,
  justifyContent: 'center',
  alignItems: 'center',
}

const baseButton: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 16px',
  borderRadius: 9999,
  border: '1px solid #d4e0ef',
  background: '#ffffff',
  color: '#1f3a5f',
  fontSize: 14,
  fontWeight: 600,
  textDecoration: 'none',
  cursor: 'pointer',
  lineHeight: 1,
}

const primaryButton: CSSProperties = {
  ...baseButton,
  border: '1px solid #1670dc',
  background: '#1670dc',
  color: '#ffffff',
}

export default function ShareButtons({ url, text }: ShareButtonsProps) {
  const shareUrl = url ?? SITE_URL
  const shareText = text ?? `${SITE_NAME} — organiser les trajets à pied des enfants entre familles`

  const [canNativeShare, setCanNativeShare] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function')
  }, [])

  const encodedUrl = encodeURIComponent(shareUrl)
  const encodedText = encodeURIComponent(shareText)

  const links = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    x: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    email: `mailto:?subject=${encodedText}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`,
  }

  async function handleNativeShare() {
    try {
      await navigator.share({ title: SITE_NAME, text: shareText, url: shareUrl })
    } catch {
      // partage annulé par l'utilisateur : rien à faire
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div style={wrapStyle}>
      {canNativeShare ? (
        <button type="button" style={primaryButton} onClick={handleNativeShare}>
          📣 Partager
        </button>
      ) : null}

      <a
        href={links.facebook}
        target="_blank"
        rel="noopener noreferrer"
        style={baseButton}
        aria-label="Partager sur Facebook"
      >
        Facebook
      </a>

      <a
        href={links.x}
        target="_blank"
        rel="noopener noreferrer"
        style={baseButton}
        aria-label="Partager sur X (Twitter)"
      >
        X
      </a>

      <a
        href={links.whatsapp}
        target="_blank"
        rel="noopener noreferrer"
        style={baseButton}
        aria-label="Partager sur WhatsApp"
      >
        WhatsApp
      </a>

      <a
        href={links.linkedin}
        target="_blank"
        rel="noopener noreferrer"
        style={baseButton}
        aria-label="Partager sur LinkedIn"
      >
        LinkedIn
      </a>

      <a href={links.email} style={baseButton} aria-label="Partager par e-mail">
        E-mail
      </a>

      <button type="button" style={baseButton} onClick={handleCopy}>
        {copied ? '✅ Lien copié' : '🔗 Copier le lien'}
      </button>
    </div>
  )
}
