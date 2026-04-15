import React, { useState, useEffect, createContext, useContext } from 'react'
import { getUser, onUserChanged, removeUserChanged } from './utils/api.js'
import Sidebar from './components/Sidebar.jsx'
import Login from './pages/Login.jsx'
import Activity from './pages/Activity.jsx'
import ActivityDetails from './pages/ActivityDetails.jsx'
import Calendar from './pages/Calendar.jsx'
import CalendarDetails from './pages/CalendarDetails.jsx'

export const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [route, setRoute] = useState({ page: 'activity', params: {} })

  useEffect(() => {
    getUser().then(res => {
      setUser(res?.user || null)
      setLoading(false)
    }).catch(() => setLoading(false))

    const handler = (_e, state) => {
      if (state?.isLoggedIn) setUser({ uid: state.uid, email: state.email, displayName: state.displayName })
      else setUser(null)
    }
    onUserChanged(handler)
    return () => removeUserChanged(handler)
  }, [])

  const navigate = (page, params = {}) => setRoute({ page, params })

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-white">
      <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin" />
    </div>
  )

  if (!user) return <Login onLogin={setUser} />

  const activePage = route.page.startsWith('activity') ? 'activity'
    : route.page.startsWith('calendar') ? 'calendar'
    : route.page

  const renderPage = () => {
    switch (route.page) {
      case 'activity':          return <Activity navigate={navigate} />
      case 'activity-details':  return <ActivityDetails navigate={navigate} sessionId={route.params.sessionId} />
      case 'calendar':          return <Calendar navigate={navigate} />
      case 'calendar-details':  return <CalendarDetails navigate={navigate} event={route.params.event} />
      default:                  return <Activity navigate={navigate} />
    }
  }

  return (
    <AuthCtx.Provider value={{ user }}>
      <div className="flex flex-col h-screen bg-white overflow-hidden">
        {/* Titlebar drag region — native controls overlay via titleBarOverlay */}
        <div className="drag flex items-center h-[38px] shrink-0 border-b border-neutral-100 px-4">
          <span className="no-drag text-[13px] font-semibold text-[#1d1d1f] tracking-tight">Claire</span>
        </div>

        <div className="flex flex-1 min-h-0">
          <Sidebar activePage={activePage} navigate={navigate} user={user} />
          <main className="no-drag flex-1 overflow-y-auto bg-white">
            {renderPage()}
          </main>
        </div>
      </div>
    </AuthCtx.Provider>
  )
}
