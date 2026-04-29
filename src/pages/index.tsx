import { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { trackEvent } from '../lib/trackEvent'
import styles from '../styles/Home.module.css'

export default function HomePage() {
  const router = useRouter()

  const [isAuthChecked, setIsAuthChecked] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    trackEvent({
      eventType: 'page_view',
      page: 'home',
      path: '/',
    })
  }, [])

  useEffect(() => {
    async function loadAuthState() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      setIsLoggedIn(!!user)
      setUserEmail(user?.email || '')
      setIsAuthChecked(true)
    }

    loadAuthState()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user)
      setUserEmail(session?.user?.email || '')
      setIsAuthChecked(true)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    setIsLoggedIn(false)
    setUserEmail('')
    router.push('/')
  }

  return (
    <>
      <Head>
        <title>TrajetÉcole - Organisez les trajets de vos enfants à Bourg-la-Reine</title>
        <meta
          name="description"
          content="TrajetÉcole aide les familles de Bourg-la-Reine à trouver des trajets compatibles pour les enfants : école, activités, conservatoire, sport."
        />
      </Head>

      <main className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.container}>
            <div className={styles.heroGrid}>
              <div className={styles.heroLeft}>
                <div className={styles.badge}>
                  Local · Gratuit pour les familles · Données privées
                </div>

                <h1 className={styles.heroTitle}>
                  Organisez plus facilement les trajets de vos enfants
                </h1>

                <p className={styles.heroText}>
                  Beaucoup de parents font les mêmes trajets sans le savoir. TrajetÉcole aide les
                  familles de Bourg-la-Reine à trouver des trajets compatibles vers l’école, les
                  activités, le conservatoire ou le sport.
                </p>

                <div className={styles.heroBenefits}>
                  <div className={styles.benefitItem}>
                    <span className={styles.benefitIcon}>📍</span>
                    <span>Local</span>
                  </div>
                  <div className={styles.benefitItem}>
                    <span className={styles.benefitIcon}>✅</span>
                    <span>Gratuit pour les familles</span>
                  </div>
                  <div className={styles.benefitItem}>
                    <span className={styles.benefitIcon}>🔒</span>
                    <span>Contact uniquement après accord</span>
                  </div>
                </div>

                {isAuthChecked && isLoggedIn ? (
                  <>
                    <p className={styles.connectionInfo}>
                      Connecté avec : <strong>{userEmail}</strong>
                    </p>

                    <div className={styles.heroButtons}>
                      <Link href="/dashboard" className={styles.primaryButton}>
                        Mon espace
                      </Link>

                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={handleLogout}
                      >
                        Se déconnecter
                      </button>
                    </div>
                  </>
                ) : (
                  <div className={styles.heroButtons}>
                    <Link href="/signup" className={styles.primaryButton}>
                      Créer mon compte
                    </Link>

                    <Link href="#comment-ca-marche" className={styles.secondaryButton}>
                      Comment ça marche ?
                    </Link>
                  </div>
                )}
              </div>

              <div className={styles.heroRight}>
                <div className={styles.mockup}>
                  <div className={styles.mockupTopbar}>
                    <div className={styles.mockupBrand}>
                      <span className={styles.mockupLogo}>●</span>
                      <span>TrajetÉcole</span>
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
                      <div className={styles.matchTitle}>Familles compatibles</div>
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

        <section id="comment-ca-marche" className={styles.stepsSection}>
          <div className={styles.container}>
            <h2 className={styles.sectionTitle}>Comment ça marche ?</h2>

            <div className={styles.stepsGrid}>
              <div className={styles.stepCard}>
                <div className={styles.stepNumber}>1</div>
                <h3>Ajoutez vos trajets</h3>
                <p>Indiquez les lieux, les jours et les horaires.</p>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepNumber}>2</div>
                <h3>Découvrez les familles compatibles</h3>
                <p>Le site recherche les trajets proches ou similaires.</p>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepNumber}>3</div>
                <h3>Demandez une mise en relation</h3>
                <p>Le contact se fait uniquement si les deux familles acceptent.</p>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.featuresSection}>
          <div className={styles.container}>
            <h2 className={styles.sectionTitle}>Pourquoi s’inscrire ?</h2>

            <div className={styles.privacyBox}>
              <p className={styles.privacyText}>
                Plus il y a de familles inscrites, plus les correspondances deviennent utiles.
              </p>

              {isAuthChecked && isLoggedIn ? (
                <Link href="/dashboard" className={styles.primaryButton}>
                  Accéder à mon espace
                </Link>
              ) : (
                <Link href="/signup" className={styles.primaryButton}>
                  Rejoindre le réseau local
                </Link>
              )}
            </div>
          </div>
        </section>

        <section className={styles.privacySection}>
          <div className={styles.container}>
            <div className={styles.privacyBox}>
              <h2 className={styles.sectionTitle}>Confidentialité</h2>

              <p className={styles.privacyText}>
                Coordonnées privées · Pas d’affichage public · Contact uniquement après accord
              </p>

              <Link href="/confidentialite" className={styles.secondaryButton}>
                En savoir plus sur la confidentialité
              </Link>
            </div>
          </div>
        </section>

        <section className={styles.featuresSection}>
          <div className={styles.container}>
            <div className={styles.privacyBox}>
              <h2 className={styles.sectionTitle}>
                Vous faites régulièrement des trajets pour vos enfants à Bourg-la-Reine ?
              </h2>

              {isAuthChecked && isLoggedIn ? (
                <Link href="/dashboard" className={styles.primaryButton}>
                  Aller dans mon espace
                </Link>
              ) : (
                <Link href="/signup" className={styles.primaryButton}>
                  Créer mon compte gratuitement
                </Link>
              )}
            </div>
          </div>
        </section>

        <section className={styles.quickLinksSection}>
          <div className={styles.container}>
            <div className={styles.quickLinksGrid}>
              <Link href="/qui-sommes-nous" className={styles.quickLinkCard}>
                <div className={styles.quickLinkIcon}>🏡</div>
                <span>Qui sommes-nous ?</span>
              </Link>

              <Link href="/contact-admin" className={styles.quickLinkCard}>
                <div className={styles.quickLinkIcon}>✉️</div>
                <span>Contacter l’admin</span>
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