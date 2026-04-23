import Head from 'next/head'
import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import styles from '../../styles/Dashboard.module.css'
import {
  Child,
  Trip,
  TripStatus,
  formatSingleDay,
  formatTimeValue,
  formatTripStatus,
  loadChildren,
  loadTrips,
  requireFamily,
} from '../../lib/dashboardShared'
import { supabase } from '../../lib/supabaseClient'
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

export default function DashboardTripsPage({ setGlobalPopup }: Props) {
  const router = useRouter()
  const fromFindMatch = router.query.from === 'find-match'

  const [familyId, setFamilyId] = useState('')
  const [children, setChildren] = useState<Child[]>([])
  const [trips, setTrips] = useState<Trip[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updatingTripId, setUpdatingTripId] = useState<string | null>(null)
  const [deletingTripGroupId, setDeletingTripGroupId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [showNewPlaceConfirm, setShowNewPlaceConfirm] = useState(false)

  const [childId, setChildId] = useState('')
  const [fromPlaceQuery, setFromPlaceQuery] = useState('')
  const [toPlaceQuery, setToPlaceQuery] = useState('')
  const [fromPlaceId, setFromPlaceId] = useState('')
  const [toPlaceId, setToPlaceId] = useState('')
  const [fromPlaceSource, setFromPlaceSource] = useState<'place' | 'suggestion' | ''>('')
  const [toPlaceSource, setToPlaceSource] = useState<'place' | 'suggestion' | ''>('')
  const [fromResults, setFromResults] = useState<SearchPlaceResult[]>([])
  const [toResults, setToResults] = useState<SearchPlaceResult[]>([])
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [fromTime, setFromTime] = useState('')
  const [toleranceMin, setToleranceMin] = useState('10')

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

        const [childrenData, tripsData] = await Promise.all([
          loadChildren(family.id),
          loadTrips(family.id),
        ])

        setChildren(childrenData)
        setTrips(tripsData)
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

    const results = payload?.results ?? []

    if (target === 'from') setFromResults(results)
    else setToResults(results)
  }

  function toggleDay(dayValue: number) {
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
    setFromPlaceId('')
    setToPlaceId('')
    setFromPlaceSource('')
    setToPlaceSource('')
    setFromResults([])
    setToResults([])
    setSelectedDays([])
    setFromTime('')
    setToleranceMin('10')
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

    if (!fromPlaceId || !toPlaceId) {
      showPopup('Veuillez sélectionner un départ et une arrivée dans la liste proposée.', 'error')
      return
    }

    if (fromPlaceId === toPlaceId && fromPlaceSource === 'place' && toPlaceSource === 'place') {
      showPopup('Le départ et l’arrivée doivent être différents.', 'error')
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

    setSaving(true)

    const tripGroupId = crypto.randomUUID()

    const rows = selectedDays.map((day) => ({
      family_id: familyId,
      child_id: childId,
      from_place_id: fromPlaceSource === 'place' ? fromPlaceId : null,
      to_place_id: toPlaceSource === 'place' ? toPlaceId : null,
      from_place_suggestion_id: fromPlaceSource === 'suggestion' ? fromPlaceId : null,
      to_place_suggestion_id: toPlaceSource === 'suggestion' ? toPlaceId : null,
      day_of_week: day,
      from_time: fromTime,
      to_time: null,
      tolerance_min: Number(toleranceMin) || 10,
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

  function goToPlacesPage() {
    setShowNewPlaceConfirm(false)
    router.push('/dashboard/places')
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
                        <strong>Départ</strong> et <strong>Arrivée</strong> définis pour ce trajet
                      </p>
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
                  onClick={() => setShowAddForm((prev) => !prev)}
                >
                  {showAddForm ? 'Fermer' : 'Créer un trajet'}
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
                      <label htmlFor="toPlaceQuery">Arrivée</label>
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
                          className={styles.timeInput}
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