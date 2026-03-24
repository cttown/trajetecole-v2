import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'

import styles from '../../styles/Dashboard.module.css'

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

type FamilyTripMatch = {
  requester_trip_id: string
  requester_trip_group_id: string
  requester_child_first_name: string | null
  requester_from_label: string
  requester_to_label: string
  requester_from_time: string
  requester_to_time: string | null
  target_trip_id: string
  target_trip_group_id: string
  target_from_time: string
  target_to_time: string | null
  day_of_week: number
  time_diff_min: number
  allowed_diff_min: number
  time_fit_score: number
  target_accepting_new_children: boolean
}

type FamilyMatch = {
  target_family_id: string
  target_parent_first_name: string | null
  target_parent_last_name: string | null
  target_email: string | null
  compatibility_score: number
  trip_compatibility_score: number
  history_score_normalized: number
  availability_score: number
  coverage_ratio: number
  average_time_fit_score: number
  accepting_ratio: number
  history_status:
    | 'none_yet'
    | 'pending'
    | 'accepted'
    | 'declined_before'
    | 'expired_before'
    | 'closed_before'
    | 'cancelled_before'
    | 'closed_with_agreement'
    | 'closed_no_agreement'
  history_label: string
  history_request_id: string | null
  history_created_at: string | null
  history_contact_email: string | null
  badge_label: string
  badge_tone: 'green' | 'yellow' | 'red'
  matched_trip_count: number
  matched_requester_trip_count: number
  covered_day_of_week_values: number[]
  trip_matches: FamilyTripMatch[]
}

type TripSummary = {
  id: string
  day_of_week: number
  from_time: string
  to_time: string | null
  trip_group_id: string
  child: {
    first_name: string
  } | null
  from_place: {
    name: string
    city: string
  } | null
  to_place: {
    name: string
    city: string
  } | null
  from_suggestion: {
    suggested_name: string
    city: string
  } | null
  to_suggestion: {
    suggested_name: string
    city: string
  } | null
}

type ContactRequestTripLink = {
  id: string
  contact_request_id: string
  requester_trip_id: string
  target_trip_id: string
  created_at: string
  requester_trip: TripSummary | null
  target_trip: TripSummary | null
}

