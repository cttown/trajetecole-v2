import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import {
  createContactRequestEmailActionToken,
  sendEmail,
} from '../../../lib/email'
import {
  CONTACT_REQUEST_RESPONSE_WINDOW_MS,
  getContactRequestRetryMessage,
} from '../../../lib/contactRequestConfig'

type CreateContactRequestBody = {
  target_family_id: string
  requester_trip_ids: string[]
}

type TripRow = {
  id: string
  family_id: string
  child_id: string
  from_location_type: 'place' | 'private_address'
  to_location_type: 'place' | 'private_address'
  from_place_id: string | null
  to_place_id: string | null
  from_address: string | null
  to_address: string | null
  from_lat: number | null
  from_lng: number | null
  to_lat: number | null
  to_lng: number | null
  day_of_week: number
  from_time: string
  to_time: string | null
  tolerance_min: number
  status: 'searching' | 'resolved_open' | 'resolved' | 'archived'
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
}

type PlaceRow = {
  id: string
  name: string
  city: string
}

type CompatiblePair = {
  requester_trip_id: string
  target_trip_id: string
  compatibility_score: number
  time_diff_min: number
  from_distance_m: number
  to_distance_m: number
  from_distance_label: string
  to_distance_label: string
}

const PENDING_RETRY_BLOCK_MS = 24 * 60 * 60 * 1000

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`)
  }
  return value
}

function getAppBaseUrl() {
  return requireEnv('APP_BASE_URL')
}

function displayParentName(family: FamilyRow) {
  const full = `${family.parent_first_name ?? ''} ${family.parent_last_name ?? ''}`.trim()
  return full || family.email
}

function timeToMinutes(value: string | null): number | null {
  if (!value) return null
  const [hours, minutes] = value.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null
  return hours * 60 + minutes
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function getDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) {
  const earthRadiusMeters = 6371000
  const toRad = (value: number) => (value * Math.PI) / 180

  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function getDistanceScore(distanceMeters: number) {
  if (distanceMeters < 20) return 30
  if (distanceMeters < 100) return 25
  if (distanceMeters < 200) return 20
  if (distanceMeters < 300) return 15
  if (distanceMeters <= 500) return 5
  return 0
}

function getDistancePrivacyLabel(distanceMeters: number) {
  if (distanceMeters < 100) return 'à proximité immédiate'
  if (distanceMeters < 300) return 'très proche'
  if (distanceMeters <= 500) return 'proche'
  return 'trop éloigné'
}

function getTimeScore(diffMinutes: number) {
  if (diffMinutes <= 5) return 30
  if (diffMinutes <= 10) return 25
  if (diffMinutes <= 15) return 20
  if (diffMinutes <= 30) return 10
  return 0
}

function isRequesterTripEligible(trip: TripRow) {
  return (
    trip.status === 'searching' &&
    isFiniteNumber(trip.from_lat) &&
    isFiniteNumber(trip.from_lng) &&
    isFiniteNumber(trip.to_lat) &&
    isFiniteNumber(trip.to_lng)
  )
}

function isTargetTripEligible(trip: TripRow) {
  return (
    (trip.status === 'searching' || trip.status === 'resolved_open') &&
    isFiniteNumber(trip.from_lat) &&
    isFiniteNumber(trip.from_lng) &&
    isFiniteNumber(trip.to_lat) &&
    isFiniteNumber(trip.to_lng)
  )
}

function compareTrips(requesterTrip: TripRow, targetTrip: TripRow): CompatiblePair | null {
  if (requesterTrip.day_of_week !== targetTrip.day_of_week) return null

  if (
    !isFiniteNumber(requesterTrip.from_lat) ||
    !isFiniteNumber(requesterTrip.from_lng) ||
    !isFiniteNumber(requesterTrip.to_lat) ||
    !isFiniteNumber(requesterTrip.to_lng) ||
    !isFiniteNumber(targetTrip.from_lat) ||
    !isFiniteNumber(targetTrip.from_lng) ||
    !isFiniteNumber(targetTrip.to_lat) ||
    !isFiniteNumber(targetTrip.to_lng)
  ) {
    return null
  }

  const fromDistanceMeters = getDistanceMeters(
    requesterTrip.from_lat,
    requesterTrip.from_lng,
    targetTrip.from_lat,
    targetTrip.from_lng
  )

  if (fromDistanceMeters > 500) return null

  const toDistanceMeters = getDistanceMeters(
    requesterTrip.to_lat,
    requesterTrip.to_lng,
    targetTrip.to_lat,
    targetTrip.to_lng
  )

  if (toDistanceMeters > 500) return null

  const requesterMin = timeToMinutes(requesterTrip.from_time)
  const targetMin = timeToMinutes(targetTrip.from_time)
  if (requesterMin === null || targetMin === null) return null

  const timeDiffMin = Math.abs(requesterMin - targetMin)
  if (timeDiffMin > 30) return null

  const compatibilityScore =
    getDistanceScore(fromDistanceMeters) +
    getDistanceScore(toDistanceMeters) +
    getTimeScore(timeDiffMin)

  // La validation d'envoi ne tient pas compte du score historique.
  // L'historique sert à classer / bloquer temporairement dans l'écran de recherche.
  if (compatibilityScore < 50) return null

  return {
    requester_trip_id: requesterTrip.id,
    target_trip_id: targetTrip.id,
    compatibility_score: compatibilityScore,
    time_diff_min: timeDiffMin,
    from_distance_m: Math.round(fromDistanceMeters),
    to_distance_m: Math.round(toDistanceMeters),
    from_distance_label: getDistancePrivacyLabel(fromDistanceMeters),
    to_distance_label: getDistancePrivacyLabel(toDistanceMeters),
  }
}

function formatDay(dayOfWeek: number) {
  const labels: Record<number, string> = {
    1: 'Lundi',
    2: 'Mardi',
    3: 'Mercredi',
    4: 'Jeudi',
    5: 'Vendredi',
    6: 'Samedi',
    7: 'Dimanche',
  }

  return labels[dayOfWeek] || `Jour ${dayOfWeek}`
}

function formatTimeValue(value: string | null) {
  if (!value) return '—'
  return value.slice(0, 5)
}

function formatOwnLocation(
  locationType: 'place' | 'private_address',
  placeId: string | null,
  address: string | null,
  placeMap: Record<string, PlaceRow>
) {
  if (locationType === 'private_address') {
    return address || 'Adresse non renseignée'
  }

  if (!placeId) return 'Lieu non renseigné'
  const place = placeMap[placeId]
  if (!place) return 'Lieu inconnu'
  return `${place.name} (${place.city})`
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

type EmailButton = {
  label: string
  url: string
  kind: 'primary' | 'secondary'
}

type TripEmailTable = {
  title: string
  rows: Array<{
    label: string
    ownTrip: string
    requesterTrip: string
  }>
}

function buildEmailButton(button: EmailButton) {
  const background = button.kind === 'primary' ? '#2563eb' : '#eef2ff'
  const color = button.kind === 'primary' ? '#ffffff' : '#1d4ed8'
  const border = button.kind === 'primary' ? '#2563eb' : '#c7d2fe'

  return `
    <a href="${escapeHtml(button.url)}" style="display:inline-block;margin:6px 8px 6px 0;padding:11px 16px;border-radius:10px;background:${background};color:${color};border:1px solid ${border};font-weight:700;text-decoration:none;">
      ${escapeHtml(button.label)}
    </a>
  `
}

function buildTripTable(table: TripEmailTable) {
  const rowsHtml = table.rows
    .map(
      (row) => `
        <tr>
          <th style="width:26%;padding:10px 12px;border-top:1px solid #e5e7eb;text-align:left;font-size:14px;color:#374151;background:#f9fafb;vertical-align:top;">
            ${escapeHtml(row.label)}
          </th>
          <td style="width:37%;padding:10px 12px;border-top:1px solid #e5e7eb;font-size:14px;color:#111827;vertical-align:top;">
            ${escapeHtml(row.ownTrip)}
          </td>
          <td style="width:37%;padding:10px 12px;border-top:1px solid #e5e7eb;font-size:14px;color:#111827;vertical-align:top;">
            ${escapeHtml(row.requesterTrip)}
          </td>
        </tr>
      `
    )
    .join('')

  return `
    <section style="margin:22px 0;padding:0;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;background:#ffffff;">
      <h2 style="margin:0;padding:14px 16px;background:#f3f4f6;font-size:18px;line-height:1.3;color:#111827;">
        ${escapeHtml(table.title)}
      </h2>
      <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="padding:10px 12px;text-align:left;font-size:13px;color:#6b7280;background:#ffffff;">Élément</th>
            <th style="padding:10px 12px;text-align:left;font-size:13px;color:#6b7280;background:#ffffff;">Votre trajet</th>
            <th style="padding:10px 12px;text-align:left;font-size:13px;color:#6b7280;background:#ffffff;">Famille demandeuse</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </section>
  `
}

function buildContactRequestEmailHtml(args: {
  title: string
  intro: string
  tripTables: TripEmailTable[]
  note: string
  nextSteps: string[]
  buttons: EmailButton[]
  footerNote: string
}) {
  const tripTablesHtml = args.tripTables.map(buildTripTable).join('')
  const nextStepsHtml = args.nextSteps
    .map(
      (line) => `<li style="margin:7px 0;">${escapeHtml(line)}</li>`
    )
    .join('')
  const buttonsHtml = args.buttons.map(buildEmailButton).join('')

  return `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(args.title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <div style="max-width:720px;margin:0 auto;padding:24px 14px;">
      <main style="background:#ffffff;border-radius:18px;padding:24px;border:1px solid #e5e7eb;">
        <h1 style="margin:0 0 14px;font-size:24px;line-height:1.25;color:#111827;">
          ${escapeHtml(args.title)}
        </h1>
        <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#374151;">
          ${escapeHtml(args.intro)}
        </p>

        ${tripTablesHtml}

        <section style="margin:22px 0;padding:14px 16px;border-radius:14px;background:#fff7ed;border:1px solid #fed7aa;">
          <h2 style="margin:0 0 8px;font-size:17px;color:#9a3412;">À noter</h2>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#7c2d12;">
            ${escapeHtml(args.note)}
          </p>
        </section>

        <section style="margin:22px 0;padding:14px 16px;border-radius:14px;background:#f9fafb;border:1px solid #e5e7eb;">
          <h2 style="margin:0 0 8px;font-size:17px;color:#111827;">Que faire maintenant ?</h2>
          <ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.6;color:#374151;">
            ${nextStepsHtml}
          </ul>
        </section>

        <div style="margin-top:20px;">
          ${buttonsHtml}
        </div>

        <p style="margin:22px 0 0;font-size:13px;line-height:1.5;color:#6b7280;">
          ${escapeHtml(args.footerNote)}
        </p>
      </main>
    </div>
  </body>
</html>
  `
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = req.body as CreateContactRequestBody
    const targetFamilyId = body?.target_family_id
    const requesterTripIds = Array.isArray(body?.requester_trip_ids)
      ? Array.from(new Set(body.requester_trip_ids.filter(Boolean)))
      : []

    if (!targetFamilyId) {
      return res.status(400).json({ error: 'target_family_id is required' })
    }

    if (requesterTripIds.length === 0) {
      return res.status(400).json({ error: 'requester_trip_ids is required' })
    }

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

    const { data: requesterFamily, error: requesterFamilyError } = await supabaseAdmin
      .from('families')
      .select('id, parent_first_name, parent_last_name, email')
      .eq('auth_user_id', user.id)
      .single()

    if (requesterFamilyError || !requesterFamily) {
      return res.status(404).json({ error: 'Requester family not found' })
    }

    if (requesterFamily.id === targetFamilyId) {
      return res.status(400).json({
        error: 'Vous ne pouvez pas contacter votre propre famille.',
      })
    }

    const { data: targetFamily, error: targetFamilyError } = await supabaseAdmin
      .from('families')
      .select('id, parent_first_name, parent_last_name, email')
      .eq('id', targetFamilyId)
      .single()

    if (targetFamilyError || !targetFamily) {
      return res.status(404).json({ error: 'Target family not found' })
    }

    const { data: requesterTripsData, error: requesterTripsError } = await supabaseAdmin
      .from('trips')
      .select(`
        id,
        family_id,
        child_id,
        from_location_type,
        to_location_type,
        from_place_id,
        to_place_id,
        from_address,
        to_address,
        from_lat,
        from_lng,
        to_lat,
        to_lng,
        day_of_week,
        from_time,
        to_time,
        tolerance_min,
        status,
        trip_group_id
      `)
      .in('id', requesterTripIds)

    if (requesterTripsError) {
      return res.status(500).json({ error: requesterTripsError.message })
    }

    const requesterTrips = (requesterTripsData ?? []) as TripRow[]

    if (requesterTrips.length !== requesterTripIds.length) {
      return res.status(400).json({ error: 'Certains trajets n’ont pas été trouvés.' })
    }

    const invalidRequesterTrip = requesterTrips.find(
      (trip) => trip.family_id !== requesterFamily.id || !isRequesterTripEligible(trip)
    )

    if (invalidRequesterTrip) {
      return res.status(400).json({
        error: 'Certains trajets sélectionnés ne sont pas prêts pour la recherche.',
      })
    }

    const pendingCutoffIso = new Date(Date.now() - PENDING_RETRY_BLOCK_MS).toISOString()

    const { data: recentPendingRequests, error: recentPendingRequestsError } =
      await supabaseAdmin
        .from('contact_requests')
        .select('id, created_at')
        .eq('status', 'pending')
        .gte('created_at', pendingCutoffIso)
        .or(
          `and(requester_family_id.eq.${requesterFamily.id},target_family_id.eq.${targetFamilyId}),and(requester_family_id.eq.${targetFamilyId},target_family_id.eq.${requesterFamily.id})`
        )

    if (recentPendingRequestsError) {
      return res.status(500).json({ error: recentPendingRequestsError.message })
    }

    if ((recentPendingRequests ?? []).length > 0) {
      return res.status(409).json({
        error: getContactRequestRetryMessage(),
        code: 'REQUEST_RETRY_BLOCKED',
      })
    }

    const { data: targetTripsData, error: targetTripsError } = await supabaseAdmin
      .from('trips')
      .select(`
        id,
        family_id,
        child_id,
        from_location_type,
        to_location_type,
        from_place_id,
        to_place_id,
        from_address,
        to_address,
        from_lat,
        from_lng,
        to_lat,
        to_lng,
        day_of_week,
        from_time,
        to_time,
        tolerance_min,
        status,
        trip_group_id
      `)
      .eq('family_id', targetFamilyId)
      .in('status', ['searching', 'resolved_open'])

    if (targetTripsError) {
      return res.status(500).json({ error: targetTripsError.message })
    }

    const targetTrips = ((targetTripsData ?? []) as TripRow[]).filter(isTargetTripEligible)

    const matchedPairs: CompatiblePair[] = []

    for (const requesterTrip of requesterTrips) {
      const compatibleTargetTrips = targetTrips
        .map((targetTrip) => compareTrips(requesterTrip, targetTrip))
        .filter((item): item is CompatiblePair => item !== null)
        .sort((a, b) => b.compatibility_score - a.compatibility_score)

      if (compatibleTargetTrips.length === 0) {
        return res.status(409).json({
          error: 'Certains trajets sélectionnés ne sont plus compatibles avec cette famille.',
          code: 'NO_LONGER_COMPATIBLE',
        })
      }

      matchedPairs.push(compatibleTargetTrips[0])
    }

    const expiresAt = new Date(
      Date.now() + CONTACT_REQUEST_RESPONSE_WINDOW_MS
    ).toISOString()

    const { data: createdRequest, error: createRequestError } = await supabaseAdmin
      .from('contact_requests')
      .insert({
        requester_family_id: requesterFamily.id,
        target_family_id: targetFamilyId,
        status: 'pending',
        expires_at: expiresAt,
      })
      .select('id, requester_family_id, target_family_id, status, created_at, expires_at')
      .single()

    if (createRequestError || !createdRequest) {
      return res.status(500).json({
        error: createRequestError?.message || 'Failed to create request',
      })
    }

    const tripRows = matchedPairs.map((pair) => ({
      contact_request_id: createdRequest.id,
      requester_trip_id: pair.requester_trip_id,
      target_trip_id: pair.target_trip_id,
    }))

    const { error: createTripRowsError } = await supabaseAdmin
      .from('contact_request_trips')
      .insert(tripRows)

    if (createTripRowsError) {
      await supabaseAdmin.from('contact_requests').delete().eq('id', createdRequest.id)

      return res.status(500).json({
        error: createTripRowsError.message,
      })
    }

    try {
      const targetTripMap = Object.fromEntries(targetTrips.map((trip) => [trip.id, trip]))

      const allChildIds = Array.from(
        new Set([
          ...requesterTrips.map((trip) => trip.child_id),
          ...matchedPairs
            .map((pair) => targetTripMap[pair.target_trip_id]?.child_id)
            .filter(Boolean),
        ] as string[])
      )

      const allTripsForEmail = [
        ...requesterTrips,
        ...matchedPairs
          .map((pair) => targetTripMap[pair.target_trip_id])
          .filter((trip): trip is TripRow => Boolean(trip)),
      ]

      const placeIds = Array.from(
        new Set(
          [
            ...allTripsForEmail.map((trip) => trip.from_place_id).filter(Boolean),
            ...allTripsForEmail.map((trip) => trip.to_place_id).filter(Boolean),
          ] as string[]
        )
      )

      const [{ data: childRows }, { data: placeRows }] = await Promise.all([
        allChildIds.length > 0
          ? supabaseAdmin.from('children').select('id, first_name').in('id', allChildIds)
          : Promise.resolve({ data: [] as ChildRow[] }),
        placeIds.length > 0
          ? supabaseAdmin.from('places').select('id, name, city').in('id', placeIds)
          : Promise.resolve({ data: [] as PlaceRow[] }),
      ])

      const childMap = Object.fromEntries(
        ((childRows ?? []) as ChildRow[]).map((child) => [child.id, child])
      )
      const placeMap = Object.fromEntries(
        ((placeRows ?? []) as PlaceRow[]).map((place) => [place.id, place])
      )
      const requesterTripMap = Object.fromEntries(requesterTrips.map((trip) => [trip.id, trip]))

      const tripTables = matchedPairs.map((pair, index) => {
        const requesterTrip = requesterTripMap[pair.requester_trip_id]
        const targetTrip = targetTripMap[pair.target_trip_id]
        const targetChild = targetTrip ? childMap[targetTrip.child_id] : null

        return {
          title: `Trajet ${index + 1}`,
          rows: [
            {
              label: 'Enfant',
              ownTrip: targetChild?.first_name || '—',
              requesterTrip: '—',
            },
            {
              label: 'Jour',
              ownTrip: targetTrip ? formatDay(targetTrip.day_of_week) : '—',
              requesterTrip: requesterTrip ? formatDay(requesterTrip.day_of_week) : '—',
            },
            {
              label: 'Horaire',
              ownTrip: targetTrip ? formatTimeValue(targetTrip.from_time) : '—',
              requesterTrip: requesterTrip
                ? `${formatTimeValue(requesterTrip.from_time)}, écart de ${pair.time_diff_min} min`
                : '—',
            },
            {
              label: 'Départ',
              ownTrip: targetTrip
                ? formatOwnLocation(
                    targetTrip.from_location_type,
                    targetTrip.from_place_id,
                    targetTrip.from_address,
                    placeMap
                  )
                : '—',
              requesterTrip: pair.from_distance_label,
            },
            {
              label: 'Destination',
              ownTrip: targetTrip
                ? formatOwnLocation(
                    targetTrip.to_location_type,
                    targetTrip.to_place_id,
                    targetTrip.to_address,
                    placeMap
                  )
                : '—',
              requesterTrip: pair.to_distance_label,
            },
          ],
        }
      })

      const appBaseUrl = getAppBaseUrl()

      const acceptToken = createContactRequestEmailActionToken({
        requestId: createdRequest.id,
        targetFamilyId: targetFamily.id,
        action: 'accept',
        exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
      })

      const declineToken = createContactRequestEmailActionToken({
        requestId: createdRequest.id,
        targetFamilyId: targetFamily.id,
        action: 'decline',
        exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
      })

      await sendEmail({
        to: targetFamily.email,
        subject: 'Nouvelle demande de mise en relation sur TrajetEcole',
        html: buildContactRequestEmailHtml({
          title: 'Nouvelle demande de mise en relation',
          intro: `Bonjour ${displayParentName(targetFamily as FamilyRow)}, ${displayParentName(
            requesterFamily as FamilyRow
          )} souhaite entrer en contact avec vous via TrajetEcole.`,
          tripTables,
          note:
            'Le trajet exact de la famille demandeuse sera communiqué uniquement si vous acceptez la mise en relation.',
          nextSteps: [
            'Vous pouvez répondre directement depuis cet email, ou retrouver cette demande dans votre espace TrajetEcole.',
            'Vous pouvez aussi mettre à jour vos trajets afin de recevoir des demandes qui correspondent mieux à vos besoins actuels : allez dans Mon espace, puis Trajets.',
          ],
          buttons: [
            {
              label: 'Accepter',
              url: `${appBaseUrl}/api/contact-requests/email-action?token=${encodeURIComponent(
                acceptToken
              )}`,
              kind: 'primary',
            },
            {
              label: 'Refuser',
              url: `${appBaseUrl}/api/contact-requests/email-action?token=${encodeURIComponent(
                declineToken
              )}`,
              kind: 'secondary',
            },
            {
              label: 'Voir mon espace',
              url: `${appBaseUrl}/dashboard`,
              kind: 'secondary',
            },
          ],
          footerNote:
            'Merci pour votre réponse. Elle aidera à organiser plus facilement les trajets entre familles.',
        }),
      })
    } catch (emailError) {
      console.error('Failed to send contact request email:', emailError)
    }

    return res.status(200).json({
      request: createdRequest,
      linked_trip_count: tripRows.length,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected server error'

    return res.status(500).json({ error: message })
  }
}
