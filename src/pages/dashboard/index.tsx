import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import styles from '../../styles/Dashboard.module.css'
import {
  Child,
  ContactRequestListItem,
  PlaceSuggestion,
  Trip,
  isTripReadyForMatching,
  requireFamily,
  loadChildren,
  loadTrips,
  loadPlaceSuggestions,
  loadContactRequests,
} from '../../lib/dashboardShared'
import { trackEvent } from '../../lib/trackEvent'

export default function DashboardHomePage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [children, setChildren] = useState<Child[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [sentRequests, setSentRequests] = useState<ContactRequestListItem[]>([])
  const [receivedRequests, setReceivedRequests] = useState<ContactRequestListItem[]>([])
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

        const [childrenData, tripsData, suggestionsData, requestsData] = await Promise.all([
          loadChildren(family.id),
          loadTrips(family.id),
          loadPlaceSuggestions(family.id),
          loadContactRequests(),
        ])

        setChildren(childrenData)
        setTrips(tripsData)
        setSuggestions(suggestionsData)
        setSentRequests(requestsData.sent)
        setReceivedRequests(requestsData.received)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur de chargement.')
      } finally {
        setLoading(false)
      }
    }

    loadPage()
  }, [router])

  const searchingTrips = trips.filter((trip) => trip.status === 'searching')
  const readyTrips = trips.filter((trip) => isTripReadyForMatching(trip))
  const pendingReceived = receivedRequests.filter((item) => item.status === 'pending')
  const pendingSent = sentRequests.filter((item) => item.status === 'pending')
  const acceptedSent = sentRequests.filter(
    (item) => item.status === 'accepted' || item.status === 'closed_with_agreement'
  )
  const pendingSuggestions = suggestions.filter((item) => item.status === 'pending')

  const nextStep = useMemo(() => {
    if (children.length === 0) {
      return 'Ajoutez au moins un enfant.'
    }
    if (trips.length === 0) {
      return 'Ajoutez votre premier trajet.'
    }
    if (readyTrips.length === 0) {
      return 'Complétez un trajet pour lancer la recherche.'
    }
    return 'Vos informations sont prêtes.'
  }, [children.length, trips.length, readyTrips.length])

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

            <div className={styles.heroCard}>
              <h2 className={styles.heroTitle}>Trouver une correspondance</h2>
              <div className={styles.heroActions}>
                <Link href="/dashboard/find-match" className={styles.primaryButton}>
                  Lancer la recherche
                </Link>
              </div>
            </div>

            <div className={styles.grid4}>
              <div className={styles.summaryCard}>
                <p className={styles.summaryLabel}>Enfants</p>
                <p className={styles.summaryValue}>{children.length}</p>
              </div>

              <div className={styles.summaryCard}>
                <p className={styles.summaryLabel}>Trajets</p>
                <p className={styles.summaryValue}>{trips.length}</p>
              </div>

              <div className={styles.summaryCard}>
                <p className={styles.summaryLabel}>Demandes reçues</p>
                <p className={styles.summaryValue}>{pendingReceived.length}</p>
              </div>

              <div className={styles.summaryCard}>
                <p className={styles.summaryLabel}>Lieux à valider</p>
                <p className={styles.summaryValue}>{pendingSuggestions.length}</p>
              </div>
            </div>

            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>Progression actuelle</h2>
                  <p className={styles.sectionText}>{nextStep}</p>
                </div>
              </div>

              <div className={styles.grid2}>
                <div className={styles.itemCard}>
                  <h3 className={styles.itemTitle}>Compte</h3>
                  <div className={styles.itemBody}>
                    <p>Enfants : {children.length}</p>
                    <p>Trajets : {trips.length}</p>
                    <p>Trajets prêts : {readyTrips.length}</p>
                  </div>
                </div>

                <div className={styles.itemCard}>
                  <h3 className={styles.itemTitle}>Demandes</h3>
                  <div className={styles.itemBody}>
                    <p>Reçues en attente : {pendingReceived.length}</p>
                    <p>Envoyées en attente : {pendingSent.length}</p>
                    <p>Acceptées : {acceptedSent.length}</p>
                  </div>
                </div>
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

                <Link href="/dashboard/find-match" className={styles.quickLinkCard}>
                  <h3 className={styles.quickLinkTitle}>Recherche</h3>
                </Link>
              </div>
            </div>

            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>Recherche</h2>
                </div>
              </div>

              <div className={styles.itemActions}>
                <Link href="/dashboard/find-match" className={styles.primaryButton}>
                  Trouver une correspondance
                </Link>
              </div>
            </div>

            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>Raccourcis utiles</h2>
                </div>
              </div>

              <div className={styles.itemActions}>
                <Link href="/dashboard/children" className={styles.secondaryButton}>
                  Enfants
                </Link>
                <Link href="/dashboard/trips" className={styles.secondaryButton}>
                  Trajets
                </Link>
                <Link href="/dashboard/requests" className={styles.secondaryButton}>
                  Demandes
                </Link>
                <Link href="/dashboard/places" className={styles.secondaryButton}>
                  Lieux
                </Link>
              </div>
            </div>

            <div className={styles.statusMessage}>
              Pour une demande déjà envoyée sur un même trajet, un nouveau contact ne sera possible
              qu’après le délai de priorité.
            </div>
          </div>
        </section>
      </main>
    </>
  )
}