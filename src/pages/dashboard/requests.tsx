import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import styles from '../../styles/Dashboard.module.css'
import {
  ContactRequestListItem,
  loadContactRequests,
  requireFamily,
  formatDateTime,
  formatFullParentName,
  formatRequestStatus,
  formatSingleDay,
  formatTripPlaceLabel,
  formatTripTimeRange,
  respondToContactRequest,
  cancelContactRequest,
} from '../../lib/dashboardShared'
import type { SetGlobalPopup } from '../_app'

type Props = {
  setGlobalPopup?: SetGlobalPopup
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
            <p className={styles.itemMeta}>
              Créée le {formatDateTime(item.created_at)} · Expire le {formatDateTime(item.expires_at)}
            </p>
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
          <p>
            <strong>Autre parent :</strong> {formatFullParentName(item)}
          </p>

          {item.trip_links.map((link) => {
            const requesterTrip = link.requester_trip
            const targetTrip = link.target_trip

            return (
              <div key={link.id} className={styles.itemCard} style={{ padding: 14 }}>
                <p>
                  <strong>Enfant :</strong> {requesterTrip?.child?.first_name || '—'}
                </p>
                <p>
                  <strong>Jour :</strong> {formatSingleDay(requesterTrip?.day_of_week ?? 0)}
                </p>
                <p>
                  <strong>Votre horaire :</strong> {formatTripTimeRange(requesterTrip)}
                </p>
                <p>
                  <strong>Départ :</strong>{' '}
                  {formatTripPlaceLabel(requesterTrip?.from_place, requesterTrip?.from_suggestion)}
                </p>
                <p>
                  <strong>Destination :</strong>{' '}
                  {formatTripPlaceLabel(requesterTrip?.to_place, requesterTrip?.to_suggestion)}
                </p>
                <p className={styles.smallMuted}>
                  Horaire de l’autre famille : {formatTripTimeRange(targetTrip)}
                </p>
              </div>
            )
          })}
        </div>

        {item.status === 'accepted' && item.other_family ? (
          <p className={styles.successMessage}>
            <strong>Email partagé :</strong> {item.other_family.email}
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