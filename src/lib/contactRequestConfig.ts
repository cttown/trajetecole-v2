export const CONTACT_REQUEST_PRIORITY_HOURS = 24

export const CONTACT_REQUEST_PRIORITY_MS =
  CONTACT_REQUEST_PRIORITY_HOURS * 60 * 60 * 1000

export function getPriorityDelayText() {
  return `${CONTACT_REQUEST_PRIORITY_HOURS} heures`
}
