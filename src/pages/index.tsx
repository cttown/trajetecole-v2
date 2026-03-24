import { useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { trackEvent } from '../lib/trackEvent'
import styles from '../styles/Home.module.css'

export default function HomePage() {
  useEffect(() => {
    trackEvent({
      eventType: 'page_view',
      page: 'home',
      path: '/',
    })
  }, [])

  return (
    <>
      <Head>
        <title>Organisez plus simplement les trajets scolaires - Bourg-la-Reine | TrajetEcole</title>
        <meta
          name="description"
          content="TrajetEcole aide les parents de Bourg-la-Reine à organiser plus simplement les trajets scolaires et activités entre familles compatibles."
        />
      </Head>

      <main className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.container}>
            <div className={styles.heroGrid}>
              <div className={styles.heroLeft}>
                <div className={styles.badge}>Trajets école ↔ activités entre parents</div>

                <h1 className={styles.heroTitle}>
                  Organisez plus simplement les trajets scolaires à Bourg-la-Reine
                </h1>

                <p className={styles.heroText}>
                  Trouvez plus facilement des familles compatibles pour les trajets école et
                  activités du quotidien.
                </p>

                <div className={styles.heroButtons}>
                  <Link href="/signup" className={styles.primaryButton}>
                    Créer un compte
                  </Link>

                  <Link href="/login" className={styles.secondaryButton}>
                    Se connecter
                  </Link>
                </div>
              </div>

              <div className={styles.heroRight}>
                <div className={styles.mockup}>
                  <div className={styles.mockupTopbar}>
                    <div className={styles.mockupBrand}>
                      <span className={styles.mockupLogo}>●</span>
                      <span>TrajetEcole</span>
                    </div>
                    <div className={styles.mockupDots}>
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>

                  <div className={styles.mockupMap}>
                    <div className={styles.routeLine}>
                      <span className={styles.routeDot}></span>
                      <span className={styles.routeDot}></span>
                      <span className={styles.routeDot}></span>
                    </div>

                    <div className={`${styles.pin} ${styles.pinOne}`}></div>
                    <div className={`${styles.pin} ${styles.pinTwo}`}></div>

                    <div className={styles.schoolCard}>🏫 Maison → École</div>

                    <div className={styles.matchCard}>
                      <div className={styles.matchTitle}>3 correspondances trouvées</div>
                      <div className={styles.matchLines}>
                        <span></span>
                        <span></span>
                      </div>
                    </div>

                    <div className={styles.requestCard}>
                      <div className={styles.requestTitle}>Demande envoyée</div>
                      <div className={styles.requestStatus}>En attente</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.stepsSection}>
          <div className={styles.container}>
            <h2 className={styles.sectionTitle}>Comment ça marche ?</h2>

            <div className={styles.stepsGrid}>
              <div className={styles.stepCard}>
                <div className={styles.stepNumber}>1</div>
                <h3>Ajouter un trajet</h3>
                <p>Jours, horaires, lieux.</p>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepNumber}>2</div>
                <h3>Voir les correspondances</h3>
                <p>Familles compatibles.</p>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepNumber}>3</div>
                <h3>Envoyer une demande</h3>
                <p>Suivi dans le dashboard.</p>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.featuresSection}>
          <div className={styles.container}>
            <h2 className={styles.sectionTitle}>Une aide concrète au quotidien</h2>

            <div className={styles.featuresGrid}>
              <div className={styles.featureCard}>
                <div className={styles.featureIllustration}>⏰</div>
                <h3>Gain de temps</h3>
                <p>Trouvez rapidement des solutions.</p>
              </div>

              <div className={styles.featureCard}>
                <div className={styles.featureIllustration}>🗂️</div>
                <h3>Organisation claire</h3>
                <p>Tout est regroupé ici.</p>
              </div>

              <div className={styles.featureCard}>
                <div className={styles.featureIllustration}>✅</div>
                <h3>Cadre rassurant</h3>
                <p>Mise en relation encadrée.</p>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.privacySection}>
          <div className={styles.container}>
            <div className={styles.privacyBox}>
              <h2 className={styles.sectionTitle}>Confidentialité</h2>
              <p className={styles.privacyText}>
                Vos données sont utilisées pour faire fonctionner le service et peuvent être
                supprimées sur demande.
              </p>

              <Link href="/confidentialite" className={styles.primaryButton}>
                Lire la politique de confidentialité
              </Link>
            </div>
          </div>
        </section>

        <section className={styles.quickLinksSection}>
          <div className={styles.container}>
            <div className={styles.quickLinksGrid}>
              <Link href="/signup" className={styles.quickLinkCard}>
                <div className={styles.quickLinkIcon}>👤</div>
                <span>Créer un compte</span>
              </Link>

              <Link href="/dashboard" className={styles.quickLinkCard}>
                <div className={styles.quickLinkIcon}>📊</div>
                <span>Dashboard</span>
              </Link>

              <Link href="/contact-admin" className={styles.quickLinkCard}>
                <div className={styles.quickLinkIcon}>✉️</div>
                <span>Contacter l&apos;admin</span>
              </Link>

              <Link href="/delete-my-data" className={styles.quickLinkCard}>
                <div className={styles.quickLinkIcon}>🗑️</div>
                <span>Supprimer mes données</span>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}