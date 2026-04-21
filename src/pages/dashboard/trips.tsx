import { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import styles from '../../styles/Dashboard.module.css'
import { getPriorityDelayText } from '../../lib/contactRequestConfig'

type Family = {
  id: string
  auth_user_id: string
  email: string
  parent_first_name: string | null
  parent_last_name: string | null
  phone: string | null
  created_at: string
}

type Child = {
  id: string
  family_id: string
  first_name: string
  level: string | null
  created_at: string
}

type Place = {
  id: string
  name: string
  kind: 'school' | 'activity' | 'other'
  city: string
  exact_address: string | null
  postal_code: string | null
  is_active: boolean
  created_at: string
}

type PlaceSuggestion = {
  id: string
  family_id: string
  suggested_name: string
  kind: 'school' | 'activity' | 'other'
  city: string
  exact_address: string | null
  postal_code: string | null
  comment: string | null
  status: 'pending' | 'approved_new_place' | 'mapped_to_existing_place' | 'rejected'
  resolved_place_id: string | null
  review_note: string | null
  created_at: string
  reviewed_at: string | null
}

type Trip = {
  id: string
  family_id: string
  child_id: string
  from_place_id: string | null
  to_place_id: string | null
  from_place_suggestion_id: string | null
  to_place_suggestion_id: string | null
  day_of_week: number
  from_time: string
  to_time: string | null
  tolerance_min: number
  status: 'searching' | 'resolved' | 'paused' | 'archived'
  accepting_new_children: boolean
  revision: number
  created_at: string
  trip_group_id: string
}

type TripGroup = {
  trip_group_id: string
  family_id: string
  child_id: string
  from_place_id: string | null
  to_place_id: string | null
  from_place_suggestion_id: string | null
  to_place_suggestion_id: string | null
  day_of_week_values: number[]
  from_time: string
  to_time: string | null
  tolerance_min: number
  accepting_new_children: boolean
  revision: number
  created_at: string
  trips: Trip[]
}

type PlaceOption =
  | {
      source: 'place'
      id: string
      name: string
      city: string
      exact_address: string | null
      kind: 'school' | 'activity' | 'other'
      label: string
    }
  | {
      source: 'suggestion'
      id: string
      name: string
      city: string
      exact_address: string | null
      kind: 'school' | 'activity' | 'other'
      label: string
    }

type NewSuggestionDraft = {
  name: string
  city: string
  exact_address: string
  postal_code: string
  kind: 'school' | 'activity' | 'other'
  comment: string
}

type PlaceField = 'from' | 'to'

type SearchPlaceApiRow = {
  id: string
  name: string
  city: string
  exact_address?: string | null
  kind: 'school' | 'activity' | 'other'
  score?: number
}

const DAY_OPTIONS = [
  { label: 'Lun', value: 1 },
  { label: 'Mar', value: 2 },
  { label: 'Mer', value: 3 },
  { label: 'Jeu', value: 4 },
  { label: 'Ven', value: 5 },
  { label: 'Sam', value: 6 },
  { label: 'Dim', value: 7 },
]

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function dedupePlaceOptions(options: PlaceOption[]) {
  const map = new Map<string, PlaceOption>()

  for (const option of options) {
    map.set(`${option.source}-${option.id}`, option)
  }

  return Array.from(map.values())
}

function isTripReadyForMatching(trip: Trip): boolean {
  return (
    trip.status === 'searching' &&
    !!trip.from_place_id &&
    !!trip.to_place_id &&
    !trip.from_place_suggestion_id &&
    !trip.to_place_suggestion_id
  )
}

function formatHour(value: string | null) {
  if (!value) return '—'
  return value.slice(0, 5)
}

function getTripBlockingReason(trip: Trip): string | null {
  if (trip.status !== 'searching') {
    if (trip.status === 'resolved') return 'Trajet déjà résolu.'
    if (trip.status === 'paused') return 'Trajet en pause.'
    if (trip.status === 'archived') return 'Trajet archivé.'
  }

  const fromPending = !!trip.from_place_suggestion_id
  const toPending = !!trip.to_place_suggestion_id

  if (fromPending && toPending) {
    return 'Les lieux de départ et d’arrivée sont en attente de validation.'
  }

  if (fromPending) {
    return 'Le lieu de départ est en attente de validation.'
  }

  if (toPending) {
    return 'Le lieu d’arrivée est en attente de validation.'
  }

  if (!trip.from_place_id || !trip.to_place_id) {
    return 'Le trajet est incomplet.'
  }

  return null
}

function PlaceSelector({
  label,
  query,
  onQueryChange,
  selectedText,
  options,
  showAll,
  onToggleShowAll,
  onSelectOption,
  onOpenCreateInline,
  loading,
}: {
  label: string
  query: string
  onQueryChange: (value: string) => void
  selectedText: string
  options: PlaceOption[]
  showAll: boolean
  onToggleShowAll: () => void
  onSelectOption: (option: PlaceOption) => void
  onOpenCreateInline: () => void
  loading: boolean
}) {

  const isTyping = query.trim().length >= 2 && query !== selectedText
  const shouldShowOptions = showAll || isTyping


  return (
    <div className={styles.field}>
      <label>{label}</label>

      <input
        className={styles.input}
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Tapez au moins 2 caractères: nom du lieu, rue ..."
        required
      />

      {selectedText ? (
        <p className={styles.helperText}>Sélection actuelle : {selectedText}</p>
      ) : null}

      <div className={styles.itemActions}>
        <button type="button" className={styles.inlineButton} onClick={onToggleShowAll}>
          {showAll ? 'Masquer la liste complète' : 'Voir les lieux disponibles'}
        </button>

        <button type="button" className={styles.inlineButton} onClick={onOpenCreateInline}>
          Ajouter un nouveau lieu
        </button>
      </div>

      {shouldShowOptions ? (
        <div
          style={{
            border: '1px solid #dbe8f5',
            borderRadius: 14,
            padding: 10,
            display: 'grid',
            gap: 8,
            maxHeight: 260,
            overflowY: 'auto',
            background: '#f8fbff',
          }}
        >
          {loading ? (
            <p className={styles.smallMuted}>Recherche en cours...</p>
          ) : options.length > 0 ? (
            options.map((option) => (
              <button
                key={`${option.source}-${option.id}`}
                type="button"
                onClick={() => onSelectOption(option)}
                className={styles.quickLinkCard}
                style={{ textAlign: 'left', padding: 14 }}
              >
                <div>
                  <strong>{option.name}</strong>
                  {option.source === 'suggestion' ? ' (suggestion en attente)' : ''}
                </div>
                <div className={styles.smallMuted}>
                  {option.city} — {option.exact_address || 'Adresse non renseignée'}
                </div>
              </button>
            ))
          ) : (
            <p className={styles.smallMuted}>
              Aucun lieu trouvé. Vous pouvez proposer un nouveau lieu si nécessaire.
            </p>
          )}
        </div>
      ) : null}
    </div>
  )
}

function NewPlaceInlineForm({
  title,
  draft,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  title: string
  draft: NewSuggestionDraft
  onChange: (patch: Partial<NewSuggestionDraft>) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
}) {
  return (
    <div className={styles.itemCard} style={{ padding: 18 }}>
      <h3 className={styles.itemTitle}>{title}</h3>

      <div
        style={{
          marginBottom: 16,
          padding: 12,
          borderRadius: 14,
          background: '#fffbeb',
          color: '#92400e',
          border: '1px solid #f3d38a',
          lineHeight: 1.6,
          fontSize: 14,
        }}
      >
        <strong>Important :</strong> privilégiez les lieux déjà disponibles. Un nouveau lieu devra
        être validé par l’administrateur avant d’être pris en compte dans la recherche.
      </div>

      <div className={styles.form}>
        <div className={styles.field}>
          <label>Nom du lieu</label>
          <input
            className={styles.input}
            type="text"
            value={draft.name}
            onChange={(e) => onChange({ name: e.target.value })}
            required
          />
        </div>

        <div className={styles.field}>
          <label>Ville</label>
          <input
            className={styles.input}
            type="text"
            value={draft.city}
            onChange={(e) => onChange({ city: e.target.value })}
            required
          />
        </div>

        <div className={styles.field}>
          <label>Adresse exacte</label>
          <input
            className={styles.input}
            type="text"
            value={draft.exact_address}
            onChange={(e) => onChange({ exact_address: e.target.value })}
          />
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label>Code postal</label>
            <input
              className={styles.input}
              type="text"
              value={draft.postal_code}
              onChange={(e) => onChange({ postal_code: e.target.value })}
            />
          </div>

          <div className={styles.field}>
            <label>Type</label>
            <select
              className={styles.select}
              value={draft.kind}
              onChange={(e) =>
                onChange({ kind: e.target.value as 'school' | 'activity' | 'other' })
              }
            >
              <option value="school">École</option>
              <option value="activity">Activité</option>
              <option value="other">Autre</option>
            </select>
          </div>
        </div>

        <div className={styles.field}>
          <label>Commentaire</label>
          <textarea
            className={styles.textarea}
            value={draft.comment}
            onChange={(e) => onChange({ comment: e.target.value })}
            rows={3}
          />
        </div>
      </div>

      <div className={styles.itemActions}>
        <button type="button" className={styles.primaryButton} onClick={onSave} disabled={saving}>
          {saving ? 'Création...' : 'Créer et utiliser ce lieu'}
        </button>
        <button type="button" className={styles.secondaryButton} onClick={onCancel}>
          Annuler
        </button>
      </div>
    </div>
  )
}

export default function DashboardTripsPage() {
  const router = useRouter()
  const fromFindMatch = router.query.from === 'find-match'

  const [family, setFamily] = useState<Family | null>(null)
  const [children, setChildren] = useState<Child[]>([])
  const [places, setPlaces] = useState<Place[]>([])
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>([])
  const [trips, setTrips] = useState<Trip[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [editingTripGroupId, setEditingTripGroupId] = useState<string | null>(null)
  const [tripChildId, setTripChildId] = useState('')
  const [tripFromPlaceId, setTripFromPlaceId] = useState('')
  const [tripToPlaceId, setTripToPlaceId] = useState('')
  const [tripFromPlaceSuggestionId, setTripFromPlaceSuggestionId] = useState('')
  const [tripToPlaceSuggestionId, setTripToPlaceSuggestionId] = useState('')
  const [tripFromQuery, setTripFromQuery] = useState('')
  const [tripToQuery, setTripToQuery] = useState('')
  const [tripSelectedDays, setTripSelectedDays] = useState<number[]>([])
  const [tripFromTime, setTripFromTime] = useState('')
  const [tripToTime, setTripToTime] = useState('')
  const [tripToleranceMin, setTripToleranceMin] = useState('10')
  const [tripStatus, setTripStatus] = useState<'searching' | 'resolved' | 'paused' | 'archived'>(
    'searching'
  )
  const [tripAcceptingNewChildren, setTripAcceptingNewChildren] = useState(true)
  const [savingTrip, setSavingTrip] = useState(false)
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null)
  const [updatingTripStatusId, setUpdatingTripStatusId] = useState<string | null>(null)

  const [showAllFromOptions, setShowAllFromOptions] = useState(false)
  const [showAllToOptions, setShowAllToOptions] = useState(false)
  const [savingSuggestion, setSavingSuggestion] = useState(false)

  const [creatingInlineField, setCreatingInlineField] = useState<PlaceField | null>(null)
  const [inlineDraftFrom, setInlineDraftFrom] = useState<NewSuggestionDraft>({
    name: '',
    city: '',
    exact_address: '',
    postal_code: '',
    kind: 'other',
    comment: 'Créé depuis le formulaire de trajet',
  })
  const [inlineDraftTo, setInlineDraftTo] = useState<NewSuggestionDraft>({
    name: '',
    city: '',
    exact_address: '',
    postal_code: '',
    kind: 'other',
    comment: 'Créé depuis le formulaire de trajet',
  })

  const [showInlineChildForm, setShowInlineChildForm] = useState(false)
  const [childFirstName, setChildFirstName] = useState('')
  const [childLevel, setChildLevel] = useState('')
  const [savingChild, setSavingChild] = useState(false)

  const [searchedFromPlaces, setSearchedFromPlaces] = useState<PlaceOption[]>([])
  const [searchedToPlaces, setSearchedToPlaces] = useState<PlaceOption[]>([])
  const [searchingFromPlaces, setSearchingFromPlaces] = useState(false)
  const [searchingToPlaces, setSearchingToPlaces] = useState(false)

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

  const tripGroups = useMemo<TripGroup[]>(() => {
    const groups = new Map<string, Trip[]>()

    for (const trip of trips) {
      const key = trip.trip_group_id
      const existing = groups.get(key) ?? []
      existing.push(trip)
      groups.set(key, existing)
    }

    return Array.from(groups.entries())
      .map(([tripGroupId, groupedTrips]) => {
        const sortedTrips = [...groupedTrips].sort((a, b) => a.day_of_week - b.day_of_week)
        const first = sortedTrips[0]

        return {
          trip_group_id: tripGroupId,
          family_id: first.family_id,
          child_id: first.child_id,
          from_place_id: first.from_place_id,
          to_place_id: first.to_place_id,
          from_place_suggestion_id: first.from_place_suggestion_id,
          to_place_suggestion_id: first.to_place_suggestion_id,
          day_of_week_values: sortedTrips.map((trip) => trip.day_of_week),
          from_time: first.from_time,
          to_time: first.to_time,
          tolerance_min: first.tolerance_min,
          accepting_new_children: first.accepting_new_children,
          revision: Math.max(...sortedTrips.map((trip) => trip.revision)),
          created_at: first.created_at,
          trips: sortedTrips,
        }
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
  }, [trips])

  const pendingSuggestions = useMemo(
    () => placeSuggestions.filter((item) => item.status === 'pending'),
    [placeSuggestions]
  )

  const validatedOptions = useMemo<PlaceOption[]>(
    () =>
      places.map((place) => ({
        source: 'place',
        id: place.id,
        name: place.name,
        city: place.city,
        exact_address: place.exact_address,
        kind: place.kind,
        label: `${place.name} (${place.city})`,
      })),
    [places]
  )

  const pendingOptions = useMemo<PlaceOption[]>(
    () =>
      pendingSuggestions.map((item) => ({
        source: 'suggestion',
        id: item.id,
        name: item.suggested_name,
        city: item.city,
        exact_address: item.exact_address,
        kind: item.kind,
        label: `${item.suggested_name} (${item.city})`,
      })),
    [pendingSuggestions]
  )

  const allOptions = useMemo<PlaceOption[]>(
    () => [...validatedOptions, ...pendingOptions],
    [validatedOptions, pendingOptions]
  )

  useEffect(() => {
    async function loadPage() {
      setError('')
      setSuccess('')

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      const { data: familyData, error: familyError } = await supabase
        .from('families')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()

      if (familyError || !familyData) {
        setError(familyError?.message || 'Famille introuvable.')
        setLoading(false)
        return
      }

      setFamily(familyData)

      const { data: childrenData, error: childrenError } = await supabase
        .from('children')
        .select('*')
        .eq('family_id', familyData.id)
        .order('created_at', { ascending: true })

      if (childrenError) {
        setError(childrenError.message)
        setLoading(false)
        return
      }

      const { data: placesData, error: placesError } = await supabase
        .from('places')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (placesError) {
        setError(placesError.message)
        setLoading(false)
        return
      }

      const { data: suggestionsData, error: suggestionsError } = await supabase
        .from('place_suggestions')
        .select('*')
        .in('status', ['pending', 'approved_new_place', 'mapped_to_existing_place'])
        .order('created_at', { ascending: false })

      if (suggestionsError) {
        setError(suggestionsError.message)
        setLoading(false)
        return
      }

      const { data: tripsData, error: tripsError } = await supabase
        .from('trips')
        .select(`
          id,
          family_id,
          child_id,
          from_place_id,
          to_place_id,
          from_place_suggestion_id,
          to_place_suggestion_id,
          day_of_week,
          from_time,
          to_time,
          tolerance_min,
          status,
          accepting_new_children,
          revision,
          created_at,
          trip_group_id
        `)
        .eq('family_id', familyData.id)
        .order('created_at', { ascending: false })
        .order('day_of_week', { ascending: true })

      if (tripsError) {
        setError(tripsError.message)
        setLoading(false)
        return
      }

      const safeChildren = childrenData ?? []

      setChildren(safeChildren)
      setPlaces(placesData ?? [])
      setPlaceSuggestions(suggestionsData ?? [])
      setTrips((tripsData ?? []) as Trip[])

      if (safeChildren.length > 0) {
        setTripChildId(safeChildren[0].id)
      }

      setLoading(false)
    }

    loadPage()
  }, [router])

  function filterPendingSuggestionOptions(query: string) {
    const q = normalizeText(query)

    if (!q) return pendingOptions

    return pendingOptions.filter((option) => {
      const haystack = normalizeText(`${option.name} ${option.city} ${option.exact_address || ''}`)
      return haystack.includes(q)
    })
  }

  async function fetchPlaceOptions(query: string): Promise<PlaceOption[]> {
    const trimmed = query.trim()

    if (trimmed.length < 2) return []

    try {
      const response = await fetch(`/api/places/search?query=${encodeURIComponent(trimmed)}`)

      if (!response.ok) {
        return []
      }

      const data: SearchPlaceApiRow[] = await response.json()

      return (data ?? []).map((place) => ({
        source: 'place' as const,
        id: place.id,
        name: place.name,
        city: place.city,
        exact_address: place.exact_address ?? null,
        kind: place.kind,
        label: `${place.name} (${place.city})`,
      }))
    } catch (err) {
      console.error('Place search failed', err)
      return []
    }
  }

  useEffect(() => {
    if (showAllFromOptions) {
      setSearchedFromPlaces([])
      setSearchingFromPlaces(false)
      return
    }

    const trimmed = tripFromQuery.trim()

    if (trimmed.length < 2) {
      setSearchedFromPlaces([])
      setSearchingFromPlaces(false)
      return
    }

    let cancelled = false
    setSearchingFromPlaces(true)

    const timer = setTimeout(async () => {
      const remotePlaces = await fetchPlaceOptions(trimmed)

      if (!cancelled) {
        setSearchedFromPlaces(remotePlaces)
        setSearchingFromPlaces(false)
      }
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [tripFromQuery, showAllFromOptions])

  useEffect(() => {
    if (showAllToOptions) {
      setSearchedToPlaces([])
      setSearchingToPlaces(false)
      return
    }

    const trimmed = tripToQuery.trim()

    if (trimmed.length < 2) {
      setSearchedToPlaces([])
      setSearchingToPlaces(false)
      return
    }

    let cancelled = false
    setSearchingToPlaces(true)

    const timer = setTimeout(async () => {
      const remotePlaces = await fetchPlaceOptions(trimmed)

      if (!cancelled) {
        setSearchedToPlaces(remotePlaces)
        setSearchingToPlaces(false)
      }
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [tripToQuery, showAllToOptions])

  const fromOptions = useMemo(() => {
    if (showAllFromOptions) return allOptions

    const pendingMatches = filterPendingSuggestionOptions(tripFromQuery)
    return dedupePlaceOptions([...searchedFromPlaces, ...pendingMatches]).slice(0, 8)
  }, [showAllFromOptions, allOptions, searchedFromPlaces, tripFromQuery, pendingOptions])

  const toOptions = useMemo(() => {
    if (showAllToOptions) return allOptions

    const pendingMatches = filterPendingSuggestionOptions(tripToQuery)
    return dedupePlaceOptions([...searchedToPlaces, ...pendingMatches]).slice(0, 8)
  }, [showAllToOptions, allOptions, searchedToPlaces, tripToQuery, pendingOptions])

  function resetTripForm() {
    setEditingTripGroupId(null)
    setTripSelectedDays([])
    setTripFromTime('')
    setTripToTime('')
    setTripToleranceMin('10')
    setTripStatus('searching')
    setTripAcceptingNewChildren(true)
    setTripFromPlaceId('')
    setTripToPlaceId('')
    setTripFromPlaceSuggestionId('')
    setTripToPlaceSuggestionId('')
    setTripFromQuery('')
    setTripToQuery('')
    setShowAllFromOptions(false)
    setShowAllToOptions(false)
    setCreatingInlineField(null)
    setShowInlineChildForm(false)
    setChildFirstName('')
    setChildLevel('')
    setSearchedFromPlaces([])
    setSearchedToPlaces([])
    setInlineDraftFrom({
      name: '',
      city: '',
      exact_address: '',
      postal_code: '',
      kind: 'other',
      comment: 'Créé depuis le formulaire de trajet',
    })
    setInlineDraftTo({
      name: '',
      city: '',
      exact_address: '',
      postal_code: '',
      kind: 'other',
      comment: 'Créé depuis le formulaire de trajet',
    })

    if (children.length > 0) {
      setTripChildId(children[0].id)
    } else {
      setTripChildId('')
    }
  }

  function formatTripStatus(status: Trip['status']) {
    if (status === 'searching') return 'Recherche'
    if (status === 'resolved') return 'Résolu'
    if (status === 'paused') return 'En pause'
    return 'Archivé'
  }

  function formatDayValues(dayValues: number[]) {
    return DAY_OPTIONS
      .filter((day) => dayValues.includes(day.value))
      .map((day) => day.label)
      .join(', ')
  }

  function formatSingleDay(dayValue: number) {
    return DAY_OPTIONS.find((day) => day.value === dayValue)?.label || `Jour ${dayValue}`
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

  function getTripGroupStatusSummary(group: TripGroup) {
    const statuses = Array.from(new Set(group.trips.map((trip) => trip.status)))

    if (statuses.length === 1) {
      const status = statuses[0]
      if (status === 'searching') {
        return { text: 'En recherche', bg: '#eff6ff', color: '#1d4ed8' }
      }
      if (status === 'resolved') {
        return { text: 'Entièrement résolu', bg: '#ecfdf3', color: '#027a48' }
      }
      if (status === 'paused') {
        return { text: 'En pause', bg: '#fffbeb', color: '#b54708' }
      }
      return { text: 'Archivé', bg: '#f3f4f6', color: '#374151' }
    }

    if (statuses.includes('searching') && statuses.includes('resolved')) {
      return { text: 'Partiellement résolu', bg: '#fffbeb', color: '#b54708' }
    }

    return { text: 'Statuts mixtes', bg: '#f3f4f6', color: '#374151' }
  }

  function getTripFormStatusMessage() {
    const hasChild = Boolean(tripChildId)
    const hasFrom = Boolean(tripFromPlaceId || tripFromPlaceSuggestionId)
    const hasTo = Boolean(tripToPlaceId || tripToPlaceSuggestionId)
    const hasDay = tripSelectedDays.length > 0
    const hasFromTime = Boolean(tripFromTime)

    if (!hasChild || !hasFrom || !hasTo || !hasDay || !hasFromTime) {
      return {
        bg: '#f9fafb',
        color: '#374151',
        text: 'Complétez le formulaire. Seuls les trajets complets avec le statut “Recherche” seront pris en compte.',
      }
    }

    if (tripFromPlaceSuggestionId || tripToPlaceSuggestionId) {
      return {
        bg: '#fffbeb',
        color: '#92400e',
        text:
          tripFromPlaceSuggestionId && tripToPlaceSuggestionId
            ? 'Les lieux de départ et d’arrivée sont en attente de validation. Ce trajet ne participera pas encore à la recherche.'
            : tripFromPlaceSuggestionId
              ? 'Le lieu de départ est en attente de validation. Ce trajet ne participera pas encore à la recherche.'
              : 'Le lieu d’arrivée est en attente de validation. Ce trajet ne participera pas encore à la recherche.',
      }
    }

    if (tripStatus !== 'searching') {
      return {
        bg: '#f3f4f6',
        color: '#374151',
        text: `Ce trajet sera enregistré avec le statut “${formatTripStatus(
          tripStatus
        )}”. Il ne participera pas à la recherche tant qu’il n’est pas repassé en “Recherche”.`,
      }
    }

    return {
      bg: '#ecfdf3',
      color: '#027a48',
      text: 'Ce trajet est prêt pour la recherche.',
    }
  }

  async function handleAddInlineChild() {
    setError('')
    setSuccess('')

    if (!family) {
      setError('Famille introuvable.')
      return
    }

    const firstNameTrimmed = childFirstName.trim()
    const levelTrimmed = childLevel.trim()

    if (!firstNameTrimmed) {
      setError('Le prénom de l’enfant est obligatoire.')
      return
    }

    setSavingChild(true)

    const { data, error } = await supabase
      .from('children')
      .insert({
        family_id: family.id,
        first_name: firstNameTrimmed,
        level: levelTrimmed || null,
      })
      .select()
      .single()

    setSavingChild(false)

    if (error) {
      setError(error.message)
      return
    }

    setChildren((prev) => [...prev, data])
    setTripChildId(data.id)
    setChildFirstName('')
    setChildLevel('')
    setShowInlineChildForm(false)
    setSuccess('Enfant ajouté et sélectionné.')
  }

  function openInlineCreate(field: PlaceField) {
    setCreatingInlineField(field)

    if (field === 'from') {
      setInlineDraftFrom((prev) => ({
        ...prev,
        name: tripFromQuery.trim(),
      }))
    } else {
      setInlineDraftTo((prev) => ({
        ...prev,
        name: tripToQuery.trim(),
      }))
    }
  }

  async function saveInlineSuggestion(field: PlaceField) {
    if (!family) {
      setError('Famille introuvable.')
      return
    }

    const draft = field === 'from' ? inlineDraftFrom : inlineDraftTo

    if (!draft.name.trim() || !draft.city.trim()) {
      setError('Le nom du lieu et la ville sont obligatoires.')
      return
    }

    setSavingSuggestion(true)

    const { data, error } = await supabase
      .from('place_suggestions')
      .insert({
        family_id: family.id,
        suggested_name: draft.name.trim(),
        kind: draft.kind,
        city: draft.city.trim(),
        exact_address: draft.exact_address.trim() || null,
        postal_code: draft.postal_code.trim() || null,
        comment: draft.comment.trim() || null,
      })
      .select()
      .single()

    setSavingSuggestion(false)

    if (error) {
      setError(error.message)
      return
    }

    setPlaceSuggestions((prev) => [data, ...prev])

    if (field === 'from') {
      setTripFromPlaceId('')
      setTripFromPlaceSuggestionId(data.id)
      setTripFromQuery(`${data.suggested_name} (suggestion en attente)`)
    } else {
      setTripToPlaceId('')
      setTripToPlaceSuggestionId(data.id)
      setTripToQuery(`${data.suggested_name} (suggestion en attente)`)
    }

    setCreatingInlineField(null)
    setSuccess(
      'Lieu proposé et attaché au trajet. Il devra être validé par l’administrateur avant d’être pris en compte dans la recherche.'
    )
  }

  function selectOption(field: PlaceField, option: PlaceOption) {
    if (field === 'from') {
      if (option.source === 'place') {
        setTripFromPlaceId(option.id)
        setTripFromPlaceSuggestionId('')
      } else {
        setTripFromPlaceId('')
        setTripFromPlaceSuggestionId(option.id)
      }
      setTripFromQuery(
        option.source === 'place'
          ? `${option.name} (${option.city})`
          : `${option.name} (suggestion en attente)`
      )
      setShowAllFromOptions(false)
    } else {
      if (option.source === 'place') {
        setTripToPlaceId(option.id)
        setTripToPlaceSuggestionId('')
      } else {
        setTripToPlaceId('')
        setTripToPlaceSuggestionId(option.id)
      }
      setTripToQuery(
        option.source === 'place'
          ? `${option.name} (${option.city})`
          : `${option.name} (suggestion en attente)`
      )
      setShowAllToOptions(false)
    }
  }

  function toggleTripDay(dayValue: number) {
    setTripSelectedDays((prev) =>
      prev.includes(dayValue) ? prev.filter((value) => value !== dayValue) : [...prev, dayValue]
    )
  }

  async function handleSaveTrip(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!family) {
      setError('Famille introuvable.')
      return
    }

    if (!tripChildId) {
      setError('Choisissez un enfant.')
      return
    }

    const hasFrom = Boolean(tripFromPlaceId || tripFromPlaceSuggestionId)
    const hasTo = Boolean(tripToPlaceId || tripToPlaceSuggestionId)

    if (!hasFrom || !hasTo) {
      setError('Choisissez un lieu de départ et un lieu d’arrivée.')
      return
    }

    if (tripFromPlaceId && tripToPlaceId && tripFromPlaceId === tripToPlaceId) {
      setError('Le lieu de départ et le lieu d’arrivée doivent être différents.')
      return
    }

    if (
      tripFromPlaceSuggestionId &&
      tripToPlaceSuggestionId &&
      tripFromPlaceSuggestionId === tripToPlaceSuggestionId
    ) {
      setError('Le lieu de départ et le lieu d’arrivée doivent être différents.')
      return
    }

    if (tripSelectedDays.length === 0) {
      setError('Choisissez au moins un jour.')
      return
    }

    if (!tripFromTime) {
      setError('L’heure de départ est obligatoire.')
      return
    }

    const tolerance = Number(tripToleranceMin)

    if (Number.isNaN(tolerance) || tolerance < 0 || tolerance > 180) {
      setError('La tolérance doit être comprise entre 0 et 180 minutes.')
      return
    }

    setSavingTrip(true)

    if (editingTripGroupId) {
      const currentGroupTrips = trips.filter((trip) => trip.trip_group_id === editingTripGroupId)
      const currentTripsByDay = new Map(currentGroupTrips.map((trip) => [trip.day_of_week, trip]))
      const nextRevision =
        currentGroupTrips.length > 0
          ? Math.max(...currentGroupTrips.map((trip) => trip.revision)) + 1
          : 1

      const { error: deleteError } = await supabase
        .from('trips')
        .delete()
        .eq('trip_group_id', editingTripGroupId)

      if (deleteError) {
        setSavingTrip(false)
        setError(deleteError.message)
        return
      }

      const rowsToInsert = tripSelectedDays.map((dayOfWeek) => ({
        family_id: family.id,
        child_id: tripChildId,
        from_place_id: tripFromPlaceId || null,
        to_place_id: tripToPlaceId || null,
        from_place_suggestion_id: tripFromPlaceSuggestionId || null,
        to_place_suggestion_id: tripToPlaceSuggestionId || null,
        day_of_week: dayOfWeek,
        from_time: tripFromTime,
        to_time: tripToTime || null,
        tolerance_min: tolerance,
        status: currentTripsByDay.get(dayOfWeek)?.status ?? tripStatus,
        accepting_new_children: tripAcceptingNewChildren,
        revision: nextRevision,
        trip_group_id: editingTripGroupId,
      }))

      const { data, error } = await supabase.from('trips').insert(rowsToInsert).select()

      setSavingTrip(false)

      if (error) {
        setError(error.message)
        return
      }

      setTrips((prev) => {
        const remaining = prev.filter((trip) => trip.trip_group_id !== editingTripGroupId)
        return [...((data ?? []) as Trip[]), ...remaining]
      })

      setSuccess('Trajet modifié.')
      resetTripForm()
      return
    }

    const tripGroupId = crypto.randomUUID()

    const rowsToInsert = tripSelectedDays.map((dayOfWeek) => ({
      family_id: family.id,
      child_id: tripChildId,
      from_place_id: tripFromPlaceId || null,
      to_place_id: tripToPlaceId || null,
      from_place_suggestion_id: tripFromPlaceSuggestionId || null,
      to_place_suggestion_id: tripToPlaceSuggestionId || null,
      day_of_week: dayOfWeek,
      from_time: tripFromTime,
      to_time: tripToTime || null,
      tolerance_min: tolerance,
      status: tripStatus,
      accepting_new_children: tripAcceptingNewChildren,
      trip_group_id: tripGroupId,
    }))

    const { data, error } = await supabase.from('trips').insert(rowsToInsert).select()

    setSavingTrip(false)

    if (error) {
      setError(error.message)
      return
    }

    setTrips((prev) => [...((data ?? []) as Trip[]), ...prev])
    setSuccess('Trajet ajouté.')
    resetTripForm()
  }

  function startEditTrip(group: TripGroup) {
    setEditingTripGroupId(group.trip_group_id)
    setTripChildId(group.child_id)
    setTripFromPlaceId(group.from_place_id || '')
    setTripToPlaceId(group.to_place_id || '')
    setTripFromPlaceSuggestionId(group.from_place_suggestion_id || '')
    setTripToPlaceSuggestionId(group.to_place_suggestion_id || '')
    setTripSelectedDays(group.day_of_week_values)
    setTripFromTime(group.from_time)
    setTripToTime(group.to_time || '')
    setTripToleranceMin(String(group.tolerance_min))
    setTripAcceptingNewChildren(group.accepting_new_children)

    const uniqueStatuses = Array.from(new Set(group.trips.map((trip) => trip.status)))
    setTripStatus(uniqueStatuses[0] ?? 'searching')

    const fromPlace = group.from_place_id ? placeMap[group.from_place_id] : null
    const toPlace = group.to_place_id ? placeMap[group.to_place_id] : null
    const fromSuggestion = group.from_place_suggestion_id
      ? suggestionMap[group.from_place_suggestion_id]
      : null
    const toSuggestion = group.to_place_suggestion_id
      ? suggestionMap[group.to_place_suggestion_id]
      : null

    setTripFromQuery(
      fromPlace
        ? `${fromPlace.name} (${fromPlace.city})`
        : fromSuggestion
          ? `${fromSuggestion.suggested_name} (suggestion en attente)`
          : ''
    )

    setTripToQuery(
      toPlace
        ? `${toPlace.name} (${toPlace.city})`
        : toSuggestion
          ? `${toSuggestion.suggested_name} (suggestion en attente)`
          : ''
    )

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleDeleteTrip(tripGroupId: string) {
    setError('')
    setSuccess('')
    setDeletingTripId(tripGroupId)

    const { error } = await supabase.from('trips').delete().eq('trip_group_id', tripGroupId)

    setDeletingTripId(null)

    if (error) {
      setError(error.message)
      return
    }

    setTrips((prev) => prev.filter((trip) => trip.trip_group_id !== tripGroupId))

    if (editingTripGroupId === tripGroupId) {
      resetTripForm()
    }

    setSuccess('Trajet supprimé.')
  }

  async function handleUpdateTripStatus(tripId: string, nextStatus: Trip['status']) {
    setError('')
    setSuccess('')
    setUpdatingTripStatusId(tripId)

    const { error } = await supabase.from('trips').update({ status: nextStatus }).eq('id', tripId)

    setUpdatingTripStatusId(null)

    if (error) {
      setError(error.message)
      return
    }

    setTrips((prev) =>
      prev.map((trip) => (trip.id === tripId ? { ...trip, status: nextStatus } : trip))
    )
    setSuccess(`Statut du trajet mis à jour : ${formatTripStatus(nextStatus)}.`)
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

  const selectedFromText =
    tripFromPlaceId || tripFromPlaceSuggestionId
      ? placeLabel(tripFromPlaceId || null, tripFromPlaceSuggestionId || null)
      : ''

  const selectedToText =
    tripToPlaceId || tripToPlaceSuggestionId
      ? placeLabel(tripToPlaceId || null, tripToPlaceSuggestionId || null)
      : ''

  const tripFormStatus = getTripFormStatusMessage()

  const searchingGroups = tripGroups.filter((group) =>
    group.trips.every((trip) => trip.status === 'searching')
  )
  const resolvedGroups = tripGroups.filter((group) =>
    group.trips.every((trip) => trip.status === 'resolved')
  )
  const pausedGroups = tripGroups.filter((group) =>
    group.trips.every((trip) => trip.status === 'paused')
  )
  const archivedGroups = tripGroups.filter((group) =>
    group.trips.every((trip) => trip.status === 'archived')
  )
  const mixedGroups = tripGroups.filter((group) => {
    const statuses = Array.from(new Set(group.trips.map((trip) => trip.status)))
    return statuses.length > 1
  })

  function GroupList({
    title,
    groups,
    openByDefault,
  }: {
    title: string
    groups: TripGroup[]
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
              const child = childMap[group.child_id]
              const summary = getTripGroupStatusSummary(group)

              return (
                <div key={group.trip_group_id} className={styles.itemCard}>
                  <div className={styles.itemHeader}>
                    <div>
                      <h3 className={styles.itemTitle}>{child?.first_name || 'Enfant inconnu'}</h3>
                      <p className={styles.itemMeta}>
                        {placeLabel(group.from_place_id, group.from_place_suggestion_id)} →{' '}
                        {placeLabel(group.to_place_id, group.to_place_suggestion_id)}
                      </p>
                    </div>

                    <span
                      className={styles.badge}
                      style={{ background: summary.bg, color: summary.color }}
                    >
                      {summary.text}
                    </span>
                  </div>

                  <div className={styles.itemBody}>
                    <p>Jours : {formatDayValues(group.day_of_week_values)}</p>
                    <p>
                      Horaires : {group.from_time}
                      {group.to_time ? ` → ${group.to_time}` : ''}
                    </p>
                    <p>Tolérance : {group.tolerance_min} min</p>
                    <p>Accepte de nouveaux enfants : {group.accepting_new_children ? 'Oui' : 'Non'}</p>
                  </div>

                  <div className={styles.itemList}>
                    {group.trips.map((trip) => {
                      const ready = isTripReadyForMatching(trip)
                      const blockingReason = getTripBlockingReason(trip)

                      return (
                        <div key={trip.id} className={styles.itemCard} style={{ padding: 14 }}>
                          <div className={styles.itemHeader}>
                            <div>
                              <h4 className={styles.itemTitle} style={{ fontSize: 18 }}>
                                {formatSingleDay(trip.day_of_week)}
                              </h4>
                              <p className={styles.itemMeta}>
                                Départ : {formatHour(trip.from_time)}
                                {trip.to_time ? ` | Arrivée : ${formatHour(trip.to_time)}` : ''}
                              </p>
                            </div>

                            <select
                              className={styles.select}
                              style={{ maxWidth: 180 }}
                              value={trip.status}
                              onChange={(e) =>
                                handleUpdateTripStatus(trip.id, e.target.value as Trip['status'])
                              }
                              disabled={updatingTripStatusId === trip.id}
                            >
                              <option value="searching">Recherche</option>
                              <option value="resolved">Résolu</option>
                              <option value="paused">En pause</option>
                              <option value="archived">Archivé</option>
                            </select>
                          </div>

                          <div
                            style={{
                              padding: 10,
                              borderRadius: 12,
                              background: ready ? '#ecfdf3' : '#fffbeb',
                              color: ready ? '#027a48' : '#92400e',
                              fontSize: 14,
                            }}
                          >
                            {ready
                              ? 'Pris en compte dans la recherche.'
                              : `${blockingReason} Non pris en compte dans la recherche.`}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className={styles.itemActions}>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => startEditTrip(group)}
                    >
                      Modifier
                    </button>

                    <button
                      type="button"
                      className={styles.dangerButton}
                      onClick={() => handleDeleteTrip(group.trip_group_id)}
                      disabled={deletingTripId === group.trip_group_id}
                    >
                      {deletingTripId === group.trip_group_id ? 'Suppression...' : 'Supprimer'}
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
                <p className={styles.pageIntro}>Ajoutez et modifiez vos trajets.</p>
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

            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>
                    {editingTripGroupId ? 'Modifier un trajet' : 'Ajouter un trajet'}
                  </h2>
                  <p className={styles.sectionText}>
                    Complétez les informations ci-dessous. Privilégiez les lieux déjà disponibles.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveTrip} className={styles.form}>
                <div className={styles.itemCard} style={{ padding: 18 }}>
                  <h3 className={styles.itemTitle}>Enfant</h3>

                  <div className={styles.field}>
                    <label htmlFor="tripChild">Choisir un enfant</label>
                    <select
                      id="tripChild"
                      className={styles.select}
                      value={tripChildId}
                      onChange={(e) => setTripChildId(e.target.value)}
                      required
                    >
                      <option value="">Choisir un enfant</option>
                      {children.map((child) => (
                        <option key={child.id} value={child.id}>
                          {child.first_name}
                          {child.level ? ` (${child.level})` : ''}
                        </option>
                      ))}
                    </select>

                    <div className={styles.itemActions}>
                      <button
                        type="button"
                        className={styles.inlineButton}
                        onClick={() => setShowInlineChildForm((prev) => !prev)}
                      >
                        {showInlineChildForm ? 'Masquer le formulaire enfant' : 'Ajouter un enfant'}
                      </button>
                    </div>
                  </div>

                  {showInlineChildForm ? (
                    <div className={styles.itemCard} style={{ padding: 14, marginTop: 12 }}>
                      <div className={styles.fieldRow}>
                        <div className={styles.field}>
                          <label>Prénom</label>
                          <input
                            className={styles.input}
                            type="text"
                            value={childFirstName}
                            onChange={(e) => setChildFirstName(e.target.value)}
                          />
                        </div>

                        <div className={styles.field}>
                          <label>Niveau / classe</label>
                          <input
                            className={styles.input}
                            type="text"
                            value={childLevel}
                            onChange={(e) => setChildLevel(e.target.value)}
                            placeholder="Ex : CE2, 6e, CM1..."
                          />
                        </div>
                      </div>

                      <div className={styles.itemActions}>
                        <button
                          type="button"
                          className={styles.primaryButton}
                          onClick={handleAddInlineChild}
                          disabled={savingChild}
                        >
                          {savingChild ? 'Ajout...' : 'Ajouter cet enfant'}
                        </button>
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          onClick={() => setShowInlineChildForm(false)}
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className={styles.itemCard} style={{ padding: 18 }}>
                  <h3 className={styles.itemTitle}>Lieu de départ</h3>

                  <PlaceSelector
                    label="Lieu de départ"
                    query={tripFromQuery}
                    onQueryChange={(value) => {
                      setTripFromQuery(value)
                      setTripFromPlaceId('')
                      setTripFromPlaceSuggestionId('')
                    }}
                    selectedText={selectedFromText}
                    options={fromOptions}
                    showAll={showAllFromOptions}
                    onToggleShowAll={() => setShowAllFromOptions((prev) => !prev)}
                    onSelectOption={(option) => selectOption('from', option)}
                    onOpenCreateInline={() => openInlineCreate('from')}
                    loading={searchingFromPlaces}
                  />

                  {creatingInlineField === 'from' ? (
                    <div style={{ marginTop: 12 }}>
                      <NewPlaceInlineForm
                        title="Nouveau lieu de départ"
                        draft={inlineDraftFrom}
                        onChange={(patch) =>
                          setInlineDraftFrom((prev) => ({
                            ...prev,
                            ...patch,
                          }))
                        }
                        onSave={() => saveInlineSuggestion('from')}
                        onCancel={() => setCreatingInlineField(null)}
                        saving={savingSuggestion}
                      />
                    </div>
                  ) : null}
                </div>

                <div className={styles.itemCard} style={{ padding: 18 }}>
                  <h3 className={styles.itemTitle}>Lieu d’arrivée</h3>

                  <PlaceSelector
                    label="Lieu d’arrivée"
                    query={tripToQuery}
                    onQueryChange={(value) => {
                      setTripToQuery(value)
                      setTripToPlaceId('')
                      setTripToPlaceSuggestionId('')
                    }}
                    selectedText={selectedToText}
                    options={toOptions}
                    showAll={showAllToOptions}
                    onToggleShowAll={() => setShowAllToOptions((prev) => !prev)}
                    onSelectOption={(option) => selectOption('to', option)}
                    onOpenCreateInline={() => openInlineCreate('to')}
                    loading={searchingToPlaces}
                  />

                  {creatingInlineField === 'to' ? (
                    <div style={{ marginTop: 12 }}>
                      <NewPlaceInlineForm
                        title="Nouveau lieu d’arrivée"
                        draft={inlineDraftTo}
                        onChange={(patch) =>
                          setInlineDraftTo((prev) => ({
                            ...prev,
                            ...patch,
                          }))
                        }
                        onSave={() => saveInlineSuggestion('to')}
                        onCancel={() => setCreatingInlineField(null)}
                        saving={savingSuggestion}
                      />
                    </div>
                  ) : null}
                </div>

                <div className={styles.itemCard} style={{ padding: 18 }}>
                  <h3 className={styles.itemTitle}>Horaires et paramètres</h3>

                  <div className={styles.field}>
                    <label>Jours</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {DAY_OPTIONS.map((day) => (
                        <label
                          key={day.value}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            border: '1px solid #dbe8f5',
                            borderRadius: 12,
                            padding: '8px 12px',
                            background: '#f8fbff',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={tripSelectedDays.includes(day.value)}
                            onChange={() => toggleTripDay(day.value)}
                          />
                          <span>{day.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className={styles.fieldRow}>
                    <div className={styles.field}>
                      <label>Heure de départ</label>
                      <input
                        className={styles.input}
                        type="time"
                        value={tripFromTime}
                        onChange={(e) => setTripFromTime(e.target.value)}
                        required
                      />
                    </div>

                    <div className={styles.field}>
                      <label>Heure d’arrivée (optionnel)</label>
                      <input
                        className={styles.input}
                        type="time"
                        value={tripToTime}
                        onChange={(e) => setTripToTime(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className={styles.fieldRow}>
                    <div className={styles.field}>
                      <label>Tolérance (minutes)</label>
                      <input
                        className={styles.input}
                        type="number"
                        min={0}
                        max={180}
                        value={tripToleranceMin}
                        onChange={(e) => setTripToleranceMin(e.target.value)}
                        required
                      />
                    </div>

                    <div className={styles.field}>
                      <label>
                        Statut par défaut {editingTripGroupId ? '(pour les nouveaux jours ajoutés)' : ''}
                      </label>
                      <select
                        className={styles.select}
                        value={tripStatus}
                        onChange={(e) => setTripStatus(e.target.value as Trip['status'])}
                      >
                        <option value="searching">Recherche</option>
                        <option value="resolved">Résolu</option>
                        <option value="paused">En pause</option>
                        <option value="archived">Archivé</option>
                      </select>
                    </div>
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={tripAcceptingNewChildren}
                      onChange={(e) => setTripAcceptingNewChildren(e.target.checked)}
                    />
                    <span>Accepte de nouveaux enfants</span>
                  </label>
                </div>

                <div
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    background: tripFormStatus.bg,
                    color: tripFormStatus.color,
                    fontSize: 14,
                  }}
                >
                  {tripFormStatus.text}
                </div>

                <div className={styles.itemActions}>
                  <button
                    type="submit"
                    className={styles.primaryButton}
                    disabled={savingTrip || children.length === 0}
                  >
                    {savingTrip
                      ? editingTripGroupId
                        ? 'Enregistrement...'
                        : 'Ajout...'
                      : editingTripGroupId
                        ? 'Enregistrer les modifications'
                        : 'Ajouter un trajet'}
                  </button>

                  {editingTripGroupId ? (
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={resetTripForm}
                    >
                      Annuler la modification
                    </button>
                  ) : null}
                </div>
              </form>
            </div>

            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>Mes trajets</h2>
                  <p className={styles.sectionText}>
                    Les trajets sont regroupés par statut. Les trajets en recherche sont affichés en
                    premier.
                  </p>
                </div>
              </div>

              <div className={styles.accordionGroup}>
                <GroupList title="Trajets en recherche" groups={searchingGroups} openByDefault />
                <GroupList title="Trajets résolus" groups={resolvedGroups} />
                <GroupList title="Trajets en pause" groups={pausedGroups} />
                <GroupList title="Trajets archivés" groups={archivedGroups} />
                <GroupList title="Trajets à statuts mixtes" groups={mixedGroups} />
              </div>
            </div>

            <div className={styles.itemActions}>
              <Link href="/" className={styles.secondaryButton}>
                Accueil
              </Link>            </div>

            {error ? <p className={styles.errorMessage}>{error}</p> : null}
            {success ? <p className={styles.successMessage}>{success}</p> : null}
            <p className={styles.smallMuted} style={{ fontStyle: 'italic', marginTop: 8 }}>
              Pendant le délai de priorité ({getPriorityDelayText()}), vous ne pouvez pas envoyer une nouvelle demande pour ce même trajet.
            </p>
          </div>
        </section>
      </main>
    </>
  )
}