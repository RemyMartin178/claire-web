import React from 'react'
import {
  getEventStartDate, getEventEndDate, getEventTitle,
  getEventAttendees, getEventOrganizer, formatDurationLabel
} from './calendarUtils.js'

const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)

const LocationIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
)

const UsersIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)

const VideoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
  </svg>
)

function getJoinLink(event) {
  if (event.hangoutLink) return event.hangoutLink
  if (event.location && /https?:\/\//.test(event.location)) {
    if (/zoom\.us|meet\.google|teams\.microsoft|webex/.test(event.location)) return event.location
  }
  const desc = event.description || ''
  const urlMatch = desc.match(/https?:\/\/[^\s"<>]+(?:zoom\.us|meet\.google|teams\.microsoft|webex)[^\s"<>]*/i)
  if (urlMatch) return urlMatch[0]
  return null
}

export default function CalendarDetailsPage({ navigate, event }) {
  if (!event) {
    return (
      <div className="min-h-screen bg-white p-10">
        <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1d1d1f] transition-colors mb-6" onClick={() => navigate('calendar')}>
          <BackIcon /> Retour
        </button>
        <p className="text-sm text-gray-400">Événement introuvable.</p>
      </div>
    )
  }

  const start = getEventStartDate(event)
  const end = getEventEndDate(event)
  const title = getEventTitle(event)
  const organizer = getEventOrganizer(event)
  const attendees = getEventAttendees(event)
  const duration = formatDurationLabel(event)
  const joinLink = getJoinLink(event)

  const fmt = d => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h')
  const fmtDate = d => d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  let dateStr = ''
  if (start) {
    dateStr = fmtDate(start)
    if (end) dateStr += ' · ' + fmt(start) + ' – ' + fmt(end)
    else dateStr += ' · ' + fmt(start)
    if (duration) dateStr += ' (' + duration + ')'
  }

  // Clean description — strip HTML tags and join links
  const cleanDescription = (event.description || '')
    .replace(/<[^>]+>/g, '')
    .replace(/https?:\/\/[^\s]+(?:zoom|meet|teams|webex)[^\s]*/gi, '')
    .trim()

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Back */}
        <button
          onClick={() => navigate('calendar')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1d1d1f] transition-colors mb-6"
        >
          <BackIcon /> Retour au calendrier
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-black mb-1.5">{title}</h1>
          <p className="text-sm text-gray-400">{dateStr}</p>
        </div>

        {/* Join button */}
        {joinLink && (
          <a
            href={joinLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 h-9 mb-8 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            <VideoIcon /> Rejoindre la réunion
          </a>
        )}

        <div className="space-y-6">
          {/* Organizer */}
          {organizer && (
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Organisateur</p>
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-[14px] text-[#1d1d1f]">{organizer}</p>
              </div>
            </div>
          )}

          {/* Attendees */}
          {attendees.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Participants ({attendees.length})
              </p>
              <div className="bg-gray-50 rounded-xl overflow-hidden divide-y divide-gray-100">
                {attendees.map((a, i) => (
                  <div key={i} className="px-4 py-2.5">
                    <p className="text-[14px] text-[#1d1d1f]">{a}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {cleanDescription && (
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Description</p>
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-[14px] text-[#1d1d1f] leading-relaxed whitespace-pre-wrap">{cleanDescription}</p>
              </div>
            </div>
          )}

          {/* Location */}
          {event.location && !joinLink && (
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Lieu</p>
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-[14px] text-[#1d1d1f]">{event.location}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
