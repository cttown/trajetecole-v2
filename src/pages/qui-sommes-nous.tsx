import Head from 'next/head'
import Link from 'next/link'
import styles from '../styles/Home.module.css'

export default function QuiSommesNousPage() {
  return (
    <>
      <Head>
        <title>Qui sommes-nous ? - TrajetÉcole</title>
        <meta
          name="description"
          content="TrajetÉcole est une initiative locale à Bourg-la-Reine pour faciliter l’entraide entre parents autour des trajets des enfants."
        />
      </Head>

      <main className={styles.page}>
        <section className={styles.legalSection}>
          <div className={styles.container}>
            <div className={styles.legalHeader}>
              <div className={styles.badge}>🏡 Initiative locale</div>
              <h1 className={styles.legalTitle}>Qui sommes-nous ?</h1>
            </div>

            <div className={styles.featuresGrid}>
              <div className={styles.featureCard}>
                <div className={styles.featureIllustration}>🏡</div>
                <h3>Initiative locale</h3>
                <p>Créée à Bourg-la-Reine par un parent d’élève.</p>
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
                À Bourg-la-Reine, beaucoup de familles accompagnent leurs enfants vers les mêmes
                écoles, activités, clubs sportifs ou le conservatoire, souvent aux mêmes horaires.
              </p>
              <p style={{ marginTop: 12 }}>
                TrajetÉcole est né d’un constat simple : ces trajets existent déjà, mais les
                familles ne savent pas toujours qu’elles pourraient s’entraider.
              </p>
            </div>

            <div className={styles.legalCard}>
              <h2 style={{ fontSize: 28, lineHeight: 1.25 }}>Ce que permet TrajetÉcole</h2>
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
                Un projet local qui évolue
              </h2>
              <p>
                TrajetÉcole est encore jeune. Le site sera amélioré progressivement grâce aux
                retours des familles utilisatrices.
              </p>
              <p style={{ marginTop: 12 }}>
                Vous pouvez proposer une amélioration ou signaler un problème en contactant l'admin du site.
              </p>
            </div>

            <div className={styles.legalCard}>
              <h2 style={{ fontSize: 28, lineHeight: 1.25 }}>Une initiative indépendante</h2>
              <p>
                TrajetÉcole n’est pas un service officiel de la mairie, des écoles ou des
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