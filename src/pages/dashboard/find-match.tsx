import Head from 'next/head'
import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import styles from '../../styles/Dashboard.module.css'
import {
  Child,
  FamilyMatch,
  Trip,
  Place,
  PlaceSuggestion,
  createContactRequest,
  formatSingleDay,
  formatTimeValue,
  loadChildren,
  loadPlaces,
  loadPlaceSuggestions,
  loadTrips,
  requireFamily,
  runFamilyMatchingRequest,
} from '../../lib/dashboardShared'
import { supabase } from '../../lib/supabaseClient'
import { trackEvent } from '../../lib/trackEvent'
import type { SetGlobalPopup } from '../_app'

type Props = {
  setGlobalPopup?: SetGlobalPopup
}

type SearchPlaceResult = {
  id: string
  name: string
  city: string
  source: 'place' | 'suggestion'
  provisional?: boolean
}

const DAY_OPTIONS = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 7, label: 'Dimanche' },
]

type ConfirmState = {
  open: boolean
  match: FamilyMatch | null
}

function recalculateFilteredMatch(match: FamilyMatch): FamilyMatch {
  const uniqueRequesterTripIds = Array.from(
    new Set(match.trip_matches.map((item) => item.requester_trip_id))
  )
  const uniqueDayValues = Array.from(
    new Set(match.trip_matches.map((item) => item.day_of_week))
  ).sort((a, b) => a - b)

  const averageTimeFitScore =
    match.trip_matches.length > 0
      ? Math.round(
          match.trip_matches.reduce((sum, item) => sum + item.time_fit_score, 0) /
            match.trip_matches.length
        )
      : 0

  const coverageRatio = uniqueRequesterTripIds.length > 0 ? 1 : 0
  const tripCompatibilityScore = uniqueRequesterTripIds.length > 0 ? 100 : 0

  const compatibilityScore = Math.round(
    tripCompatibilityScore * 0.55 +
      averageTimeFitScore * 0.3 +
      match.history_score_normalized * 100 * 0.15
  )

  let badge_label = 'Compatible'
  let badge_tone: 'green' | 'yellow' | 'red' = 'yellow'

  if (compatibilityScore >= 80) {
    badge_label = 'Très compatible'
    badge_tone = 'green'
  } else if (compatibilityScore < 60) {
    badge_label = 'À vérifier'
    badge_tone = 'red'
  }

  return {
    ...match,
    compatibility_score: compatibilityScore,
    trip_compatibility_score: tripCompatibilityScore,
    average_time_fit_score: averageTimeFitScore,
    coverage_ratio: coverageRatio,
    matched_trip_count: match.trip_matches.length,
    matched_requester_trip_count: uniqueRequesterTripIds.length,
    covered_day_of_week_values: uniqueDayValues,
    badge_label,
    badge_tone,
  }
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
  const [showAddTrip, setShowAddTrip] = useState(false)
  const [scoreInfoFamilyId, setScoreInfoFamilyId] = useState<string | null>(null)

  const [confirmState, setConfirmState] = useState<ConfirmState>({
    open: false,
    match: null,
  })

  const [isSendingRequest, setIsSendingRequest] = useState(false)

  const [showNewPlaceConfirm, setShowNewPlaceConfirm] = useState(false)

  const [childFirstName, setChildFirstName] = useState('')
  const [childLevel, setChildLevel] = useState('')
  const [savingChild, setSavingChild] = useState(false)

  const [fromPlaceQuery, setFromPlaceQuery] = useState('')
  const [toPlaceQuery, setToPlaceQuery] = useState('')
  const [fromPlaceId, setFromPlaceId] = useState('')
  const [toPlaceId, setToPlaceId] = useState('')
  const [fromPlaceSource, setFromPlaceSource] = useState<'' | 'place' | 'suggestion'>('')
  const [toPlaceSource, setToPlaceSource] = useState<'' | 'place' | 'suggestion'>('')
  const [fromResults, setFromResults] = useState<SearchPlaceResult[]>([])
  const [toResults, setToResults] = useState<SearchPlaceResult[]>([])
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [fromTime, setFromTime] = useState('')
  const [toleranceMin, setToleranceMin] = useState('10')
  const [savingTrip, setSavingTrip] = useState(false)

  function showPopup(message: string, type: 'success' | 'error' = 'success') {
    if (setGlobalPopup) {
      setGlobalPopup({ message, type })
      return
    }
    if (type === 'error') {
      setError(message)
    }
  }

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

  function getPlaceLabel(placeId: string | null, suggestionId?: string | null) {
    if (placeId) {
      const place = placeMap[placeId]
      if (!place) return 'Lieu inconnu'
      return `${place.name} (${place.city})`
    }

    if (suggestionId) {
      const suggestion = suggestionMap[suggestionId]
      if (!suggestion) return 'Lieu provisoire'
      return `${suggestion.suggested_name} (${suggestion.city}) — provisoire`
    }

    return 'Lieu non renseigné'
  }

  const selectedChildTrips = useMemo(() => {
    if (!selectedChildId) return []
    return trips.filter((trip) => trip.child_id === selectedChildId && trip.status === 'searching')
  }, [selectedChildId, trips])

  const groupedSelectedChildTrips = useMemo(() => {
    const groups = new Map<
      string,
      {
        departureLabel: string
        destinationLabel: string
        trips: Trip[]
      }
    >()

    for (const trip of selectedChildTrips) {
      const departureLabel = getPlaceLabel(trip.from_place_id, trip.from_place_suggestion_id)
      const destinationLabel = getPlaceLabel(trip.to_place_id, trip.to_place_suggestion_id)
      const key = `${departureLabel}__${destinationLabel}`

      const current = groups.get(key)
      if (current) {
        current.trips.push(trip)
      } else {
        groups.set(key, {
          departureLabel,
          destinationLabel,
          trips: [trip],
        })
      }
    }

    return Array.from(groups.values()).map((group) => ({
      ...group,
      trips: [...group.trips].sort((a, b) => {
        if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week
        return a.from_time.localeCompare(b.from_time)
      }),
    }))
  }, [selectedChildTrips, placeMap, suggestionMap])

  async function reloadChildren() {
    if (!familyId) return
    setChildren(await loadChildren(familyId))
  }

  async function reloadTrips() {
    if (!familyId) return
    setTrips(await loadTrips(familyId))
  }

  function toggleTripSelection(tripId: string) {
    setSelectedTripIds((prev) =>
      prev.includes(tripId) ? prev.filter((id) => id !== tripId) : [...prev, tripId]
    )
  }

  function toggleDay(dayValue: number) {
    setSelectedDays((prev) =>
      prev.includes(dayValue)
        ? prev.filter((value) => value !== dayValue)
        : [...prev, dayValue].sort((a, b) => a - b)
    )
  }

  async function searchPlaces(query: string, target: 'from' | 'to') {
    if (query.trim().length < 2) {
      if (target === 'from') setFromResults([])
      else setToResults([])
      return
    }

    const response = await fetch(`/api/places/search?q=${encodeURIComponent(query.trim())}`)
    const payload = await response.json().catch(() => null)

    if (!response.ok) return

    const searchResults = payload?.results ?? []

    if (target === 'from') setFromResults(searchResults)
    else setToResults(searchResults)
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

    await reloadChildren()
    setSelectedChildId(data.id)
    setSelectedTripIds([])
    setChildFirstName('')
    setChildLevel('')
    setShowAddChild(false)
    setStep(2)
    showPopup('Enfant ajouté.', 'success')
  }

  async function handleAddTrip(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!familyId || !selectedChildId) {
      showPopup('Veuillez sélectionner un enfant.', 'error')
      return
    }

    if (!fromPlaceId || !toPlaceId) {
      showPopup(
        'Veuillez sélectionner un départ et une destination dans la liste proposée.',
        'error'
      )
      return
    }

    if (fromPlaceId === toPlaceId && fromPlaceSource === 'place' && toPlaceSource === 'place') {
      showPopup('Le départ et la destination doivent être différents.', 'error')
      return
    }

    if (!fromTime) {
      showPopup('Veuillez renseigner l’horaire.', 'error')
      return
    }

    if (selectedDays.length === 0) {
      showPopup('Veuillez sélectionner au moins un jour.', 'error')
      return
    }

    if (fromPlaceSource === 'suggestion' || toPlaceSource === 'suggestion') {
      showPopup(
        "L’administrateur du site doit valider le lieu provisoire avant toute recherche de trajet. Nous vous tiendrons au courant par email dans un délai de 3 jours maximum.",
        'error'
      )
      return
    }

    setSavingTrip(true)

    const tripGroupId = crypto.randomUUID()

    const rows = selectedDays.map((day) => ({
      family_id: familyId,
      child_id: selectedChildId,
      from_place_id: fromPlaceSource === 'place' ? fromPlaceId : null,
      to_place_id: toPlaceSource === 'place' ? toPlaceId : null,
      from_place_suggestion_id:
        String(fromPlaceSource) === 'suggestion' ? fromPlaceId : null,
      to_place_suggestion_id:
        String(toPlaceSource) === 'suggestion' ? toPlaceId : null,
      day_of_week: day,
      from_time: fromTime,
      to_time: null,
      tolerance_min: Number(toleranceMin) || 10,
      status: 'searching',
      trip_group_id: tripGroupId,
    }))

    const { error } = await supabase.from('trips').insert(rows)

    setSavingTrip(false)

    if (error) {
      showPopup(error.message, 'error')
      return
    }

    await reloadTrips()
    setFromPlaceQuery('')
    setToPlaceQuery('')
    setFromPlaceId('')
    setToPlaceId('')
    setFromPlaceSource('')
    setToPlaceSource('')
    setFromResults([])
    setToResults([])
    setSelectedDays([])
    setFromTime('')
    setToleranceMin('10')
    setShowAddTrip(false)
    showPopup('Trajet créé.', 'success')
  }

  async function launchMatching() {
    setError('')
    setLoadingMatching(true)

    try {
      const provisionalSelected = selectedChildTrips
        .filter((trip) => selectedTripIds.includes(trip.id))
        .some((trip) => trip.from_place_suggestion_id || trip.to_place_suggestion_id)

      if (provisionalSelected) {
        showPopup(
          "L’administrateur du site doit valider le lieu provisoire avant toute recherche de trajet. Nous vous tiendrons au courant par email dans un délai de 3 jours maximum.",
          'error'
        )
        setLoadingMatching(false)
        return
      }

      const allResults = await runFamilyMatchingRequest()

      const filteredResults =
        selectedTripIds.length === 0
          ? allResults
          : allResults
              .map((match) => ({
                ...match,
                trip_matches: match.trip_matches.filter((tripMatch) =>
                  selectedTripIds.includes(tripMatch.requester_trip_id)
                ),
              }))
              .filter((match) => match.trip_matches.length > 0)
              .map(recalculateFilteredMatch)

      setResults(filteredResults)
      setStep(3)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la recherche.')
    } finally {
      setLoadingMatching(false)
    }
  }

  function openConfirmPopup(match: FamilyMatch) {
    setConfirmState({
      open: true,
      match,
    })
  }

  function closeConfirmPopup() {
    setConfirmState({
      open: false,
      match: null,
    })
    setIsSendingRequest(false)
  }

  async function confirmRequestContact() {
    if (isSendingRequest) return

    const match = confirmState.match
    if (!match) return

    setIsSendingRequest(true)
    setError('')

    const parentName =
      `${match.target_parent_first_name || ''} ${match.target_parent_last_name || ''}`.trim() ||
      'cette famille'

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

      closeConfirmPopup()
      showPopup(
        `Votre demande a bien été envoyée à ${parentName}. Nous vous informerons dès qu’une réponse sera donnée.`,
        'success'
      )
      setStep(4)
    } catch (err) {
      closeConfirmPopup()
      const message =
        err instanceof Error ? err.message : 'Erreur lors de l’envoi de la demande.'
      showPopup(message, 'error')
    } finally {
      setIsSendingRequest(false)
    }
  }

  function scoreExplanation() {
    return 'Score estimé à partir de la proximité des lieux, des horaires et de l’historique des échanges entre familles.'
  }

  function goToPlacesPage() {
    setShowNewPlaceConfirm(false)
    router.push('/dashboard/places')
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

  const confirmParentName =
    confirmState.match
      ? `${confirmState.match.target_parent_first_name || ''} ${
          confirmState.match.target_parent_last_name || ''
        }`.trim() || 'cette famille'
      : ''

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
              </div>
              <div className={styles.topbarActions}>
                <Link href="/dashboard" className={styles.secondaryButton}>
                  Retour Mon espace
                </Link>
              </div>
            </div>

            {error ? <p className={styles.errorMessage}>{error}</p> : null}

            {step === 1 ? (
              <div className={styles.sectionCard}>
                <h2 className={styles.sectionTitle}>Sélectionner un enfant</h2>

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

                {!showAddChild ? (
                  <div className={styles.itemActions}>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => setShowAddChild(true)}
                    >
                      Ajouter un enfant
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
                ) : null}

                {showAddChild ? (
                  <div style={{ marginTop: 18 }}>
                    <div className={styles.itemActions} style={{ marginBottom: 12 }}>
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={() => setShowAddChild(false)}
                      >
                        Fermer
                      </button>
                    </div>

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
                <h2 className={styles.sectionTitle}>Sélectionner les trajets</h2>

                {selectedChildTrips.length === 0 ? (
                  <p className={styles.statusMessage}>
                    Aucun trajet en recherche pour cet enfant.
                  </p>
                ) : (
                  <div className={styles.itemList}>
                    {groupedSelectedChildTrips.map((group, index) => (
                      <div key={`${group.departureLabel}-${group.destinationLabel}-${index}`} className={styles.itemCard}>
                        <div className={styles.itemBodyCompact}>
                          <p>
                            <strong>Départ</strong> : {group.departureLabel}
                          </p>
                          <p>
                            <strong>Destination</strong> : {group.destinationLabel}
                          </p>
                        </div>

                        <div className={styles.itemList} style={{ marginTop: 10 }}>
                          {group.trips.map((trip) => (
                            <label key={trip.id} className={styles.itemCardCompact} style={{ cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={selectedTripIds.includes(trip.id)}
                                onChange={() => toggleTripSelection(trip.id)}
                                style={{ marginRight: 10 }}
                              />
                              <strong>{formatSingleDay(trip.day_of_week)}</strong>{' '}
                              {formatTimeValue(trip.from_time)}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!showAddTrip ? (
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
                      onClick={() => setShowAddTrip(true)}
                    >
                      Ajouter un trajet
                    </button>

                    <Link href="/dashboard/trips" className={styles.secondaryButton}>
                      Mettre à jour les trajets
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
                ) : null}

                {showAddTrip ? (
                  <div style={{ marginTop: 20 }}>
                    <div className={styles.itemActions} style={{ marginBottom: 12 }}>
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={() => setShowAddTrip(false)}
                      >
                        Fermer
                      </button>
                    </div>

                    <form onSubmit={handleAddTrip} className={styles.form}>
                      <div className={styles.field}>
                        <label>Enfant</label>
                        <input
                          value={
                            children.find((child) => child.id === selectedChildId)?.first_name || ''
                          }
                          disabled
                        />
                      </div>

                      <div className={styles.field}>
                        <label>Jours</label>
                        <div className={styles.itemActions}>
                          {DAY_OPTIONS.map((day) => (
                            <button
                              key={day.value}
                              type="button"
                              className={
                                selectedDays.includes(day.value)
                                  ? styles.primaryButton
                                  : styles.secondaryButton
                              }
                              onClick={() => toggleDay(day.value)}
                            >
                              {day.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className={styles.field}>
                        <label htmlFor="fromPlaceQuery">Départ</label>
                        <input
                          id="fromPlaceQuery"
                          className={styles.input}
                          value={fromPlaceQuery}
                          onChange={(e) => {
                            setFromPlaceQuery(e.target.value)
                            setFromPlaceId('')
                            setFromPlaceSource('')
                            void searchPlaces(e.target.value, 'from')
                          }}
                          placeholder="Commencez à saisir un lieu"
                        />
                        {fromResults.length > 0 ? (
                          <div className={styles.searchResultsList}>
                            {fromResults.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                className={styles.searchResultButton}
                                onClick={() => {
                                  setFromPlaceId(item.id)
                                  setFromPlaceSource(item.source)
                                  setFromPlaceQuery(
                                    `${item.name} (${item.city})${
                                      item.provisional ? ' — provisoire' : ''
                                    }`
                                  )
                                  setFromResults([])
                                }}
                              >
                                <span>
                                  {item.name} ({item.city})
                                  {item.provisional ? ' — provisoire' : ''}
                                </span>
                              </button>
                            ))}
                            <button
                              type="button"
                              className={styles.searchResultButtonAlt}
                              onClick={() => setShowNewPlaceConfirm(true)}
                            >
                              Ajouter un nouveau lieu
                            </button>
                          </div>
                        ) : null}
                      </div>

                      <div className={styles.field}>
                        <label htmlFor="toPlaceQuery">Destination</label>
                        <input
                          id="toPlaceQuery"
                          className={styles.input}
                          value={toPlaceQuery}
                          onChange={(e) => {
                            setToPlaceQuery(e.target.value)
                            setToPlaceId('')
                            setToPlaceSource('')
                            void searchPlaces(e.target.value, 'to')
                          }}
                          placeholder="Commencez à saisir un lieu"
                        />
                        {toResults.length > 0 ? (
                          <div className={styles.searchResultsList}>
                            {toResults.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                className={styles.searchResultButton}
                                onClick={() => {
                                  setToPlaceId(item.id)
                                  setToPlaceSource(item.source)
                                  setToPlaceQuery(
                                    `${item.name} (${item.city})${
                                      item.provisional ? ' — provisoire' : ''
                                    }`
                                  )
                                  setToResults([])
                                }}
                              >
                                <span>
                                  {item.name} ({item.city})
                                  {item.provisional ? ' — provisoire' : ''}
                                </span>
                              </button>
                            ))}
                            <button
                              type="button"
                              className={styles.searchResultButtonAlt}
                              onClick={() => setShowNewPlaceConfirm(true)}
                            >
                              Ajouter un nouveau lieu
                            </button>
                          </div>
                        ) : null}
                      </div>

                      <div className={styles.fieldRow}>
                        <div className={styles.field}>
                          <label htmlFor="fromTime">Horaire</label>
                          <input
                            id="fromTime"
                            type="time"
                            className={`${styles.input} ${styles.timeInput}`}
                            value={fromTime}
                            onChange={(e) => setFromTime(e.target.value)}
                            required
                          />
                        </div>

                        <div className={styles.field}>
                          <label htmlFor="toleranceMin">Tolérance (minutes)</label>
                          <input
                            id="toleranceMin"
                            type="number"
                            className={styles.input}
                            min={0}
                            max={180}
                            value={toleranceMin}
                            onChange={(e) => setToleranceMin(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className={styles.itemActions}>
                        <button type="submit" className={styles.primaryButton} disabled={savingTrip}>
                          {savingTrip ? 'Enregistrement...' : 'Créer ce trajet'}
                        </button>
                      </div>
                    </form>
                  </div>
                ) : null}
              </div>
            ) : null}

            {step === 3 ? (
              <div className={styles.sectionCard}>
                <h2 className={styles.sectionTitle}>Résultats</h2>

                {results.length === 0 ? (
                  <p className={styles.statusMessage}>
                    Aucun parent compatible trouvé pour le moment. N’hésitez pas à revenir plus tard ou à élargir vos critères de recherche en ajoutant d’autres trajets.
                  </p>
                ) : (
                  <div className={styles.itemList}>
                    {results.map((match) => {
                      const parentName =
                        `${match.target_parent_first_name || ''} ${
                          match.target_parent_last_name || ''
                        }`.trim() || 'Famille compatible'

                      const isScoreInfoOpen = scoreInfoFamilyId === match.target_family_id

                      return (
                        <div key={match.target_family_id} className={styles.itemCard}>
                          <div className={styles.itemHeader}>
                            <div>
                              <h3 className={styles.itemTitle}>{parentName}</h3>
                              <p className={styles.itemMeta}>Historique : {match.history_label}</p>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                className={styles.badgeGreen}
                                onClick={() =>
                                  setScoreInfoFamilyId((prev) =>
                                    prev === match.target_family_id ? null : match.target_family_id
                                  )
                                }
                                style={{ border: 'none', cursor: 'pointer' }}
                              >
                                {match.compatibility_score}% ⓘ
                              </button>
                            </div>
                          </div>

                          {isScoreInfoOpen ? (
                            <p className={styles.smallMuted} style={{ marginBottom: 12 }}>
                              {scoreExplanation()}
                            </p>
                          ) : null}

                          <div className={styles.itemBody}>
                            <p>Trajets compatibles : {match.matched_requester_trip_count}</p>
                          </div>

                          <div className={styles.itemList}>
                            {match.trip_matches.map((tripMatch) => (
                              <div
                                key={`${tripMatch.requester_trip_id}-${tripMatch.target_trip_id}`}
                                className={styles.itemCardCompact}
                              >
                                <p>
                                  <strong>{formatSingleDay(tripMatch.day_of_week)}</strong>
                                </p>
                                <p>
                                  <strong>Enfant</strong> : {tripMatch.requester_child_first_name || '—'}
                                </p>
                                <p>
                                  <strong>Départ</strong> : {tripMatch.requester_from_label}
                                </p>
                                <p>
                                  <strong>Destination</strong> : {tripMatch.requester_to_label}
                                </p>
                                <p>
                                  <strong>Vous</strong> : {formatTimeValue(tripMatch.requester_from_time)}
                                </p>
                                <p>
                                  <strong>Autre famille</strong> :{' '}
                                  {formatTimeValue(tripMatch.target_from_time)}
                                </p>
                              </div>
                            ))}
                          </div>

                          <div className={styles.itemActions}>
                            <button
                              type="button"
                              className={styles.primaryButton}
                              onClick={() => openConfirmPopup(match)}
                            >
                              Demander la mise en relation
                            </button>
                          </div>
                        </div>
                      )
                    })}
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
                <h2 className={styles.sectionTitle}>Suite</h2>
                <p className={styles.sectionText}>
                  Votre demande a bien été envoyée. Vous pouvez suivre son évolution dans vos
                  demandes.
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

        {confirmState.open ? (
          <div className={styles.modalOverlay}>
            <div className={styles.modalSmallCard}>
              <p className={styles.modalText}>
                Envoyer une demande de mise en relation à <strong>{confirmParentName}</strong> ?
              </p>

              <div className={styles.itemActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={closeConfirmPopup}
                  disabled={isSendingRequest}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={confirmRequestContact}
                  disabled={isSendingRequest}
                >
                  {isSendingRequest ? 'Envoi...' : 'Envoyer'}
                </button>
              </div>








            </div>
          </div>
        ) : null}

        {showNewPlaceConfirm ? (
          <div className={styles.modalOverlay}>
            <div className={styles.modalSmallCard}>
              <p className={styles.modalText}>
                Il est préférable de sélectionner un lieu préenregistré.
                <br />
                <br />
                Vous pouvez demander l’ajout d’un nouveau lieu, mais il devra être validé par
                l’administrateur avant toute recherche de trajet compatible.
                <br />
                <br />
                Vous voulez quand-même en ajouter un ? Si oui, faites-le, puis revenez ici pour
                compléter vos trajets.
              </p>

              <div className={styles.itemActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setShowNewPlaceConfirm(false)}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={goToPlacesPage}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </>
  )
}