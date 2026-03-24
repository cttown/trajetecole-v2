import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import styles from '../../styles/Dashboard.module.css'
import {
  Child,
  FamilyMatch,
  Trip,
  createContactRequest,
  formatDayValues,
  formatSingleDay,
  getTripBlockingReason,
  isTripReadyForMatching,
  loadChildren,
  loadPlaces,
  loadPlaceSuggestions,
  loadTrips,
  requireFamily,
  runFamilyMatchingRequest,
  Place,
  PlaceSuggestion,
} from '../../lib/dashboardShared'
import { trackEvent } from '../../lib/trackEvent'

export default function DashboardFindMatchPage() {
  const router = useRouter()

  const [children, setChildren] = useState<Child[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [places, setPlaces] = useState<Place[]>([])
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>([])
  const [step, setStep] = useState(1)
  const [results, setResults] = useState<FamilyMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMatching, setLoadingMatching] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    trackEvent({
      eventType: 'page_view',
      page: 'find_match',
      path: '/dashboard/find-match',
    })
  }, [])

  useEffect(() => {
    async function loadPage() {
      try {
        const { family } = await requireFamily(router)
        if (!family) return

        const [childrenData, tripsData, placesData, suggestionsData] = await Promise.all([
          loadChildren(family.id),
          loadTrips(family.id),
          loadPlaces(),
          loadPlaceSuggestions(),
        ])

        setChildren(childrenData)
        setTrips(tripsData)
        setPlaces(placesData)
        setPlaceSuggestions(suggestionsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur de chargement.')
      } finally {
        setLoading(false)
      }
    }

    loadPage()
  }, [router])

  const readyTrips = useMemo(() => trips.filter((trip) => isTripReadyForMatching(trip)), [trips])

  const childMap = useMemo(
    () => Object.fromEntries(children.map((child) => [child.id, child])),
    [children]
  )

  const placeMap = useMemo(
    () => Object.fromEntries(places.map((place) => [place.id, place])),
    [places]
  )

  const suggestionMap = useMemo(
    () => Object.fromEntries(placeSuggestions.map((item) => [item.id, item])),
    [placeSuggestions]
  )

  const searchingTrips = trips.filter((trip) => trip.status === 'searching')
  const resolvedTrips = trips.filter((trip) => trip.status === 'resolved')
  const pausedTrips = trips.filter((trip) => trip.status === 'paused')
  const archivedTrips = trips.filter((trip) => trip.status === 'archived')

  function placeLabel(placeId: string | null, suggestionId?: string | null) {
    if (placeId) {
      const place = placeMap[placeId]
      return place ? `${place.name} (${place.city})` : 'Lieu inconnu'
    }

    if (suggestionId) {
      const suggestion = suggestionMap[suggestionId]
      return suggestion
        ? `${suggestion.suggested_name} (suggestion en attente)`
        : 'Suggestion inconnue'
    }

    return 'Lieu non renseigné'
  }

  async function launchMatching() {
    setError('')
    setSuccess('')
    setLoadingMatching(true)

    try {
      const data = await runFamilyMatchingRequest()
      setResults(data)
      setStep(3)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la recherche.')
    } finally {
      setLoadingMatching(false)
    }
  }

  async function handleRequestContact(match: FamilyMatch) {
    const parentName =
      `${match.target_parent_first_name || ''} ${match.target_parent_last_name || ''}`.trim() ||
      'cette famille'

    const confirmed = window.confirm(
      `Le nombre de demandes est limité à une fois par période d’exclusivité et par trajet. Voulez-vous contacter ${parentName} ?`
    )

    if (!confirmed) return

    setError('')
    setSuccess('')

    try {
      const requesterTripIds = match.trip_matches.map((item) => item.requester_trip_id)
      await createContactRequest(match.target_family_id, requesterTripIds)

      trackEvent({
        eventType: 'match_request_sent',
        page: 'find_match',
        path: '/dashboard/find-match',
        metadata: {
          target_family_id: match.target_family_id,
          requester_trip_count: requesterTripIds.length,
          matched_trip_count: match.trip_matches.length,
        },
      })

      setSuccess(
        'Votre demande a bien été envoyée. Pour un même trajet, vous pourrez renouveler une demande après 24h.'
      )
      setStep(4)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l’envoi de la demande.')
    }
  }

  function TripList({
    title,
    items,
    openByDefault,
  }: {
    title: string
    items: Trip[]
    openByDefault?: boolean
  }) {
    return (
      <details className={styles.accordion} open={openByDefault}>
        <summary className={styles.accordionSummary}>
          {title} ({items.length})
        </summary>
        <div className={styles.accordionBody}>
          {items.length === 0 ? (
            <p className={styles.smallMuted}>Aucun trajet dans cette catégorie.</p>
          ) : (
            items.map((trip) => {
              const child = childMap[trip.child_id]
              const ready = isTripReadyForMatching(trip)
              const reason = ready
                ? 'Pris en compte dans la recherche.'
                : getTripBlockingReason(trip) || 'Non pris en compte.'

              return (
                <div key={trip.id} className={styles.itemCard} style={{ padding: 14 }}>
                  <div className={styles.itemBody}>
                    <p>
                      <strong>Enfant :</strong> {child?.first_name || '—'}
                    </p>
                    <p>
                      <strong>Jour :</strong> {formatSingleDay(trip.day_of_week)}
                    </p>
                    <p>
                      <strong>Horaires :</strong> {trip.from_time}
                      {trip.to_time ? ` → ${trip.to_time}` : ''}
                    </p>
                    <p>
                      <strong>Départ :</strong>{' '}
                      {placeLabel(trip.from_place_id, trip.from_place_suggestion_id)}
                    </p>
                    <p>
                      <strong>Destination :</strong>{' '}
                      {placeLabel(trip.to_place_id, trip.to_place_suggestion_id)}
                    </p>
                    <p className={styles.smallMuted}>{reason}</p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </details>
    )
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
        <title>Trouver une correspondance - TrajetEcole</title>
      </Head>

      <main className={styles.page}>
        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.topbar}>
              <div>
                <h1 className={styles.pageTitle}>Trouver une correspondance</h1>
                <p className={styles.pageIntro}>
                  Suivez les étapes pour vérifier vos informations et rechercher des familles
                  compatibles.
                </p>
              </div>
              <div className={styles.topbarActions}>
                <Link href="/dashboard" className={styles.secondaryButton}>
                  Retour dashboard
                </Link>
              </div>
            </div>

            <div className={styles.stepper}>
              <div className={step === 1 ? styles.stepPillActive : styles.stepPill}>1. Enfants</div>
              <div className={step === 2 ? styles.stepPillActive : styles.stepPill}>2. Trajets</div>
              <div className={step === 3 ? styles.stepPillActive : styles.stepPill}>
                3. Résultats
              </div>
              <div className={step === 4 ? styles.stepPillActive : styles.stepPill}>4. Suite</div>
            </div>

            {error ? <p className={styles.errorMessage}>{error}</p> : null}
            {success ? <p className={styles.successMessage}>{success}</p> : null}

            {step === 1 ? (
              <div className={styles.sectionCard}>
                <h2 className={styles.sectionTitle}>Étape 1 — Enfants</h2>
                <p className={styles.sectionText}>
                  Vérifiez que vous avez bien au moins un enfant enregistré avant de continuer.
                </p>

                {children.length === 0 ? (
                  <p className={styles.statusMessage}>
                    Ajoutez au moins un enfant pour commencer la recherche.
                  </p>
                ) : (
                  <div className={styles.itemList}>
                    {children.map((child) => (
                      <div key={child.id} className={styles.itemCard}>
                        <h3 className={styles.itemTitle}>{child.first_name}</h3>
                        <p className={styles.itemMeta}>Niveau : {child.level || '—'}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className={styles.itemActions}>
                  <Link href="/dashboard/children?from=find-match" className={styles.secondaryButton}>
                    Gérer mes enfants
                  </Link>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    disabled={children.length === 0}
                    onClick={() => setStep(2)}
                  >
                    Suivant
                  </button>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className={styles.sectionCard}>
                <h2 className={styles.sectionTitle}>Étape 2 — Trajets</h2>
                <p className={styles.sectionText}>
                  Vérifiez vos trajets existants ou ajoutez-en un nouveau. Seuls les trajets
                  complets et en statut “Recherche” seront pris en compte.
                </p>

                <div className={styles.grid3}>
                  <div className={styles.summaryCard}>
                    <p className={styles.summaryLabel}>Trajets en recherche</p>
                    <p className={styles.summaryValue}>{searchingTrips.length}</p>
                  </div>
                  <div className={styles.summaryCard}>
                    <p className={styles.summaryLabel}>Prêts pour la recherche</p>
                    <p className={styles.summaryValue}>{readyTrips.length}</p>
                  </div>
                  <div className={styles.summaryCard}>
                    <p className={styles.summaryLabel}>Autres statuts</p>
                    <p className={styles.summaryValue}>
                      {resolvedTrips.length + pausedTrips.length + archivedTrips.length}
                    </p>
                  </div>
                </div>

                <div className={styles.accordionGroup}>
                  <TripList title="Trajets en recherche" items={searchingTrips} openByDefault />
                  <TripList title="Trajets résolus" items={resolvedTrips} />
                  <TripList title="Trajets en pause" items={pausedTrips} />
                  <TripList title="Trajets archivés" items={archivedTrips} />
                </div>

                <div className={styles.itemActions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => setStep(1)}
                  >
                    Précédent
                  </button>
                  <Link href="/dashboard/trips?from=find-match" className={styles.secondaryButton}>
                    Gérer mes trajets
                  </Link>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={launchMatching}
                    disabled={readyTrips.length === 0 || loadingMatching}
                  >
                    {loadingMatching ? 'Recherche en cours...' : 'Lancer la recherche'}
                  </button>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className={styles.sectionCard}>
                <h2 className={styles.sectionTitle}>Étape 3 — Résultats</h2>

                {results.length === 0 ? (
                  <p className={styles.statusMessage}>
                    Aucune famille compatible trouvée pour le moment. Renevez à votre espace pour effectuer des recherches ultérieusement !
                  </p>
                ) : (
                  <div className={styles.itemList}>
                    {results.map((match) => (
                      <div key={match.target_family_id} className={styles.itemCard}>
                        <div className={styles.itemHeader}>
                          <div>
                            <h3 className={styles.itemTitle}>
                              {`${match.target_parent_first_name || ''} ${match.target_parent_last_name || ''}`.trim() ||
                                'Famille compatible'}
                            </h3>
                            <p className={styles.itemMeta}>
                              Jours couverts : {formatDayValues(match.covered_day_of_week_values)}
                            </p>
                          </div>
                          <span className={styles.badgeGreen}>
                            Score {match.compatibility_score}/100
                          </span>
                        </div>

                        <div className={styles.itemBody}>
                          <p>Historique : {match.history_label}</p>
                          <p>Trajets compatibles : {match.matched_requester_trip_count}</p>
                        </div>

                        <div className={styles.itemList}>
                          {match.trip_matches.map((tripMatch) => (
                            <div
                              key={`${tripMatch.requester_trip_id}-${tripMatch.target_trip_id}`}
                              className={styles.itemCard}
                              style={{ padding: 14 }}
                            >
                              <p>
                                <strong>{formatSingleDay(tripMatch.day_of_week)}</strong>
                              </p>
                              <p>Enfant : {tripMatch.requester_child_first_name || '—'}</p>
                              <p>Départ : {tripMatch.requester_from_label}</p>
                              <p>Destination : {tripMatch.requester_to_label}</p>
                              <p>
                                Horaires : {tripMatch.requester_from_time}
                                {tripMatch.requester_to_time
                                  ? ` → ${tripMatch.requester_to_time}`
                                  : ''}
                              </p>
                              <p>
                                Autre famille : {tripMatch.target_from_time}
                                {tripMatch.target_to_time ? ` → ${tripMatch.target_to_time}` : ''}
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className={styles.itemActions}>
                          <button
                            type="button"
                            className={styles.primaryButton}
                            onClick={() => handleRequestContact(match)}
                          >
                            Demander la mise en relation
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className={styles.itemActions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => setStep(2)}
                  >
                    Précédent
                  </button>
                </div>
              </div>
            ) : null}

            {step === 4 ? (
              <div className={styles.sectionCard}>
                <h2 className={styles.sectionTitle}>Étape 4 — Suite</h2>
                <p className={styles.sectionText}>
                  Votre demande apparaît maintenant dans vos demandes envoyées. La réponse de l’autre
                  parent sera visible dans votre espace personnel.
                </p>

                <p className={styles.statusMessage}>
                  Pour un même trajet, vous pourrez renouveler une demande de mise en relation après
                  24h.
                </p>

                <div className={styles.itemActions}>
                  <Link href="/dashboard/requests" className={styles.primaryButton}>
                    Voir mes demandes
                  </Link>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => setStep(3)}
                  >
                    Retour aux résultats
                  </button>
                  <Link href="/dashboard" className={styles.secondaryButton}>
                    Retour dashboard
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </>
  )
}