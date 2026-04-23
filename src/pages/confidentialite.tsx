import Head from 'next/head'
import Link from 'next/link'
import styles from '../styles/Home.module.css'

export default function ConfidentialitePage() {
  return (
    <>
      <Head>
        <title>Confidentialité - TrajetEcole</title>
        <meta
          name="description"
          content="Comment TrajetEcole utilise et protège vos données."
        />
      </Head>

      <main className={styles.page}>
        <section className={styles.legalSection}>
          <div className={styles.container}>
            <div className={styles.legalHeader}>
              <div className={styles.badge}>TrajetEcole</div>
              <h1 className={styles.legalTitle}>Confidentialité</h1>
              <p className={styles.legalIntro}>
                Vos données servent uniquement à faire fonctionner le service
                et à faciliter la mise en relation entre familles.
              </p>
            </div>

            <div className={styles.legalCard}>
              <h2>En bref</h2>
              <ul className={styles.legalList}>
                <li>vous gardez la main sur vos informations ;</li>
                <li>la mise en relation ne se fait jamais automatiquement ;</li>
                <li>vous pouvez demander la suppression de vos données.</li>
              </ul>
            </div>

            <div className={styles.legalCard}>
              <h2>Données utilisées</h2>
              <ul className={styles.legalList}>
                <li>vos informations de compte ;</li>
                <li>les enfants et trajets que vous enregistrez ;</li>
                <li>les jours, horaires et lieux associés ;</li>
                <li>les demandes de mise en relation ;</li>
                <li>les messages envoyés à l’administrateur ;</li>
                <li>les données techniques utiles au bon fonctionnement du site.</li>
              </ul>
            </div>

            <div className={styles.legalCard}>
              <h2>Pourquoi ces données ?</h2>
              <ul className={styles.legalList}>
                <li>vous permettre de vous connecter ;</li>
                <li>enregistrer et afficher vos trajets ;</li>
                <li>rechercher des familles compatibles ;</li>
                <li>gérer les demandes entre parents ;</li>
                <li>envoyer les emails utiles au service ;</li>
                <li>répondre à vos questions.</li>
              </ul>
            </div>

            <div className={styles.legalCard}>
              <h2>Mise en relation</h2>
              <p>
                Les coordonnées ne sont pas partagées librement.
                Une famille doit d’abord envoyer une demande, puis l’autre famille
                doit l’accepter.
              </p>
            </div>

            <div className={styles.legalCard}>
              <h2>Suppression des données</h2>
              <p>
                Vous pouvez demander la suppression de vos données depuis la plateforme.
                Certaines informations techniques ou d’historique peuvent être conservées
                si cela est nécessaire au bon fonctionnement du service ou au suivi des échanges.
              </p>
            </div>

            <div className={styles.legalCard}>
              <h2>Une question ?</h2>
              <p>
                Si vous avez une question sur vos données ou sur le fonctionnement du site,
                vous pouvez contacter l’administrateur.
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