import Head from 'next/head'
import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'
import styles from '../styles/FormPages.module.css'
import type { SetGlobalPopup } from './_app'

type Props = {
  setGlobalPopup?: SetGlobalPopup
}

export default function ForgotPasswordPage({ setGlobalPopup }: Props) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function showPopup(message: string, type: 'success' | 'error') {
    if (setGlobalPopup) {
      setGlobalPopup({ message, type })
      return
    }
    if (type === 'error') setError(message)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/reset-password`
        : undefined

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo }
    )

    setLoading(false)

    if (error) {
      showPopup(error.message, 'error')
      return
    }

    showPopup(
      'Un email de réinitialisation vient d’être envoyé. Pensez à vérifier aussi vos emails indésirables.',
      'success'
    )
  }

  return (
    <>
      <Head>
        <title>Mot de passe oublié - TrajetEcole</title>
      </Head>

      <main className={styles.page}>
        <section className={styles.section}>
          <div className={styles.container} style={{ maxWidth: 760 }}>
            <div className={styles.formCard}>
              <h1 className={styles.formTitle}>Mot de passe oublié</h1>

              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.field}>
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" disabled={loading} className={styles.primaryButton}>
                  {loading ? 'Envoi...' : 'Envoyer le lien'}
                </button>

                {error ? <p className={styles.errorMessage}>{error}</p> : null}
              </form>

              <div className={styles.secondaryActions}>
                <Link href="/login" className={styles.secondaryButton}>
                  Retour à la connexion
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}