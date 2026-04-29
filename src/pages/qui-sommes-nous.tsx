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
          content="TrajetÉcole est une initiative locale créée à Bourg-la-Reine pour faciliter l’entraide entre parents autour des trajets des enfants."
        />
      </Head>

      <main className={styles.page}>
        <section className={styles.legalSection}>
          <div className={styles.container}>
            <div className={styles.legalHeader}>
              <div className={styles.badge}>🏡 Initiative locale</div>

              <h1 className={styles.legalTitle}>Qui sommes-nous ?</h1>

              <p className={styles.legalIntro}>
                TrajetÉcole est un projet local créé par un habitant de Bourg-la-Reine, parent
                d’élève, pour aider les familles à mieux s’organiser autour des trajets des enfants.
              </p>
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
                <div className={styles.featureIllustration}>🔒</div>
                <h3>Vie privée respectée</h3>
                <p>Les coordonnées ne sont pas affichées publiquement.</p>
              </div>
            </div>

            <div className={styles.legalCard}>
              <h2>Pourquoi ce site ?</h2>
              <p>
                Comme beaucoup de parents, j’ai constaté que plusieurs familles font souvent des
                trajets similaires — école, activités, conservatoire, sport — sans forcément se
                connaître.
              </p>
            </div>

            <div className={styles.legalCard}>
              <h2>Un cadre simple et volontaire</h2>
              <p>
                J’ai donc créé ce site pour faciliter les mises en relation entre parents de
                Bourg-la-Reine, dans un cadre simple, volontaire et respectueux de la vie privée.
              </p>
            </div>

            <div className={styles.legalCard}>
              <h2>Gratuit pour les familles</h2>
              <p>
                L’utilisation du site est gratuite pour les familles. L’objectif est de favoriser
                l’entraide locale entre parents de Bourg-la-Reine.
              </p>
            </div>

            <div className={styles.legalCard}>
              <h2>Un projet qui va s’améliorer</h2>
              <p>
                Le site est développé et administré localement. Il est encore jeune et s’améliorera
                progressivement grâce aux retours des familles utilisatrices.
              </p>
            </div>

            <div className={styles.legalCard}>
              <h2>Suggestions bienvenues</h2>
              <p>
                Toutes les suggestions sont les bienvenues : amélioration du site, ajout de lieux,
                correction d’un problème ou idée pour mieux répondre aux besoins des parents.
              </p>
            </div>

            <div className={styles.legalCard}>
              <h2>Projet indépendant</h2>
              <p>
                TrajetÉcole n’est pas un service officiel de la mairie ou des établissements
                scolaires. C’est une initiative indépendante, pensée pour favoriser l’entraide entre
                parents.
              </p>
            </div>

            <div className={styles.legalActions}>
              <Link href="/contact-admin" className={styles.primaryButton}>
                Contacter l’admin
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