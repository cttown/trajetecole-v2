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
import { supabase } from '../../lib/supabaseClient'
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
      return 'Ajoutez au moins un enfant pour commencer.'
    }
    if (trips.length === 0) {
      return 'Ajoutez votre premier trajet.'
    }
    if (readyTrips.length === 0) {
      return 'Complétez ou corrigez un trajet pour qu’il soit pris en compte dans la recherche.'
    }
    return 'Vos informations sont prêtes. Vous pouvez lancer la recherche de correspondances.'
  }, [children.length, trips.length, readyTrips.length])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

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
                <button onClick={handleLogout} className={styles.secondaryButton}>
                  Se déconnecter
                </button>
              </div>
            </div>

            {error ? <p className={styles.errorMessage}>{error}</p> : null}

            <div className={styles.heroCard}>
              <h2 className={styles.heroTitle}>Recherche guidée</h2>
              <p className={styles.heroText}>
                Vérifiez vos enfants, vos trajets et lancez la recherche de familles compatibles.
              </p>
              <div className={styles.heroActions}>
                <Link href="/dashboard/find-match" className={styles.primaryButton}>
                  Trouver une correspondance
                </Link>
              </div>
            </div>

            <div className={styles.grid4}>
              <div className={styles.summaryCard}>
                <p className={styles.summaryLabel}>Enfants</p>
                <p className={styles.summaryValue}>{children.length}</p>
                <p className={styles.summaryText}>Enfants enregistrés</p>
              </div>

              <div className={styles.summaryCard}>
                <p className={styles.summaryLabel}>Trajets</p>
                <p className={styles.summaryValue}>{trips.length}</p>
                <p className={styles.summaryText}>
                  {searchingTrips.length} en recherche · {readyTrips.length} prêts
                </p>
              </div>

              <div className={styles.summaryCard}>
                <p className={styles.summaryLabel}>Demandes</p>
                <p className={styles.summaryValue}>{pendingReceived.length}</p>
                <p className={styles.summaryText}>Demandes reçues en attente</p>
              </div>

              <div className={styles.summaryCard}>
                <p className={styles.summaryLabel}>Lieux</p>
                <p className={styles.summaryValue}>{pendingSuggestions.length}</p>
                <p className={styles.summaryText}>Suggestions en attente</p>
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
                    <p>Enfants enregistrés : {children.length}</p>
                    <p>Trajets créés : {trips.length}</p>
                    <p>Trajets prêts pour la recherche : {readyTrips.length}</p>
                  </div>
                </div>

                <div className={styles.itemCard}>
                  <h3 className={styles.itemTitle}>Demandes</h3>
                  <div className={styles.itemBody}>
                    <p>Demandes reçues en attente : {pendingReceived.length}</p>
                    <p>Demandes envoyées en attente : {pendingSent.length}</p>
                    <p>Demandes acceptées / coordonnées partagées : {acceptedSent.length}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>Gérer mes informations</h2>
                  <p className={styles.sectionText}>
                    Chaque page ci-dessous reste la source de vérité pour consulter et modifier vos
                    données.
                  </p>
                </div>
              </div>

              <div className={styles.quickLinks}>
                <Link href="/dashboard/profile" className={styles.quickLinkCard}>
                  <h3 className={styles.quickLinkTitle}>Profil parent</h3>
                  <p className={styles.quickLinkText}>Prénom, nom et téléphone.</p>
                </Link>

                <Link href="/dashboard/children" className={styles.quickLinkCard}>
                  <h3 className={styles.quickLinkTitle}>Enfants</h3>
                  <p className={styles.quickLinkText}>Ajouter, consulter, supprimer.</p>
                </Link>

                <Link href="/dashboard/trips" className={styles.quickLinkCard}>
                  <h3 className={styles.quickLinkTitle}>Trajets</h3>
                  <p className={styles.quickLinkText}>Créer, modifier, vérifier les statuts.</p>
                </Link>

                <Link href="/dashboard/requests" className={styles.quickLinkCard}>
                  <h3 className={styles.quickLinkTitle}>Demandes</h3>
                  <p className={styles.quickLinkText}>Reçues, envoyées, réponses et clôtures.</p>
                </Link>

                <Link href="/dashboard/places" className={styles.quickLinkCard}>
                  <h3 className={styles.quickLinkTitle}>Lieux</h3>
                  <p className={styles.quickLinkText}>Suggestions et suivi de validation.</p>
                </Link>

                <Link href="/dashboard/find-match" className={styles.quickLinkCard}>
                  <h3 className={styles.quickLinkTitle}>Recherche guidée</h3>
                  <p className={styles.quickLinkText}>
                    Trouver une correspondance étape par étape.
                  </p>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}