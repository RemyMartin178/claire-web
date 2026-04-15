/**
 * Calendar utility functions — adapted from pickleglass_web/app/calendar/event-utils.ts
 */

export function getEventStartDate(event) {
  if (!event) return null
  const s = event.start
  if (!s) return null
  if (s.dateTime) return new Date(s.dateTime)
  if (s.date) return new Date(s.date + 'T00:00:00')
  if (typeof s === 'string') return new Date(s)
  return null
}

export function getEventEndDate(event) {
  if (!event) return null
  const e = event.end
  if (!e) return null
  if (e.dateTime) return new Date(e.dateTime)
  if (e.date) return new Date(e.date + 'T00:00:00')
  if (typeof e === 'string') return new Date(e)
  return null
}

export function getEventTitle(event) {
  return event?.summary || event?.title || 'Réunion sans titre'
}

export function getEventAttendees(event) {
  if (!event?.attendees) return []
  return event.attendees
    .map(a => typeof a === 'object' ? (a.displayName || a.email || '') : String(a))
    .filter(Boolean)
}

export function getEventOrganizer(event) {
  const org = event?.organizer
  if (!org) return null
  if (org.self === true) {
    const creator = event.creator
    if (creator && creator.self !== true) {
      return creator.displayName || creator.email || null
    }
    return null
  }
  if (typeof org === 'object') return org.displayName || org.email || null
  return String(org)
}

export function formatDateHeading(date) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today.getTime() + 86_400_000)
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (d.getTime() === today.getTime()) return "Aujourd'hui"
  if (d.getTime() === tomorrow.getTime()) return 'Demain'
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function formatTimeLabel(event) {
  const start = getEventStartDate(event)
  if (!start) return ''
  return start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h')
}

export function formatDurationLabel(event) {
  const start = getEventStartDate(event)
  const end = getEventEndDate(event)
  if (!start || !end) return ''
  const mins = Math.round((end.getTime() - start.getTime()) / 60_000)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60), m = mins % 60
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`
}
