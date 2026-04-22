import Head from 'next/head'
import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import styles from '../styles/FormPages.module.css'
import type { SetGlobalPopup } from './_app'

type Props = {
  setGlobalPopup?: SetGlobalPopup
}

function toFrenchLoginError(message: string) {
  if (message === 'Invalid login credentials') {
    return 'Adresse email ou mot de passe incorrect.'
  }
  return message
}

export default function LoginPage({ setGlobalPopup }: Props) {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    setLoading(false)

    if (error) {
      showPopup(toFrenchLoginError(error.message), 'error')
      return
    }

    router.push('/dashboard')
  }

  return (
    <>
      <Head>
        <title>Connexion - TrajetEcole</title>
      </Head>

      <main className={styles.page}>
        <section className={styles.section}>
          <div className={styles.container} style={{ maxWidth: 760 }}>
            <div className={styles.formCard}>
              <h1 className={styles.formTitle}>Se connecter</h1>

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

                <div className={styles.field}>
                  <label htmlFor="password">Mot de passe</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" disabled={loading} className={styles.primaryButton}>
                  {loading ? 'Connexion...' : 'Se connecter'}
                </button>

                {error ? <p className={styles.errorMessage}>{error}</p> : null}
              </form>

              <p className={styles.footerText}>
                <Link href="/forgot-password" className={styles.textLink}>
                  Mot de passe oublié ?
                </Link>
              </p>

              <div className={styles.secondaryActions}>
                <Link href="/" className={styles.secondaryButton}>
                  Retour à l’accueil
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}