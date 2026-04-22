import Head from 'next/head'
import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'
import styles from '../styles/FormPages.module.css'
import type { SetGlobalPopup } from './_app'

type Props = {
  setGlobalPopup?: SetGlobalPopup
}

const NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ]+(?:[ '\-][A-Za-zÀ-ÖØ-öø-ÿ]+)*$/

function validateName(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return 'Ce champ est obligatoire.'
  }

  if (!NAME_REGEX.test(trimmed)) {
    return 'Utilisez uniquement des lettres.'
  }

  return ''
}

function validatePassword(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return 'Le mot de passe est obligatoire.'
  }

  if (trimmed.length < 6) {
    return 'Minimum 6 caractères.'
  }

  return ''
}

export default function SignupPage({ setGlobalPopup }: Props) {
  const [parentFirstName, setParentFirstName] = useState('')
  const [parentLastName, setParentLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [parentFirstNameError, setParentFirstNameError] = useState('')
  const [parentLastNameError, setParentLastNameError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function showPopup(message: string, type: 'success' | 'error') {
    if (setGlobalPopup) {
      setGlobalPopup({ message, type })
      return
    }
    if (type === 'error') setError(message)
  }

  function validateForm() {
    const firstNameMessage = validateName(parentFirstName)
    const lastNameMessage = validateName(parentLastName)
    const passwordMessage = validatePassword(password)

    setParentFirstNameError(firstNameMessage)
    setParentLastNameError(lastNameMessage)
    setPasswordError(passwordMessage)

    return !firstNameMessage && !lastNameMessage && !passwordMessage
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!validateForm()) {
      return
    }

    setLoading(true)

    const normalizedFirstName = parentFirstName.trim()
    const normalizedLastName = parentLastName.trim()
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedPassword = password.trim()

    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/login`
        : undefined

    const { error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: normalizedPassword,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          parent_first_name: normalizedFirstName,
          parent_last_name: normalizedLastName,
        },
      },
    })

    setLoading(false)

    if (error) {
      showPopup(error.message, 'error')
      return
    }

    setParentFirstName('')
    setParentLastName('')
    setEmail('')
    setPassword('')

    showPopup(
      `Un email a été envoyé à l’adresse ${normalizedEmail}. Pensez à vérifier aussi vos emails indésirables.`,
      'success'
    )
  }

  return (
    <>
      <Head>
        <title>Créer un compte - TrajetEcole</title>
      </Head>

      <main className={styles.page}>
        <section className={styles.section}>
          <div className={styles.container} style={{ maxWidth: 760 }}>
            <div className={styles.formCard}>
              <h1 className={styles.formTitle}>Créer un compte</h1>

              <form onSubmit={handleSubmit} className={styles.form} noValidate>
                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label htmlFor="parentFirstName">Prénom</label>
                    <input
                      id="parentFirstName"
                      type="text"
                      value={parentFirstName}
                      onChange={(e) => setParentFirstName(e.target.value)}
                      onBlur={() =>
                        setParentFirstNameError(validateName(parentFirstName))
                      }
                      required
                    />
                    {parentFirstNameError ? (
                      <p className={styles.fieldError}>{parentFirstNameError}</p>
                    ) : null}
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="parentLastName">Nom</label>
                    <input
                      id="parentLastName"
                      type="text"
                      value={parentLastName}
                      onChange={(e) => setParentLastName(e.target.value)}
                      onBlur={() =>
                        setParentLastNameError(validateName(parentLastName))
                      }
                      required
                    />
                    {parentLastNameError ? (
                      <p className={styles.fieldError}>{parentLastNameError}</p>
                    ) : null}
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
                    onBlur={() => setPasswordError(validatePassword(password))}
                    required
                    minLength={6}
                  />
                  <p className={styles.helperText}>Minimum 6 caractères.</p>
                  {passwordError ? (
                    <p className={styles.fieldError}>{passwordError}</p>
                  ) : null}
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
        </section>
      </main>
    </>
  )
}