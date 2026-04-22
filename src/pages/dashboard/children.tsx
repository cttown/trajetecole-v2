import Head from 'next/head'
import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import styles from '../../styles/Dashboard.module.css'
import { Child, requireFamily, loadChildren } from '../../lib/dashboardShared'
import { supabase } from '../../lib/supabaseClient'
import type { SetGlobalPopup } from '../_app'

type Props = {
  setGlobalPopup?: SetGlobalPopup
}

export default function DashboardChildrenPage({ setGlobalPopup }: Props) {
  const router = useRouter()

  const [familyId, setFamilyId] = useState('')
  const [children, setChildren] = useState<Child[]>([])
  const [childFirstName, setChildFirstName] = useState('')
  const [childLevel, setChildLevel] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
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

  useEffect(() => {
    async function loadPage() {
      try {
        const { family } = await requireFamily(router)
        if (!family) return

        setFamilyId(family.id)
        setChildren(await loadChildren(family.id))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur de chargement.')
      } finally {
        setLoading(false)
      }
    }

    loadPage()
  }, [router])

  async function handleAddChild(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!familyId) return
    if (!childFirstName.trim()) {
      showPopup('Le prénom de l’enfant est obligatoire.', 'error')
      return
    }

    setSaving(true)

    const { data, error } = await supabase
      .from('children')
      .insert({
        family_id: familyId,
        first_name: childFirstName.trim(),
        level: childLevel.trim() || null,
      })
      .select()
      .single()

    setSaving(false)

    if (error) {
      showPopup(error.message, 'error')
      return
    }

    setChildren((prev) => [...prev, data])
    setChildFirstName('')
    setChildLevel('')
    showPopup('Enfant ajouté.', 'success')
  }

  async function handleDeleteChild(childId: string) {
    setError('')
    setDeletingId(childId)

    const { error } = await supabase.from('children').delete().eq('id', childId)

    setDeletingId(null)

    if (error) {
      showPopup(error.message, 'error')
      return
    }

    setChildren((prev) => prev.filter((child) => child.id !== childId))
    showPopup('Enfant supprimé.', 'success')
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
        <title>Enfants - TrajetEcole</title>
      </Head>

      <main className={styles.page}>
        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.topbar}>
              <div>
                <h1 className={styles.pageTitle}>Enfants</h1>
              </div>
              <div className={styles.topbarActions}>
                <Link href="/dashboard" className={styles.secondaryButton}>
                  Retour Mon espace
                </Link>
              </div>
            </div>

            {error ? <p className={styles.errorMessage}>{error}</p> : null}

            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>Ajouter un enfant</h2>
                </div>
              </div>

              <form onSubmit={handleAddChild} className={styles.form}>
                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label htmlFor="childFirstName">Prénom</label>
                    <input
                      id="childFirstName"
                      value={childFirstName}
                      onChange={(e) => setChildFirstName(e.target.value)}
                      required
                    />
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="childLevel">Niveau / classe</label>
                    <input
                      id="childLevel"
                      value={childLevel}
                      onChange={(e) => setChildLevel(e.target.value)}
                      placeholder="Ex : CE2, 6e, CM1..."
                    />
                  </div>
                </div>

                <div className={styles.itemActions}>
                  <button className={styles.primaryButton} disabled={saving}>
                    {saving ? 'Ajout...' : 'Ajouter un enfant'}
                  </button>
                </div>
              </form>
            </div>

            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>Liste des enfants</h2>
                </div>
              </div>

              {children.length === 0 ? (
                <p className={styles.statusMessage}>Aucun enfant enregistré.</p>
              ) : (
                <div className={styles.itemList}>
                  {children.map((child) => (
                    <div key={child.id} className={styles.itemCard}>
                      <div className={styles.itemHeader}>
                        <div>
                          <h3 className={styles.itemTitle}>{child.first_name}</h3>
                          <p className={styles.itemMeta}>Niveau : {child.level || '—'}</p>
                        </div>
                      </div>

                      <div className={styles.itemActions}>
                        <button
                          type="button"
                          className={styles.dangerButton}
                          onClick={() => handleDeleteChild(child.id)}
                          disabled={deletingId === child.id}
                        >
                          {deletingId === child.id ? 'Suppression...' : 'Supprimer'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </>
  )
}