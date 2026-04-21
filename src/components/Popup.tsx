import { useEffect } from 'react'
import styles from '../styles/Popup.module.css'

type Props = {
  message: string
  type?: 'success' | 'error'
  onClose: () => void
}

export default function Popup({ message, type = 'success', onClose }: Props) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={styles.overlay}>
      <div className={`${styles.popup} ${styles[type]}`}>
        <p>{message}</p>
        <button onClick={onClose}>OK</button>
      </div>
    </div>
  )
}