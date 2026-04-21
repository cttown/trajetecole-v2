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
  closeContactRequest,
} from '../../lib/dashboardShared'
import { getPriorityDelayText } from '../../lib/contactRequestConfig'

export default function DashboardRequestsPage() {
  const router = useRouter()

  const [sentRequests, setSentRequests] = useState<ContactRequestListItem[]>([])
  const [receivedRequests, setReceivedRequests] = useState<ContactRequestListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [respondingRequestId, setRespondingRequestId] = useState<string | null>(null)
  const [closingRequestId, setClosingRequestId] = useState<string | null>(null)
  const [cancellingRequestId, setCancellingRequestId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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
    setSuccess('')
    setRespondingRequestId(contactRequestId)

    try {
      await respondToContactRequest(contactRequestId, action)
      setSuccess(action === 'accept' ? 'Demande acceptée.' : 'Demande refusée.')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur.')
    } finally {
      setRespondingRequestId(null)
    }
  }

  async function handleCancel(contactRequestId: string) {
    if (!window.confirm('Confirmer l’annulation de cette demande ?')) return

    setError('')
    setSuccess('')
    setCancellingRequestId(contactRequestId)

    try {
      await cancelContactRequest(contactRequestId)
      setSuccess('Demande annulée.')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur.')
    } finally {
      setCancellingRequestId(null)
    }
  }

  async function handleClose(
    contactRequestId: string,
    outcome: 'agreement_found' | 'no_agreement'
  ) {
    const confirmed = window.confirm(
      outcome === 'agreement_found'
        ? 'Confirmer que vous avez trouvé un accord avec cette famille ?'
        : 'Confirmer que vous n’avez pas trouvé d’accord avec cette famille ?'
    )

    if (!confirmed) return

    setError('')
    setSuccess('')
    setClosingRequestId(contactRequestId)

    try {
      await closeContactRequest(contactRequestId, outcome)
      setSuccess(
        outcome === 'agreement_found'
          ? 'Demande clôturée avec accord.'
          : 'Demande clôturée sans accord.'
      )
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur.')
    } finally {
      setClosingRequestId(null)
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
              Créée le {formatDateTime(item.created_at)} · Délai de priorité jusqu’au{' '}
              {formatDateTime(item.expires_at)}
            </p>
          </div>

          <span
            className={
              item.status === 'pending'
                ? styles.badgeYellow
                : item.status === 'accepted' || item.status === 'closed_with_agreement'
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
                  {mode === 'received'
                    ? `Horaire de l’autre famille : ${formatTripTimeRange(targetTrip)}`
                    : `Horaire de l’autre famille : ${formatTripTimeRange(targetTrip)}`}
                </p>
              </div>
            )
          })}
        </div>

        {(item.status === 'accepted' || item.status === 'closed_with_agreement') &&
        item.other_family ? (
          <p className={styles.successMessage}>
            <strong>Coordonnée partagée :</strong> {item.other_family.email}
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

        {mode === 'sent' && item.status === 'accepted' ? (
          <div className={styles.itemActions}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => handleClose(item.id, 'agreement_found')}
              disabled={closingRequestId === item.id}
            >
              {closingRequestId === item.id ? 'Traitement...' : 'Accord trouvé'}
            </button>

            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => handleClose(item.id, 'no_agreement')}
              disabled={closingRequestId === item.id}
            >
              {closingRequestId === item.id ? 'Traitement...' : 'Pas d’accord trouvé'}
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
                <p className={styles.pageIntro}>
                  Toutes les demandes reçues et envoyées restent consultables ici.
                </p>
              </div>
              <div className={styles.topbarActions}>
                <Link href="/dashboard" className={styles.secondaryButton}>
                  Retour Mon espace
                </Link>
              </div>
            </div>

            {error ? <p className={styles.errorMessage}>{error}</p> : null}
            {success ? <p className={styles.successMessage}>{success}</p> : null}
            <p className={styles.smallMuted} style={{ fontStyle: 'italic', marginTop: 8 }}>
              Pendant le délai de priorité ({getPriorityDelayText()}), vous ne pouvez pas envoyer une nouvelle demande pour ce même trajet.
            </p>

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