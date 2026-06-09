import Head from 'next/head'
import Link from 'next/link'
import styles from '../../styles/Home.module.css'

const resources = [
  {
    title: 'Comment organiser les trajets scolaires entre voisins ?',
    description:
      'Conseils pratiques pour organiser un départ groupé à pied avec d’autres familles du quartier.',
    href: '/ressources/organiser-trajets-scolaires-entre-voisins',
    icon: '🚶',
  },
  {
    title: "Comment gagner du temps le matin grâce à l'entraide entre parents ?",
    description:
      'Des idées simples pour organiser un tour de rôle entre familles et alléger les matinées.',
    href: '/ressources/gagner-temps-matin-entraide-parents',
    icon: '⏰',
  },
  {
    title: "Activités extrascolaires : comment partager les trajets avec d'autres familles ?",
    description:
      'Sport, musique, danse, arts martiaux : comment s’organiser entre familles pour réduire les trajets.',
    href: '/ressources/activites-extrascolaires-partager-trajets',
    icon: '🎒',
  },
  {
    title: "Confier son enfant à un autre parent : comment s'organiser sereinement ?",
    description:
      'Confiance, règles, horaires, imprévus : les points à clarifier pour une organisation rassurante.',
    href: '/ressources/confier-enfant-autre-parent',
    icon: '🤝',
  },
  {
    title: 'Trajets partagés entre familles : quelles règles établir dès le début ?',
    description:
      'Les points essentiels à définir dès le départ pour que l’organisation reste simple et durable.',
    href: '/ressources/regles-trajets-partages-familles',
    icon: '📝',
  },
  {
    title: '5 bonnes raisons de partager les trajets de vos enfants à pied',
    description:
      'Gain de temps, sécurité, autonomie, entraide locale : pourquoi les trajets groupés peuvent aider les familles.',
    href: '/ressources/raisons-partager-trajets-enfants-pied',
    icon: '🌿',
  },
]

export default function RessourcesPage() {
  return (
    <>
      <Head>
        <title>Ressources - TrajetÉcole</title>
        <meta
          name="description"
          content="Conseils pratiques pour mieux organiser les trajets des enfants : école, activités, conservatoire, sport et entraide entre parents."
        />
      </Head>

      <main className={styles.page}>
        <section className={styles.legalSection}>
          <div className={styles.container}>
            <div className={styles.legalHeader}>
              <div className={styles.badge}>📚 Conseils pratiques</div>

              <h1 className={styles.legalTitle}>Ressources</h1>

              <p className={styles.legalIntro}>
                Retrouvez ici des conseils simples pour mieux organiser les trajets des enfants,
                encourager l’entraide locale entre parents et trouver des solutions pratiques au
                quotidien.
              </p>
            </div>

            <div className={styles.featuresGrid}>
              {resources.map((resource) => (
                <Link
                  key={resource.href}
                  href={resource.href}
                  className={styles.featureCard}
                  style={{
                    display: 'block',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <div className={styles.featureIllustration}>{resource.icon}</div>

                  <h3>{resource.title}</h3>

                  <p>{resource.description}</p>

                  <span
                    className={styles.secondaryButton}
                    style={{
                      marginTop: 18,
                      pointerEvents: 'none',
                    }}
                  >
                    Lire la ressource
                  </span>
                </Link>
              ))}
            </div>

            <div className={styles.legalActions}>
              <Link href="/" className={styles.secondaryButton}>
                Retour à l’accueil
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}