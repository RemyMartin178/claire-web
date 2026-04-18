import React, { useState, useMemo } from 'react'
import {
  getEventTitle,
  getEventStartDate,
  getEventEndDate,
  getEventOrganizer,
  getEventAttendees,
  getEventJoinLink,
  formatDurationLabel,
  formatTimeLabel,
} from '../utils/calendar.js'

const ArrowLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
)

const CalendarIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

const ClockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)

const UsersIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const MapPinIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)

const VideoIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" />
  </svg>
)

const ExternalLinkIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
)

const MailIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
)

function getInitials(label) {
  if (label.includes('@')) {
    const local = label.split('@')[0]
    const parts = local.split(/[._-]/).filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return local.substring(0, 2).toUpperCase()
  }
  const words = label.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase()
  return label.substring(0, 2).toUpperCase()
}

function formatAttendeeLabel(label) {
  if (!label.includes('@')) return { name: label, email: null }
  const local = label.split('@')[0]
  const name = local
    .split(/[._-]/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).replace(/\d+$/, ''))
    .join(' ')
    .trim() || label
  return { name, email: label }
}

function formatEventDateLabel(event) {
  const start = getEventStartDate(event)
  if (!start) return ''
  return start.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function formatEventRangeLabel(event) {
  const start = getEventStartDate(event)
  const end = getEventEndDate(event)
  if (!start) return ''
  const s = formatTimeLabel(start)
  const e = end ? formatTimeLabel(end) : ''
  return e ? `${s} - ${e}` : s
}

export default function CalendarDetails({ navigate, event }) {
  const [activeTab, setActiveTab] = useState('summary')
  const [isEmailing, setIsEmailing] = useState(false)

  const attendees = useMemo(() => (event ? getEventAttendees(event) : []), [event])
  const joinLink = useMemo(() => (event ? getEventJoinLink(event) : null), [event])
  const organizer = useMemo(() => (event ? getEventOrganizer(event) : null), [event])

  if (!event) {
    return (
      <div className="h-full bg-white flex flex-col items-center justify-center p-6">
        <p className="text-[15px] text-gray-400 mb-4">Reunion introuvable.</p>
        <button onClick={() => navigate('calendar')} className="text-sm font-medium text-blue-500 hover:underline">Retour au calendrier</button>
      </div>
    )
  }

  const title = getEventTitle(event)

  const handlePrepareEmail = async () => {
    setIsEmailing(true)
    try {
      const subject = encodeURIComponent(`Suivi de reunion : ${title}`)
      const body = encodeURIComponent(`Bonjour,\n\nSuite a notre reunion "${title}", voici un suivi...\n\nCordialement`)
      window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
    } finally {
      setIsEmailing(false)
    }
  }

  return (
    <div className="h-full bg-white">
      <div className="max-w-[760px] mx-auto px-5 py-7">
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => navigate('calendar')}
            className="flex items-center gap-1.5 text-[#94a3b8] hover:text-[#1d1d1f] transition-colors"
          >
            <ArrowLeft />
            <span className="text-[14px] font-medium">Retour</span>
          </button>
        </div>

        <h1 className="text-[26px] font-semibold text-[#1d1d1f] mb-3 leading-tight">{title}</h1>
        <div className="flex flex-wrap gap-2 mb-5">
          <span className="flex items-center gap-1.5 text-[13px] font-medium text-[#1d1d1f] bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
            <UsersIcon />
            Reunion
          </span>
          <span className="flex items-center gap-1.5 text-[13px] font-medium text-[#1d1d1f] bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
            <CalendarIcon />
            {formatEventDateLabel(event)}
          </span>
          <span className="flex items-center gap-1.5 text-[13px] font-medium text-[#1d1d1f] bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
            <ClockIcon />
            {formatEventRangeLabel(event)} ({formatDurationLabel(event)})
          </span>
          {joinLink && (
            <a
              href={joinLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[13px] font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg px-3 py-1.5 transition-colors ml-auto"
            >
              <VideoIcon />
              Rejoindre
            </a>
          )}
          <button
            onClick={handlePrepareEmail}
            disabled={isEmailing}
            className="flex items-center gap-1.5 text-[13px] font-medium text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            <MailIcon />
            Mail de suivi
          </button>
        </div>

        <div className="mb-5">
          <div className="inline-flex bg-white rounded-lg p-0.5 border border-gray-200 shadow-sm">
            {['summary', 'details'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 text-[12px] transition-all rounded-md whitespace-nowrap ${
                  activeTab === tab
                    ? 'text-[#1d1d1f] font-semibold bg-white shadow-sm border border-gray-200/50'
                    : 'text-[#8e8e93] hover:text-[#1d1d1f] font-medium'
                }`}
              >
                {tab === 'summary' ? 'Resume' : 'Details'}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'summary' ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-[17px] font-semibold text-[#1d1d1f] mb-3">Resume</h2>
              {event.description ? (
                <p className="text-[15px] leading-[1.7] text-[#1d1d1f] whitespace-pre-wrap">{event.description}</p>
              ) : (
                <p className="text-[15px] text-[#86868b] italic">Aucune description disponible.</p>
              )}
            </div>

            {attendees.length > 0 && (
              <div>
                <h3 className="text-[13px] font-semibold text-[#86868b] uppercase tracking-wide mb-4">Participants</h3>
                <div className="space-y-3">
                  {attendees.map(attendee => {
                    const initials = getInitials(attendee)
                    const { name, email } = formatAttendeeLabel(attendee)
                    return (
                      <div key={attendee} className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-[12px] font-semibold text-gray-500 shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[14px] font-medium text-[#1d1d1f] truncate">{name}</p>
                          {email && <p className="text-[12px] text-[#86868b] truncate">{email}</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-100 p-5 bg-white space-y-3">
              <div className="flex items-center gap-3 text-[14px] text-[#4b5563]">
                <CalendarIcon />
                <span>{formatEventDateLabel(event)}</span>
              </div>
              <div className="flex items-center gap-3 text-[14px] text-[#4b5563]">
                <ClockIcon />
                <span>{formatEventRangeLabel(event)} ({formatDurationLabel(event)})</span>
              </div>
              {organizer && (
                <div className="flex items-center gap-3 text-[14px] text-[#4b5563]">
                  <UsersIcon />
                  <span>Organisateur : {organizer}</span>
                </div>
              )}
              {event.location && (
                <div className="flex items-center gap-3 text-[14px] text-[#4b5563]">
                  <MapPinIcon />
                  <span>{event.location}</span>
                </div>
              )}
            </div>

            {(joinLink || event.htmlLink) && (
              <div className="rounded-2xl border border-gray-100 p-5 bg-white space-y-3">
                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-1">Liens</h3>
                {joinLink && (
                  <a href={joinLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[14px] text-[#1d1d1f] hover:text-[#007aff] transition-colors">
                    <VideoIcon />
                    Rejoindre la reunion
                    <ExternalLinkIcon />
                  </a>
                )}
                {event.htmlLink && (
                  <a href={event.htmlLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[14px] text-[#1d1d1f] hover:text-[#007aff] transition-colors">
                    <CalendarIcon />
                    Ouvrir dans Google Calendar
                    <ExternalLinkIcon />
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
