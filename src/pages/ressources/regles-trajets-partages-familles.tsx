import type { CSSProperties } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import styles from '../../styles/Home.module.css'

const titleStyle: CSSProperties = {
  fontSize: 28,
  lineHeight: 1.25,
  marginBottom: 14,
}

const paragraphStyle: CSSProperties = {
  marginTop: 12,
}

const articleImageStyle: CSSProperties = {
  width: '100%',
  maxHeight: 460,
  objectFit: 'cover',
  borderRadius: 22,
  border: '1px solid #dbe8f5',
  boxShadow: '0 14px 34px rgba(24, 61, 109, 0.10)',
  marginBottom: 28,
}

const visualListStyle: CSSProperties = {
  display: 'grid',
  gap: 10,
  marginTop: 14,
}

const visualListItemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 10,
  padding: '12px 14px',
  borderRadius: 14,
  background: '#f7fbff',
  border: '1px solid #dbe8f5',
  color: '#3a5b83',
  fontSize: 18,
  lineHeight: 1.5,
}

const checkStyle: CSSProperties = {
  flex: '0 0 auto',
  color: '#1670dc',
  fontWeight: 800,
}

function VisualList({ items }: { items: string[] }) {
  return (
    <div style={visualListStyle}>
      {items.map((item) => (
        <div key={item} style={visualListItemStyle}>
          <span style={checkStyle}>✓</span>
          <span>{item}</span>
        </div>
      ))}
    </div>
  )
}

export default function ReglesTrajetsPartagesFamillesPage() {
  return (
    <>
      <Head>
        <title>
          Trajets partagés entre familles : quelles règles établir dès le début ? - TrajetÉcole
        </title>
        <meta
          name="description"
          content="Conseils pratiques pour définir des règles simples et claires dès le départ pour organiser des trajets partagés entre familles."
        />
      </Head>

      <main className={styles.page}>
        <section className={styles.legalSection}>
          <div className={styles.container}>
            <div className={styles.legalHeader}>
              <div className={styles.badge}>📚 Ressource pratique</div>

              <h1 className={styles.legalTitle}>
                Trajets partagés entre familles : quelles règles établir dès le début ?
              </h1>

              <p className={styles.legalIntro}>
                S&apos;organiser avec des familles voisines pour les trajets à pied, c&apos;est une
                excellente idée.
              </p>

              <p className={styles.legalIntro} style={paragraphStyle}>
                Mais comme toute organisation collective, cela fonctionne mieux quand les règles
                sont claires dès le départ. Voici les points essentiels à définir avant de
                commencer.
              </p>
            </div>

            <img
              src="/images/ressources/regles-trajets-partages-familles.jpg"
              alt="Planning hebdomadaire utilisé pour organiser les trajets entre familles"
              style={articleImageStyle}
            />

            <div className={styles.legalCard}>
              <h2 style={titleStyle}>Pourquoi définir des règles ?</h2>

              <p>
                Une organisation informelle peut très bien fonctionner au début, puis se fragiliser
                au fil du temps : un parent qui annule souvent, des horaires qui glissent, des
                malentendus sur le tour de rôle.
              </p>

              <p style={paragraphStyle}>
                Quelques minutes de discussion au démarrage évitent beaucoup de tensions par la
                suite.
              </p>
            </div>

            <div className={styles.legalCard}>
              <h2 style={titleStyle}>Les points à clarifier entre parents</h2>

              <p>
                Avant de commencer, il est utile de s&apos;accorder sur quelques points très
                concrets.
              </p>
            </div>

            <div className={styles.stepsGrid}>
              <div className={styles.stepCard}>
                <div className={styles.stepNumber}>1</div>
                <h3>L&apos;itinéraire</h3>
                <p>
                  Définissez ensemble le chemin emprunté : quelles rues, quels passages piétons,
                  quel point de rendez-vous. Tous les enfants doivent connaître le trajet.
                </p>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepNumber}>2</div>
                <h3>Les horaires</h3>
                <p>
                  Fixez une heure de départ précise et tenez-vous y. Une petite marge peut être
                  tolérée, mais le groupe doit pouvoir partir sans attendre trop longtemps.
                </p>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepNumber}>3</div>
                <h3>Le tour de rôle</h3>
                <p>
                  Définissez clairement qui accompagne quel jour. Un planning simple sur WhatsApp ou
                  une feuille partagée suffit pour éviter les confusions.
                </p>
              </div>
            </div>

            <div className={styles.stepsGrid} style={{ marginTop: 24 }}>
              <div className={styles.stepCard}>
                <div className={styles.stepNumber}>4</div>
                <h3>Les absences et imprévus</h3>
                <p>
                  Définissez un délai de prévenance minimum, idéalement la veille, et prévoyez un
                  plan B en cas d&apos;absence imprévue au dernier moment.
                </p>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepNumber}>5</div>
                <h3>Les règles pour les enfants</h3>
                <p>
                  Comportement dans la rue, gestion des conflits entre enfants, téléphone : mieux
                  vaut que tous les parents transmettent les mêmes consignes.
                </p>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepNumber}>6</div>
                <h3>Un support simple</h3>
                <p>
                  Un simple message récapitulatif dans le groupe WhatsApp peut suffire pour que tout
                  le monde garde les mêmes repères.
                </p>
              </div>
            </div>

            <div className={styles.legalCard} style={{ marginTop: 24 }}>
              <h2 style={titleStyle}>Une organisation légère, pas un contrat</h2>

              <p>
                L&apos;objectif n&apos;est pas de créer une organisation rigide, mais de s&apos;assurer
                que tout le monde part avec les mêmes attentes.
              </p>

              <p style={paragraphStyle}>
                Un simple échange oral ou un message récapitulatif dans le groupe WhatsApp suffit
                largement dans la plupart des cas.
              </p>
            </div>

            <div className={styles.legalCard}>
              <h2 style={titleStyle}>Faire évoluer les règles si nécessaire</h2>

              <p>
                Une bonne organisation s&apos;adapte. Si quelque chose ne fonctionne pas - un horaire
                inadapté, un tour de rôle déséquilibré - parlez-en rapidement plutôt que de laisser
                la situation se dégrader.
              </p>

              <p style={paragraphStyle}>
                La plupart des ajustements se règlent en quelques minutes de discussion.
              </p>
            </div>

            <div className={styles.legalCard}>
              <h2 style={titleStyle}>En résumé</h2>

              <VisualList
                items={[
                  'définir quelques règles simples dès le début évite beaucoup de malentendus ;',
                  'un itinéraire, des horaires et un tour de rôle clairs facilitent l’organisation ;',
                  'un plan B en cas d’absence est indispensable ;',
                  'une organisation légère mais claire permet une entraide qui dure dans le temps.',
                ]}
              />

              <p style={paragraphStyle}>
                Des familles bien organisées dès le départ, c&apos;est une entraide plus sereine -
                et des enfants qui marchent ensemble toute l&apos;année en toute tranquillité.
              </p>
            </div>

            <div className={styles.legalActions}>
              <Link href="/signup" className={styles.primaryButton}>
                Créer mon compte
              </Link>

              <Link href="/ressources" className={styles.secondaryButton}>
                Retour aux ressources
              </Link>

              <Link href="/" className={styles.secondaryButton}>
                Retour à l’accueil
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}