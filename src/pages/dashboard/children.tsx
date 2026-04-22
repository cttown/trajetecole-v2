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
  const [editingChildId, setEditingChildId] = useState<string | null>(null)
  const [editingFirstName, setEditingFirstName] = useState('')
  const [editingLevel, setEditingLevel] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  function showPopup(message: string, type: 'success' | 'error' = 'success') {
    if (setGlobalPopup) {
      setGlobalPopup({ message, type })
      return
    }
    if (type === 'error') setError(message)
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

  async function reloadChildren() {
    if (!familyId) return
    setChildren(await loadChildren(familyId))
  }

  async function handleAddChild(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!familyId) return
    if (!childFirstName.trim()) {
      showPopup('Le prénom de l’enfant est obligatoire.', 'error')
      return
    }

    setSaving(true)

    const { error } = await supabase.from('children').insert({
      family_id: familyId,
      first_name: childFirstName.trim(),
      level: childLevel.trim() || null,
    })

    setSaving(false)

    if (error) {
      showPopup(error.message, 'error')
      return
    }

    setChildFirstName('')
    setChildLevel('')
    await reloadChildren()
    showPopup('Enfant ajouté.', 'success')
  }

  function openEdit(child: Child) {
    setEditingChildId(child.id)
    setEditingFirstName(child.first_name)
    setEditingLevel(child.level || '')
  }

  async function handleUpdateChild(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!editingChildId) return
    if (!editingFirstName.trim()) {
      showPopup('Le prénom de l’enfant est obligatoire.', 'error')
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('children')
      .update({
        first_name: editingFirstName.trim(),
        level: editingLevel.trim() || null,
      })
      .eq('id', editingChildId)

    setSaving(false)

    if (error) {
      showPopup(error.message, 'error')
      return
    }

    setEditingChildId(null)
    setEditingFirstName('')
    setEditingLevel('')
    await reloadChildren()
    showPopup('Enfant modifié.', 'success')
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

    await reloadChildren()
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
              <form onSubmit={handleAddChild} className={styles.form}>
                <div className={styles.itemActions}>
                  <button type="submit" className={styles.primaryButton} disabled={saving}>
                    {saving ? 'Ajout...' : 'Ajouter un enfant'}
                  </button>
                </div>

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
                          className={styles.secondaryButton}
                          onClick={() => openEdit(child)}
                        >
                          Modifier
                        </button>

                        <button
                          type="button"
                          className={styles.dangerButton}
                          onClick={() => handleDeleteChild(child.id)}
                          disabled={deletingId === child.id}
                        >
                          {deletingId === child.id ? 'Suppression...' : 'Supprimer'}
                        </button>
                      </div>

                      {editingChildId === child.id ? (
                        <form onSubmit={handleUpdateChild} className={styles.form} style={{ marginTop: 16 }}>
                          <div className={styles.fieldRow}>
                            <div className={styles.field}>
                              <label>Prénom</label>
                              <input
                                value={editingFirstName}
                                onChange={(e) => setEditingFirstName(e.target.value)}
                              />
                            </div>

                            <div className={styles.field}>
                              <label>Niveau / classe</label>
                              <input
                                value={editingLevel}
                                onChange={(e) => setEditingLevel(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className={styles.itemActions}>
                            <button type="submit" className={styles.primaryButton} disabled={saving}>
                              {saving ? 'Enregistrement...' : 'Enregistrer'}
                            </button>
                            <button
                              type="button"
                              className={styles.secondaryButton}
                              onClick={() => setEditingChildId(null)}
                            >
                              Annuler
                            </button>
                          </div>
                        </form>
                      ) : null}
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