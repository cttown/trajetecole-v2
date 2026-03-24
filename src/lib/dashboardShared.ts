import type { NextRouter } from 'next/router'
import { supabase } from './supabaseClient'

export type Family = {
  id: string
  auth_user_id: string
  email: string
  parent_first_name: string | null
  parent_last_name: string | null
  phone: string | null
  created_at: string
}

export type Child = {
  id: string
  family_id: string
  first_name: string
  level: string | null
  created_at: string
}

export type Place = {
  id: string
  name: string
  kind: 'school' | 'activity' | 'other'
  city: string
  exact_address: string | null
  postal_code: string | null
  is_active: boolean
  created_at: string
}

export type PlaceSuggestion = {
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

export type Trip = {
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

export type TripSummary = {
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

export type ContactRequestTripLink = {
  id: string
  contact_request_id: string
  requester_trip_id: string
  target_trip_id: string
  created_at: string
  requester_trip: TripSummary | null
  target_trip: TripSummary | null
}

export type ContactRequestListItem = {
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

export type FamilyTripMatch = {
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

export type FamilyMatch = {
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

export const DAY_OPTIONS = [
  { label: 'Lun', value: 1 },
  { label: 'Mar', value: 2 },
  { label: 'Mer', value: 3 },
  { label: 'Jeu', value: 4 },
  { label: 'Ven', value: 5 },
  { label: 'Sam', value: 6 },
  { label: 'Dim', value: 7 },
]

export function formatSingleDay(dayValue: number) {
  return DAY_OPTIONS.find((day) => day.value === dayValue)?.label || `Jour ${dayValue}`
}

export function formatDayValues(dayValues: number[]) {
  return DAY_OPTIONS
    .filter((day) => dayValues.includes(day.value))
    .map((day) => day.label)
    .join(', ')
}

export function formatDateTime(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return date.toLocaleString('fr-FR')
}

export function formatRequestStatus(status: ContactRequestListItem['status']) {
  if (status === 'pending') return 'En attente'
  if (status === 'accepted') return 'Acceptée'
  if (status === 'declined') return 'Refusée'
  if (status === 'expired') return 'Expirée'
  if (status === 'cancelled') return 'Annulée'
  if (status === 'closed_with_agreement') return 'Accord trouvé'
  if (status === 'closed_no_agreement') return 'Pas d’accord trouvé'
  return 'Clôturée'
}

export function formatSuggestionStatus(status: PlaceSuggestion['status']) {
  if (status === 'pending') return 'En attente'
  if (status === 'approved_new_place') return 'Validée comme nouveau lieu'
  if (status === 'mapped_to_existing_place') return 'Associée à un lieu existant'
  return 'Rejetée'
}

export function formatKind(kind: Place['kind'] | PlaceSuggestion['kind']) {
  if (kind === 'school') return 'École'
  if (kind === 'activity') return 'Activité'
  return 'Autre'
}

export function formatTripStatus(status: Trip['status']) {
  if (status === 'searching') return 'Recherche'
  if (status === 'resolved') return 'Résolu'
  if (status === 'paused') return 'En pause'
  return 'Archivé'
}

export function isTripReadyForMatching(trip: Trip): boolean {
  return (
    trip.status === 'searching' &&
    !!trip.from_place_id &&
    !!trip.to_place_id &&
    !trip.from_place_suggestion_id &&
    !trip.to_place_suggestion_id
  )
}

export function getTripBlockingReason(trip: Trip): string | null {
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

export function formatFullParentName(item: ContactRequestListItem) {
  const first = item.other_family?.parent_first_name?.trim() || ''
  const last = item.other_family?.parent_last_name?.trim() || ''
  const full = `${first} ${last}`.trim()

  if (full) return full
  return item.other_family?.email || 'Famille'
}

export function formatTripPlaceLabel(
  place: { name: string; city: string } | null | undefined,
  suggestion: { suggested_name: string; city: string } | null | undefined
) {
  if (place) return `${place.name} (${place.city})`
  if (suggestion) return `${suggestion.suggested_name} (${suggestion.city})`
  return 'Lieu non renseigné'
}

export function formatTripTimeRange(trip: TripSummary | null) {
  if (!trip) return '—'
  return trip.to_time ? `${trip.from_time} → ${trip.to_time}` : trip.from_time
}

export async function requireFamily(router?: NextRouter) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    router?.replace('/login')
    return { user: null, family: null as Family | null }
  }

  const { data: familyData, error } = await supabase
    .from('families')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()

  if (error || !familyData) {
    throw new Error(error?.message || 'Famille introuvable.')
  }

  return { user, family: familyData as Family }
}

export async function loadChildren(familyId: string) {
  const { data, error } = await supabase
    .from('children')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as Child[]
}

export async function loadTrips(familyId: string) {
  const { data, error } = await supabase
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
    .eq('family_id', familyId)
    .order('created_at', { ascending: false })
    .order('day_of_week', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as Trip[]
}

export async function loadPlaceSuggestions(familyId?: string) {
  let query = supabase
    .from('place_suggestions')
    .select('*')
    .order('created_at', { ascending: false })

  if (familyId) {
    query = query.eq('family_id', familyId)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return (data ?? []) as PlaceSuggestion[]
}

export async function loadPlaces() {
  const { data, error } = await supabase
    .from('places')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as Place[]
}

export async function loadContactRequests() {
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

  return {
    sent: (payload?.sent ?? []) as ContactRequestListItem[],
    received: (payload?.received ?? []) as ContactRequestListItem[],
  }
}

export async function runFamilyMatchingRequest() {
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

  return (payload?.results ?? []) as FamilyMatch[]
}

export async function createContactRequest(targetFamilyId: string, requesterTripIds: string[]) {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const accessToken = session?.access_token

  if (!accessToken) {
    throw new Error('Session introuvable.')
  }

  const response = await fetch('/api/contact-requests/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      target_family_id: targetFamilyId,
      requester_trip_ids: requesterTripIds,
    }),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.error || 'Erreur lors de la création de la demande.')
  }

  return payload
}

export async function respondToContactRequest(contactRequestId: string, action: 'accept' | 'decline') {
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

  return payload
}

export async function cancelContactRequest(contactRequestId: string) {
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

  return payload
}

export async function closeContactRequest(
  contactRequestId: string,
  outcome: 'agreement_found' | 'no_agreement'
) {
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

  return payload
}