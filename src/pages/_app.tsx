import type { AppProps } from 'next/app'
import '../styles/globals.css'
import { useState } from 'react'
import Popup from '../components/Popup'

type PopupState = {
  message: string
  type?: 'success' | 'error'
} | null

export default function App({ Component, pageProps }: AppProps) {
  const [popup, setPopup] = useState<PopupState>(null)

  return (
    <>
      {popup ? (
        <Popup
          message={popup.message}
          type={popup.type}
          onClose={() => setPopup(null)}
        />
      ) : null}

      <Component {...pageProps} setGlobalPopup={setPopup} />
    </>
  )
}