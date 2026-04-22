import Head from 'next/head'
import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import styles from '../../styles/Dashboard.module.css'
import {
  Child,
  Place,
  PlaceSuggestion,
  Trip,
  TripStatus,
  formatSingleDay,
  formatTimeValue,
  formatTripStatus,
  loadChildren,
  loadPlaces,
  loadPlaceSuggestions,
  loadTrips,
  requireFamily,
} from '../../lib/dashboardShared'
import { supabase } from '../../lib/supabaseClient'
import type { SetGlobalPopup } from '../_app'

type Props = {
  setGlobalPopup?: SetGlobalPopup
}

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

  return Array.from(groups.entries())
    .map(([tripGroupId, items]) => ({
      tripGroupId,
      items: [...items].sort((a, b) => a.day_of_week - b.day_of_week),
    }))
    .sort((a, b) => {
      const aFirst = a.items[0]
      const bFirst = b.items[0]
      return (aFirst?.day_of_week ?? 0) - (bFirst?.day_of_week ?? 0)
    })
}

export default function DashboardTripsPage({ setGlobalPopup }: Props) {
  const router = useRouter()
  const fromFindMatch = router.query.from === 'find-match'

  const [familyId, setFamilyId] = useState('')
  const [children, setChildren] = useState<Child[]>([])
  const [places, setPlaces] = useState<Place[]>([])
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>([])
  const [trips, setTrips] = useState<Trip[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updatingTripId, setUpdatingTripId] = useState<string | null>(null)
  const [deletingTripGroupId, setDeletingTripGroupId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  const [childId, setChildId] = useState('')
  const [fromPlaceId, setFromPlaceId] = useState('')
  const [fromSuggestionId, setFromSuggestionId] = useState('')
  const [toPlaceId, setToPlaceId] = useState('')
  const [toSuggestionId, setToSuggestionId] = useState('')
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [fromTime, setFromTime] = useState('')
  const [toTime, setToTime] = useState('')
  const [toleranceMin, setToleranceMin] = useState('10')
  const [status, setStatus] = useState<TripStatus>('searching')

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
    async function loadPage() {
      try {
        const { family } = await requireFamily(router)
        if (!family) return

        setFamilyId(family.id)

        const [childrenData, tripsData, placesData, suggestionsData] = await Promise.all([
          loadChildren(family.id),
          loadTrips(family.id),
          loadPlaces(),
          loadPlaceSuggestions(family.id),
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

  const groupedTrips = useMemo(() => groupTripsByTripGroup(trips), [trips])

  const searchingGroups = groupedTrips.filter((group) => group.items[0]?.status === 'searching')
  const resolvedOpenGroups = groupedTrips.filter(
    (group) => group.items[0]?.status === 'resolved_open'
  )
  const resolvedGroups = groupedTrips.filter((group) => group.items[0]?.status === 'resolved')
  const archivedGroups = groupedTrips.filter((group) => group.items[0]?.status === 'archived')

  const availableSuggestions = useMemo(
    () => placeSuggestions.filter((item) => item.status === 'pending'),
    [placeSuggestions]
  )

  function resetForm() {
    setChildId('')
    setFromPlaceId('')
    setFromSuggestionId('')
    setToPlaceId('')
    setToSuggestionId('')
    setSelectedDays([])
    setFromTime('')
    setToTime('')
    setToleranceMin('10')
    setStatus('searching')
  }

  function formatPlaceLabel(placeId: string | null, suggestionId?: string | null) {
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

  function toggleDay(dayValue: number) {
    setSelectedDays((prev) =>
      prev.includes(dayValue)
        ? prev.filter((value) => value !== dayValue)
        : [...prev, dayValue].sort((a, b) => a - b)
    )
  }

  async function reloadTrips() {
    if (!familyId) return
    const tripsData = await loadTrips(familyId)
    setTrips(tripsData)
  }

  async function handleAddTrip(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!familyId) {
      showPopup('Famille introuvable.', 'error')
      return
    }

    if (!childId) {
      showPopup('Veuillez sélectionner un enfant.', 'error')
      return
    }

    if (!fromTime) {
      showPopup('Veuillez renseigner l’horaire de départ.', 'error')
      return
    }

    if (selectedDays.length === 0) {
      showPopup('Veuillez sélectionner au moins un jour.', 'error')
      return
    }

    if ((!fromPlaceId && !fromSuggestionId) || (!toPlaceId && !toSuggestionId)) {
      showPopup('Veuillez renseigner un départ et une destination.', 'error')
      return
    }

    if (fromPlaceId && toPlaceId && fromPlaceId === toPlaceId) {
      showPopup('Le départ et la destination doivent être différents.', 'error')
      return
    }

    setSaving(true)

    const tripGroupId = crypto.randomUUID()

    const rows = selectedDays.map((day) => ({
      family_id: familyId,
      child_id: childId,
      from_place_id: fromPlaceId || null,
      to_place_id: toPlaceId || null,
      from_place_suggestion_id: fromSuggestionId || null,
      to_place_suggestion_id: toSuggestionId || null,
      day_of_week: day,
      from_time: fromTime,
      to_time: toTime || null,
      tolerance_min: Number(toleranceMin) || 10,
      status,
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
    showPopup('Trajet ajouté.', 'success')
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
                      <p className={styles.itemMeta}>
                        {formatPlaceLabel(
                          firstTrip?.from_place_id ?? null,
                          firstTrip?.from_place_suggestion_id
                        )}{' '}
                        →{' '}
                        {formatPlaceLabel(
                          firstTrip?.to_place_id ?? null,
                          firstTrip?.to_place_suggestion_id
                        )}
                      </p>
                    </div>

                    <span className={styles.badgeBlue}>
                      {firstTrip ? formatTripStatus(firstTrip.status) : '—'}
                    </span>
                  </div>

                  <div className={styles.itemBody}>
                    <p>
                      <strong>Jours :</strong>{' '}
                      {group.items.map((trip) => formatSingleDay(trip.day_of_week)).join(', ')}
                    </p>
                    <p>
                      <strong>Horaire :</strong> {formatTimeValue(firstTrip?.from_time ?? null)}
                      {firstTrip?.to_time ? ` → ${formatTimeValue(firstTrip.to_time)}` : ''}
                    </p>
                    <p>
                      <strong>Tolérance :</strong> {firstTrip?.tolerance_min ?? '—'} min
                    </p>
                  </div>

                  <div className={styles.itemActions}>
                    <select
                      className={styles.select}
                      value={firstTrip?.status ?? 'searching'}
                      onChange={(e) =>
                        handleStatusChange(group.tripGroupId, e.target.value as TripStatus)
                      }
                      disabled={updatingTripId === group.tripGroupId}
                      style={{ maxWidth: 420 }}
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      className={styles.dangerButton}
                      onClick={() => handleDeleteTripGroup(group.tripGroupId)}
                      disabled={deletingTripGroupId === group.tripGroupId}
                    >
                      {deletingTripGroupId === group.tripGroupId
                        ? 'Suppression...'
                        : 'Supprimer'}
                    </button>
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
                  onClick={() => setShowAddForm((prev) => !prev)}
                >
                  {showAddForm ? 'Fermer' : 'Ajouter un trajet'}
                </button>
              </div>

              {showAddForm ? (
                <div style={{ marginTop: 20 }}>
                  <form onSubmit={handleAddTrip} className={styles.form}>
                    <div className={styles.field}>
                      <label htmlFor="childId">Enfant</label>
                      <select
                        id="childId"
                        className={styles.select}
                        value={childId}
                        onChange={(e) => setChildId(e.target.value)}
                        required
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

                    <div className={styles.fieldRow}>
                      <div className={styles.field}>
                        <label htmlFor="fromPlaceId">Départ (lieu validé)</label>
                        <select
                          id="fromPlaceId"
                          className={styles.select}
                          value={fromPlaceId}
                          onChange={(e) => {
                            setFromPlaceId(e.target.value)
                            setFromSuggestionId('')
                          }}
                        >
                          <option value="">Sélectionner</option>
                          {places.map((place) => (
                            <option key={place.id} value={place.id}>
                              {place.name} ({place.city})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className={styles.field}>
                        <label htmlFor="fromSuggestionId">Départ (suggestion)</label>
                        <select
                          id="fromSuggestionId"
                          className={styles.select}
                          value={fromSuggestionId}
                          onChange={(e) => {
                            setFromSuggestionId(e.target.value)
                            setFromPlaceId('')
                          }}
                        >
                          <option value="">Aucune</option>
                          {availableSuggestions.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.suggested_name} ({item.city})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className={styles.fieldRow}>
                      <div className={styles.field}>
                        <label htmlFor="toPlaceId">Destination (lieu validé)</label>
                        <select
                          id="toPlaceId"
                          className={styles.select}
                          value={toPlaceId}
                          onChange={(e) => {
                            setToPlaceId(e.target.value)
                            setToSuggestionId('')
                          }}
                        >
                          <option value="">Sélectionner</option>
                          {places.map((place) => (
                            <option key={place.id} value={place.id}>
                              {place.name} ({place.city})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className={styles.field}>
                        <label htmlFor="toSuggestionId">Destination (suggestion)</label>
                        <select
                          id="toSuggestionId"
                          className={styles.select}
                          value={toSuggestionId}
                          onChange={(e) => {
                            setToSuggestionId(e.target.value)
                            setToPlaceId('')
                          }}
                        >
                          <option value="">Aucune</option>
                          {availableSuggestions.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.suggested_name} ({item.city})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className={styles.fieldRow}>
                      <div className={styles.field}>
                        <label htmlFor="fromTime">Horaire de départ</label>
                        <input
                          id="fromTime"
                          type="time"
                          className={styles.input}
                          value={fromTime}
                          onChange={(e) => setFromTime(e.target.value)}
                          required
                        />
                      </div>

                      <div className={styles.field}>
                        <label htmlFor="toTime">Horaire de fin</label>
                        <input
                          id="toTime"
                          type="time"
                          className={styles.input}
                          value={toTime}
                          onChange={(e) => setToTime(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className={styles.fieldRow}>
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

                      <div className={styles.field}>
                        <label htmlFor="status">Statut</label>
                        <select
                          id="status"
                          className={styles.select}
                          value={status}
                          onChange={(e) => setStatus(e.target.value as TripStatus)}
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className={styles.itemActions}>
                      <button type="submit" className={styles.primaryButton} disabled={saving}>
                        {saving ? 'Enregistrement...' : 'Ajouter ce trajet'}
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