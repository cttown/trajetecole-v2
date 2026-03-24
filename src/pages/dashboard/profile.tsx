import Head from 'next/head'
import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import styles from '../../styles/Dashboard.module.css'
import { Family, requireFamily } from '../../lib/dashboardShared'
import { supabase } from '../../lib/supabaseClient'

export default function DashboardProfilePage() {
  const router = useRouter()

  const [family, setFamily] = useState<Family | null>(null)
  const [parentFirstName, setParentFirstName] = useState('')
  const [parentLastName, setParentLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    async function loadPage() {
      try {
        const result = await requireFamily(router)
        if (!result.family) return

        setFamily(result.family)
        setParentFirstName(result.family.parent_first_name ?? '')
        setParentLastName(result.family.parent_last_name ?? '')
        setPhone(result.family.phone ?? '')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur de chargement.')
      } finally {
        setLoading(false)
      }
    }

    loadPage()
  }, [router])

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!family) return

    setError('')
    setSuccess('')
    setSaving(true)

    const { data, error } = await supabase
      .from('families')
      .update({
        parent_first_name: parentFirstName.trim(),
        parent_last_name: parentLastName.trim(),
        phone: phone.trim() || null,
      })
      .eq('id', family.id)
      .select()
      .single()

    setSaving(false)

    if (error) {
      setError(error.message)
      return
    }

    setFamily(data)
    setSuccess('Profil mis à jour.')
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
        <title>Profil parent - TrajetEcole</title>
      </Head>

      <main className={styles.page}>
        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.topbar}>
              <div>
                <h1 className={styles.pageTitle}>Profil parent</h1>
                <p className={styles.pageIntro}>Informations du parent responsable.</p>
              </div>
              <div className={styles.topbarActions}>
                <Link href="/dashboard" className={styles.secondaryButton}>
                  Retour dashboard
                </Link>
              </div>
            </div>

            <div className={styles.sectionCard}>
              <form onSubmit={handleSave} className={styles.form}>
                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label htmlFor="parentFirstName">Prénom</label>
                    <input
                      id="parentFirstName"
                      value={parentFirstName}
                      onChange={(e) => setParentFirstName(e.target.value)}
                      required
                    />
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="parentLastName">Nom</label>
                    <input
                      id="parentLastName"
                      value={parentLastName}
                      onChange={(e) => setParentLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label htmlFor="phone">Téléphone</label>
                  <input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Optionnel"
                  />
                </div>

                <div className={styles.itemActions}>
                  <button className={styles.primaryButton} disabled={saving}>
                    {saving ? 'Enregistrement...' : 'Enregistrer le profil'}
                  </button>
                </div>
              </form>

              {error ? <p className={styles.errorMessage}>{error}</p> : null}
              {success ? <p className={styles.successMessage}>{success}</p> : null}
            </div>
          </div>
        </section>
      </main>
    </>
  )
}