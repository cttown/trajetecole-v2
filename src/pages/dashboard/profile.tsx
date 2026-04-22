import Head from 'next/head'
import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import styles from '../../styles/Dashboard.module.css'
import { requireFamily } from '../../lib/dashboardShared'
import { supabase } from '../../lib/supabaseClient'
import type { SetGlobalPopup } from '../_app'

type Props = {
  setGlobalPopup?: SetGlobalPopup
}

const PHONE_REGEX = /^[+()\-\s0-9]{8,20}$/

function validatePhone(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return 'Le numéro de téléphone est obligatoire.'
  }

  if (!PHONE_REGEX.test(trimmed)) {
    return 'Le format du numéro semble incorrect.'
  }

  return ''
}

export default function DashboardProfilePage({ setGlobalPopup }: Props) {
  const router = useRouter()

  const [familyId, setFamilyId] = useState('')
  const [parentFirstName, setParentFirstName] = useState('')
  const [parentLastName, setParentLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [phoneError, setPhoneError] = useState('')

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
        setParentFirstName(family.parent_first_name || '')
        setParentLastName(family.parent_last_name || '')
        setPhone(family.phone || '')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur de chargement.')
      } finally {
        setLoading(false)
      }
    }

    loadPage()
  }, [router])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    const phoneMessage = validatePhone(phone)
    setPhoneError(phoneMessage)

    if (phoneMessage) return

    setSaving(true)

    const { error } = await supabase
      .from('families')
      .update({
        parent_first_name: parentFirstName.trim() || null,
        parent_last_name: parentLastName.trim() || null,
        phone: phone.trim(),
      })
      .eq('id', familyId)

    setSaving(false)

    if (error) {
      showPopup(error.message, 'error')
      return
    }

    showPopup('Informations mises à jour.', 'success')
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
        <title>Parent - TrajetEcole</title>
      </Head>

      <main className={styles.page}>
        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.topbar}>
              <div>
                <h1 className={styles.pageTitle}>Parent</h1>
              </div>

              <div className={styles.topbarActions}>
                <Link href="/dashboard" className={styles.secondaryButton}>
                  Retour Mon espace
                </Link>
              </div>
            </div>

            {error ? <p className={styles.errorMessage}>{error}</p> : null}

            <div className={styles.sectionCard}>
              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label htmlFor="parentFirstName">Prénom</label>
                    <input
                      id="parentFirstName"
                      value={parentFirstName}
                      onChange={(e) => setParentFirstName(e.target.value)}
                    />
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="parentLastName">Nom</label>
                    <input
                      id="parentLastName"
                      value={parentLastName}
                      onChange={(e) => setParentLastName(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label htmlFor="phone">Téléphone</label>
                  <input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onBlur={() => setPhoneError(validatePhone(phone))}
                    required
                  />
                  {phoneError ? <p className={styles.fieldError}>{phoneError}</p> : null}
                </div>

                <div className={styles.itemActions}>
                  <button type="submit" className={styles.primaryButton} disabled={saving}>
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}