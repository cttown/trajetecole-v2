import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import styles from '../../styles/Dashboard.module.css'
import {
  ContactRequestListItem,
  loadContactRequests,
  requireFamily,
  formatFullParentName,
  formatRequestStatus,
  formatSingleDay,
  formatTimeValue,
  respondToContactRequest,
  cancelContactRequest,
} from '../../lib/dashboardShared'
import type { SetGlobalPopup } from '../_app'

type Props = {
  setGlobalPopup?: SetGlobalPopup
}

type RequestTripSummary = {
  id: string
  day_of_week: number
  from_time: string
  to_time: string | null
  trip_group_id: string
  from_location_type?: 'place' | 'private_address' | null
  to_location_type?: 'place' | 'private_address' | null
  from_address?: string | null
  to_address?: string | null
  from_lat?: number | null
  from_lng?: number | null
  to_lat?: number | null
  to_lng?: number | null
  child?: {
    first_name: string
  } | null
  from_place?: {
    name: string
    city: string
  } | null
  to_place?: {
    name: string
    city: string
  } | null
  from_suggestion?: {
    suggested_name: string
    city: string
  } | null
  to_suggestion?: {
    suggested_name: string
    city: string
  } | null
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

function getDistancePrivacyLabel(distanceMeters: number | null) {
  if (distanceMeters === null) return 'information non disponible'
  if (distanceMeters < 100) return 'à proximité immédiate'
  if (distanceMeters < 300) return 'très proche'
  if (distanceMeters <= 500) return 'proche'
  return 'éloigné'
}

function getLocationLabel(
  trip: RequestTripSummary | null,
  side: 'from' | 'to'
) {
  if (!trip) return '—'

  const locationType = side === 'from' ? trip.from_location_type : trip.to_location_type
  const address = side === 'from' ? trip.from_address : trip.to_address
  const place = side === 'from' ? trip.from_place : trip.to_place
  const suggestion = side === 'from' ? trip.from_suggestion : trip.to_suggestion

  if (locationType === 'private_address') {
    return address || 'Adresse non renseignée'
  }

  if (place) return `${place.name} (${place.city})`
  if (suggestion) return `${suggestion.suggested_name} (${suggestion.city})`
  if (address) return address

  return 'Lieu non renseigné'
}

function getDistanceBetweenTrips(
  ownTrip: RequestTripSummary | null,
  otherTrip: RequestTripSummary | null,
  side: 'from' | 'to'
) {
  if (!ownTrip || !otherTrip) return null

  const ownLat = side === 'from' ? ownTrip.from_lat : ownTrip.to_lat
  const ownLng = side === 'from' ? ownTrip.from_lng : ownTrip.to_lng
  const otherLat = side === 'from' ? otherTrip.from_lat : otherTrip.to_lat
  const otherLng = side === 'from' ? otherTrip.from_lng : otherTrip.to_lng

  if (
    !isFiniteNumber(ownLat) ||
    !isFiniteNumber(ownLng) ||
    !isFiniteNumber(otherLat) ||
    !isFiniteNumber(otherLng)
  ) {
    return null
  }

  return getDistanceMeters(ownLat, ownLng, otherLat, otherLng)
}

function timeToMinutes(value: string | null | undefined) {
  if (!value) return null
  const [hours, minutes] = value.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null
  return hours * 60 + minutes
}

function getTimeDiffMinutes(
  ownTrip: RequestTripSummary | null,
  otherTrip: RequestTripSummary | null
) {
  const ownMinutes = timeToMinutes(ownTrip?.from_time)
  const otherMinutes = timeToMinutes(otherTrip?.from_time)

  if (ownMinutes === null || otherMinutes === null) return null
  return Math.abs(ownMinutes - otherMinutes)
}

function getOwnTrip(
  link: ContactRequestListItem['trip_links'][number],
  mode: 'received' | 'sent'
) {
  return (mode === 'received' ? link.target_trip : link.requester_trip) as RequestTripSummary | null
}

function getOtherTrip(
  link: ContactRequestListItem['trip_links'][number],
  mode: 'received' | 'sent'
) {
  return (mode === 'received' ? link.requester_trip : link.target_trip) as RequestTripSummary | null
}

export default function DashboardRequestsPage({ setGlobalPopup }: Props) {
  const router = useRouter()

  const [sentRequests, setSentRequests] = useState<ContactRequestListItem[]>([])
  const [receivedRequests, setReceivedRequests] = useState<ContactRequestListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [respondingRequestId, setRespondingRequestId] = useState<string | null>(null)
  const [cancellingRequestId, setCancellingRequestId] = useState<string | null>(null)
  const [error, setError] = useState('')

  function showPopup(message: string, type: 'success' | 'error' = 'success') {
    if (setGlobalPopup) {
      setGlobalPopup({ message, type })
      return
    }

    if (type === 'error') {
      setError(message)
    }
  }

  async function reload() {
    const data = await loadContactRequests()
    setSentRequests(data.sent)
    setReceivedRequests(data.received)
  }

  useEffect(() => {
    async function loadPage() {
      try {
        const { family } = await requireFamily(router)
        if (!family) return
        await reload()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur de chargement.')
      } finally {
        setLoading(false)
      }
    }

    loadPage()
  }, [router])

  async function handleRespond(contactRequestId: string, action: 'accept' | 'decline') {
    setError('')
    setRespondingRequestId(contactRequestId)

    try {
      await respondToContactRequest(contactRequestId, action)
      showPopup(action === 'accept' ? 'Demande acceptée.' : 'Demande refusée.', 'success')
      await reload()
    } catch (err) {
      showPopup(err instanceof Error ? err.message : 'Erreur.', 'error')
    } finally {
      setRespondingRequestId(null)
    }
  }

  async function handleCancel(contactRequestId: string) {
    if (!window.confirm('Confirmer l’annulation de cette demande ?')) return

    setError('')
    setCancellingRequestId(contactRequestId)

    try {
      await cancelContactRequest(contactRequestId)
      showPopup('Demande annulée.', 'success')
      await reload()
    } catch (err) {
      showPopup(err instanceof Error ? err.message : 'Erreur.', 'error')
    } finally {
      setCancellingRequestId(null)
    }
  }

  function RequestCard({
    item,
    mode,
  }: {
    item: ContactRequestListItem
    mode: 'received' | 'sent'
  }) {
    return (
      <div className={styles.itemCard}>
        <div className={styles.itemHeader}>
          <div>
            <h3 className={styles.itemTitle}>{formatFullParentName(item)}</h3>
          </div>

          <span
            className={
              item.status === 'pending'
                ? styles.badgeYellow
                : item.status === 'accepted'
                  ? styles.badgeGreen
                  : item.status === 'declined' || item.status === 'cancelled'
                    ? styles.badgeRed
                    : styles.badgeGrey
            }
          >
            {formatRequestStatus(item.status)}
          </span>
        </div>

        <div className={styles.itemBody}>
          {item.trip_links.map((link, index) => {
            const ownTrip = getOwnTrip(link, mode)
            const otherTrip = getOtherTrip(link, mode)
            const fromDistance = getDistanceBetweenTrips(ownTrip, otherTrip, 'from')
            const toDistance = getDistanceBetweenTrips(ownTrip, otherTrip, 'to')
            const timeDiffMinutes = getTimeDiffMinutes(ownTrip, otherTrip)

            return (
              <div key={link.id} className={styles.itemCard} style={{ padding: 14 }}>
                <p className={styles.itemMeta} style={{ marginBottom: 10 }}>
                  Trajet {index + 1}
                </p>

                <div className={styles.itemCardCompact} style={{ marginBottom: 10 }}>
                  <h4
                    className={styles.itemTitle}
                    style={{
                      fontSize: 17,
                      fontWeight: 800,
                      marginBottom: 10,
                      paddingBottom: 6,
                      borderBottom: '1px solid rgba(15, 23, 42, 0.12)',
                    }}
                  >
                    Votre trajet
                  </h4>
                  <p>
                    <strong>Enfant</strong> : {ownTrip?.child?.first_name || '—'}
                  </p>
                  <p>
                    <strong>Jour</strong> : {formatSingleDay(ownTrip?.day_of_week ?? 0)}
                  </p>
                  <p>
                    <strong>Horaire</strong> : {formatTimeValue(ownTrip?.from_time ?? null)}
                  </p>
                  <p>
                    <strong>Départ</strong> : {getLocationLabel(ownTrip, 'from')}
                  </p>
                  <p>
                    <strong>Destination</strong> : {getLocationLabel(ownTrip, 'to')}
                  </p>
                </div>

                <div className={styles.itemCardCompact} style={{ marginBottom: 10 }}>
                  <h4
                    className={styles.itemTitle}
                    style={{
                      fontSize: 17,
                      fontWeight: 800,
                      marginBottom: 10,
                      paddingBottom: 6,
                      borderBottom: '1px solid rgba(15, 23, 42, 0.12)',
                    }}
                  >
                    Compatibilité avec le trajet de l’autre famille
                  </h4>
                  <p>
                    <strong>Proximité du départ</strong> : {getDistancePrivacyLabel(fromDistance)}
                  </p>
                  <p>
                    <strong>Proximité de la destination</strong> : {getDistancePrivacyLabel(toDistance)}
                  </p>
                  <p>
                    <strong>Horaire de l’autre famille</strong> : {formatTimeValue(otherTrip?.from_time ?? null)}
                    {timeDiffMinutes !== null ? `, écart de ${timeDiffMinutes} min` : ''}
                  </p>
                </div>

                <div className={styles.itemCardCompact}>
                  <h4
                    className={styles.itemTitle}
                    style={{
                      fontSize: 17,
                      fontWeight: 800,
                      marginBottom: 10,
                      paddingBottom: 6,
                      borderBottom: '1px solid rgba(15, 23, 42, 0.12)',
                    }}
                  >
                    Statut
                  </h4>
                  <p>
                    <strong>Demande</strong> : {formatRequestStatus(item.status)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {item.status === 'accepted' && item.other_family ? (
          <p className={styles.successMessage}>
            <strong>Email :</strong> {item.other_family.email}
          </p>
        ) : null}

        {mode === 'received' && item.status === 'pending' ? (
          <div className={styles.itemActions}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => handleRespond(item.id, 'accept')}
              disabled={respondingRequestId === item.id}
            >
              {respondingRequestId === item.id ? 'Traitement...' : 'Accepter'}
            </button>

            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => handleRespond(item.id, 'decline')}
              disabled={respondingRequestId === item.id}
            >
              {respondingRequestId === item.id ? 'Traitement...' : 'Refuser'}
            </button>
          </div>
        ) : null}

        {mode === 'sent' && item.status === 'pending' ? (
          <div className={styles.itemActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => handleCancel(item.id)}
              disabled={cancellingRequestId === item.id}
            >
              {cancellingRequestId === item.id ? 'Traitement...' : 'Annuler la demande'}
            </button>
          </div>
        ) : null}
      </div>
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
        <title>Mes demandes - TrajetEcole</title>
      </Head>

      <main className={styles.page}>
        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.topbar}>
              <div>
                <h1 className={styles.pageTitle}>Mes demandes</h1>
              </div>
              <div className={styles.topbarActions}>
                <Link href="/dashboard" className={styles.secondaryButton}>
                  Retour Mon espace
                </Link>
              </div>
            </div>

            {error ? <p className={styles.errorMessage}>{error}</p> : null}

            <div className={styles.grid2}>
              <div className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.sectionTitle}>Demandes reçues</h2>
                  </div>
                </div>

                {receivedRequests.length === 0 ? (
                  <p className={styles.statusMessage}>Aucune demande reçue.</p>
                ) : (
                  <div className={styles.itemList}>
                    {receivedRequests.map((item) => (
                      <RequestCard key={item.id} item={item} mode="received" />
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.sectionTitle}>Demandes envoyées</h2>
                  </div>
                </div>

                {sentRequests.length === 0 ? (
                  <p className={styles.statusMessage}>Aucune demande envoyée.</p>
                ) : (
                  <div className={styles.itemList}>
                    {sentRequests.map((item) => (
                      <RequestCard key={item.id} item={item} mode="sent" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
