import type { AppProps } from 'next/app'
import { useState } from 'react'
import '../styles/globals.css'
import Popup from '../components/Popup'

type PopupState = {
  message: string
  type?: 'success' | 'error'
} | null

export type SetGlobalPopup = (value: PopupState) => void

type PagePropsWithPopup = AppProps['pageProps'] & {
  setGlobalPopup?: SetGlobalPopup
}

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

      <Component
        {...(pageProps as PagePropsWithPopup)}
        setGlobalPopup={setPopup}
      />
    </>
  )
}