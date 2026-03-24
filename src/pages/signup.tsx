import Head from 'next/head'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'
import styles from '../styles/FormPages.module.css'

export default function SignupPage() {
  const router = useRouter()

  const [parentFirstName, setParentFirstName] = useState('')
  const [parentLastName, setParentLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          parent_first_name: parentFirstName,
          parent_last_name: parentLastName,
        },
      },
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
        <title>Créer un compte - TrajetEcole</title>
        <meta
          name="description"
          content="Créez votre compte TrajetEcole pour organiser les trajets scolaires plus facilement."
        />
      </Head>

      <main className={styles.page}>
        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.formLayout}>
              <div className={styles.sideCard}>
                <div className={styles.badge}>TrajetEcole</div>
                <h1 className={styles.sideTitle}>Créer un compte</h1>
                <p className={styles.sideText}>
                  Rejoignez la plateforme pour enregistrer vos trajets,
                  voir les correspondances compatibles et gérer vos demandes.
                </p>

                <div className={styles.infoList}>
                  <div className={styles.infoItem}>Compte parent simple à créer</div>
                  <div className={styles.infoItem}>Trajets et demandes centralisés</div>
                  <div className={styles.infoItem}>Accès rapide à votre dashboard</div>
                </div>
              </div>

              <div className={styles.formCard}>
                <h2 className={styles.formTitle}>Créer mon compte</h2>

                <form onSubmit={handleSubmit} className={styles.form}>
                  <div className={styles.fieldRow}>
                    <div className={styles.field}>
                      <label htmlFor="parentFirstName">Prénom</label>
                      <input
                        id="parentFirstName"
                        type="text"
                        value={parentFirstName}
                        onChange={(e) => setParentFirstName(e.target.value)}
                        required
                      />
                    </div>

                    <div className={styles.field}>
                      <label htmlFor="parentLastName">Nom</label>
                      <input
                        id="parentLastName"
                        type="text"
                        value={parentLastName}
                        onChange={(e) => setParentLastName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

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
                      minLength={6}
                    />
                    <p className={styles.helperText}>
                      Minimum 6 caractères.
                    </p>
                  </div>

                  <button type="submit" disabled={loading} className={styles.primaryButton}>
                    {loading ? 'Création...' : 'Créer mon compte'}
                  </button>

                  {error ? <p className={styles.errorMessage}>{error}</p> : null}
                </form>

                <p className={styles.footerText}>
                  Déjà inscrit ?{' '}
                  <Link href="/login" className={styles.textLink}>
                    Se connecter
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