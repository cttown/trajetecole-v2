import Link from 'next/link'
import type { CSSProperties } from 'react'

type Crumb = { label: string; href?: string }

const navStyle: CSSProperties = {
  padding: '4px 0 20px',
  fontSize: 14,
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
  alignItems: 'center',
}

const linkStyle: CSSProperties = {
  color: '#1670dc',
  textDecoration: 'none',
  fontWeight: 600,
}

const currentStyle: CSSProperties = { color: '#5c7699' }
const separatorStyle: CSSProperties = { color: '#9fb4ce' }
const itemStyle: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6 }

/**
 * Fil d'Ariane affiché en haut des pages de contenu, pour offrir un retour
 * immédiat (accueil / section) sans avoir à faire défiler toute la page.
 */
export default function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Fil d’ariane" style={navStyle}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <span key={index} style={itemStyle}>
            {item.href && !isLast ? (
              <Link href={item.href} style={linkStyle}>
                {item.label}
              </Link>
            ) : (
              <span style={currentStyle} aria-current={isLast ? 'page' : undefined}>
                {item.label}
              </span>
            )}
            {!isLast ? <span style={separatorStyle}>›</span> : null}
          </span>
        )
      })}
    </nav>
  )
}
