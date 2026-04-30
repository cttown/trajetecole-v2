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

            <div className={styles.aboutCardsGrid}>
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
                <h3>Gratuit pour les familles</h3>
                <p>L’utilisation du site est gratuite.</p>
              </div>

              <div className={styles.featureCard}>
                <div className={styles.featureIllustration}>🔒</div>
                <h3>Vie privée respectée</h3>
                <p>Les coordonnées ne sont pas affichées publiquement.</p>
              </div>

              <div className={styles.featureCard}>
                <div className={styles.featureIllustration}>📌</div>
                <h3>Projet indépendant</h3>
                <p>Le site n’est pas un service officiel de la mairie ou des écoles.</p>
              </div>
            </div>

            <div className={styles.aboutContentGrid}>
              <div className={styles.aboutContentCard}>
                <div className={styles.aboutContentIcon}>💡</div>
                <div>
                  <h2>Pourquoi ce site ?</h2>
                  <p>
                    Comme beaucoup de parents, j’ai constaté que plusieurs familles font souvent
                    des trajets similaires — école, activités, conservatoire, sport — sans
                    forcément se connaître.
                  </p>
                  <p>
                    TrajetÉcole a donc été créé pour faciliter les mises en relation entre parents
                    de Bourg-la-Reine, dans un cadre simple, volontaire et respectueux de la vie
                    privée.
                  </p>
                </div>
              </div>

              <div className={styles.aboutContentCard}>
                <div className={styles.aboutContentIcon}>✅</div>
                <div>
                  <h2>Un service gratuit pour les familles</h2>
                  <p>
                    L’utilisation du site est gratuite pour les familles. L’objectif est de
                    favoriser l’entraide locale entre parents de Bourg-la-Reine.
                  </p>
                </div>
              </div>

              <div className={styles.aboutContentCard}>
                <div className={styles.aboutContentIcon}>🌱</div>
                <div>
                  <h2>Un projet qui évolue avec vos retours</h2>
                  <p>
                    Le site est encore jeune et s’améliorera progressivement grâce aux retours des
                    familles utilisatrices.
                  </p>
                  <p>
                    Toutes les suggestions sont les bienvenues : amélioration du site, ajout de
                    lieux, correction d’un problème ou idée pour mieux répondre aux besoins des
                    parents.
                  </p>
                </div>
              </div>

              <div className={styles.aboutContentCard}>
                <div className={styles.aboutContentIcon}>📌</div>
                <div>
                  <h2>Une initiative indépendante</h2>
                  <p>
                    TrajetÉcole n’est pas un service officiel de la mairie ou des établissements
                    scolaires. C’est une initiative indépendante, pensée pour favoriser l’entraide
                    entre parents.
                  </p>
                </div>
              </div>
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