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
  createContactRequest,
  formatSingleDay,
  formatTimeValue,
  loadChildren,
  loadPlaces,
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
  kind: 'school' | 'activity' | 'other' | 'address'
  source: 'place' | 'address'
  label: string
  address: string | null
  lat: number
  lng: number
  score?: number | null
}

type SelectedLocation = SearchPlaceResult

type TripValidationErrors = {
  from: boolean
  to: boolean
  days: boolean
  time: boolean
}

const emptyTripValidationErrors: TripValidationErrors = {
  from: false,
  to: false,
  days: false,
  time: false,
}

function MissingFieldInfo({ message }: { message: string }) {
  return (
    <span
      title={message}
      aria-label={message}
      role="img"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 20,
        height: 20,
        marginLeft: 8,
        borderRadius: '999px',
        color: '#b91c1c',
        background: '#fee2e2',
        border: '1px solid #fecaca',
        fontSize: 13,
        fontWeight: 800,
        lineHeight: 1,
        cursor: 'help',
        verticalAlign: 'middle',
      }}
    >
      !
    </span>
  )
}

const LOCATION_MISSING_MESSAGE =
  'Saisissez un lieu connu ou une adresse complète, puis choisissez une proposition dans la liste.'
const DAY_MISSING_MESSAGE = 'Choisissez au moins un jour.'
const TIME_MISSING_MESSAGE = 'Saisissez un horaire.'

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

  const tripCompatibilityScore =
    match.trip_matches.length > 0
      ? Math.round(
          match.trip_matches.reduce(
            (sum, item) =>
              sum + item.from_distance_score + item.to_distance_score + item.time_score,
            0
          ) / match.trip_matches.length
        )
      : 0

  const compatibilityScore =
    match.trip_matches.length > 0
      ? Math.round(
          match.trip_matches.reduce((sum, item) => sum + item.compatibility_score, 0) /
            match.trip_matches.length
        )
      : 0

  let badge_label = 'Possible'
  let badge_tone: 'green' | 'yellow' | 'red' = 'red'

  if (compatibilityScore >= 85) {
    badge_label = 'Très compatible'
    badge_tone = 'green'
  } else if (compatibilityScore >= 70) {
    badge_label = 'Compatible'
    badge_tone = 'yellow'
  }

  return {
    ...match,
    compatibility_score: compatibilityScore,
    trip_compatibility_score: tripCompatibilityScore,
    average_time_fit_score: averageTimeFitScore,
    coverage_ratio: uniqueRequesterTripIds.length > 0 ? 1 : 0,
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

  const [childFirstName, setChildFirstName] = useState('')
  const [childLevel, setChildLevel] = useState('')
  const [savingChild, setSavingChild] = useState(false)

  const [fromPlaceQuery, setFromPlaceQuery] = useState('')
  const [toPlaceQuery, setToPlaceQuery] = useState('')
  const [fromLocation, setFromLocation] = useState<SelectedLocation | null>(null)
  const [toLocation, setToLocation] = useState<SelectedLocation | null>(null)
  const [fromResults, setFromResults] = useState<SearchPlaceResult[]>([])
  const [toResults, setToResults] = useState<SearchPlaceResult[]>([])
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [fromTime, setFromTime] = useState('')
  const [savingTrip, setSavingTrip] = useState(false)
  const [tripValidationErrors, setTripValidationErrors] =
    useState<TripValidationErrors>(emptyTripValidationErrors)

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

        const [childrenData, tripsData, placesData] = await Promise.all([
          loadChildren(family.id),
          loadTrips(family.id),
          loadPlaces(),
        ])

        setChildren(childrenData)
        setTrips(tripsData)
        setPlaces(placesData)
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

  function getTripLocationLabel(trip: Trip, side: 'from' | 'to') {
    const locationType = side === 'from' ? trip.from_location_type : trip.to_location_type
    const address = side === 'from' ? trip.from_address : trip.to_address
    const placeId = side === 'from' ? trip.from_place_id : trip.to_place_id
    const suggestionId =
      side === 'from' ? trip.from_place_suggestion_id : trip.to_place_suggestion_id

    if (locationType === 'private_address' && address) {
      return address
    }

    if (placeId) {
      const place = placeMap[placeId]
      if (!place) return 'Lieu inconnu'
      return `${place.name} (${place.city})`
    }

    if (suggestionId) {
      return 'Lieu provisoire — à remplacer par un lieu ou une adresse'
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
      const departureLabel = getTripLocationLabel(trip, 'from')
      const destinationLabel = getTripLocationLabel(trip, 'to')
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
  }, [selectedChildTrips, placeMap])

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
    setTripValidationErrors((prev) => ({ ...prev, days: false }))
    setSelectedDays((prev) =>
      prev.includes(dayValue)
        ? prev.filter((value) => value !== dayValue)
        : [...prev, dayValue].sort((a, b) => a - b)
    )
  }

  async function searchPlaces(query: string, target: 'from' | 'to') {
    if (query.trim().length < 2) {
      if (target === 'from') {
        setFromResults([])
      } else {
        setToResults([])
      }
      return
    }

    const response = await fetch(`/api/places/search?q=${encodeURIComponent(query.trim())}`)
    const payload = await response.json().catch(() => null)

    if (!response.ok) return

    const searchResults = (payload?.results ?? []) as SearchPlaceResult[]
    if (target === 'from') {
      setFromResults(searchResults)
    } else {
      setToResults(searchResults)
    }
  }

  function selectLocation(item: SearchPlaceResult, target: 'from' | 'to') {
    const displayLabel = item.source === 'address' ? item.label : `${item.name} (${item.city})`

    if (target === 'from') {
      setFromLocation(item)
      setFromPlaceQuery(displayLabel)
      setFromResults([])
      setTripValidationErrors((prev) => ({ ...prev, from: false }))
    } else {
      setToLocation(item)
      setToPlaceQuery(displayLabel)
      setToResults([])
      setTripValidationErrors((prev) => ({ ...prev, to: false }))
    }
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

    const validationErrors: TripValidationErrors = {
      from: !fromLocation,
      to: !toLocation,
      days: selectedDays.length === 0,
      time: !fromTime,
    }

    setTripValidationErrors(validationErrors)

    if (Object.values(validationErrors).some(Boolean)) {
      showPopup('Complétez les informations manquantes.', 'error')
      return
    }

    if (!fromLocation || !toLocation) {
      return
    }

    if (fromLocation.id === toLocation.id) {
      showPopup('Le départ et la destination doivent être différents.', 'error')
      return
    }

    setSavingTrip(true)

    const tripGroupId = crypto.randomUUID()

    const rows = selectedDays.map((day) => ({
      family_id: familyId,
      child_id: selectedChildId,

      from_location_type: fromLocation.source === 'address' ? 'private_address' : 'place',
      to_location_type: toLocation.source === 'address' ? 'private_address' : 'place',

      from_place_id: fromLocation.source === 'place' ? fromLocation.id : null,
      to_place_id: toLocation.source === 'place' ? toLocation.id : null,
      from_place_suggestion_id: null,
      to_place_suggestion_id: null,

      from_address: fromLocation.source === 'address' ? fromLocation.address || fromLocation.label : null,
      to_address: toLocation.source === 'address' ? toLocation.address || toLocation.label : null,
      from_lat: fromLocation.lat,
      from_lng: fromLocation.lng,
      to_lat: toLocation.lat,
      to_lng: toLocation.lng,

      day_of_week: day,
      from_time: fromTime,
      to_time: null,
      tolerance_min: 10,
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
    setFromLocation(null)
    setToLocation(null)
    setFromResults([])
    setToResults([])
    setSelectedDays([])
    setFromTime('')
    setTripValidationErrors(emptyTripValidationErrors)
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
              .filter((match) => match.compatibility_score >= 50)
              .sort((a, b) => b.compatibility_score - a.compatibility_score)

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
    return 'Classement calculé à partir de la proximité du départ, de la proximité de la destination, de l’écart horaire et de l’historique des échanges.'
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
                      onClick={() => {
                        setTripValidationErrors(emptyTripValidationErrors)
                        setShowAddTrip(true)
                      }}
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
                        onClick={() => {
                          setTripValidationErrors(emptyTripValidationErrors)
                          setShowAddTrip(false)
                        }}
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
                        <label>
                          Jours
                          {tripValidationErrors.days ? (
                            <MissingFieldInfo message={DAY_MISSING_MESSAGE} />
                          ) : null}
                        </label>
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
                        <label htmlFor="fromPlaceQuery">
                          Départ
                          {tripValidationErrors.from ? (
                            <MissingFieldInfo message={LOCATION_MISSING_MESSAGE} />
                          ) : null}
                        </label>
                        <input
                          id="fromPlaceQuery"
                          className={styles.input}
                          value={fromPlaceQuery}
                          onChange={(e) => {
                            setFromPlaceQuery(e.target.value)
                            setFromLocation(null)
                            void searchPlaces(e.target.value, 'from')
                          }}
                          placeholder="Lieu connu ou adresse complète"
                        />
                        {fromResults.length > 0 ? (
                          <div className={styles.searchResultsList}>
                            {fromResults.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                className={styles.searchResultButton}
                                onClick={() => selectLocation(item, 'from')}
                              >
                                <span>
                                  {item.label}
                                  {item.source === 'address' ? ' — adresse' : ' — lieu enregistré'}
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className={styles.field}>
                        <label htmlFor="toPlaceQuery">
                          Destination
                          {tripValidationErrors.to ? (
                            <MissingFieldInfo message={LOCATION_MISSING_MESSAGE} />
                          ) : null}
                        </label>
                        <input
                          id="toPlaceQuery"
                          className={styles.input}
                          value={toPlaceQuery}
                          onChange={(e) => {
                            setToPlaceQuery(e.target.value)
                            setToLocation(null)
                            void searchPlaces(e.target.value, 'to')
                          }}
                          placeholder="Lieu connu ou adresse complète"
                        />
                        {toResults.length > 0 ? (
                          <div className={styles.searchResultsList}>
                            {toResults.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                className={styles.searchResultButton}
                                onClick={() => selectLocation(item, 'to')}
                              >
                                <span>
                                  {item.label}
                                  {item.source === 'address' ? ' — adresse' : ' — lieu enregistré'}
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className={styles.field}>
                        <label htmlFor="fromTime">
                          Horaire
                          {tripValidationErrors.time ? (
                            <MissingFieldInfo message={TIME_MISSING_MESSAGE} />
                          ) : null}
                        </label>
                        <input
                          id="fromTime"
                          type="time"
                          className={`${styles.input} ${styles.timeInput}`}
                          value={fromTime}
                          onChange={(e) => {
                            setFromTime(e.target.value)
                            setTripValidationErrors((prev) => ({ ...prev, time: false }))
                          }}
                        />
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
                      const badgeStyle =
                        match.badge_tone === 'green'
                          ? {
                              background: '#dcfce7',
                              color: '#166534',
                              border: '1px solid #bbf7d0',
                            }
                          : match.badge_tone === 'yellow'
                            ? {
                                background: '#fef9c3',
                                color: '#854d0e',
                                border: '1px solid #fde68a',
                              }
                            : {
                                background: '#fee2e2',
                                color: '#991b1b',
                                border: '1px solid #fecaca',
                              }

                      return (
                        <div key={match.target_family_id} className={styles.itemCard}>
                          <div className={styles.itemHeader}>
                            <div>
                              <h3 className={styles.itemTitle}>{parentName}</h3>
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
                                style={{ ...badgeStyle, cursor: 'pointer' }}
                              >
                                {match.badge_label} ⓘ
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
                                <div
                                  className={styles.itemCardCompact}
                                  style={{ marginBottom: 10 }}
                                >
                                  <h4 className={styles.itemTitle} style={{ fontSize: 16 }}>
                                    Votre trajet
                                  </h4>
                                  <p>
                                    <strong>Jour</strong> : {formatSingleDay(tripMatch.day_of_week)}
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
                                    <strong>Horaire</strong> : {formatTimeValue(tripMatch.requester_from_time)}
                                  </p>
                                </div>

                                <div className={styles.itemCardCompact}>
                                  <h4 className={styles.itemTitle} style={{ fontSize: 16 }}>
                                    Compatibilité avec l’autre trajet
                                  </h4>
                                  <p>
                                    <strong>Proximité du départ</strong> : {tripMatch.from_distance_label}
                                  </p>
                                  <p>
                                    <strong>Proximité de la destination</strong> : {tripMatch.to_distance_label}
                                  </p>
                                  <p>
                                    <strong>Horaire de l’autre famille</strong> : {formatTimeValue(tripMatch.target_from_time)}, écart de {tripMatch.time_diff_min} min
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>


                          <div className={styles.itemCardCompact} style={{ marginTop: 12 }}>
                            <h4 className={styles.itemTitle} style={{ fontSize: 16 }}>
                              Historique
                            </h4>
                            <p>{match.history_label}</p>
                            {match.contact_block_reason ? (
                              <p className={styles.smallMuted} style={{ marginTop: 6 }}>
                                {match.contact_block_reason}
                              </p>
                            ) : null}
                          </div>

                          <div className={styles.itemActions}>
                            <button
                              type="button"
                              className={styles.primaryButton}
                              onClick={() => openConfirmPopup(match)}
                              disabled={!match.can_contact}
                            >
                              {match.can_contact
                                ? 'Demander la mise en relation'
                                : 'Demande déjà en attente'}
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

      </main>
    </>
  )
}
