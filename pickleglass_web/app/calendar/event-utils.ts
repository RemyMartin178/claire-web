export type CalendarEvent = {
  id: string
  summary?: string
  description?: string
  start?: string | { dateTime?: string; date?: string }
  end?: string | { dateTime?: string; date?: string }
  location?: string
  attendees?: Array<string | { email?: string; displayName?: string; self?: boolean }>
  creator?: string | { email?: string; displayName?: string; self?: boolean }
  organizer?: string | { email?: string; displayName?: string; self?: boolean }
  htmlLink?: string
  hangoutLink?: string
  conferenceData?: { entryPoints?: Array<{ entryPointType?: string; uri?: string }> }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readDateLike(
  value: string | { dateTime?: string; date?: string } | undefined
): string | undefined {
  if (!value) return undefined
  if (typeof value === 'string') return value
  return value.dateTime || value.date
}

export function getEventStartValue(event: CalendarEvent): string | undefined {
  return readDateLike(event.start)
}

export function getEventEndValue(event: CalendarEvent): string | undefined {
  return readDateLike(event.end)
}

export function getEventStartDate(event: CalendarEvent): Date | null {
  const value = getEventStartValue(event)
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function getEventEndDate(event: CalendarEvent): Date | null {
  const value = getEventEndValue(event)
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function getEventTitle(event: CalendarEvent): string {
  const title = (event.summary || '').trim()
  return title.length > 0 ? title : 'Reunion sans titre'
}

export function formatDurationLabel(event: CalendarEvent): string {
  const start = getEventStartDate(event)
  const end = getEventEndDate(event)

  if (!start || !end) return '--'

  const diffMs = end.getTime() - start.getTime()
  if (diffMs <= 0) return '0:00'

  const totalSeconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function formatTimeLabel(date: Date | null): string {
  if (!date) return '--'
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h')
}

export function formatDateHeading(date: Date): string {
  const value = date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return value.charAt(0).toUpperCase() + value.slice(1).replace('.', '')
}

export function formatEventDateLabel(event: CalendarEvent): string {
  const start = getEventStartDate(event)
  if (!start) return '--'
  return start.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatEventRangeLabel(event: CalendarEvent): string {
  const start = getEventStartDate(event)
  const end = getEventEndDate(event)
  const startLabel = formatTimeLabel(start)

  if (!end) return startLabel
  return `${startLabel} - ${formatTimeLabel(end)}`
}

function readContact(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'string') return value
  if (isObject(value)) {
    const displayName = typeof value.displayName === 'string' ? value.displayName.trim() : ''
    const email = typeof value.email === 'string' ? value.email.trim() : ''
    return displayName || email || null
  }
  return null
}

export function getEventAttendees(event: CalendarEvent): string[] {
  const attendees = Array.isArray(event.attendees) ? event.attendees : []
  const values = attendees
    .filter((attendee) => {
      if (!isObject(attendee)) return true
      return attendee.self !== true
    })
    .map((attendee) => readContact(attendee))
    .filter((attendee): attendee is string => Boolean(attendee))

  return Array.from(new Set(values))
}

export function getEventOrganizer(event: CalendarEvent): string | null {
  const org = event.organizer
  // organizer.self === true means the calendar owner is considered the organizer by Google,
  // which happens when Google propagates meetings to invited users' calendars.
  // In that case, try the creator field for the actual external organizer.
  if (isObject(org) && org.self === true) {
    const creator = event.creator
    if (isObject(creator) && creator.self !== true) {
      return readContact(creator)
    }
    return null
  }
  return readContact(event.organizer) || readContact(event.creator)
}

export function getEventJoinLink(event: CalendarEvent): string | null {
  if (event.hangoutLink) return event.hangoutLink
  const entryPoints = event.conferenceData?.entryPoints || []
  const videoEntry = entryPoints.find((entry) => entry.entryPointType === 'video' && entry.uri)
  return videoEntry?.uri || null
}

function cleanDescription(description: string | undefined): string {
  if (!description) return ''
  return description
    .replace(/<[^>]*>/g, ' ')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function buildEventSummaryMarkdown(event: CalendarEvent): string {
  const dateLabel = formatEventDateLabel(event)
  const rangeLabel = formatEventRangeLabel(event)
  const duration = formatDurationLabel(event)
  const organizer = getEventOrganizer(event)
  const attendees = getEventAttendees(event)
  const description = cleanDescription(event.description)

  const lines: string[] = []
  lines.push('## Contexte')
  lines.push(`- **Date**: ${dateLabel}`)
  lines.push(`- **Horaire**: ${rangeLabel} (${duration})`)
  if (organizer) lines.push(`- **Organisateur**: ${organizer}`)

  if (attendees.length > 0) {
    lines.push('')
    lines.push('## Participants')
    attendees.forEach((attendee) => lines.push(`- ${attendee}`))
  }

  if (description) {
    lines.push('')
    lines.push('## Description')
    const brief = description.length > 400 ? description.substring(0, 400).trimEnd() + '...' : description
    lines.push(brief)
  }

  return lines.join('\n')
}

