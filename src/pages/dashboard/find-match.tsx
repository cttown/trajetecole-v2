import Head from 'next/head'
import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import styles from '../../styles/Dashboard.module.css'
import {
  Child,
  FamilyMatch,
  Trip,
  createContactRequest,
  formatDayValues,
  formatSingleDay,
  formatTimeValue,
  loadChildren,
  loadPlaces,
  loadPlaceSuggestions,
  loadTrips,
  requireFamily,
  runFamilyMatchingRequest,
  Place,
  PlaceSuggestion,
} from '../../lib/dashboardShared'
import { supabase } from '../../lib/supabaseClient'
import { trackEvent } from '../../lib/trackEvent'
import type { SetGlobalPopup } from '../_app'

type Props = {
  setGlobalPopup?: SetGlobalPopup
}

export default function DashboardFindMatchPage({ setGlobalPopup }: Props) {
  const router = useRouter()

  const [familyId, setFamilyId] = useState('')
  const [children, setChildren] = useState<Child[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [places, setPlaces] = useState<Place[]>([])
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>([])

  const [step, setStep] = useState(1)
  const [results, setResults] = useState<FamilyMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMatching, setLoadingMatching] = useState(false)
  const [error, setError] = useState('')

  const [selectedChildId, setSelectedChildId] = useState('')
  const [selectedTripIds, setSelectedTripIds] = useState<string[]>([])
  const [showAddChild, setShowAddChild] = useState(false)
  const [showHelpText, setShowHelpText] = useState(false)

  const [childFirstName, setChildFirstName] = useState('')
  const [childLevel, setChildLevel] = useState('')
  const [savingChild, setSavingChild] = useState(false)

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

        setFamilyId(family.id)

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

  const placeMap = useMemo(
    () => Object.fromEntries(places.map((place) => [place.id, place])),
    [places]
  )

  const suggestionMap = useMemo(
    () => Object.fromEntries(placeSuggestions.map((item) => [item.id, item])),
    [placeSuggestions]
  )

  const selectedChildTrips = useMemo(() => {
    if (!selectedChildId) return []
    return trips.filter((trip) => trip.child_id === selectedChildId && trip.status === 'searching')
  }, [selectedChildId, trips])

  function showPopup(message: string, type: 'success' | 'error' = 'success') {
    if (setGlobalPopup) {
      setGlobalPopup({ message, type })
      return
    }

    if (type === 'error') {
      setError(message)
    }
  }

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

  function getCompatibilityLabel(score: number) {
    if (score >= 80) return 'Très compatible'
    if (score >= 60) return 'Compatible'
    return 'Peu compatible'
  }

  function toggleTripSelection(tripId: string) {
    setSelectedTripIds((prev) =>
      prev.includes(tripId) ? prev.filter((id) => id !== tripId) : [...prev, tripId]
    )
  }

  async function handleAddChild(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!familyId) return
    if (!childFirstName.trim()) {
      showPopup('Le prénom de l’enfant est obligatoire.', 'error')
      return
    }

    setSavingChild(true)

    const { data, error } = await supabase
      .from('children')
      .insert({
        family_id: familyId,
        first_name: childFirstName.trim(),
        level: childLevel.trim() || null,
      })
      .select()
      .single()

    setSavingChild(false)

    if (error) {
      showPopup(error.message, 'error')
      return
    }

    setChildren((prev) => [...prev, data])
    setSelectedChildId(data.id)
    setChildFirstName('')
    setChildLevel('')
    setShowAddChild(false)
    showPopup('Enfant ajouté.', 'success')
  }

  async function launchMatching() {
    setError('')
    setLoadingMatching(true)

    try {
      const allResults = await runFamilyMatchingRequest()

      if (selectedTripIds.length === 0) {
        setResults(allResults)
      } else {
        const filteredResults = allResults
          .map((match) => ({
            ...match,
            trip_matches: match.trip_matches.filter((tripMatch) =>
              selectedTripIds.includes(tripMatch.requester_trip_id)
            ),
          }))
          .filter((match) => match.trip_matches.length > 0)

        setResults(filteredResults)
      }

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
      `Envoyer une demande à ${parentName} ?

Le parent recevra votre demande et pourra accepter ou refuser.`
    )

    if (!confirmed) return

    setError('')

    try {
      const requesterTripIds = Array.from(
        new Set(match.trip_matches.map((item) => item.requester_trip_id))
      )

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

      showPopup(
        'Votre demande a été envoyée. Vous serez informé dès que l’autre parent répond.',
        'success'
      )
      setStep(4)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors de l’envoi de la demande.'
      showPopup(message, 'error')
    }
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
                  Choisissez un enfant, sélectionnez les trajets à rechercher, puis consultez les familles compatibles.
                </p>
              </div>
              <div className={styles.topbarActions}>
                <Link href="/dashboard" className={styles.secondaryButton}>
                  Retour Mon espace
                </Link>
              </div>
            </div>

            <div className={styles.stepper}>
              <div className={step === 1 ? styles.stepPillActive : styles.stepPill}>1. Enfant</div>
              <div className={step === 2 ? styles.stepPillActive : styles.stepPill}>2. Trajets</div>
              <div className={step === 3 ? styles.stepPillActive : styles.stepPill}>3. Résultats</div>
              <div className={step === 4 ? styles.stepPillActive : styles.stepPill}>4. Suite</div>
            </div>

            {error ? <p className={styles.errorMessage}>{error}</p> : null}

            {step === 1 ? (
              <div className={styles.sectionCard}>
                <h2 className={styles.sectionTitle}>Étape 1 — Sélectionner un enfant</h2>

                {children.length === 0 ? (
                  <p className={styles.statusMessage}>Aucun enfant enregistré.</p>
                ) : (
                  <div className={styles.itemList}>
                    {children.map((child) => (
                      <label key={child.id} className={styles.itemCard} style={{ cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="selected-child"
                          checked={selectedChildId === child.id}
                          onChange={() => {
                            setSelectedChildId(child.id)
                            setSelectedTripIds([])
                          }}
                          style={{ marginRight: 10 }}
                        />
                        <strong>{child.first_name}</strong>
                        {child.level ? <span style={{ marginLeft: 8 }}>· {child.level}</span> : null}
                      </label>
                    ))}
                  </div>
                )}

                <div className={styles.itemActions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => setShowAddChild((prev) => !prev)}
                  >
                    {showAddChild ? 'Fermer' : 'Ajouter un enfant'}
                  </button>

                  <button
                    type="button"
                    className={styles.primaryButton}
                    disabled={!selectedChildId}
                    onClick={() => setStep(2)}
                  >
                    Suivant
                  </button>
                </div>

                {showAddChild ? (
                  <div style={{ marginTop: 18 }}>
                    <form onSubmit={handleAddChild} className={styles.form}>
                      <div className={styles.fieldRow}>
                        <div className={styles.field}>
                          <label htmlFor="childFirstName">Prénom</label>
                          <input
                            id="childFirstName"
                            value={childFirstName}
                            onChange={(e) => setChildFirstName(e.target.value)}
                            required
                          />
                        </div>

                        <div className={styles.field}>
                          <label htmlFor="childLevel">Niveau / classe</label>
                          <input
                            id="childLevel"
                            value={childLevel}
                            onChange={(e) => setChildLevel(e.target.value)}
                            placeholder="Ex : CE2, 6e, CM1..."
                          />
                        </div>
                      </div>

                      <div className={styles.itemActions}>
                        <button className={styles.primaryButton} disabled={savingChild}>
                          {savingChild ? 'Ajout...' : 'Ajouter un enfant'}
                        </button>
                      </div>
                    </form>
                  </div>
                ) : null}
              </div>
            ) : null}

            {step === 2 ? (
              <div className={styles.sectionCard}>
                <h2 className={styles.sectionTitle}>Étape 2 — Sélectionner les trajets</h2>

                {selectedChildTrips.length === 0 ? (
                  <p className={styles.statusMessage}>
                    Aucun trajet en recherche pour cet enfant.
                  </p>
                ) : (
                  <div className={styles.itemList}>
                    {selectedChildTrips.map((trip) => (
                      <label key={trip.id} className={styles.itemCard} style={{ cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedTripIds.includes(trip.id)}
                          onChange={() => toggleTripSelection(trip.id)}
                          style={{ marginRight: 10 }}
                        />
                        <strong>{formatSingleDay(trip.day_of_week)}</strong>
                        <div className={styles.itemBody} style={{ marginTop: 8 }}>
                          <p>
                            <strong>Horaire :</strong> {formatTimeValue(trip.from_time)}
                            {trip.to_time ? ` → ${formatTimeValue(trip.to_time)}` : ''}
                          </p>
                          <p>
                            <strong>Départ :</strong>{' '}
                            {placeLabel(trip.from_place_id, trip.from_place_suggestion_id)}
                          </p>
                          <p>
                            <strong>Destination :</strong>{' '}
                            {placeLabel(trip.to_place_id, trip.to_place_suggestion_id)}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                <div className={styles.itemActions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => setStep(1)}
                  >
                    Précédent
                  </button>

                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => setShowHelpText((prev) => !prev)}
                  >
                    Ajouter un trajet
                  </button>

                  <Link href="/dashboard/trips" className={styles.secondaryButton}>
                    Modifier un trajet
                  </Link>

                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={launchMatching}
                    disabled={selectedTripIds.length === 0 || loadingMatching}
                  >
                    {loadingMatching ? 'Recherche...' : 'Lancer la recherche'}
                  </button>
                </div>

                {showHelpText ? (
                  <p className={styles.statusMessage}>
                    Pour ajouter un trajet, ouvrez la page Trajets puis revenez ici.
                  </p>
                ) : null}
              </div>
            ) : null}

            {step === 3 ? (
              <div className={styles.sectionCard}>
                <h2 className={styles.sectionTitle}>Étape 3 — Résultats</h2>

                {results.length === 0 ? (
                  <p className={styles.statusMessage}>
                    Aucun parent compatible trouvé pour le moment.
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
                            {getCompatibilityLabel(match.compatibility_score)} ({match.compatibility_score}%)
                          </span>
                        </div>

                        <div className={styles.itemBody}>
                          <p>Nom de l’autre famille : {`${match.target_parent_first_name || ''} ${match.target_parent_last_name || ''}`.trim() || '—'}</p>
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
                                Votre horaire : {formatTimeValue(tripMatch.requester_from_time)}
                                {tripMatch.requester_to_time
                                  ? ` → ${formatTimeValue(tripMatch.requester_to_time)}`
                                  : ''}
                              </p>
                              <p>
                                Horaire de l’autre famille : {formatTimeValue(tripMatch.target_from_time)}
                                {tripMatch.target_to_time
                                  ? ` → ${formatTimeValue(tripMatch.target_to_time)}`
                                  : ''}
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
                  Votre demande a bien été envoyée. Vous pouvez suivre son évolution dans vos demandes.
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
                    Retour Mon espace
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