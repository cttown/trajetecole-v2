import Head from 'next/head'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'
import styles from '../styles/FormPages.module.css'

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    router.push('/dashboard')
  }

  return (
    <>
      <Head>
        <title>Connexion - TrajetEcole</title>
        <meta
          name="description"
          content="Connectez-vous à TrajetEcole pour accéder à vos trajets et demandes."
        />
      </Head>

      <main className={styles.page}>
        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.formLayout}>
              <div className={styles.sideCard}>
                <div className={styles.badge}>TrajetEcole</div>
                <h1 className={styles.sideTitle}>Connexion</h1>
                <p className={styles.sideText}>
                  Accédez à votre espace pour consulter vos trajets, vos demandes
                  envoyées et reçues, et votre dashboard.
                </p>

                <div className={styles.infoList}>
                  <div className={styles.infoItem}>Accès à votre dashboard</div>
                  <div className={styles.infoItem}>Suivi clair des demandes</div>
                  <div className={styles.infoItem}>Gestion simple de vos trajets</div>
                </div>
              </div>

              <div className={styles.formCard}>
                <h2 className={styles.formTitle}>Se connecter</h2>

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

                  <div className={styles.inlineLinks}>
                    <Link href="/forgot-password" className={styles.textLink}>
                      Mot de passe oublié ?
                    </Link>
                  </div>

                  <button type="submit" disabled={loading} className={styles.primaryButton}>
                    {loading ? 'Connexion...' : 'Se connecter'}
                  </button>

                  {error ? <p className={styles.errorMessage}>{error}</p> : null}
                </form>

                <p className={styles.footerText}>
                  Pas encore de compte ?{' '}
                  <Link href="/signup" className={styles.textLink}>
                    Créer un compte
                  </Link>
                </p>

                <div className={styles.secondaryActions}>
                  <Link href="/" className={styles.secondaryButton}>
                    Retour à l’accueil
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}