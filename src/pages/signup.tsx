import Head from 'next/head'
import { FormEvent, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'
import styles from '../styles/FormPages.module.css'

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

function isFormDirty(values: {
  parentFirstName: string
  parentLastName: string
  email: string
  password: string
}) {
  return Object.values(values).some((value) => value.trim() !== '')
}

export default function SignupPage() {
  const [parentFirstName, setParentFirstName] = useState('')
  const [parentLastName, setParentLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [parentFirstNameError, setParentFirstNameError] = useState('')
  const [parentLastNameError, setParentLastNameError] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')

  const dirty = useMemo(
    () =>
      isFormDirty({
        parentFirstName,
        parentLastName,
        email,
        password,
      }),
    [parentFirstName, parentLastName, email, password]
  )

  function resetForm() {
    setParentFirstName('')
    setParentLastName('')
    setEmail('')
    setPassword('')
    setParentFirstNameError('')
    setParentLastNameError('')
    setPasswordError('')
    setError('')
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

    const { error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: normalizedPassword,
      options: {
        data: {
          parent_first_name: normalizedFirstName,
          parent_last_name: normalizedLastName,
        },
      },
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setSubmittedEmail(normalizedEmail)
    resetForm()
    setShowSuccessModal(true)
  }

  function handleBackHomeClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!dirty) {
      return
    }

    e.preventDefault()
    setShowLeaveModal(true)
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
                        onBlur={() => setParentLastNameError(validateName(parentLastName))}
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
                  <Link
                    href="/"
                    className={styles.secondaryButton}
                    onClick={handleBackHomeClick}
                  >
                    Retour à l’accueil
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {showSuccessModal ? (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalCard}>
            <h3 className={styles.modalTitle}>Compte presque créé</h3>
            <p className={styles.modalText}>
              Un email a été envoyé à l’adresse <strong>{submittedEmail}</strong>.
              Consultez votre messagerie pour valider la création de votre compte.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => setShowSuccessModal(false)}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showLeaveModal ? (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalCard}>
            <h3 className={styles.modalTitle}>Quitter cette page ?</h3>
            <p className={styles.modalText}>
              Les informations saisies seront perdues. Voulez-vous rester sur la
              page ou revenir à l’accueil ?
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setShowLeaveModal(false)}
              >
                Rester sur la page
              </button>
              <Link href="/" className={styles.primaryButton}>
                Retour à l’accueil
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}