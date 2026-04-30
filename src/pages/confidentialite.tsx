import Head from 'next/head'
import Link from 'next/link'
import styles from '../styles/Home.module.css'

const cardTitleStyle = {
  fontSize: 28,
  lineHeight: 1.25,
  marginBottom: 14,
}

const paragraphSpacingStyle = {
  marginTop: 12,
}

const visualListStyle = {
  display: 'grid',
  gap: 10,
  marginTop: 14,
}

const visualListItemStyle = {
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

const checkStyle = {
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

export default function ConfidentialitePage() {
  return (
    <>
      <Head>
        <title>Confidentialité - TrajetÉcole</title>
        <meta
          name="description"
          content="Comment TrajetÉcole utilise les données nécessaires au fonctionnement du service et protège les coordonnées des familles."
        />
      </Head>

      <main className={styles.page}>
        <section className={styles.legalSection}>
          <div className={styles.container}>
            <div className={styles.legalHeader}>
              <div className={styles.badge}>🔒 Données privées</div>

              <h1 className={styles.legalTitle}>Confidentialité</h1>

              <p className={styles.legalIntro}>
                TrajetÉcole utilise uniquement les informations nécessaires au fonctionnement du
                service : créer votre compte, enregistrer vos trajets, rechercher des familles
                compatibles et gérer les demandes de mise en relation.
              </p>

              <p className={styles.legalIntro} style={paragraphSpacingStyle}>
                Vos coordonnées ne sont jamais affichées publiquement.
              </p>
            </div>

            <div className={styles.stepsGrid}>
              <div className={styles.stepCard}>
                <div className={styles.stepNumber}>1</div>
                <h3>Vous gardez le contrôle</h3>
                <p>Vous choisissez les trajets que vous ajoutez et les demandes que vous acceptez.</p>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepNumber}>2</div>
                <h3>Pas de contact automatique</h3>
                <p>Une mise en relation n’a lieu que si les deux familles sont d’accord.</p>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepNumber}>3</div>
                <h3>Suppression possible</h3>
                <p>Vous pouvez demander la suppression de vos données depuis le site.</p>
              </div>
            </div>

            <div className={styles.legalCard} style={{ marginTop: 28 }}>
              <h2 style={cardTitleStyle}>Quelles données sont utilisées ?</h2>

              <p>
                TrajetÉcole peut utiliser uniquement les informations utiles au service :
              </p>

              <VisualList
                items={[
                  'vos informations de compte ;',
                  'les enfants et trajets que vous enregistrez ;',
                  'les jours, horaires et lieux associés ;',
                  'les demandes de mise en relation ;',
                  'les messages envoyés à l’administrateur ;',
                  'certaines données techniques nécessaires au bon fonctionnement du site.',
                ]}
              />
            </div>

            <div className={styles.legalCard}>
              <h2 style={cardTitleStyle}>Pourquoi ces données ?</h2>

              <p>
                Ces informations servent uniquement à faire fonctionner TrajetÉcole :
              </p>

              <VisualList
                items={[
                  'vous permettre de vous connecter ;',
                  'afficher et gérer vos trajets ;',
                  'rechercher des familles compatibles ;',
                  'gérer les demandes entre parents ;',
                  'envoyer les emails utiles au service ;',
                  'répondre à vos questions.',
                ]}
              />
            </div>

            <div className={styles.legalCard}>
              <h2 style={cardTitleStyle}>Mise en relation entre familles</h2>

              <p>
                Les coordonnées ne sont pas partagées librement. Une famille peut envoyer une
                demande de contact.
              </p>

              <p style={paragraphSpacingStyle}>
                L’autre famille doit l’accepter avant toute mise en relation directe.
              </p>
            </div>

            <div className={styles.legalCard}>
              <h2 style={cardTitleStyle}>Suppression des données</h2>

              <p>
                Vous pouvez demander la suppression de vos données depuis la plateforme.
              </p>

              <p style={paragraphSpacingStyle}>
                Certaines informations techniques ou d’historique peuvent être conservées
                temporairement si cela est nécessaire au bon fonctionnement du service ou au suivi
                des demandes.
              </p>
            </div>

            <div className={styles.legalCard}>
              <h2 style={cardTitleStyle}>Une question ?</h2>

              <p>
                Pour toute question sur vos données ou le fonctionnement du site, vous pouvez
                contacter l’administrateur.
              </p>
            </div>

            <div className={styles.legalActions}>
              <Link href="/contact-admin" className={styles.primaryButton}>
                Contacter l’administrateur
              </Link>

              <Link href="/delete-my-data" className={styles.secondaryButton}>
                Supprimer mes données
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