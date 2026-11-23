import Seo from '../components/Seo'
import Breadcrumb from '../components/Breadcrumb'
import Link from 'next/link'
import styles from '../styles/Home.module.css'

export default function QuiSommesNousPage() {
  return (
    <>
      <Seo
        title="Qui sommes-nous ? - TrajetEcole"
        description="TrajetEcole facilite l’entraide entre parents autour des trajets des enfants, partout en France."
        path="/qui-sommes-nous"
      />

      <main className={styles.page}>
        <section className={styles.legalSection}>
          <div className={styles.container}>
            <Breadcrumb
              items={[{ label: 'Accueil', href: '/' }, { label: 'Qui sommes-nous ?' }]}
            />

            <div className={styles.legalHeader}>
              <div className={styles.badge}>🤝 Entraide entre parents</div>
              <h1 className={styles.legalTitle}>Qui sommes-nous ?</h1>
            </div>

            <div className={styles.featuresGrid}>
              <div className={styles.featureCard}>
                <div className={styles.featureIllustration}>🏡</div>
                <h3>Par un parent d’élève</h3>
                <p>Créée par un parent d’élève, ouverte à toutes les familles.</p>
              </div>

              <div className={styles.featureCard}>
                <div className={styles.featureIllustration}>🤝</div>
                <h3>Entraide entre familles</h3>
                <p>Faciliter les trajets réguliers des enfants.</p>
              </div>

              <div className={styles.featureCard}>
                <div className={styles.featureIllustration}>✅</div>
                <h3>Gratuit</h3>
                <p>L’utilisation du site est gratuite.</p>
              </div>
            </div>

            <div className={styles.legalCard} style={{ marginTop: 24 }}>
              <h2 style={{ fontSize: 28, lineHeight: 1.25 }}>Pourquoi ce site ?</h2>
              <p>
                Partout en France, beaucoup de familles accompagnent leurs enfants vers les mêmes
                écoles, activités, clubs sportifs ou le conservatoire, souvent aux mêmes horaires.
              </p>
              <p style={{ marginTop: 12 }}>
                TrajetEcole est né d’un constat simple : ces trajets existent déjà, mais les
                familles ne savent pas toujours qu’elles pourraient s’entraider.
              </p>
            </div>

            <div className={styles.legalCard}>
              <h2 style={{ fontSize: 28, lineHeight: 1.25 }}>Ce que permet TrajetEcole</h2>
              <p>
                Le site permet aux parents d’indiquer leurs trajets réguliers et de repérer
                d’autres familles ayant des trajets proches ou compatibles.
              </p>
              <p style={{ marginTop: 12 }}>
                L’objectif n’est pas d’organiser automatiquement les déplacements, mais de faciliter
                une première mise en relation entre parents.
              </p>
            </div>

            <div className={styles.legalCard}>
              <h2 style={{ fontSize: 28, lineHeight: 1.25 }}>
                Un cadre volontaire et respectueux
              </h2>
              <p>
                Chaque famille choisit les trajets qu’elle ajoute et les demandes qu’elle accepte.
              </p>
              <p style={{ marginTop: 12 }}>
                Une mise en relation directe se fait uniquement après accord des deux familles.
              </p>
            </div>

            <div className={styles.legalCard}>
              <h2 style={{ fontSize: 28, lineHeight: 1.25 }}>
                Un projet qui évolue
              </h2>
              <p>
                TrajetEcole est encore jeune. Le site sera amélioré progressivement grâce aux
                retours des familles utilisatrices.
              </p>
              <p style={{ marginTop: 12 }}>
                Vous pouvez proposer une amélioration ou signaler un problème en contactant l'admin du site.
              </p>
            </div>

            <div className={styles.legalCard}>
              <h2 style={{ fontSize: 28, lineHeight: 1.25 }}>Une initiative indépendante</h2>
              <p>
                TrajetEcole n’est pas un service officiel de la mairie, des écoles ou des
                associations.
              </p>
              <p style={{ marginTop: 12 }}>
                C’est une initiative indépendante, pensée pour encourager l’entraide locale entre
                parents.
              </p>
            </div>

            <div className={styles.legalActions}>
              <Link href="/contact-admin" className={styles.primaryButton}>
                Contacter l&apos;admin
              </Link>

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