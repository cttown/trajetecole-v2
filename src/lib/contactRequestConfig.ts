export const CONTACT_REQUEST_RETRY_HOURS = 24
export const CONTACT_REQUEST_RETRY_MS =
  CONTACT_REQUEST_RETRY_HOURS * 60 * 60 * 1000

export const CONTACT_REQUEST_RESPONSE_WINDOW_HOURS = 24
export const CONTACT_REQUEST_RESPONSE_WINDOW_MS =
  CONTACT_REQUEST_RESPONSE_WINDOW_HOURS * 60 * 60 * 1000

export function getContactRequestRetryLabel() {
  return `${CONTACT_REQUEST_RETRY_HOURS} h`
}

export function getContactRequestRetryMessage() {
  return `Vous avez déjà contacté cette famille pour ce trajet récemment. Merci d’attendre ${getContactRequestRetryLabel()} avant de refaire une demande.`
}