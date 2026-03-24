import { FormEvent, useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
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

function formatKind(kind: PlaceSuggestion['kind']) {
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

function statusBadgeStyle(status: PlaceSuggestion['status']) {
  if (status === 'pending') {
    return { background: '#fffbeb', color: '#92400e' }
  }
  if (status === 'approved_new_place' || status === 'mapped_to_existing_place') {
    return { background: '#ecfdf3', color: '#027a48' }
  }
  return { background: '#fef2f2', color: '#b42318' }
}

export default function DashboardPlacesPage() {
  const router = useRouter()
  const fromFindMatch = router.query.from === 'find-match'

  const [family, setFamily] = useState<Family | null>(null)
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [suggestedName, setSuggestedName] = useState('')
  const [suggestedKind, setSuggestedKind] = useState<'school' | 'activity' | 'other'>('school')
  const [suggestedCity, setSuggestedCity] = useState('')
  const [suggestedExactAddress, setSuggestedExactAddress] = useState('')
  const [suggestedPostalCode, setSuggestedPostalCode] = useState('')
  const [suggestedComment, setSuggestedComment] = useState('')

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

      const { data: suggestionsData, error: suggestionsError } = await supabase
        .from('place_suggestions')
        .select('*')
        .eq('family_id', familyData.id)
        .order('created_at', { ascending: false })

      if (suggestionsError) {
        setError(suggestionsError.message)
        setLoading(false)
        return
      }

      setSuggestions((suggestionsData ?? []) as PlaceSuggestion[])
      setLoading(false)
    }

    loadPage()
  }, [router])

  const pendingCount = useMemo(
    () => suggestions.filter((item) => item.status === 'pending').length,
    [suggestions]
  )

  const approvedCount = useMemo(
    () =>
      suggestions.filter(
        (item) =>
          item.status === 'approved_new_place' ||
          item.status === 'mapped_to_existing_place'
      ).length,
    [suggestions]
  )

  const rejectedCount = useMemo(
    () => suggestions.filter((item) => item.status === 'rejected').length,
    [suggestions]
  )

  async function handleSubmit(e: FormEvent) {
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

    setSaving(true)

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

    setSaving(false)

    if (error) {
      setError(error.message)
      return
    }

    setSuggestions((prev) => [data as PlaceSuggestion, ...prev])
    setSuggestedName('')
    setSuggestedKind('school')
    setSuggestedCity('')
    setSuggestedExactAddress('')
    setSuggestedPostalCode('')
    setSuggestedComment('')
    setSuccess(
      'Lieu proposé. Il devra être validé par l’administrateur avant d’être pris en compte dans la recherche.'
    )
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
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
        <title>Lieux - TrajetEcole</title>
      </Head>

      <main className={styles.page}>
        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.topbar}>
              <div>
                <h1 className={styles.pageTitle}>Lieux</h1>
                <p className={styles.pageIntro}>
                  Consultez vos suggestions de lieux et proposez-en un nouveau si nécessaire.
                </p>
              </div>

              <div className={styles.topbarActions}>
                <Link href="/dashboard" className={styles.secondaryButton}>
                  Retour dashboard
                </Link>
                {fromFindMatch ? (
                  <Link href="/dashboard/find-match" className={styles.primaryButton}>
                    Reprendre la recherche
                  </Link>
                ) : null}
              </div>
            </div>

            <div
              style={{
                marginBottom: 24,
                padding: 14,
                borderRadius: 14,
                background: '#fffbeb',
                color: '#92400e',
                border: '1px solid #f3d38a',
                lineHeight: 1.6,
              }}
            >
              <strong>Important :</strong> privilégiez les lieux déjà disponibles lorsque c’est
              possible. Un lieu proposé ici devra être validé par l’administrateur avant d’être pris
              en compte dans la recherche.
            </div>

            <div className={styles.grid3}>
              <div className={styles.summaryCard}>
                <p className={styles.summaryLabel}>En attente</p>
                <p className={styles.summaryValue}>{pendingCount}</p>
              </div>

              <div className={styles.summaryCard}>
                <p className={styles.summaryLabel}>Validées</p>
                <p className={styles.summaryValue}>{approvedCount}</p>
              </div>

              <div className={styles.summaryCard}>
                <p className={styles.summaryLabel}>Rejetées</p>
                <p className={styles.summaryValue}>{rejectedCount}</p>
              </div>
            </div>

            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>Proposer un nouveau lieu</h2>
                  <p className={styles.sectionText}>
                    Remplissez ce formulaire uniquement si le lieu n’existe pas déjà.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.field}>
                  <label>Nom du lieu</label>
                  <input
                    className={styles.input}
                    type="text"
                    value={suggestedName}
                    onChange={(e) => setSuggestedName(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label>Type</label>
                    <select
                      className={styles.select}
                      value={suggestedKind}
                      onChange={(e) =>
                        setSuggestedKind(e.target.value as 'school' | 'activity' | 'other')
                      }
                    >
                      <option value="school">École</option>
                      <option value="activity">Activité</option>
                      <option value="other">Autre</option>
                    </select>
                  </div>

                  <div className={styles.field}>
                    <label>Ville</label>
                    <input
                      className={styles.input}
                      type="text"
                      value={suggestedCity}
                      onChange={(e) => setSuggestedCity(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label>Adresse exacte</label>
                    <input
                      className={styles.input}
                      type="text"
                      value={suggestedExactAddress}
                      onChange={(e) => setSuggestedExactAddress(e.target.value)}
                    />
                  </div>

                  <div className={styles.field}>
                    <label>Code postal</label>
                    <input
                      className={styles.input}
                      type="text"
                      value={suggestedPostalCode}
                      onChange={(e) => setSuggestedPostalCode(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label>Commentaire</label>
                  <textarea
                    className={styles.textarea}
                    value={suggestedComment}
                    onChange={(e) => setSuggestedComment(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className={styles.itemActions}>
                  <button type="submit" className={styles.primaryButton} disabled={saving}>
                    {saving ? 'Envoi...' : 'Proposer ce lieu'}
                  </button>
                </div>
              </form>
            </div>

            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>Mes suggestions de lieux</h2>
                  <p className={styles.sectionText}>
                    Suivez ici l’état de validation de vos propositions.
                  </p>
                </div>
              </div>

              {suggestions.length === 0 ? (
                <p className={styles.statusMessage}>Aucune suggestion envoyée.</p>
              ) : (
                <div className={styles.itemList}>
                  {suggestions.map((item) => {
                    const badge = statusBadgeStyle(item.status)

                    return (
                      <div key={item.id} className={styles.itemCard}>
                        <div className={styles.itemHeader}>
                          <div>
                            <h3 className={styles.itemTitle}>{item.suggested_name}</h3>
                            <p className={styles.itemMeta}>
                              {item.city}
                              {item.postal_code ? ` · ${item.postal_code}` : ''}
                            </p>
                          </div>

                          <span
                            className={styles.badge}
                            style={{ background: badge.background, color: badge.color }}
                          >
                            {formatSuggestionStatus(item.status)}
                          </span>
                        </div>

                        <div className={styles.itemBody}>
                          <p>Type : {formatKind(item.kind)}</p>
                          <p>Adresse : {item.exact_address || '—'}</p>
                          <p>Commentaire : {item.comment || '—'}</p>
                          <p>Note admin : {item.review_note || '—'}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className={styles.itemActions}>
              <Link href="/" className={styles.secondaryButton}>
                Accueil
              </Link>
              <button onClick={handleLogout} className={styles.secondaryButton}>
                Se déconnecter
              </button>
            </div>

            {error ? <p className={styles.errorMessage}>{error}</p> : null}
            {success ? <p className={styles.successMessage}>{success}</p> : null}
          </div>
        </section>
      </main>
    </>
  )
}