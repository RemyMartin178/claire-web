export function getEventStartDate(event) {
  const s = event?.start
  if (!s) return null
  if (s.dateTime) return new Date(s.dateTime)
  if (s.date) return new Date(s.date + 'T00:00:00')
  return null
}

export function getEventEndDate(event) {
  const e = event?.end
  if (!e) return null
  if (e.dateTime) return new Date(e.dateTime)
  if (e.date) return new Date(e.date + 'T00:00:00')
  return null
}

export function getEventTitle(event) {
  return event?.summary || event?.title || 'Sans titre'
}

export function getEventOrganizer(event) {
  const o = event?.organizer
  if (!o) return null
  if (typeof o === 'string') return o
  return o.displayName || o.email || null
}

export function getEventAttendees(event) {
  if (!Array.isArray(event?.attendees)) return []
  return event.attendees.map(a => {
    if (typeof a === 'string') return a
    return a.displayName || a.email || ''
  }).filter(Boolean)
}

export function getEventJoinLink(event) {
  if (event?.hangoutLink) return event.hangoutLink
  const desc = event?.description || ''
  const m = desc.match(/https?:\/\/[^\s"<>]+(?:zoom\.us|meet\.google|teams\.microsoft|webex)[^\s"<>]*/i)
  return m ? m[0] : null
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

export function formatTimeLabel(date) {
  if (!date) return ''
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h')
}

export function formatDurationLabel(event) {
  const start = getEventStartDate(event)
  const end = getEventEndDate(event)
  if (!start || !end) return ''
  const mins = Math.round((end - start) / 60000)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60), m = mins % 60
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`
}