type ContactRequestListItem = {
  id: string
  requester_family_id: string
  target_family_id: string
  status:
    | 'pending'
    | 'accepted'
    | 'declined'
    | 'expired'
    | 'cancelled'
    | 'closed_no_agreement'
    | 'closed_with_agreement'
  request_message: string | null
  created_at: string
  expires_at: string
  responded_at: string | null
  accepted_at: string | null
  closed_at: string | null
  close_reason: string | null
  other_family: {
    id: string
    parent_first_name: string | null
    parent_last_name: string | null
    email: string
  } | null
  trip_links: ContactRequestTripLink[]
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

const DAY_OPTIONS = [
  { label: 'Lun', value: 1 },
  { label: 'Mar', value: 2 },
  { label: 'Mer', value: 3 },
  { label: 'Jeu', value: 4 },
  { label: 'Ven', value: 5 },
  { label: 'Sam', value: 6 },
  { label: 'Dim', value: 7 },
]

function isTripReadyForMatching(trip: Trip): boolean {
  return (
    trip.status === 'searching' &&
    !!trip.from_place_id &&
    !!trip.to_place_id &&
    !trip.from_place_suggestion_id &&
    !trip.to_place_suggestion_id
  )
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
}) {
  const shouldShowOptions = showAll || query.trim().length >= 2

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <span>{label}</span>

      <input
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Tape au moins 2 caractères"
        required
      />

      {selectedText ? (
        <p style={{ margin: 0, fontSize: 14 }}>
          Sélection actuelle : {selectedText}
        </p>
      ) : null}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={onToggleShowAll}>
          {showAll ? 'Masquer la liste complète' : 'Voir tous les lieux disponibles'}
        </button>

        <button type="button" onClick={onOpenCreateInline}>
          Ajouter un nouveau lieu
        </button>
      </div>

      {shouldShowOptions ? (
        <div
          style={{
            border: '1px solid #ddd',
            borderRadius: 8,
            padding: 8,
            display: 'grid',
            gap: 8,
            maxHeight: 260,
            overflowY: 'auto',
          }}
        >
          {options.length > 0 ? (
            options.map((option) => (
              <button
                key={`${option.source}-${option.id}`}
                type="button"
                onClick={() => onSelectOption(option)}
                style={{
                  textAlign: 'left',
                  border: '1px solid #eee',
                  borderRadius: 6,
                  padding: 10,
                  background: 'white',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <strong>{option.name}</strong>
                  {option.source === 'suggestion' ? ' (suggestion en attente)' : ''}
                </div>
                <div style={{ fontSize: 14 }}>
                  {option.city} — {option.exact_address || 'Adresse non renseignée'}
                </div>
              </button>
            ))
          ) : (
            <p style={{ margin: 0 }}>
              Aucun lieu trouvé. Tu peux ajouter un nouveau lieu.
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
    <div
      style={{
        border: '1px solid #ddd',
        borderRadius: 8,
        padding: 12,
        display: 'grid',
        gap: 10,
      }}
    >
      <h3 style={{ margin: 0 }}>{title}</h3>

      <label style={{ display: 'grid', gap: 6 }}>
        <span>Nom du lieu</span>
        <input
          type="text"
          value={draft.name}
          onChange={(e) => onChange({ name: e.target.value })}
          required
        />
      </label>

      <label style={{ display: 'grid', gap: 6 }}>
        <span>Ville</span>
        <input
          type="text"
          value={draft.city}
          onChange={(e) => onChange({ city: e.target.value })}
          required
        />
      </label>

      <label style={{ display: 'grid', gap: 6 }}>
        <span>Adresse exacte</span>
        <input
          type="text"
          value={draft.exact_address}
          onChange={(e) => onChange({ exact_address: e.target.value })}
        />
      </label>

      <label style={{ display: 'grid', gap: 6 }}>
        <span>Code postal</span>
        <input
          type="text"
          value={draft.postal_code}
          onChange={(e) => onChange({ postal_code: e.target.value })}
        />
      </label>

      <label style={{ display: 'grid', gap: 6 }}>
        <span>Type</span>
        <select
          value={draft.kind}
          onChange={(e) =>
            onChange({ kind: e.target.value as 'school' | 'activity' | 'other' })
          }
        >
          <option value="school">École</option>
          <option value="activity">Activité</option>
          <option value="other">Autre</option>
        </select>
      </label>

      <label style={{ display: 'grid', gap: 6 }}>
        <span>Commentaire</span>
        <textarea
          value={draft.comment}
          onChange={(e) => onChange({ comment: e.target.value })}
          rows={3}
        />
      </label>

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={onSave} disabled={saving}>
          {saving ? 'Création...' : 'Créer et utiliser ce lieu'}
        </button>
        <button type="button" onClick={onCancel}>
          Annuler
        </button>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()

  const [family, setFamily] = useState<Family | null>(null)
  const [children, setChildren] = useState<Child[]>([])
  const [places, setPlaces] = useState<Place[]>([])
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>([])
  const [trips, setTrips] = useState<Trip[]>([])

  const [familyMatches, setFamilyMatches] = useState<FamilyMatch[]>([])
  const [loadingMatching, setLoadingMatching] = useState(false)
  const [matchingHasRun, setMatchingHasRun] = useState(false)
  const [showMatchingReview, setShowMatchingReview] = useState(false)

  const [sentRequests, setSentRequests] = useState<ContactRequestListItem[]>([])
  const [receivedRequests, setReceivedRequests] = useState<ContactRequestListItem[]>([])
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [respondingRequestId, setRespondingRequestId] = useState<string | null>(null)
  const [closingRequestId, setClosingRequestId] = useState<string | null>(null)
  const [cancellingRequestId, setCancellingRequestId] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [parentFirstName, setParentFirstName] = useState('')
  const [parentLastName, setParentLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  const [childFirstName, setChildFirstName] = useState('')
  const [childLevel, setChildLevel] = useState('')
  const [savingChild, setSavingChild] = useState(false)
  const [deletingChildId, setDeletingChildId] = useState<string | null>(null)

  const [suggestedName, setSuggestedName] = useState('')
  const [suggestedKind, setSuggestedKind] = useState<'school' | 'activity' | 'other'>('school')
  const [suggestedCity, setSuggestedCity] = useState('')
  const [suggestedExactAddress, setSuggestedExactAddress] = useState('')
  const [suggestedPostalCode, setSuggestedPostalCode] = useState('')
  const [suggestedComment, setSuggestedComment] = useState('')
  const [savingSuggestion, setSavingSuggestion] = useState(false)

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
  const [tripStatus, setTripStatus] = useState<'searching' | 'resolved' | 'paused' | 'archived'>('searching')
  const [tripAcceptingNewChildren, setTripAcceptingNewChildren] = useState(true)
  const [savingTrip, setSavingTrip] = useState(false)
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null)
  const [updatingTripStatusId, setUpdatingTripStatusId] = useState<string | null>(null)

  const [showAllFromOptions, setShowAllFromOptions] = useState(false)
  const [showAllToOptions, setShowAllToOptions] = useState(false)

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

  const allOptions = useMemo<PlaceOption[]>(() => {
    const validated: PlaceOption[] = places.map((place) => ({
      source: 'place',
      id: place.id,
      name: place.name,
      city: place.city,
      exact_address: place.exact_address,
      kind: place.kind,
      label: `${place.name} (${place.city})`,
    }))

    const pending: PlaceOption[] = pendingSuggestions.map((item) => ({
      source: 'suggestion',
      id: item.id,
      name: item.suggested_name,
      city: item.city,
      exact_address: item.exact_address,
      kind: item.kind,
      label: `${item.suggested_name} (${item.city})`,
    }))

    return [...validated, ...pending]
  }, [places, pendingSuggestions])

  const matchingReviewItems = useMemo(() => {
    return trips
      .slice()
      .sort((a, b) => {
        if (a.created_at !== b.created_at) {
          return b.created_at.localeCompare(a.created_at)
        }
        return a.day_of_week - b.day_of_week
      })
      .map((trip) => ({
        trip,
        included: isTripReadyForMatching(trip),
        reason: isTripReadyForMatching(trip)
          ? 'Pris en compte dans la recherche.'
          : getTripBlockingReason(trip) || 'Non pris en compte.',
      }))
  }, [trips])

  const includedMatchingTrips = matchingReviewItems.filter((item) => item.included)
  const excludedMatchingTrips = matchingReviewItems.filter((item) => !item.included)

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
      setParentFirstName(familyData.parent_first_name ?? '')
      setParentLastName(familyData.parent_last_name ?? '')
      setPhone(familyData.phone ?? '')

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

      await loadContactRequests()
      setLoading(false)
    }

    loadPage()
  }, [router])

  function filterOptions(query: string) {
    const q = query.trim().toLowerCase()
    if (!q) return allOptions

    return allOptions.filter((option) => {
      const haystack = `${option.name} ${option.city} ${option.exact_address || ''}`.toLowerCase()
      return haystack.includes(q)
    })
  }

  const fromOptions = useMemo(() => {
    if (showAllFromOptions) return allOptions
    return filterOptions(tripFromQuery).slice(0, 8)
  }, [tripFromQuery, showAllFromOptions, allOptions])

  const toOptions = useMemo(() => {
    if (showAllToOptions) return allOptions
    return filterOptions(tripToQuery).slice(0, 8)
  }, [tripToQuery, showAllToOptions, allOptions])

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

  function formatKind(kind: Place['kind'] | PlaceSuggestion['kind']) {
    if (kind === 'school') return 'École'
    if (kind === 'activity') return 'Activité'
    return 'Autre'
  }

  function formatSuggestionStatus(status: PlaceSuggestion['status']) {
    if (status === 'pending') return 'En attente'
    if (status === 'approved_new_place') return 'Validée comme nouveau lieu'
    if (status === 'mapped_to_existing_place') return 'Associée à un lieu existant'
    return 'Rejetée'
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

  function formatPercent(value: number) {
    return `${Math.round(value * 100)}%`
  }

  function formatParentName(match: FamilyMatch) {
    const first = match.target_parent_first_name?.trim() || ''
    const last = match.target_parent_last_name?.trim() || ''
    const full = `${first} ${last}`.trim()
    return full || 'Famille compatible'
  }

  function formatRequestStatus(status: ContactRequestListItem['status']) {
    if (status === 'pending') return 'En attente'
    if (status === 'accepted') return 'Acceptée'
    if (status === 'declined') return 'Refusée'
    if (status === 'expired') return 'Expirée'
    if (status === 'cancelled') return 'Annulée'
    if (status === 'closed_with_agreement') return 'Accord trouvé'
    if (status === 'closed_no_agreement') return 'Pas d’accord trouvé'
    return 'Clôturée'
  }

  function formatDateTime(value: string | null) {
    if (!value) return '—'
    const date = new Date(value)
    return date.toLocaleString('fr-FR')
  }

  function formatFullParentName(item: ContactRequestListItem) {
    const first = item.other_family?.parent_first_name?.trim() || ''
    const last = item.other_family?.parent_last_name?.trim() || ''
    const full = `${first} ${last}`.trim()

    if (full) return full
    return item.other_family?.email || 'Famille'
  }

  function formatTripPlaceLabel(
    place: { name: string; city: string } | null | undefined,
    suggestion: { suggested_name: string; city: string } | null | undefined
  ) {
    if (place) {
      return `${place.name} (${place.city})`
    }

    if (suggestion) {
      return `${suggestion.suggested_name} (${suggestion.city})`
    }

    return 'Lieu non renseigné'
  }

  function formatTripTimeRange(trip: TripSummary | null) {
    if (!trip) return '—'
    return trip.to_time ? `${trip.from_time} → ${trip.to_time}` : trip.from_time
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

  function badgeStyle(tone: FamilyMatch['badge_tone']) {
    if (tone === 'green') {
      return {
        background: '#ecfdf3',
        color: '#027a48',
      }
    }
    if (tone === 'yellow') {
      return {
        background: '#fffbeb',
        color: '#b54708',
      }
    }
    return {
      background: '#fef3f2',
      color: '#b42318',
    }
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

  function normalizeBadgeLabel(label: string) {
    return label === 'À vérifier' ? 'Compatibilité partielle' : label
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
        text: 'Complète le formulaire. Le matching ne prendra en compte que les trajets complets, avec un statut “Recherche”.',
      }
    }

    if (tripFromPlaceSuggestionId || tripToPlaceSuggestionId) {
      return {
        bg: '#fffbeb',
        color: '#92400e',
        text:
          tripFromPlaceSuggestionId && tripToPlaceSuggestionId
            ? 'Les lieux de départ et d’arrivée sont en attente de validation. Ce trajet ne participera pas encore au matching.'
            : tripFromPlaceSuggestionId
              ? 'Le lieu de départ est en attente de validation. Ce trajet ne participera pas encore au matching.'
              : 'Le lieu d’arrivée est en attente de validation. Ce trajet ne participera pas encore au matching.',
      }
    }

    if (tripStatus !== 'searching') {
      return {
        bg: '#f3f4f6',
        color: '#374151',
        text: `Ce trajet sera enregistré avec le statut “${formatTripStatus(
          tripStatus
        )}”. Il ne participera pas au matching tant qu’il n’est pas repassé en “Recherche”.`,
      }
    }

    return {
      bg: '#ecfdf3',
      color: '#027a48',
      text: 'Ce trajet est prêt pour le matching.',
    }
  }

  async function runFamilyMatching() {
    setError('')
    setSuccess('')
    setLoadingMatching(true)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const accessToken = session?.access_token

      if (!accessToken) {
        throw new Error('Session introuvable.')
      }

      const response = await fetch('/api/matching/families', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || 'Erreur lors de la recherche de groupes.')
      }

      setFamilyMatches(payload?.results ?? [])
      setMatchingHasRun(true)
      setShowMatchingReview(false)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors de la recherche de groupes.'
      setError(message)
    } finally {
      setLoadingMatching(false)
    }
  }

  function openMatchingReview() {
    setError('')
    setSuccess('')

    if (trips.length === 0) {
      setError('Ajoute d’abord au moins un trajet.')
      return
    }

    setShowMatchingReview(true)
  }

  async function loadContactRequests() {
    setLoadingRequests(true)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const accessToken = session?.access_token

      if (!accessToken) {
        throw new Error('Session introuvable.')
      }

      const response = await fetch('/api/contact-requests/list', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || 'Erreur lors du chargement des demandes.')
      }

      setSentRequests(payload?.sent ?? [])
      setReceivedRequests(payload?.received ?? [])
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors du chargement des demandes.'
      setError(message)
    } finally {
      setLoadingRequests(false)
    }
  }

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSavingProfile(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setSavingProfile(false)
      router.replace('/login')
      return
    }

    const { data, error } = await supabase
      .from('families')
      .update({
        parent_first_name: parentFirstName.trim(),
        parent_last_name: parentLastName.trim(),
        phone: phone.trim() || null,
      })
      .eq('auth_user_id', user.id)
      .select()
      .single()

    setSavingProfile(false)

    if (error) {
      setError(error.message)
      return
    }

    setFamily(data)
    setSuccess('Profil mis à jour.')
  }

  async function handleAddChild(e: FormEvent) {
    e.preventDefault()
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
    setChildFirstName('')
    setChildLevel('')
    setSuccess('Enfant ajouté.')

    if (!tripChildId) {
      setTripChildId(data.id)
    }
  }

  async function handleDeleteChild(childId: string) {
    setError('')
    setSuccess('')
    setDeletingChildId(childId)

    const { error } = await supabase.from('children').delete().eq('id', childId)

    setDeletingChildId(null)

    if (error) {
      setError(error.message)
      return
    }

    const remainingChildren = children.filter((child) => child.id !== childId)

    setChildren(remainingChildren)
    setTrips((prev) => prev.filter((trip) => trip.child_id !== childId))
    setFamilyMatches([])
    setMatchingHasRun(false)
    setSuccess('Enfant supprimé.')

    if (tripChildId === childId) {
      setTripChildId(remainingChildren[0]?.id ?? '')
    }
  }

  async function handleSuggestPlace(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!family) {
      setError('Famille introuvable.')
      return
    }

    const nameTrimmed = suggestedName.trim()
    const cityTrimmed = suggestedCity.trim()

    if (!nameTrimmed || !cityTrimmed) {
      setError('Le nom du lieu et la ville sont obligatoires.')
      return
    }

    setSavingSuggestion(true)

    const { data, error } = await supabase
      .from('place_suggestions')
      .insert({
        family_id: family.id,
        suggested_name: nameTrimmed,
        kind: suggestedKind,
        city: cityTrimmed,
        exact_address: suggestedExactAddress.trim() || null,
        postal_code: suggestedPostalCode.trim() || null,
        comment: suggestedComment.trim() || null,
      })
      .select()
      .single()

    setSavingSuggestion(false)

    if (error) {
      setError(error.message)
      return
    }

    setPlaceSuggestions((prev) => [data, ...prev])
    setSuggestedName('')
    setSuggestedKind('school')
    setSuggestedCity('')
    setSuggestedExactAddress('')
    setSuggestedPostalCode('')
    setSuggestedComment('')
    setSuccess(
      'Lieu proposé. Il devra être validé par l’administrateur avant de pouvoir servir au matching.'
    )
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
    setSuccess('Lieu créé et attaché au trajet.')
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

  async function handleSaveTrip(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!family) {
      setError('Famille introuvable.')
      return
    }

    if (!tripChildId) {
      setError('Choisis un enfant.')
      return
    }

    const hasFrom = Boolean(tripFromPlaceId || tripFromPlaceSuggestionId)
    const hasTo = Boolean(tripToPlaceId || tripToPlaceSuggestionId)

    if (!hasFrom || !hasTo) {
      setError('Choisis un lieu de départ et un lieu d’arrivée.')
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
      setError('Choisis au moins un jour.')
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

      setFamilyMatches([])
      setMatchingHasRun(false)
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
    setFamilyMatches([])
    setMatchingHasRun(false)
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
    setFamilyMatches([])
    setMatchingHasRun(false)

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
    setFamilyMatches([])
    setMatchingHasRun(false)
    setSuccess(`Statut du trajet mis à jour : ${formatTripStatus(nextStatus)}.`)
  }

  async function handleRequestContact(match: FamilyMatch) {
    const parentName = formatParentName(match)

    const confirmed = window.confirm(
      `Le nombre de demandes est limité à une fois par jour et par trajet. Êtes-vous sûr de vouloir contacter ${parentName} ?`
    )

    if (!confirmed) {
      return
    }

    setError('')
    setSuccess('')

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const accessToken = session?.access_token

      if (!accessToken) {
        throw new Error('Session introuvable.')
      }

      const requesterTripIds = match.trip_matches.map((item) => item.requester_trip_id)

      const response = await fetch('/api/contact-requests/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          target_family_id: match.target_family_id,
          requester_trip_ids: requesterTripIds,
        }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || 'Erreur lors de la création de la demande.')
      }

      setSuccess(
        `Demande de mise en relation envoyée à ${parentName} pour ${payload?.linked_trip_count ?? 0} trajet(s).`
      )

      setFamilyMatches((prev) =>
        prev.filter((item) => item.target_family_id !== match.target_family_id)
      )

      await loadContactRequests()
      await runFamilyMatching().catch(() => undefined)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors de la création de la demande.'
      setError(message)
    }
  }

  async function handleRespondToRequest(
    contactRequestId: string,
    action: 'accept' | 'decline'
  ) {
    setError('')
    setSuccess('')
    setRespondingRequestId(contactRequestId)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const accessToken = session?.access_token

      if (!accessToken) {
        throw new Error('Session introuvable.')
      }

      const response = await fetch('/api/contact-requests/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          contact_request_id: contactRequestId,
          action,
        }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || 'Erreur lors de la réponse à la demande.')
      }

      setSuccess(action === 'accept' ? 'Demande acceptée.' : 'Demande refusée.')

      await loadContactRequests()
      await runFamilyMatching().catch(() => undefined)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors de la réponse à la demande.'
      setError(message)
    } finally {
      setRespondingRequestId(null)
    }
  }

  async function handleCancelRequest(contactRequestId: string) {
    const confirmed = window.confirm('Confirmer l’annulation de cette demande ?')

    if (!confirmed) {
      return
    }

    setError('')
    setSuccess('')
    setCancellingRequestId(contactRequestId)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const accessToken = session?.access_token

      if (!accessToken) {
        throw new Error('Session introuvable.')
      }

      const response = await fetch('/api/contact-requests/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          contact_request_id: contactRequestId,
        }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || 'Erreur lors de l’annulation de la demande.')
      }

      setSuccess('Demande annulée.')

      await loadContactRequests()
      await runFamilyMatching().catch(() => undefined)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors de l’annulation de la demande.'
      setError(message)
    } finally {
      setCancellingRequestId(null)
    }
  }

  async function handleCloseRequest(
    contactRequestId: string,
    outcome: 'agreement_found' | 'no_agreement'
  ) {
    const confirmed = window.confirm(
      outcome === 'agreement_found'
        ? 'Confirmer que vous avez trouvé un accord avec cette famille ?'
        : 'Confirmer que vous n’avez pas trouvé d’accord avec cette famille ?'
    )

    if (!confirmed) {
      return
    }

    setError('')
    setSuccess('')
    setClosingRequestId(contactRequestId)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const accessToken = session?.access_token

      if (!accessToken) {
        throw new Error('Session introuvable.')
      }

      const response = await fetch('/api/contact-requests/close', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          contact_request_id: contactRequestId,
          outcome,
        }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || 'Erreur lors de la clôture de la demande.')
      }

      setSuccess(
        outcome === 'agreement_found'
          ? 'Demande clôturée avec accord.'
          : 'Demande clôturée sans accord.'
      )

      await loadContactRequests()
      await runFamilyMatching().catch(() => undefined)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors de la clôture de la demande.'
      setError(message)
    } finally {
      setClosingRequestId(null)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const ownSuggestions = placeSuggestions.filter((item) => family && item.family_id === family.id)

  if (loading) {
    return (
      <main style={{ maxWidth: 950, margin: '40px auto', fontFamily: 'Arial, sans-serif' }}>
        <p>Chargement...</p>
      </main>
    )
  }

  const selectedFromText = tripFromPlaceId || tripFromPlaceSuggestionId
    ? placeLabel(tripFromPlaceId || null, tripFromPlaceSuggestionId || null)
    : ''

  const selectedToText = tripToPlaceId || tripToPlaceSuggestionId
    ? placeLabel(tripToPlaceId || null, tripToPlaceSuggestionId || null)
    : ''

  const tripFormStatus = getTripFormStatusMessage()

  return (
    <main style={{ maxWidth: 950, margin: '40px auto', fontFamily: 'Arial, sans-serif' }}>
      <h1>Dashboard</h1>

      <div style={{ marginBottom: 24 }}>
        <p>
          Connecté avec : <strong>{family?.email}</strong>
        </p>
      </div>

      <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 20, marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>Mon profil parent</h2>

        <form onSubmit={handleSaveProfile} style={{ display: 'grid', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Prénom</span>
            <input
              type="text"
              value={parentFirstName}
              onChange={(e) => setParentFirstName(e.target.value)}
              required
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span>Nom</span>
            <input
              type="text"
              value={parentLastName}
              onChange={(e) => setParentLastName(e.target.value)}
              required
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span>Téléphone</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Optionnel"
            />
          </label>

          <div>
            <button type="submit" disabled={savingProfile}>
              {savingProfile ? 'Enregistrement...' : 'Enregistrer le profil'}
            </button>
          </div>
        </form>
      </section>

      <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 20, marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>Mes enfants</h2>

        <form onSubmit={handleAddChild} style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Prénom de l’enfant</span>
            <input
              type="text"
              value={childFirstName}
              onChange={(e) => setChildFirstName(e.target.value)}
              required
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span>Niveau / classe</span>
            <input
              type="text"
              value={childLevel}
              onChange={(e) => setChildLevel(e.target.value)}
              placeholder="Ex : CE2, 6e, CM1..."
            />
          </label>

          <div>
            <button type="submit" disabled={savingChild}>
              {savingChild ? 'Ajout...' : 'Ajouter un enfant'}
            </button>
          </div>
        </form>

        {children.length === 0 ? (
          <p>Aucun enfant enregistré.</p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {children.map((child) => (
              <div
                key={child.id}
                style={{
                  border: '1px solid #eee',
                  borderRadius: 8,
                  padding: 14,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div>
                  <p style={{ margin: 0 }}>
                    <strong>{child.first_name}</strong>
                  </p>
                  <p style={{ margin: '6px 0 0 0' }}>
                    Niveau : {child.level || '—'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteChild(child.id)}
                  disabled={deletingChildId === child.id}
                >
                  {deletingChildId === child.id ? 'Suppression...' : 'Supprimer'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 20, marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>
          {editingTripGroupId ? 'Modifier un trajet' : 'Ajouter un trajet'}
        </h2>

        <form onSubmit={handleSaveTrip} style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Enfant</span>
            <select value={tripChildId} onChange={(e) => setTripChildId(e.target.value)} required>
              <option value="">Choisir un enfant</option>
              {children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.first_name}
                  {child.level ? ` (${child.level})` : ''}
                </option>
              ))}
            </select>
          </label>

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
          />

          {creatingInlineField === 'from' ? (
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
          ) : null}

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
          />

          {creatingInlineField === 'to' ? (
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
          ) : null}

          <div style={{ display: 'grid', gap: 6 }}>
            <span>Jours</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {DAY_OPTIONS.map((day) => (
                <label
                  key={day.value}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    border: '1px solid #ddd',
                    borderRadius: 6,
                    padding: '6px 10px',
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

          <label style={{ display: 'grid', gap: 6 }}>
            <span>Heure de départ</span>
            <input
              type="time"
              value={tripFromTime}
              onChange={(e) => setTripFromTime(e.target.value)}
              required
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span>Heure d’arrivée (optionnel)</span>
            <input
              type="time"
              value={tripToTime}
              onChange={(e) => setTripToTime(e.target.value)}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span>Tolérance (minutes)</span>
            <input
              type="number"
              min={0}
              max={180}
              value={tripToleranceMin}
              onChange={(e) => setTripToleranceMin(e.target.value)}
              required
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span>
              Statut par défaut {editingTripGroupId ? '(utilisé seulement pour les nouveaux jours ajoutés)' : ''}
            </span>
            <select value={tripStatus} onChange={(e) => setTripStatus(e.target.value as Trip['status'])}>
              <option value="searching">Recherche</option>
              <option value="resolved">Résolu</option>
              <option value="paused">En pause</option>
              <option value="archived">Archivé</option>
            </select>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={tripAcceptingNewChildren}
              onChange={(e) => setTripAcceptingNewChildren(e.target.checked)}
            />
            <span>Accepte de nouveaux enfants</span>
          </label>

          <div style={{ display: 'flex', gap: 12 }}>
            <button type="submit" disabled={savingTrip || children.length === 0}>
              {savingTrip
                ? editingTripGroupId
                  ? 'Enregistrement...'
                  : 'Ajout...'
                : editingTripGroupId
                  ? 'Enregistrer les modifications'
                  : 'Ajouter un trajet'}
            </button>

            {editingTripGroupId ? (
              <button type="button" onClick={resetTripForm}>
                Annuler la modification
              </button>
            ) : null}
          </div>

          <div
            style={{
              marginTop: 4,
              padding: 10,
              borderRadius: 8,
              background: tripFormStatus.bg,
              color: tripFormStatus.color,
              fontSize: 14,
            }}
          >
            {tripFormStatus.text}
          </div>
        </form>

        {tripGroups.length === 0 ? (
          <p>Aucun trajet enregistré.</p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {tripGroups.map((group) => {
              const child = childMap[group.child_id]
              const summary = getTripGroupStatusSummary(group)

              return (
                <div
                  key={group.trip_group_id}
                  style={{
                    border: '1px solid #eee',
                    borderRadius: 8,
                    padding: 14,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'grid', gap: 8, flex: 1 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 12,
                        flexWrap: 'wrap',
                      }}
                    >
                      <p style={{ margin: 0 }}>
                        <strong>{child?.first_name || 'Enfant inconnu'}</strong>
                      </p>

                      <span
                        style={{
                          display: 'inline-block',
                          padding: '6px 10px',
                          borderRadius: 999,
                          fontSize: 13,
                          fontWeight: 600,
                          background: summary.bg,
                          color: summary.color,
                        }}
                      >
                        {summary.text}
                      </span>
                    </div>

                    <p style={{ margin: 0 }}>
                      {placeLabel(group.from_place_id, group.from_place_suggestion_id)} →{' '}
                      {placeLabel(group.to_place_id, group.to_place_suggestion_id)}
                    </p>

                    <p style={{ margin: 0 }}>
                      Tolérance : {group.tolerance_min} min
                    </p>

                    <p style={{ margin: 0 }}>
                      Accepte de nouveaux enfants : {group.accepting_new_children ? 'Oui' : 'Non'}
                    </p>

                    <div style={{ display: 'grid', gap: 8 }}>
                      {group.trips.map((trip) => {
                        const ready = isTripReadyForMatching(trip)
                        const blockingReason = getTripBlockingReason(trip)

                        return (
                          <div
                            key={trip.id}
                            style={{
                              border: '1px solid #f0f0f0',
                              borderRadius: 8,
                              padding: 10,
                              background: '#fafafa',
                              display: 'grid',
                              gap: 6,
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 12,
                                flexWrap: 'wrap',
                              }}
                            >
                              <strong>{formatSingleDay(trip.day_of_week)}</strong>

                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 14 }}>Statut</span>
                                <select
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
                            </div>

                            <p style={{ margin: 0 }}>
                              Départ : {trip.from_time}
                              {trip.to_time ? ` | Arrivée : ${trip.to_time}` : ''}
                            </p>

                            <div
                              style={{
                                padding: 8,
                                borderRadius: 8,
                                background: ready ? '#ecfdf3' : '#fffbeb',
                                color: ready ? '#027a48' : '#92400e',
                                fontSize: 14,
                              }}
                            >
                              {ready
                                ? 'Pris en compte dans le matching.'
                                : `${blockingReason} Non pris en compte dans le matching.`}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={() => startEditTrip(group)}>
                      Modifier
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteTrip(group.trip_group_id)}
                      disabled={deletingTripId === group.trip_group_id}
                    >
                      {deletingTripId === group.trip_group_id ? 'Suppression...' : 'Supprimer'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 20, marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>Recherche de groupes</h2>

        <div
          style={{
            padding: 12,
            borderRadius: 8,
            background: '#f9fafb',
            color: '#374151',
            fontSize: 14,
            marginBottom: 16,
          }}
        >
          Vérifie que les trajets à rechercher sont bien à jour. Seuls les trajets avec le statut
          “Recherche” et prêts pour le matching seront pris en compte.
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
          <button type="button" onClick={openMatchingReview} disabled={loadingMatching}>
            {loadingMatching ? 'Recherche en cours...' : 'Rechercher des groupes'}
          </button>

          <span style={{ fontSize: 14, color: '#555' }}>
            Une vérification s’affiche avant le lancement du matching.
          </span>
        </div>

        {!matchingHasRun ? (
          <p style={{ margin: 0 }}>
            Clique sur “Rechercher des groupes” pour afficher les familles compatibles.
          </p>
        ) : familyMatches.length === 0 ? (
          <p style={{ margin: 0 }}>Aucun groupe compatible trouvé pour le moment.</p>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {familyMatches.map((match) => {
              const badge = badgeStyle(match.badge_tone)

              return (
                <div
                  key={match.target_family_id}
                  style={{
                    border: '1px solid #eee',
                    borderRadius: 8,
                    padding: 14,
                    display: 'grid',
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <p style={{ margin: 0 }}>
                        <strong>{formatParentName(match)}</strong>
                      </p>
                      <p style={{ margin: '6px 0 0 0' }}>
                        Jours couverts : {formatDayValues(match.covered_day_of_week_values)}
                      </p>
                    </div>

                    <div style={{ display: 'grid', gap: 8, justifyItems: 'end' }}>
                      <div
                        style={{
                          display: 'inline-block',
                          padding: '6px 10px',
                          borderRadius: 999,
                          fontSize: 13,
                          fontWeight: 600,
                          background: '#ecfdf3',
                          color: '#027a48',
                        }}
                      >
                        Score {match.compatibility_score}/100
                      </div>

                      <div
                        style={{
                          display: 'inline-block',
                          padding: '6px 10px',
                          borderRadius: 999,
                          fontSize: 13,
                          fontWeight: 600,
                          background: badge.background,
                          color: badge.color,
                        }}
                      >
                        {normalizeBadgeLabel(match.badge_label)}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: 4 }}>
                    <p style={{ margin: 0 }}>
                      Trajets compatibles : {match.matched_requester_trip_count}
                    </p>
                    <p style={{ margin: 0 }}>
                      Historique : {match.history_label}
                      {match.history_created_at ? ` — ${formatDateTime(match.history_created_at)}` : ''}
                    </p>
                    {(match.history_status === 'accepted' ||
                      match.history_status === 'closed_with_agreement') &&
                    match.history_contact_email ? (
                      <p style={{ margin: 0 }}>
                        Email déjà partagé : {match.history_contact_email}
                      </p>
                    ) : null}
                  </div>

                  <div style={{ display: 'grid', gap: 8 }}>
                    {match.trip_matches.map((tripMatch) => (
                      <div
                        key={`${tripMatch.requester_trip_id}-${tripMatch.target_trip_id}`}
                        style={{
                          border: '1px solid #f0f0f0',
                          borderRadius: 8,
                          padding: 10,
                          background: '#fafafa',
                          display: 'grid',
                          gap: 4,
                        }}
                      >
                        <p style={{ margin: 0 }}>
                          <strong>{formatSingleDay(tripMatch.day_of_week)}</strong>
                        </p>
                        <p style={{ margin: 0 }}>
                          Enfant : {tripMatch.requester_child_first_name || '—'}
                        </p>
                        <p style={{ margin: 0 }}>
                          Départ : {tripMatch.requester_from_label}
                        </p>
                        <p style={{ margin: 0 }}>
                          Destination : {tripMatch.requester_to_label}
                        </p>
                        <p style={{ margin: 0 }}>
                          Horaires : {tripMatch.requester_from_time}
                          {tripMatch.requester_to_time ? ` → ${tripMatch.requester_to_time}` : ''}
                        </p>
                        <p style={{ margin: 0 }}>
                          Horaire autre famille : {tripMatch.target_from_time}
                          {tripMatch.target_to_time ? ` → ${tripMatch.target_to_time}` : ''}
                        </p>
                        <p style={{ margin: 0 }}>
                          Compatibilité horaire : {formatPercent(tripMatch.time_fit_score)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div>
                    {match.history_status === 'pending' ? (
                      <div
                        style={{
                          padding: 10,
                          borderRadius: 8,
                          background: '#fffbeb',
                          color: '#92400e',
                          fontSize: 14,
                        }}
                      >
                        Une demande est déjà en attente avec cette famille.
                      </div>
                    ) : (match.history_status === 'accepted' ||
                        match.history_status === 'closed_with_agreement') &&
                      match.history_contact_email ? (
                      <div
                        style={{
                          padding: 10,
                          borderRadius: 8,
                          background: '#ecfdf3',
                          color: '#027a48',
                          fontSize: 14,
                        }}
                      >
                        Vous êtes déjà en contact avec cette famille. Email : {match.history_contact_email}
                      </div>
                    ) : (
                      <button type="button" onClick={() => handleRequestContact(match)}>
                        Demander la mise en relation
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 20, marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>Demandes reçues</h2>

        {loadingRequests ? (
          <p>Chargement des demandes...</p>
        ) : receivedRequests.length === 0 ? (
          <p>Aucune demande reçue.</p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {receivedRequests.map((item) => (
              <div
                key={item.id}
                style={{
                  border: '1px solid #eee',
                  borderRadius: 8,
                  padding: 14,
                  display: 'grid',
                  gap: 8,
                }}
              >
                <p style={{ margin: 0 }}>
                  <strong>Autre parent :</strong> {formatFullParentName(item)}
                </p>

                <p style={{ margin: 0 }}>
                  <strong>Statut :</strong> {formatRequestStatus(item.status)}
                </p>

                <p style={{ margin: 0 }}>
                  <strong>Créée le :</strong> {formatDateTime(item.created_at)}
                </p>

                <p style={{ margin: 0 }}>
                  <strong>Exclusivité jusqu’au :</strong> {formatDateTime(item.expires_at)}
                </p>

                <div style={{ display: 'grid', gap: 8 }}>
                  {item.trip_links.map((link) => {
                    const requesterTrip = link.requester_trip
                    const targetTrip = link.target_trip

                    return (
                      <div
                        key={link.id}
                        style={{
                          border: '1px solid #f0f0f0',
                          borderRadius: 8,
                          padding: 10,
                          background: '#fafafa',
                          display: 'grid',
                          gap: 4,
                        }}
                      >
                        <p style={{ margin: 0 }}>
                          <strong>Trajet concerné</strong>
                        </p>
                        <p style={{ margin: 0 }}>
                          <strong>Enfant :</strong> {requesterTrip?.child?.first_name || '—'}
                        </p>
                        <p style={{ margin: 0 }}>
                          <strong>Jour :</strong> {formatSingleDay(requesterTrip?.day_of_week ?? 0)}
                        </p>
                        <p style={{ margin: 0 }}>
                          <strong>Horaires :</strong> {formatTripTimeRange(requesterTrip)}
                        </p>
                        <p style={{ margin: 0 }}>
                          <strong>Départ :</strong>{' '}
                          {formatTripPlaceLabel(
                            requesterTrip?.from_place,
                            requesterTrip?.from_suggestion
                          )}
                        </p>
                        <p style={{ margin: 0 }}>
                          <strong>Destination :</strong>{' '}
                          {formatTripPlaceLabel(
                            requesterTrip?.to_place,
                            requesterTrip?.to_suggestion
                          )}
                        </p>

                        <p style={{ margin: '6px 0 0 0', fontSize: 14, color: '#555' }}>
                          Votre horaire correspondant : {formatTripTimeRange(targetTrip)}
                        </p>
                      </div>
                    )
                  })}
                </div>

                {(item.status === 'accepted' || item.status === 'closed_with_agreement') && item.other_family ? (
                  <div
                    style={{
                      marginTop: 4,
                      padding: 10,
                      borderRadius: 8,
                      background: '#ecfdf3',
                      color: '#027a48',
                      fontSize: 14,
                    }}
                  >
                    <strong>Coordonnée partagée :</strong> {item.other_family.email}
                  </div>
                ) : null}

                {item.status === 'pending' ? (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => handleRespondToRequest(item.id, 'accept')}
                      disabled={respondingRequestId === item.id}
                    >
                      {respondingRequestId === item.id ? 'Traitement...' : 'Accepter'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRespondToRequest(item.id, 'decline')}
                      disabled={respondingRequestId === item.id}
                    >
                      {respondingRequestId === item.id ? 'Traitement...' : 'Refuser'}
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 20, marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>Demandes envoyées</h2>

        {loadingRequests ? (
          <p>Chargement des demandes...</p>
        ) : sentRequests.length === 0 ? (
          <p>Aucune demande envoyée.</p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {sentRequests.map((item) => (
              <div
                key={item.id}
                style={{
                  border: '1px solid #eee',
                  borderRadius: 8,
                  padding: 14,
                  display: 'grid',
                  gap: 8,
                }}
              >
                <p style={{ margin: 0 }}>
                  <strong>Autre parent :</strong> {formatFullParentName(item)}
                </p>

                <p style={{ margin: 0 }}>
                  <strong>Statut :</strong> {formatRequestStatus(item.status)}
                </p>

                <p style={{ margin: 0 }}>
                  <strong>Créée le :</strong> {formatDateTime(item.created_at)}
                </p>

                <p style={{ margin: 0 }}>
                  <strong>Exclusivité jusqu’au :</strong> {formatDateTime(item.expires_at)}
                </p>

                <div style={{ display: 'grid', gap: 8 }}>
                  {item.trip_links.map((link) => {
                    const requesterTrip = link.requester_trip
                    const targetTrip = link.target_trip

                    return (
                      <div
                        key={link.id}
                        style={{
                          border: '1px solid #f0f0f0',
                          borderRadius: 8,
                          padding: 10,
                          background: '#fafafa',
                          display: 'grid',
                          gap: 4,
                        }}
                      >
                        <p style={{ margin: 0 }}>
                          <strong>Trajet concerné</strong>
                        </p>
                        <p style={{ margin: 0 }}>
                          <strong>Enfant :</strong> {requesterTrip?.child?.first_name || '—'}
                        </p>
                        <p style={{ margin: 0 }}>
                          <strong>Jour :</strong> {formatSingleDay(requesterTrip?.day_of_week ?? 0)}
                        </p>
                        <p style={{ margin: 0 }}>
                          <strong>Horaires :</strong> {formatTripTimeRange(requesterTrip)}
                        </p>
                        <p style={{ margin: 0 }}>
                          <strong>Départ :</strong>{' '}
                          {formatTripPlaceLabel(
                            requesterTrip?.from_place,
                            requesterTrip?.from_suggestion
                          )}
                        </p>
                        <p style={{ margin: 0 }}>
                          <strong>Destination :</strong>{' '}
                          {formatTripPlaceLabel(
                            requesterTrip?.to_place,
                            requesterTrip?.to_suggestion
                          )}
                        </p>

                        <p style={{ margin: '6px 0 0 0', fontSize: 14, color: '#555' }}>
                          Horaire de l’autre famille : {formatTripTimeRange(targetTrip)}
                        </p>
                      </div>
                    )
                  })}
                </div>

                {(item.status === 'accepted' || item.status === 'closed_with_agreement') && item.other_family ? (
                  <div
                    style={{
                      marginTop: 4,
                      padding: 10,
                      borderRadius: 8,
                      background: '#ecfdf3',
                      color: '#027a48',
                      fontSize: 14,
                    }}
                  >
                    <strong>Coordonnée partagée :</strong> {item.other_family.email}
                  </div>
                ) : null}

                {item.status === 'pending' ? (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => handleCancelRequest(item.id)}
                      disabled={cancellingRequestId === item.id}
                    >
                      {cancellingRequestId === item.id ? 'Traitement...' : 'Annuler la demande'}
                    </button>
                  </div>
                ) : null}

                {item.status === 'accepted' ? (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => handleCloseRequest(item.id, 'agreement_found')}
                      disabled={closingRequestId === item.id}
                    >
                      {closingRequestId === item.id ? 'Traitement...' : 'Accord trouvé'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCloseRequest(item.id, 'no_agreement')}
                      disabled={closingRequestId === item.id}
                    >
                      {closingRequestId === item.id ? 'Traitement...' : 'Pas d’accord trouvé'}
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 20, marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>Mes suggestions de lieux</h2>

        {ownSuggestions.length === 0 ? (
          <p>Aucune suggestion envoyée.</p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {ownSuggestions.map((item) => (
              <div key={item.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
                <p style={{ margin: 0 }}>
                  <strong>{item.suggested_name}</strong>
                </p>
                <p style={{ margin: '6px 0 0 0' }}>Type : {formatKind(item.kind)}</p>
                <p style={{ margin: '6px 0 0 0' }}>Ville : {item.city}</p>
                <p style={{ margin: '6px 0 0 0' }}>Adresse : {item.exact_address || '—'}</p>
                <p style={{ margin: '6px 0 0 0' }}>Statut : {formatSuggestionStatus(item.status)}</p>
                <p style={{ margin: '6px 0 0 0' }}>Note admin : {item.review_note || '—'}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 20, marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>Proposer un nouveau lieu</h2>

        <form onSubmit={handleSuggestPlace} style={{ display: 'grid', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Nom du lieu</span>
            <input
              type="text"
              value={suggestedName}
              onChange={(e) => setSuggestedName(e.target.value)}
              required
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span>Type</span>
            <select
              value={suggestedKind}
              onChange={(e) => setSuggestedKind(e.target.value as 'school' | 'activity' | 'other')}
            >
              <option value="school">École</option>
              <option value="activity">Activité</option>
              <option value="other">Autre</option>
            </select>
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span>Ville</span>
            <input
              type="text"
              value={suggestedCity}
              onChange={(e) => setSuggestedCity(e.target.value)}
              required
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span>Adresse exacte</span>
            <input
              type="text"
              value={suggestedExactAddress}
              onChange={(e) => setSuggestedExactAddress(e.target.value)}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span>Code postal</span>
            <input
              type="text"
              value={suggestedPostalCode}
              onChange={(e) => setSuggestedPostalCode(e.target.value)}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span>Commentaire</span>
            <textarea
              value={suggestedComment}
              onChange={(e) => setSuggestedComment(e.target.value)}
              rows={3}
            />
          </label>

          <div>
            <button type="submit" disabled={savingSuggestion}>
              {savingSuggestion ? 'Envoi...' : 'Proposer ce lieu'}
            </button>
          </div>
        </form>
      </section>

      {showMatchingReview ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 12,
              maxWidth: 900,
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: 20,
              display: 'grid',
              gap: 16,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              <div>
                <h3 style={{ margin: 0 }}>Vérifier les trajets pris en compte</h3>
                <p style={{ margin: '8px 0 0 0', color: '#555' }}>
                  Vérifie les trajets avant de lancer la recherche. Mets à jour les statuts si nécessaire.
                </p>
              </div>

              <button type="button" onClick={() => setShowMatchingReview(false)}>
                Fermer
              </button>
            </div>

            <div
              style={{
                padding: 12,
                borderRadius: 8,
                background: '#ecfdf3',
                color: '#027a48',
              }}
            >
              Pris en compte : {includedMatchingTrips.length}
            </div>

            <div
              style={{
                padding: 12,
                borderRadius: 8,
                background: '#fffbeb',
                color: '#92400e',
              }}
            >
              Non pris en compte : {excludedMatchingTrips.length}
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              {matchingReviewItems.map(({ trip, included, reason }) => {
                const child = childMap[trip.child_id]

                return (
                  <div
                    key={trip.id}
                    style={{
                      border: '1px solid #eee',
                      borderRadius: 8,
                      padding: 12,
                      display: 'grid',
                      gap: 6,
                      background: included ? '#f9fffb' : '#fffdfa',
                    }}
                  >
                    <p style={{ margin: 0 }}>
                      <strong>{child?.first_name || 'Enfant inconnu'}</strong> — {formatSingleDay(trip.day_of_week)}
                    </p>
                    <p style={{ margin: 0 }}>
                      {placeLabel(trip.from_place_id, trip.from_place_suggestion_id)} →{' '}
                      {placeLabel(trip.to_place_id, trip.to_place_suggestion_id)}
                    </p>
                    <p style={{ margin: 0 }}>
                      Horaires : {trip.from_time}
                      {trip.to_time ? ` → ${trip.to_time}` : ''}
                    </p>
                    <p style={{ margin: 0 }}>
                      Statut : {formatTripStatus(trip.status)}
                    </p>
                    <div
                      style={{
                        padding: 8,
                        borderRadius: 8,
                        background: included ? '#ecfdf3' : '#fffbeb',
                        color: included ? '#027a48' : '#92400e',
                        fontSize: 14,
                      }}
                    >
                      {reason}
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={runFamilyMatching}
                disabled={loadingMatching || includedMatchingTrips.length === 0}
              >
                {loadingMatching ? 'Recherche en cours...' : 'Continuer la recherche'}
              </button>

              <button type="button" onClick={() => setShowMatchingReview(false)}>
                Retourner modifier mes trajets
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {error ? <p style={{ color: 'red' }}>{error}</p> : null}
      {success ? <p style={{ color: 'green' }}>{success}</p> : null}

      <div style={{ display: 'flex', gap: 16 }}>
        <Link href="/">Accueil</Link>
        <button onClick={handleLogout}>Se déconnecter</button>
      </div>
    </main>
  )
}