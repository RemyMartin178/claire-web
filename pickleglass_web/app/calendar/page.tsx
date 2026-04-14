'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Page } from '@/components/Page'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Calendar, Video, Clock, Mail, LogOut, RefreshCw } from 'lucide-react'
import { getApiHeaders } from '@/utils/api'
import { openOAuthPopup, checkAuthStatus, revokeAuth } from '@/utils/oauth'
import { toast } from 'react-hot-toast'

export default function CalendarPage() {
    const { user: userInfo, loading: authLoading } = useAuth()
    const [isConfigured, setIsConfigured] = useState(false)
    const [statusLoading, setStatusLoading] = useState(true)
    const [eventsLoading, setEventsLoading] = useState(false)
    const [, setCalendarInfo] = useState<any>(null)
    const [connectedEmail, setConnectedEmail] = useState<string | null>(null)
    const [upcomingEvents, setUpcomingEvents] = useState<any[]>([])
    const [operatingAuth, setOperatingAuth] = useState(false)
    const [preparingEmailId, setPreparingEmailId] = useState<string | null>(null)

    const searchParams = useSearchParams()
    const authSuccess = searchParams.get('auth') === 'success'
    const toolName = 'google_calendar'
    const provider = 'google'

    const [mounted, setMounted] = useState(false)
    useEffect(() => {
        setMounted(true)
    }, [])

    const fetchCalendarData = useCallback(async () => {
        setEventsLoading(true)
        try {
            const eventsRes = await fetch(`/api/v1/tools/${toolName}/execute`, {
                method: 'POST',
                headers: { ...(await getApiHeaders()), 'Content-Type': 'application/json' },
                body: JSON.stringify({ parameters: { operation: 'listEvents', maxResults: 10 } })
            })

            if (eventsRes.ok) {
                const eventsData = await eventsRes.json()
                const events = eventsData.result?.events || eventsData.events || []
                console.log('[Calendar] execute success', { eventsCount: events.length, eventsData })
                setUpcomingEvents(events)
            } else {
                const errorBody = await eventsRes.text()
                console.error('[Calendar] execute returned', eventsRes.status, errorBody)
            }
        } catch (error) {
            console.error('[Calendar] fetchCalendarData error:', error)
        } finally {
            setEventsLoading(false)
        }
    }, [toolName])

    const checkStatus = useCallback(async () => {
        setStatusLoading(true)
        const { auth } = await import('@/utils/firebase')
        const userId = auth.currentUser?.uid

        try {
            if (!userId) {
                setStatusLoading(false)
                return
            }

            const status = await checkAuthStatus(toolName, userId)
            console.log('[Calendar] auth status', status)

            setIsConfigured(status.authenticated)
            if ((status as any).accountEmail) {
                setConnectedEmail((status as any).accountEmail)
            } else {
                setConnectedEmail(null)
            }

            if (status.authenticated) {
                await fetchCalendarData()
            }
        } catch (error) {
            console.error('[Calendar] checkStatus failed', error)
        } finally {
            setStatusLoading(false)
        }
    }, [fetchCalendarData, toolName])

    const waitForConnectedStatus = useCallback(async (userId: string) => {
        const maxAttempts = 12

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const status = await checkAuthStatus(toolName, userId)
                console.log('[Calendar] auth status poll', { attempt, status })

                setIsConfigured(status.authenticated)
                if ((status as any).accountEmail) {
                    setConnectedEmail((status as any).accountEmail)
                }

                if (status.authenticated) {
                    await fetchCalendarData()
                    return true
                }
            } catch (error) {
                console.error('[Calendar] auth status poll failed', { attempt, error })
            }

            if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 1000))
            }
        }

        return false
    }, [fetchCalendarData, toolName])

    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).api) {
            const api = (window as any).api
            const handleOAuthSuccess = async (_event: any, data: any) => {
                if (data.tool !== toolName) return

                const { auth } = await import('@/utils/firebase')
                const userId = auth.currentUser?.uid
                if (!userId) return

                const connected = await waitForConnectedStatus(userId)
                if (connected) {
                    toast.success('Calendrier connecté !')
                }
            }

            api.on('oauth:success', handleOAuthSuccess)
        }
    }, [toolName, waitForConnectedStatus])

    useEffect(() => {
        if (userInfo) {
            checkStatus()
        }
    }, [userInfo, checkStatus])

    const handleConnect = async () => {
        try {
            setOperatingAuth(true)
            const { auth } = await import('@/utils/firebase')
            const userId = auth.currentUser?.uid
            if (!userId) throw new Error('User not authenticated')

            await openOAuthPopup({ toolName, provider }, userId)

            const connected = await waitForConnectedStatus(userId)
            if (connected) {
                toast.success('Calendrier connecté !')
                return
            }

            console.error('[Calendar] OAuth popup completed but credentials were not visible after polling')
            toast.error('Connexion réussie côté Google, mais le calendrier ne s\'est pas synchronisé.')
        } catch (error: any) {
            console.error('[Calendar] handleConnect failed', error)
            if (error?.message?.includes('fermée')) return
            toast.error('Échec de la connexion au calendrier')
        } finally {
            setOperatingAuth(false)
        }
    }

    const handleDisconnect = async () => {
        try {
            setOperatingAuth(true)
            const { auth } = await import('@/utils/firebase')
            const userId = auth.currentUser?.uid
            if (!userId) throw new Error('User not authenticated')

            await revokeAuth(toolName, userId)
            setIsConfigured(false)
            setConnectedEmail(null)
            setCalendarInfo(null)
            setUpcomingEvents([])
            toast.success('Calendrier déconnecté')
        } catch (error) {
            console.error('[Calendar] handleDisconnect failed', error)
            toast.error('Échec de la déconnexion')
        } finally {
            setOperatingAuth(false)
        }
    }

    const handlePrepareEmail = async (event: any) => {
        setPreparingEmailId(event.id)
        const toastId = toast.loading("Génération du brouillon de l'email...")
        try {
            const context = `Réunion: ${event.summary}\nDescription: ${event.description || 'Pas de description'}`
            const response = await fetch('/api/activity/generate-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    context,
                    userName: userInfo?.display_name || userInfo?.email?.split('@')[0] || 'Utilisateur'
                })
            })

            if (!response.ok) throw new Error('Erreur lors de la génération')

            const data = await response.json()
            const subject = encodeURIComponent(`Suivi de réunion : ${event.summary}`)
            const body = encodeURIComponent(data.email)
            window.location.href = `mailto:?subject=${subject}&body=${body}`
            toast.success('Brouillon généré !', { id: toastId })
        } catch (error) {
            console.error('[Calendar] handlePrepareEmail failed', error)
            toast.error('Échec de la génération de l\'email', { id: toastId })
        } finally {
            setPreparingEmailId(null)
        }
    }

    if (authSuccess) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center bg-background">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    <Calendar className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Connexion réussie !</h1>
                <p className="text-muted-foreground mb-8">
                    Votre calendrier Google est maintenant connecté.<br />
                    Cette fenêtre va se fermer automatiquement.
                </p>
                <Button onClick={() => window.close()} variant="outline">
                    Fermer la fenêtre
                </Button>
            </div>
        )
    }

    if (authLoading || statusLoading) {
        return (
            <Page>
                <div className="flex items-center justify-center min-h-[50vh]">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
            </Page>
        )
    }

    return (
        <Page>
            <div className="max-w-4xl mx-auto w-full px-4 pt-4">
                <div className="mb-10 w-full text-left">
                    <h1 className="text-3xl font-heading font-semibold text-[#282828] mb-1">Calendrier</h1>
                    <p className="text-sm text-gray-500 mb-6">Les prochaines réunions sont synchronisées à partir de ces calendriers.</p>

                    {!isConfigured ? (
                        <div className="mt-2 text-left">
                            <p className="text-sm text-gray-500 mb-6">Connectez votre compte Google pour synchroniser vos réunions.</p>
                            <Button
                                onClick={handleConnect}
                                disabled={operatingAuth}
                                variant="outline"
                                className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 shadow-sm transition-all gap-2 px-4 h-9"
                            >
                                {operatingAuth ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 48 48">
                                        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
                                        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
                                        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
                                        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
                                    </svg>
                                )}
                                <span className="text-sm">Connecter Google</span>
                            </Button>
                        </div>
                    ) : (
                        <div className="mt-4 flex items-center gap-4 text-left">
                            <div className="flex items-center gap-2.5 group">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 48 48" className="shrink-0">
                                    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
                                    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
                                    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
                                    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
                                </svg>
                                <span className="text-sm font-medium text-gray-700">
                                    {connectedEmail || userInfo?.email || 'Calendrier connecté'}
                                </span>
                                <span className="flex h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></span>
                            </div>

                            <div className="h-4 w-[1px] bg-gray-200"></div>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={fetchCalendarData}
                                    disabled={eventsLoading}
                                    className="text-gray-400 hover:text-gray-900 h-8 w-8 p-0"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${eventsLoading ? 'animate-spin' : ''}`} />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleDisconnect}
                                    disabled={operatingAuth}
                                    className="text-gray-400 hover:text-red-500 h-8 px-2 transition-colors text-xs font-medium"
                                >
                                    <LogOut className="w-3.5 h-3.5 mr-1.5" />
                                    Déconnecter
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {isConfigured && (
                    <div className="w-full px-4">
                        {eventsLoading ? (
                            <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Chargement des réunions...
                            </div>
                        ) : upcomingEvents.length === 0 ? (
                            <p className="text-sm text-gray-400 py-4">Aucune réunion à venir.</p>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {upcomingEvents.map((event: any) => {
                                    const startStr = event.start?.dateTime || event.start?.date
                                    const endStr = event.end?.dateTime || event.end?.date
                                    const start = startStr ? new Date(startStr) : null
                                    const end = endStr ? new Date(endStr) : null
                                    const meetLink = event.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === 'video')?.uri
                                    return (
                                        <Card key={event.id} className="border border-gray-100 shadow-none">
                                            <CardContent className="p-4 flex items-start justify-between gap-4">
                                                <div className="flex items-start gap-3 min-w-0">
                                                    <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                                        <Calendar className="w-4 h-4 text-blue-500" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-gray-900 truncate">{event.summary || 'Sans titre'}</p>
                                                        {mounted && start && (
                                                            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                {start.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                                                                {' · '}
                                                                {start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                                {end && ` – ${end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
                                                            </p>
                                                        )}
                                                        {event.attendees && event.attendees.length > 0 && (
                                                            <p className="text-xs text-gray-400 mt-0.5 truncate">
                                                                {event.attendees.filter((a: any) => !a.self).slice(0, 3).map((a: any) => a.displayName || a.email).join(', ')}
                                                                {event.attendees.filter((a: any) => !a.self).length > 3 && ` +${event.attendees.filter((a: any) => !a.self).length - 3}`}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    {meetLink && (
                                                        <a href={meetLink} target="_blank" rel="noopener noreferrer">
                                                            <Button variant="outline" size="sm" className="h-8 px-3 text-xs gap-1.5">
                                                                <Video className="w-3 h-3" />
                                                                Rejoindre
                                                            </Button>
                                                        </a>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 px-2 text-xs text-gray-400 hover:text-gray-700"
                                                        onClick={() => handlePrepareEmail(event)}
                                                        disabled={preparingEmailId === event.id}
                                                    >
                                                        {preparingEmailId === event.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Page>
    )
}
