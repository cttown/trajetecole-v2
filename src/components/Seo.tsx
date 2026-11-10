import Head from 'next/head'
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from '../lib/site'

type SeoProps = {
  /** Titre de la page (balise <title> + og:title). */
  title: string
  /** Meta description (+ og:description). */
  description: string
  /** Chemin relatif de la page, ex. '/ressources'. Vide pour l'accueil. */
  path?: string
  /** Image de partage (chemin relatif ou URL absolue). */
  image?: string
  /** Type Open Graph : 'website' par défaut, 'article' pour les ressources. */
  type?: 'website' | 'article'
}

/**
 * En-tête SEO partagé : title, description, canonical, Open Graph et Twitter.
 * Centralise les balises pour éviter de les répéter sur chaque page.
 */
export default function Seo({
  title,
  description,
  path = '',
  image = DEFAULT_OG_IMAGE,
  type = 'website',
}: SeoProps) {
  const url = `${SITE_URL}${path}`
  const imageUrl = image.startsWith('http') ? image : `${SITE_URL}${image}`

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:locale" content="fr_FR" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
    </Head>
  )
}
