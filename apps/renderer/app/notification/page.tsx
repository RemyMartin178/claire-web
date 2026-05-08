'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { Calendar, Video, X } from 'lucide-react'

type Meeting = {
  title?: string
  startTime?: string
  endTime?: string
  meetingUrl?: string
  source?: string
} | null

export default function MeetingNotificationPage() {
  const [meeting, setMeeting] = useState<Meeting>(null)

  useEffect(() => {
    const api = (window as any).api
    api?.dashboard?.onMeetingNotificationData?.((data: Meeting) => {
      setMeeting(data)
    })
  }, [])

  if (!meeting) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          WebkitAppRegion: 'drag',
        } as CSSProperties}
      />
    )
  }

  const startLabel = meeting.startTime
    ? new Date(meeting.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h')
    : ''

  const handleJoin = () => {
    if (meeting.meetingUrl) {
      void (window as any).api?.common?.openExternal?.(meeting.meetingUrl)
    }
  }

  const handleDismiss = () => {
    void (window as any).api?.dashboard?.hideMeetingNotification?.()
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        padding: 8,
        background: 'transparent',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'rgba(24,23,28,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14,
          boxShadow: '0 16px 40px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.18)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 10px 0 14px',
          color: 'white',
          WebkitAppRegion: 'drag',
        } as CSSProperties}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'rgba(79,142,247,0.18)',
            color: '#7eb0ff',
            flexShrink: 0,
          }}
        >
          <Calendar size={16} />
        </div>

        <div style={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.96)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {meeting.title || 'Réunion à venir'}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
            {startLabel ? `Démarre à ${startLabel}` : 'Bientôt'}
          </div>
        </div>

        {meeting.meetingUrl && (
          <button
            onClick={handleJoin}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              height: 28,
              padding: '0 10px',
              borderRadius: 999,
              background: 'linear-gradient(135deg, #4f8ef7 0%, #1a63e8 100%)',
              color: 'white',
              fontSize: 12,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              flexShrink: 0,
              WebkitAppRegion: 'no-drag',
            } as CSSProperties}
          >
            <Video size={12} />
            Rejoindre
          </button>
        )}

        <button
          onClick={handleDismiss}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            borderRadius: 6,
            background: 'transparent',
            color: 'rgba(255,255,255,0.5)',
            border: 'none',
            cursor: 'pointer',
            flexShrink: 0,
            WebkitAppRegion: 'no-drag',
          } as CSSProperties}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
