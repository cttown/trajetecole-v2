import styles from '../styles/Popup.module.css'

type PopupProps = {
  message: string
  type?: 'success' | 'error'
  onClose: () => void
}

export default function Popup({
  message,
  type = 'success',
  onClose,
}: PopupProps) {
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div
        className={`${styles.popup} ${
          type === 'error' ? styles.error : styles.success
        }`}
      >
        <p className={styles.message}>{message}</p>

        <div className={styles.actions}>
          <button type="button" className={styles.button} onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  )
}