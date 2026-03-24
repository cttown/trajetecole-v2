import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

type TripRow = {
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

type FamilyRow = {
  id: string
  parent_first_name: string | null
  parent_last_name: string | null
  email: string
}

type ChildRow = {
  id: string
  first_name: string
  level: string | null
}

type PlaceRow = {
  id: string
  name: string
  city: string
}

type ContactRequestHistoryRow = {
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
  created_at: string
  accepted_at: string | null
  responded_at: string | null
  closed_at: string | null
  expires_at: string
}

type TripMatchDetail = {
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

type HistoryStatus =
  | 'none_yet'
  | 'pending'
  | 'accepted'
  | 'declined_before'
  | 'expired_before'
  | 'closed_before'
  | 'cancelled_before'
  | 'closed_with_agreement'
  | 'closed_no_agreement'

type FamilyMatchResult = {
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
  history_status: HistoryStatus
  history_label: string
  history_request_id: string | null
  history_created_at: string | null
  history_contact_email: string | null
  badge_label: string
  badge_tone: 'green' | 'yellow' | 'red'
  matched_trip_count: number
  matched_requester_trip_count: number
  covered_day_of_week_values: number[]
  trip_matches: TripMatchDetail[]
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`)
  }
  return value
}

function isTripEligible(trip: TripRow): boolean {
  return (
    trip.status === 'searching' &&
    !!trip.from_place_id &&
    !!trip.to_place_id &&
    !trip.from_place_suggestion_id &&
    !trip.to_place_suggestion_id
  )
}

function timeToMinutes(value: string | null): number | null {
  if (!value) return null
  const parts = value.split(':')
  if (parts.length < 2) return null

  const hours = Number(parts[0])
  const minutes = Number(parts[1])

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null
  return hours * 60 + minutes
}

function placeLabel(placeId: string | null, placesById: Map<string, PlaceRow>) {
  if (!placeId) return 'Lieu inconnu'
  const place = placesById.get(placeId)
  return place ? `${place.name} (${place.city})` : 'Lieu inconnu'
}

function computeTripPair(
  requesterTrip: TripRow,
  targetTrip: TripRow,
  childrenById: Map<string, ChildRow>,
  placesById: Map<string, PlaceRow>
): TripMatchDetail | null {
  if (requesterTrip.id === targetTrip.id) return null
  if (requesterTrip.family_id === targetTrip.family_id) return null

  if (!isTripEligible(requesterTrip) || !isTripEligible(targetTrip)) return null

  if (requesterTrip.day_of_week !== targetTrip.day_of_week) return null
  if (requesterTrip.from_place_id !== targetTrip.from_place_id) return null
  if (requesterTrip.to_place_id !== targetTrip.to_place_id) return null

  const requesterMin = timeToMinutes(requesterTrip.from_time)
  const targetMin = timeToMinutes(targetTrip.from_time)

  if (requesterMin === null || targetMin === null) return null

  const timeDiffMin = Math.abs(requesterMin - targetMin)
  const allowedDiffMin = Math.min(
    requesterTrip.tolerance_min ?? 0,
    targetTrip.tolerance_min ?? 0
  )

  if (timeDiffMin > allowedDiffMin) return null

  const timeFitScore =
    allowedDiffMin === 0
      ? timeDiffMin === 0
        ? 1
        : 0
      : Math.max(0, 1 - timeDiffMin / allowedDiffMin)

  const child = childrenById.get(requesterTrip.child_id)

  return {
    requester_trip_id: requesterTrip.id,
    requester_trip_group_id: requesterTrip.trip_group_id,
    requester_child_first_name: child?.first_name ?? null,
    requester_from_label: placeLabel(requesterTrip.from_place_id, placesById),
    requester_to_label: placeLabel(requesterTrip.to_place_id, placesById),
    requester_from_time: requesterTrip.from_time,
    requester_to_time: requesterTrip.to_time,
    target_trip_id: targetTrip.id,
    target_trip_group_id: targetTrip.trip_group_id,
    target_from_time: targetTrip.from_time,
    target_to_time: targetTrip.to_time,
    day_of_week: requesterTrip.day_of_week,
    time_diff_min: timeDiffMin,
    allowed_diff_min: allowedDiffMin,
    time_fit_score: Number(timeFitScore.toFixed(4)),
    target_accepting_new_children: targetTrip.accepting_new_children,
  }
}

function buildHistoryInfo(
  history: ContactRequestHistoryRow | undefined,
  targetEmail: string | null
): {
  history_status: HistoryStatus
  history_score_normalized: number
  history_label: string
  history_request_id: string | null
  history_created_at: string | null
  history_contact_email: string | null
} {
  if (!history) {
    return {
      history_status: 'none_yet',
      history_score_normalized: 0.5,
      history_label: 'Aucun historique',
      history_request_id: null,
      history_created_at: null,
      history_contact_email: null,
    }
  }

  if (history.status === 'pending') {
    const isStillExclusive = new Date(history.expires_at).getTime() > Date.now()

    return {
      history_status: 'pending',
      history_score_normalized: isStillExclusive ? 0.15 : 0.45,
      history_label: isStillExclusive
        ? 'Demande en attente'
        : 'Demande ancienne encore ouverte',
      history_request_id: history.id,
      history_created_at: history.created_at,
      history_contact_email: null,
    }
  }

  if (history.status === 'accepted') {
    return {
      history_status: 'accepted',
      history_score_normalized: 0.9,
      history_label: 'Déjà en contact',
      history_request_id: history.id,
      history_created_at: history.accepted_at ?? history.created_at,
      history_contact_email: targetEmail,
    }
  }

  if (history.status === 'closed_with_agreement') {
    return {
      history_status: 'closed_with_agreement',
      history_score_normalized: 1,
      history_label: 'Accord déjà trouvé auparavant',
      history_request_id: history.id,
      history_created_at: history.closed_at ?? history.accepted_at ?? history.created_at,
      history_contact_email: targetEmail,
    }
  }

  if (history.status === 'closed_no_agreement') {
    return {
      history_status: 'closed_no_agreement',
      history_score_normalized: 0.35,
      history_label: 'Pas d’accord trouvé auparavant',
      history_request_id: history.id,
      history_created_at: history.closed_at ?? history.created_at,
      history_contact_email: null,
    }
  }

  if (history.status === 'declined') {
    return {
      history_status: 'declined_before',
      history_score_normalized: 0.2,
      history_label: 'Déjà refusé auparavant',
      history_request_id: history.id,
      history_created_at: history.responded_at ?? history.created_at,
      history_contact_email: null,
    }
  }

  if (history.status === 'expired') {
    return {
      history_status: 'expired_before',
      history_score_normalized: 0.3,
      history_label: 'Ancienne demande expirée',
      history_request_id: history.id,
      history_created_at: history.responded_at ?? history.created_at,
      history_contact_email: null,
    }
  }

  if (history.status === 'cancelled') {
    return {
      history_status: 'cancelled_before',
      history_score_normalized: 0.4,
      history_label: 'Ancienne demande annulée',
      history_request_id: history.id,
      history_created_at: history.closed_at ?? history.created_at,
      history_contact_email: null,
    }
  }

  return {
    history_status: 'closed_before',
    history_score_normalized: 0.35,
    history_label: 'Ancienne tentative close',
    history_request_id: history.id,
    history_created_at: history.closed_at ?? history.created_at,
    history_contact_email: null,
  }
}

function buildBadge(score: number): {
  badge_label: string
  badge_tone: 'green' | 'yellow' | 'red'
} {
  if (score >= 80) {
    return { badge_label: 'Très compatible', badge_tone: 'green' }
  }
  if (score >= 55) {
    return { badge_label: 'Compatible', badge_tone: 'yellow' }
  }
  return { badge_label: 'À vérifier', badge_tone: 'red' }
}

function buildFamilyScore(args: {
  matchedRequesterTripCount: number
  eligibleRequesterTripCount: number
  averageTimeFitScore: number
  acceptingRatio: number
  historyScoreNormalized: number
}) {
  const {
    matchedRequesterTripCount,
    eligibleRequesterTripCount,
    averageTimeFitScore,
    acceptingRatio,
    historyScoreNormalized,
  } = args

  const coverageRatio =
    eligibleRequesterTripCount > 0
      ? matchedRequesterTripCount / eligibleRequesterTripCount
      : 0

  const tripCompatibilityScore =
    0.65 * coverageRatio + 0.35 * averageTimeFitScore

  const totalNormalized =
    0.7 * tripCompatibilityScore +
    0.2 * historyScoreNormalized +
    0.1 * acceptingRatio

  const compatibilityScore = Math.round(
    Math.max(0, Math.min(1, totalNormalized)) * 100
  )

  return {
    compatibility_score: compatibilityScore,
    trip_compatibility_score: Number(tripCompatibilityScore.toFixed(4)),
    history_score_normalized: Number(historyScoreNormalized.toFixed(4)),
    availability_score: Number(acceptingRatio.toFixed(4)),
    coverage_ratio: Number(coverageRatio.toFixed(4)),
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
    const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization token' })
    }

    const accessToken = authHeader.slice('Bearer '.length)

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(accessToken)

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { data: ownFamily, error: ownFamilyError } = await supabaseAdmin
      .from('families')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (ownFamilyError || !ownFamily) {
      return res.status(404).json({ error: 'Family not found' })
    }

    const [
      { data: allTripsData, error: tripsError },
      { data: childrenData, error: childrenError },
      { data: placesData, error: placesError },
    ] = await Promise.all([
      supabaseAdmin
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
        .eq('status', 'searching'),
      supabaseAdmin.from('children').select('id, first_name, level'),
      supabaseAdmin.from('places').select('id, name, city'),
    ])

    if (tripsError) {
      return res.status(500).json({ error: tripsError.message })
    }
    if (childrenError) {
      return res.status(500).json({ error: childrenError.message })
    }
    if (placesError) {
      return res.status(500).json({ error: placesError.message })
    }

    const allTrips = (allTripsData ?? []) as TripRow[]
    const childrenById = new Map(
      ((childrenData ?? []) as ChildRow[]).map((item) => [item.id, item])
    )
    const placesById = new Map(
      ((placesData ?? []) as PlaceRow[]).map((item) => [item.id, item])
    )

    const eligibleOwnTrips = allTrips.filter(
      (trip) => trip.family_id === ownFamily.id && isTripEligible(trip)
    )

    const eligibleTargetTrips = allTrips.filter(
      (trip) => trip.family_id !== ownFamily.id && isTripEligible(trip)
    )

    if (eligibleOwnTrips.length === 0) {
      return res.status(200).json({
        family_id: ownFamily.id,
        results: [] as FamilyMatchResult[],
      })
    }

    const bestMatchesByFamily = new Map<string, Map<string, TripMatchDetail>>()

    for (const requesterTrip of eligibleOwnTrips) {
      for (const targetTrip of eligibleTargetTrips) {
        const pair = computeTripPair(requesterTrip, targetTrip, childrenById, placesById)
        if (!pair) continue

        const familyId = targetTrip.family_id
        const familyMap = bestMatchesByFamily.get(familyId) ?? new Map<string, TripMatchDetail>()

        const existing = familyMap.get(requesterTrip.id)

        if (!existing) {
          familyMap.set(requesterTrip.id, pair)
        } else {
          const currentIsBetter =
            pair.time_fit_score > existing.time_fit_score ||
            (pair.time_fit_score === existing.time_fit_score &&
              pair.time_diff_min < existing.time_diff_min)

          if (currentIsBetter) {
            familyMap.set(requesterTrip.id, pair)
          }
        }

        bestMatchesByFamily.set(familyId, familyMap)
      }
    }

    const targetFamilyIds = Array.from(bestMatchesByFamily.keys())

    let familiesById = new Map<string, FamilyRow>()
    if (targetFamilyIds.length > 0) {
      const { data: familiesData, error: familiesError } = await supabaseAdmin
        .from('families')
        .select('id, parent_first_name, parent_last_name, email')
        .in('id', targetFamilyIds)

      if (familiesError) {
        return res.status(500).json({ error: familiesError.message })
      }

      familiesById = new Map(
        ((familiesData ?? []) as FamilyRow[]).map((item) => [item.id, item])
      )
    }

    let latestHistoryByFamily = new Map<string, ContactRequestHistoryRow>()
    if (targetFamilyIds.length > 0) {
      const { data: historyData, error: historyError } = await supabaseAdmin
        .from('contact_requests')
        .select(`
          id,
          requester_family_id,
          target_family_id,
          status,
          created_at,
          accepted_at,
          responded_at,
          closed_at,
          expires_at
        `)
        .or(
          targetFamilyIds
            .flatMap((targetFamilyId) => [
              `and(requester_family_id.eq.${ownFamily.id},target_family_id.eq.${targetFamilyId})`,
              `and(requester_family_id.eq.${targetFamilyId},target_family_id.eq.${ownFamily.id})`,
            ])
            .join(',')
        )

      if (historyError) {
        return res.status(500).json({ error: historyError.message })
      }

      for (const item of (historyData ?? []) as ContactRequestHistoryRow[]) {
        const otherFamilyId =
          item.requester_family_id === ownFamily.id
            ? item.target_family_id
            : item.requester_family_id

        const existing = latestHistoryByFamily.get(otherFamilyId)

        if (!existing || existing.created_at < item.created_at) {
          latestHistoryByFamily.set(otherFamilyId, item)
        }
      }
    }

    const results: FamilyMatchResult[] = targetFamilyIds
      .map((targetFamilyId) => {
        const familyMatches = Array.from(
          (bestMatchesByFamily.get(targetFamilyId) ?? new Map()).values()
        ).sort((a, b) => {
          if (b.time_fit_score !== a.time_fit_score) {
            return b.time_fit_score - a.time_fit_score
          }
          return a.time_diff_min - b.time_diff_min
        })

        const matchedRequesterTripCount = familyMatches.length
        const averageTimeFitScore =
          familyMatches.length > 0
            ? familyMatches.reduce((sum, item) => sum + item.time_fit_score, 0) /
              familyMatches.length
            : 0

        const acceptingRatio =
          familyMatches.length > 0
            ? familyMatches.filter((item) => item.target_accepting_new_children).length /
              familyMatches.length
            : 0

        const family = familiesById.get(targetFamilyId)
        const historyInfo = buildHistoryInfo(
          latestHistoryByFamily.get(targetFamilyId),
          family?.email ?? null
        )

        const scoreInfo = buildFamilyScore({
          matchedRequesterTripCount,
          eligibleRequesterTripCount: eligibleOwnTrips.length,
          averageTimeFitScore,
          acceptingRatio,
          historyScoreNormalized: historyInfo.history_score_normalized,
        })

        const badgeInfo = buildBadge(scoreInfo.compatibility_score)

        const coveredDayOfWeekValues = Array.from(
          new Set(familyMatches.map((item) => item.day_of_week))
        ).sort((a, b) => a - b)

        return {
          target_family_id: targetFamilyId,
          target_parent_first_name: family?.parent_first_name ?? null,
          target_parent_last_name: family?.parent_last_name ?? null,
          target_email: family?.email ?? null,
          compatibility_score: scoreInfo.compatibility_score,
          trip_compatibility_score: scoreInfo.trip_compatibility_score,
          history_score_normalized: historyInfo.history_score_normalized,
          availability_score: scoreInfo.availability_score,
          coverage_ratio: scoreInfo.coverage_ratio,
          average_time_fit_score: Number(averageTimeFitScore.toFixed(4)),
          accepting_ratio: Number(acceptingRatio.toFixed(4)),
          history_status: historyInfo.history_status,
          history_label: historyInfo.history_label,
          history_request_id: historyInfo.history_request_id,
          history_created_at: historyInfo.history_created_at,
          history_contact_email: historyInfo.history_contact_email,
          badge_label: badgeInfo.badge_label,
          badge_tone: badgeInfo.badge_tone,
          matched_trip_count: familyMatches.length,
          matched_requester_trip_count: matchedRequesterTripCount,
          covered_day_of_week_values: coveredDayOfWeekValues,
          trip_matches: familyMatches,
        }
      })
      .sort((a, b) => {
        if (b.compatibility_score !== a.compatibility_score) {
          return b.compatibility_score - a.compatibility_score
        }
        if (b.matched_requester_trip_count !== a.matched_requester_trip_count) {
          return b.matched_requester_trip_count - a.matched_requester_trip_count
        }
        return a.target_family_id.localeCompare(b.target_family_id)
      })

    return res.status(200).json({
      family_id: ownFamily.id,
      results,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected server error'

    return res.status(500).json({ error: message })
  }
}