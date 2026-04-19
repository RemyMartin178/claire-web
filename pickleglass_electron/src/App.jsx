import React, { useState, useEffect, useRef, createContext, useContext } from 'react'
import { getUser, onUserChanged, removeUserChanged, minimizeWindow, maximizeWindow, closeWindow, onNavigateToSession, removeOnNavigateToSession } from './utils/api.js'
import Sidebar from './components/Sidebar.jsx'
import Login from './pages/Login.jsx'
import Activity from './pages/Activity.jsx'
import ActivityDetails from './pages/ActivityDetails.jsx'
import Calendar from './pages/Calendar.jsx'
import CalendarDetails from './pages/CalendarDetails.jsx'

export const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

function WinBtn({ onClick, title, children }) {
  const [hovered, setHovered] = React.useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        WebkitAppRegion: 'no-drag',
        width: 22, height: 22,
        borderRadius: '50%',
        border: 'none',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: hovered ? 'rgba(0,0,0,0.08)' : 'transparent',
        color: '#6b7280',
        transition: 'background 0.15s',
        padding: 0,
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

function WinControls() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, WebkitAppRegion: 'no-drag' }}>
      <WinBtn onClick={minimizeWindow} title="Réduire">
        <svg width="10" height="2" viewBox="0 0 10 2" fill="none"><rect width="10" height="1.5" rx=".75" fill="currentColor"/></svg>
      </WinBtn>
      <WinBtn onClick={maximizeWindow} title="Agrandir">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x=".75" y=".75" width="8.5" height="8.5" rx="1.5" stroke="currentColor" strokeWidth="1.5"/></svg>
      </WinBtn>
      <WinBtn onClick={closeWindow} title="Fermer">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><line x1="1.5" y1="1.5" x2="8.5" y2="8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="8.5" y1="1.5" x2="1.5" y2="8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
      </WinBtn>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [route, setRoute] = useState({ page: 'activity', params: {} })
  const [navHistory, setNavHistory] = useState([{ page: 'activity', params: {} }])
  const [navIndex, setNavIndex] = useState(0)
  const navigateRef = useRef(null)

  const navigate = (page, params = {}) => {
    const newHistory = navHistory.slice(0, navIndex + 1)
    const next = { page, params }
    newHistory.push(next)
    setNavHistory(newHistory)
    setNavIndex(newHistory.length - 1)
    setRoute(next)
  }
  navigateRef.current = navigate

  useEffect(() => {
    Promise.resolve(getUser()).then(res => {
      setUser(res?.user || null)
      setLoading(false)
    }).catch(() => setLoading(false))

    const handler = (_e, state) => {
      if (state?.isLoggedIn) setUser({ uid: state.uid, email: state.email, displayName: state.displayName })
      else setUser(null)
    }
    onUserChanged(handler)

    const navHandler = (_e, { sessionId }) => {
      navigateRef.current?.('activity-details', { sessionId })
    }
    onNavigateToSession(navHandler)

    return () => {
      removeUserChanged(handler)
      removeOnNavigateToSession(navHandler)
    }
  }, [])

  const goBack = () => {
    if (navIndex > 0) {
      const prev = navHistory[navIndex - 1]
      setNavIndex(navIndex - 1)
      setRoute(prev)
    }
  }

  const goForward = () => {
    if (navIndex < navHistory.length - 1) {
      const next = navHistory[navIndex + 1]
      setNavIndex(navIndex + 1)
      setRoute(next)
    }
  }

  if (loading) return null

  if (!user) return <Login onLogin={setUser} />

  const activePage = route.page.startsWith('activity')
    ? 'activity'
    : route.page.startsWith('calendar')
      ? 'calendar'
      : route.page

  const renderPage = () => {
    switch (route.page) {
      case 'activity':
        return <Activity navigate={navigate} />
      case 'activity-details':
        return <ActivityDetails navigate={navigate} sessionId={route.params.sessionId} />
      case 'calendar':
        return <Calendar navigate={navigate} />
      case 'calendar-details':
        return <CalendarDetails navigate={navigate} event={route.params.event} />
      default:
        return <Activity navigate={navigate} />
    }
  }

  const userInitial = (user?.displayName || user?.email || '?').charAt(0).toUpperCase()
  const canBack = navIndex > 0
  const canForward = navIndex < navHistory.length - 1
  const pageTitle = activePage === 'calendar' ? 'Calendrier' : 'Mon activite'

  return (
    <AuthCtx.Provider value={{ user }}>
      <div className="flex h-screen bg-[#eef1f4] overflow-hidden">
        <Sidebar activePage={activePage} navigate={navigate} user={user} />

        <div className="flex flex-1 min-w-0 p-3">
          <div className="flex flex-1 min-w-0 flex-col overflow-hidden rounded-[24px] border border-black/5 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
            <div className="drag flex items-center h-[38px] shrink-0 border-b border-neutral-200/80 bg-white px-3">
              <div className="no-drag flex items-center gap-2 w-full min-w-0">
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={goBack}
                    disabled={!canBack}
                    className="flex items-center justify-center w-7 h-7 rounded-full disabled:opacity-25"
                    style={{ WebkitAppRegion: 'no-drag', cursor: canBack ? 'pointer' : 'default' }}
                    onMouseEnter={e => { if (canBack) e.currentTarget.style.background = '#f0f0f2' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  <button
                    onClick={goForward}
                    disabled={!canForward}
                    className="flex items-center justify-center w-7 h-7 rounded-full disabled:opacity-25"
                    style={{ WebkitAppRegion: 'no-drag', cursor: canForward ? 'pointer' : 'default' }}
                    onMouseEnter={e => { if (canForward) e.currentTarget.style.background = '#f0f0f2' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>

                <div className="min-w-0 flex-1 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-[#111827] leading-none">{pageTitle}</p>
                    <p className="text-[11px] text-[#6b7280] mt-1 truncate">Renderer dedie a Electron sur renderer.clairia.app</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div
                      className="w-[28px] h-[28px] rounded-full bg-neutral-900 flex items-center justify-center text-[11px] font-semibold text-white select-none"
                      style={{ WebkitAppRegion: 'no-drag' }}
                      title={user?.displayName || user?.email}
                    >
                      {userInitial}
                    </div>
                    <WinControls />
                  </div>
                </div>
              </div>
            </div>

            <main className="no-drag flex-1 overflow-y-auto bg-white">
              {renderPage()}
            </main>
          </div>
        </div>
      </div>
    </AuthCtx.Provider>
  )
}
