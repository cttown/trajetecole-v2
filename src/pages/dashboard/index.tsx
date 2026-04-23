import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import styles from '../../styles/Dashboard.module.css'
import { requireFamily } from '../../lib/dashboardShared'
import { trackEvent } from '../../lib/trackEvent'

export default function DashboardHomePage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    trackEvent({
      eventType: 'page_view',
      page: 'dashboard',
      path: '/dashboard',
    })
  }, [])

  useEffect(() => {
    async function loadPage() {
      setError('')

      try {
        const { family } = await requireFamily(router)
        if (!family) return
        setEmail(family.email)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur de chargement.')
      } finally {
        setLoading(false)
      }
    }

    loadPage()
  }, [router])

  if (loading) {
    return (
      <main className={styles.page}>
        <section className={styles.section}>
          <div className={styles.container}>
            <p className={styles.statusMessage}>Chargement...</p>
          </div>
        </section>
      </main>
    )
  }

  return (
    <>
      <Head>
        <title>Mon espace - TrajetEcole</title>
      </Head>

      <main className={styles.page}>
        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.topbar}>
              <div>
                <h1 className={styles.pageTitle}>Mon espace</h1>
                <p className={styles.pageIntro}>
                  Connecté avec : <strong>{email || '—'}</strong>
                </p>
              </div>

              <div className={styles.topbarActions}>
                <Link href="/" className={styles.secondaryButton}>
                  Accueil
                </Link>
              </div>
            </div>

            {error ? <p className={styles.errorMessage}>{error}</p> : null}

            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>Trouver une correspondance</h2>
                </div>
              </div>

              <div className={styles.itemActions}>
                <Link href="/dashboard/find-match" className={styles.primaryButton}>
                  Commencer
                </Link>
              </div>
            </div>

            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>Gérer mes informations</h2>
                </div>
              </div>

              <div className={styles.quickLinks}>
                <Link href="/dashboard/profile" className={styles.quickLinkCard}>
                  <h3 className={styles.quickLinkTitle}>Parent</h3>
                </Link>

                <Link href="/dashboard/children" className={styles.quickLinkCard}>
                  <h3 className={styles.quickLinkTitle}>Enfants</h3>
                </Link>

                <Link href="/dashboard/trips" className={styles.quickLinkCard}>
                  <h3 className={styles.quickLinkTitle}>Trajets</h3>
                </Link>

                <Link href="/dashboard/requests" className={styles.quickLinkCard}>
                  <h3 className={styles.quickLinkTitle}>Demandes</h3>
                </Link>

                <Link href="/dashboard/places" className={styles.quickLinkCard}>
                  <h3 className={styles.quickLinkTitle}>Lieux</h3>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}