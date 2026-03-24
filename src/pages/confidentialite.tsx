import Head from 'next/head'
import Link from 'next/link'
import styles from '../styles/Home.module.css'

export default function ConfidentialitePage() {
  return (
    <>
      <Head>
        <title>Politique de confidentialité - TrajetEcole</title>
        <meta
          name="description"
          content="Politique de confidentialité de TrajetEcole."
        />
      </Head>

      <main className={styles.page}>
        <section className={styles.legalSection}>
          <div className={styles.container}>
            <div className={styles.legalHeader}>
              <div className={styles.badge}>TrajetEcole</div>
              <h1 className={styles.legalTitle}>Politique de confidentialité</h1>
              <p className={styles.legalIntro}>
                Cette page explique simplement quelles données sont utilisées,
                dans quel but, et comment demander leur suppression.
              </p>
            </div>

            <div className={styles.legalCard}>
              <h2>1. Finalité du service</h2>
              <p>
                TrajetEcole permet à des parents de se mettre en relation
                pour organiser des trajets liés à l’école ou aux activités.
              </p>
            </div>

            <div className={styles.legalCard}>
              <h2>2. Données utilisées</h2>
              <ul className={styles.legalList}>
                <li>données de compte nécessaires à la connexion ;</li>
                <li>trajets saisis par l’utilisateur ;</li>
                <li>jours, horaires et lieux liés aux trajets ;</li>
                <li>demandes de mise en relation et leur statut ;</li>
                <li>messages envoyés à l’administrateur ;</li>
                <li>données techniques nécessaires au bon fonctionnement du service.</li>
              </ul>
            </div>

            <div className={styles.legalCard}>
              <h2>3. Pourquoi ces données sont utilisées</h2>
              <ul className={styles.legalList}>
                <li>permettre l’authentification ;</li>
                <li>enregistrer et afficher les trajets ;</li>
                <li>détecter les correspondances compatibles ;</li>
                <li>gérer les demandes entre parents ;</li>
                <li>envoyer les notifications utiles au service ;</li>
                <li>répondre aux demandes adressées à l’administrateur.</li>
              </ul>
            </div>

            <div className={styles.legalCard}>
              <h2>4. Mise en relation</h2>
              <p>
                La mise en relation n’est pas libre ni automatique.
                Elle passe par une demande explicite, visible et suivie dans le dashboard.
              </p>
            </div>

            <div className={styles.legalCard}>
              <h2>5. Suppression des données</h2>
              <p>
                Une procédure de suppression des données est disponible sur la plateforme.
                Les données actives peuvent être supprimées selon le fonctionnement prévu par le service.
                Certaines informations d’historique peuvent être conservées séparément si nécessaire.
              </p>
            </div>

            <div className={styles.legalCard}>
              <h2>6. Contact</h2>
              <p>
                Pour toute question sur vos données ou sur le service,
                vous pouvez utiliser la page de contact administrateur.
              </p>
            </div>

            <div className={styles.legalActions}>
              <Link href="/" className={styles.secondaryButton}>
                Retour à l’accueil
              </Link>

              <Link href="/contact-admin" className={styles.primaryButton}>
                Contacter l’administrateur
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}