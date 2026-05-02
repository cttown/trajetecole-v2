import Head from 'next/head'
import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import styles from '../../styles/Dashboard.module.css'
import {
  Child,
  Place,
  Trip,
  TripStatus,
  formatSingleDay,
  formatTimeValue,
  formatTripStatus,
  loadChildren,
  loadPlaces,
  loadTrips,
  requireFamily,
} from '../../lib/dashboardShared'
import { supabase } from '../../lib/supabaseClient'
import type { SetGlobalPopup } from '../_app'

type Props = {
  setGlobalPopup?: SetGlobalPopup
}

type SearchLocationResult = {
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

type TripValidationErrors = {
  child: boolean
  from: boolean
  to: boolean
  days: boolean
  time: boolean
}

const emptyTripValidationErrors: TripValidationErrors = {
  child: false,
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

const CHILD_MISSING_MESSAGE = 'Choisissez un enfant.'
const LOCATION_MISSING_MESSAGE =
  'Saisissez un lieu connu ou une adresse complète, puis choisissez une proposition dans la liste.'
const DAY_MISSING_MESSAGE = 'Choisissez au moins un jour.'
const TIME_MISSING_MESSAGE = 'Saisissez un horaire.'

const STATUS_OPTIONS: { value: TripStatus; label: string }[] = [
  {
    value: 'searching',
    label: 'Recherche de solution en cours',
  },
  {
    value: 'resolved_open',
    label: 'Solution trouvée, d’autres familles peuvent me joindre',
  },
  {
    value: 'resolved',
    label: 'Solution trouvée, d’autres familles ne peuvent plus me joindre',
  },
  {
    value: 'archived',
    label: 'Archivé',
  },
]

const DAY_OPTIONS = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 7, label: 'Dimanche' },
]

function groupTripsByTripGroup(trips: Trip[]) {
  const groups = new Map<string, Trip[]>()

  for (const trip of trips) {
    const current = groups.get(trip.trip_group_id) ?? []
    current.push(trip)
    groups.set(trip.trip_group_id, current)
  }

  return Array.from(groups.entries()).map(([tripGroupId, items]) => ({
    tripGroupId,
    items: [...items].sort((a, b) => a.day_of_week - b.day_of_week),
  }))
}

function formatPlaceLabel(place: Place | undefined | null) {
  if (!place) return 'Lieu non renseigné'
  return `${place.name} (${place.city})`
}

function formatTripLocation(
  trip: Trip | undefined | null,
  direction: 'from' | 'to',
  placeMap: Record<string, Place>
) {
  if (!trip) return 'Lieu non renseigné'

  const locationType = direction === 'from' ? trip.from_location_type : trip.to_location_type
  const address = direction === 'from' ? trip.from_address : trip.to_address
  const placeId = direction === 'from' ? trip.from_place_id : trip.to_place_id

  if (locationType === 'private_address') {
    return address || 'Adresse non renseignée'
  }

  if (placeId) {
    return formatPlaceLabel(placeMap[placeId])
  }

  return 'Lieu non renseigné'
}

function isSameSelectedLocation(
  fromLocation: SearchLocationResult,
  toLocation: SearchLocationResult
) {
  if (fromLocation.source !== toLocation.source) return false

  if (fromLocation.source === 'place') {
    return fromLocation.id === toLocation.id
  }

  return (
    fromLocation.address === toLocation.address ||
    (fromLocation.lat === toLocation.lat && fromLocation.lng === toLocation.lng)
  )
}

