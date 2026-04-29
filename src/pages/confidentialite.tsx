import Head from 'next/head'
import Link from 'next/link'
import styles from '../styles/Home.module.css'

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

              <p className={styles.legalIntro}>
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

            <div className={styles.legalCard}>
              <h2>Quelles données sont utilisées ?</h2>
              <ul className={styles.legalList}>
                <li>vos informations de compte ;</li>
                <li>les enfants et trajets que vous enregistrez ;</li>
                <li>les jours, horaires et lieux associés ;</li>
                <li>les demandes de mise en relation ;</li>
                <li>les messages envoyés à l’administrateur ;</li>
                <li>certaines données techniques nécessaires au bon fonctionnement du site.</li>
              </ul>
            </div>

            <div className={styles.legalCard}>
              <h2>Pourquoi ces données ?</h2>
              <ul className={styles.legalList}>
                <li>vous permettre de vous connecter ;</li>
                <li>afficher et gérer vos trajets ;</li>
                <li>rechercher des familles compatibles ;</li>
                <li>gérer les demandes entre parents ;</li>
                <li>envoyer les emails utiles au service ;</li>
                <li>répondre à vos questions.</li>
              </ul>
            </div>

            <div className={styles.legalCard}>
              <h2>Mise en relation entre familles</h2>
              <p>
                Les coordonnées ne sont pas partagées librement. Une famille peut envoyer une
                demande de contact. L’autre famille doit l’accepter avant toute mise en relation
                directe.
              </p>
            </div>

            <div className={styles.legalCard}>
              <h2>Suppression des données</h2>
              <p>
                Vous pouvez demander la suppression de vos données depuis la plateforme. Certaines
                informations techniques ou d’historique peuvent être conservées temporairement si
                cela est nécessaire au bon fonctionnement du service ou au suivi des demandes.
              </p>
            </div>

            <div className={styles.legalCard}>
              <h2>Une question ?</h2>
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