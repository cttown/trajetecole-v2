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

export default function RaisonsPartagerTrajetsEnfantsPiedPage() {
  return (
    <>
      <Head>
        <title>5 bonnes raisons de partager les trajets de vos enfants à pied - TrajetÉcole</title>
        <meta
          name="description"
          content="Découvrez 5 bonnes raisons de partager les trajets de vos enfants à pied : gain de temps, sécurité, autonomie, entraide locale et quartier plus apaisé."
        />
      </Head>

      <main className={styles.page}>
        <section className={styles.legalSection}>
          <div className={styles.container}>
            <div className={styles.legalHeader}>
              <div className={styles.badge}>📚 Ressource pratique</div>

              <h1 className={styles.legalTitle}>
                5 bonnes raisons de partager les trajets de vos enfants à pied
              </h1>

              <p className={styles.legalIntro}>
                Vous avez entendu parler des trajets groupés entre familles, mais vous hésitez
                encore à vous lancer ?
              </p>

              <p className={styles.legalIntro} style={paragraphStyle}>
                Voici cinq raisons concrètes qui pourraient vous convaincre.
              </p>
            </div>

            <img
              src="/images/ressources/raisons-partager-trajets-enfants-pied.jpg"
              alt="Enfants jouant ensemble en extérieur"
              style={articleImageStyle}
            />

            <div className={styles.stepsGrid}>
              <div className={styles.stepCard}>
                <div className={styles.stepNumber}>1</div>
                <h3>Gagner du temps au quotidien</h3>
                <p>
                  En s&apos;organisant avec deux ou trois familles voisines, chaque parent
                  n&apos;accompagne les enfants qu&apos;un matin sur deux ou trois.
                </p>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepNumber}>2</div>
                <h3>Renforcer la sécurité des enfants</h3>
                <p>
                  Un enfant qui marche en groupe est plus visible. Les adultes accompagnateurs sont
                  attentifs, et les enfants apprennent aussi à veiller les uns sur les autres.
                </p>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepNumber}>3</div>
                <h3>Favoriser l&apos;autonomie</h3>
                <p>
                  Marcher avec des camarades aide les enfants à respecter les règles dans la rue, à
                  connaître leur trajet et à gagner progressivement en confiance.
                </p>
              </div>
            </div>

            <div className={styles.stepsGrid} style={{ marginTop: 24 }}>
              <div className={styles.stepCard}>
                <div className={styles.stepNumber}>4</div>
                <h3>Créer des liens entre familles</h3>
                <p>
                  L&apos;organisation des trajets est souvent le point de départ d&apos;une vraie
                  entraide de voisinage entre parents et enfants du quartier.
                </p>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepNumber}>5</div>
                <h3>Contribuer à un quartier plus apaisé</h3>
                <p>
                  Moins de voitures devant l&apos;école, c&apos;est moins d&apos;embouteillages,
                  moins de pollution et une rue plus agréable pour tout le monde.
                </p>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepNumber}>✓</div>
                <h3>Un bénéfice collectif</h3>
                <p>
                  Les trajets partagés rendent le quotidien plus simple pour les parents, plus
                  agréable pour les enfants et plus doux pour le quartier.
                </p>
              </div>
            </div>

            <div className={styles.legalCard} style={{ marginTop: 24 }}>
              <h2 style={titleStyle}>Par où commencer ?</h2>

              <p>
                La première étape est de trouver des familles compatibles : même itinéraire, mêmes
                horaires, lieux proches.
              </p>

              <p style={paragraphStyle}>
                Des plateformes comme TrajetÉcole facilitent cette mise en relation : vous indiquez
                vos trajets, le site trouve les familles proches avec des horaires compatibles, et
                le contact se fait uniquement avec votre accord.
              </p>

              <p style={paragraphStyle}>Il n&apos;en faut pas plus pour démarrer.</p>
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