export default function DashboardTripsPage({ setGlobalPopup }: Props) {
  const router = useRouter()
  const fromFindMatch = router.query.from === 'find-match'

  const [familyId, setFamilyId] = useState('')
  const [children, setChildren] = useState<Child[]>([])
  const [places, setPlaces] = useState<Place[]>([])
  const [trips, setTrips] = useState<Trip[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updatingTripId, setUpdatingTripId] = useState<string | null>(null)
  const [deletingTripGroupId, setDeletingTripGroupId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  const [childId, setChildId] = useState('')
  const [fromPlaceQuery, setFromPlaceQuery] = useState('')
  const [toPlaceQuery, setToPlaceQuery] = useState('')
  const [fromLocation, setFromLocation] = useState<SearchLocationResult | null>(null)
  const [toLocation, setToLocation] = useState<SearchLocationResult | null>(null)
  const [fromResults, setFromResults] = useState<SearchLocationResult[]>([])
  const [toResults, setToResults] = useState<SearchLocationResult[]>([])
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [fromTime, setFromTime] = useState('')
  const [tripValidationErrors, setTripValidationErrors] =
    useState<TripValidationErrors>(emptyTripValidationErrors)

  const [editingTripGroupId, setEditingTripGroupId] = useState<string | null>(null)
  const [editingStatus, setEditingStatus] = useState<TripStatus>('searching')

  function showPopup(message: string, type: 'success' | 'error' = 'success') {
    if (setGlobalPopup) {
      setGlobalPopup({ message, type })
      return
    }
    if (type === 'error') setError(message)
  }

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

  const childMap = useMemo(
    () => Object.fromEntries(children.map((child) => [child.id, child])),
    [children]
  )

  const placeMap = useMemo(
    () => Object.fromEntries(places.map((place) => [place.id, place])),
    [places]
  )

  const groupedTrips = useMemo(() => groupTripsByTripGroup(trips), [trips])

  const searchingGroups = groupedTrips.filter((group) => group.items[0]?.status === 'searching')
  const resolvedOpenGroups = groupedTrips.filter(
    (group) => group.items[0]?.status === 'resolved_open'
  )
  const resolvedGroups = groupedTrips.filter((group) => group.items[0]?.status === 'resolved')
  const archivedGroups = groupedTrips.filter((group) => group.items[0]?.status === 'archived')

  async function reloadTrips() {
    if (!familyId) return
    const tripsData = await loadTrips(familyId)
    setTrips(tripsData)
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

    const results = (payload?.results ?? []) as SearchLocationResult[]

    if (target === 'from') setFromResults(results)
    else setToResults(results)
  }

  function selectLocation(item: SearchLocationResult, target: 'from' | 'to') {
    if (target === 'from') {
      setFromLocation(item)
      setFromPlaceQuery(item.label)
      setFromResults([])
      setTripValidationErrors((prev) => ({ ...prev, from: false }))
      return
    }

    setToLocation(item)
    setToPlaceQuery(item.label)
    setToResults([])
    setTripValidationErrors((prev) => ({ ...prev, to: false }))
  }

  function toggleDay(dayValue: number) {
    setTripValidationErrors((prev) => ({ ...prev, days: false }))
    setSelectedDays((prev) =>
      prev.includes(dayValue)
        ? prev.filter((value) => value !== dayValue)
        : [...prev, dayValue].sort((a, b) => a - b)
    )
  }

  function resetForm() {
    setChildId('')
    setFromPlaceQuery('')
    setToPlaceQuery('')
    setFromLocation(null)
    setToLocation(null)
    setFromResults([])
    setToResults([])
    setSelectedDays([])
    setFromTime('')
    setTripValidationErrors(emptyTripValidationErrors)
  }

  async function handleAddTrip(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!familyId) {
      showPopup('Famille introuvable.', 'error')
      return
    }

    const validationErrors: TripValidationErrors = {
      child: !childId,
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
      showPopup('Complétez les informations manquantes.', 'error')
      return
    }

    if (isSameSelectedLocation(fromLocation, toLocation)) {
      showPopup('Le départ et la destination doivent être différents.', 'error')
      return
    }






    setSaving(true)

    const tripGroupId = crypto.randomUUID()

    const rows = selectedDays.map((day) => ({
      family_id: familyId,
      child_id: childId,
      from_location_type: fromLocation.source === 'address' ? 'private_address' : 'place',
      to_location_type: toLocation.source === 'address' ? 'private_address' : 'place',
      from_place_id: fromLocation.source === 'place' ? fromLocation.id : null,
      to_place_id: toLocation.source === 'place' ? toLocation.id : null,
      from_address: fromLocation.source === 'address' ? fromLocation.address || fromLocation.label : null,
      to_address: toLocation.source === 'address' ? toLocation.address || toLocation.label : null,
      from_lat: fromLocation.lat,
      from_lng: fromLocation.lng,
      to_lat: toLocation.lat,
      to_lng: toLocation.lng,
      from_place_suggestion_id: null,
      to_place_suggestion_id: null,
      day_of_week: day,
      from_time: fromTime,
      to_time: null,
      tolerance_min: 10,
      status: 'searching',
      trip_group_id: tripGroupId,
    }))

    const { error } = await supabase.from('trips').insert(rows)

    setSaving(false)

    if (error) {
      showPopup(error.message, 'error')
      return
    }

    await reloadTrips()
    resetForm()
    setShowAddForm(false)
    showPopup('Trajet créé.', 'success')
  }

  async function handleStatusChange(tripGroupId: string, nextStatus: TripStatus) {
    setError('')
    setUpdatingTripId(tripGroupId)

    const { error } = await supabase
      .from('trips')
      .update({ status: nextStatus })
      .eq('trip_group_id', tripGroupId)

    setUpdatingTripId(null)

    if (error) {
      showPopup(error.message, 'error')
      return
    }

    await reloadTrips()
    showPopup('Statut mis à jour.', 'success')
  }

  async function handleDeleteTripGroup(tripGroupId: string) {
    const confirmed = window.confirm('Supprimer ce trajet ?')
    if (!confirmed) return

    setError('')
    setDeletingTripGroupId(tripGroupId)

    const { error } = await supabase.from('trips').delete().eq('trip_group_id', tripGroupId)

    setDeletingTripGroupId(null)

    if (error) {
      showPopup(error.message, 'error')
      return
    }

    await reloadTrips()
    showPopup('Trajet supprimé.', 'success')
  }

  function openEdit(group: { tripGroupId: string; items: Trip[] }) {
    setEditingTripGroupId(group.tripGroupId)
    setEditingStatus(group.items[0]?.status || 'searching')
  }

  function TripGroupList({
    title,
    groups,
    openByDefault,
  }: {
    title: string
    groups: { tripGroupId: string; items: Trip[] }[]
    openByDefault?: boolean
  }) {
    return (
      <details className={styles.accordion} open={openByDefault}>
        <summary className={styles.accordionSummary}>
          {title} ({groups.length})
        </summary>

        <div className={styles.accordionBody}>
          {groups.length === 0 ? (
            <p className={styles.smallMuted}>Aucun trajet dans cette catégorie.</p>
          ) : (
            groups.map((group) => {
              const firstTrip = group.items[0]
              const child = firstTrip ? childMap[firstTrip.child_id] : null

              return (
                <div key={group.tripGroupId} className={styles.itemCard}>
                  <div className={styles.itemHeader}>
                    <div>
                      <h3 className={styles.itemTitle}>{child?.first_name || 'Enfant'}</h3>
                    </div>

                    <span className={styles.badgeBlue}>
                      {firstTrip ? formatTripStatus(firstTrip.status) : '—'}
                    </span>
                  </div>

                  <div className={styles.itemBodyCompact}>
                    <p>
                      <strong>Jours</strong> :{' '}
                      {group.items.map((trip) => formatSingleDay(trip.day_of_week)).join(', ')}
                    </p>
                    <p>
                      <strong>Horaire</strong> : {formatTimeValue(firstTrip?.from_time ?? null)}
                    </p>
                    <p>
                      <strong>Départ</strong> : {formatTripLocation(firstTrip, 'from', placeMap)}
                    </p>
                    <p>
                      <strong>Destination</strong> : {formatTripLocation(firstTrip, 'to', placeMap)}
                    </p>
                  </div>

                  <div className={styles.itemActions}>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => openEdit(group)}
                    >
                      Mettre à jour le statut
                    </button>

                    <button
                      type="button"
                      className={styles.dangerButton}
                      onClick={() => handleDeleteTripGroup(group.tripGroupId)}
                      disabled={deletingTripGroupId === group.tripGroupId}
                    >
                      {deletingTripGroupId === group.tripGroupId ? 'Suppression...' : 'Supprimer'}
                    </button>
                  </div>

                  {editingTripGroupId === group.tripGroupId ? (
                    <div style={{ marginTop: 16 }}>
                      <div className={styles.field}>
                        <label>Statut</label>
                        <select
                          className={styles.select}
                          value={editingStatus}
                          onChange={(e) => setEditingStatus(e.target.value as TripStatus)}
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className={styles.itemActions} style={{ marginTop: 12 }}>
                        <button
                          type="button"
                          className={styles.primaryButton}
                          onClick={() => handleStatusChange(group.tripGroupId, editingStatus)}
                          disabled={updatingTripId === group.tripGroupId}
                        >
                          {updatingTripId === group.tripGroupId ? 'Enregistrement...' : 'Enregistrer'}
                        </button>

                        <button
                          type="button"
                          className={styles.secondaryButton}
                          onClick={() => setEditingTripGroupId(null)}
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : null}
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
        <title>Trajets - TrajetEcole</title>
      </Head>

      <main className={styles.page}>
        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.topbar}>
              <div>
                <h1 className={styles.pageTitle}>Trajets</h1>
              </div>

              <div className={styles.topbarActions}>
                <Link href="/dashboard" className={styles.secondaryButton}>
                  Retour Mon espace
                </Link>

                {fromFindMatch ? (
                  <Link href="/dashboard/find-match" className={styles.primaryButton}>
                    Reprendre la recherche
                  </Link>
                ) : null}
              </div>
            </div>

            {error ? <p className={styles.errorMessage}>{error}</p> : null}

            <div className={styles.sectionCard}>
              <div className={styles.itemActions}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => {
                    setShowAddForm((prev) => !prev)
                    setTripValidationErrors(emptyTripValidationErrors)
                  }}
                >
                  {showAddForm ? 'Fermer' : 'Créer un trajet'}
                </button>
              </div>

              {showAddForm ? (
                <div style={{ marginTop: 20 }}>
                  <form onSubmit={handleAddTrip} className={styles.form}>
                    <div className={styles.field}>
                      <label htmlFor="childId">
                        Enfant
                        {tripValidationErrors.child ? (
                          <MissingFieldInfo message={CHILD_MISSING_MESSAGE} />
                        ) : null}
                      </label>
                      <select
                        id="childId"
                        className={styles.select}
                        value={childId}
                        onChange={(e) => {
                          setChildId(e.target.value)
                          if (e.target.value) {
                            setTripValidationErrors((prev) => ({ ...prev, child: false }))
                          }
                        }}
                      >
                        <option value="">Sélectionner</option>
                        {children.map((child) => (
                          <option key={child.id} value={child.id}>
                            {child.first_name}
                            {child.level ? ` (${child.level})` : ''}
                          </option>
                        ))}
                      </select>
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
                        className={styles.timeInput}
                        value={fromTime}
                        onChange={(e) => {
                          setFromTime(e.target.value)
                          if (e.target.value) {
                            setTripValidationErrors((prev) => ({ ...prev, time: false }))
                          }
                        }}
                      />
                    </div>

                    <div className={styles.itemActions}>
                      <button type="submit" className={styles.primaryButton} disabled={saving}>
                        {saving ? 'Enregistrement...' : 'Créer ce trajet'}
                      </button>
                    </div>
                  </form>
                </div>
              ) : null}
            </div>

            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>Mes trajets</h2>
                </div>
              </div>

              <div className={styles.accordionGroup}>
                <TripGroupList
                  title="Recherche de solution en cours"
                  groups={searchingGroups}
                  openByDefault
                />
                <TripGroupList
                  title="Solution trouvée, trajet ouvert aux autres familles"
                  groups={resolvedOpenGroups}
                />
                <TripGroupList
                  title="Solution trouvée, trajet non proposé aux autres familles"
                  groups={resolvedGroups}
                />
                <TripGroupList title="Archivé" groups={archivedGroups} />
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
