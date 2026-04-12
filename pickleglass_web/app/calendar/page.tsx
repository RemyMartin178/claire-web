'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Page } from '@/components/Page'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Loader2, Calendar, Video, Clock, ExternalLink, Check, Mail, LogOut, RefreshCw } from 'lucide-react'
import Image from 'next/image'
import { getApiHeaders } from '@/utils/api'
import { openOAuthPopup, checkAuthStatus, revokeAuth } from '@/utils/oauth'
import { toast } from 'react-hot-toast'

export default function CalendarPage() {
    const { user: userInfo, loading: authLoading } = useAuth()
    const [isConfigured, setIsConfigured] = useState(false)
    const [statusLoading, setStatusLoading] = useState(true)
    const [eventsLoading, setEventsLoading] = useState(false)
    const [calendarInfo, setCalendarInfo] = useState<any>(null)
    const [connectedEmail, setConnectedEmail] = useState<string | null>(null)
    const [upcomingEvents, setUpcomingEvents] = useState<any[]>([])
    const [operatingAuth, setOperatingAuth] = useState(false)
    const [preparingEmailId, setPreparingEmailId] = useState<string | null>(null)

    const searchParams = useSearchParams()
    const authSuccess = searchParams.get('auth') === 'success'

    // Robust Popup handling: signal parent and close
    useEffect(() => {
        if (authSuccess) {
            // 1. Signal via localStorage (works even across domain redirects if same origin remains)
            localStorage.setItem('google-auth-success', Date.now().toString())

            // 2. Signal via postMessage as fallback
            if (window.opener) {
                try {
                    window.opener.postMessage('google-auth-success', '*')
                } catch (e) {
                    console.error('postMessage failed:', e)
                }
            }

            // 3. Attempt to close
            const timeout = setTimeout(() => {
                window.close()
            }, 2000)
            return () => clearTimeout(timeout)
        }
    }, [authSuccess])

    const toolName = 'google_calendar'
    const provider = 'google'

    // Hydration fix: only render dynamic dates after mount
    const [mounted, setMounted] = useState(false)
    useEffect(() => {
        setMounted(true)
    }, [])

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
            setIsConfigured(status.authenticated)
            if ((status as any).accountEmail) {
                setConnectedEmail((status as any).accountEmail)
            }

            if (status.authenticated) {
                await fetchCalendarData()
            }
        } catch (e) {
        } finally {
            setStatusLoading(false)
        }
    }, [toolName])

    // IPC support for Electron Deep Links
    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).api) {
            const api = (window as any).api;
            const handleOAuthSuccess = (_event: any, data: any) => {
                if (data.tool === toolName) {
                    toast.success('Calendrier connecté !');
                    setTimeout(() => checkStatus(), 1500);
                }
            };

            api.on('oauth:success', handleOAuthSuccess);
        }
    }, [checkStatus]);

    useEffect(() => {
        if (userInfo) {
            checkStatus()
        }
    }, [userInfo, checkStatus])

    // Listen for popup success via BroadcastChannel, postMessage, and localStorage
    const signalHandledRef = useRef<string | null>(null);

    useEffect(() => {
        let bc: BroadcastChannel | null = null;
        try {
            bc = new BroadcastChannel('oauth_channel');
        } catch (e) {
        }

        const handleResult = (data: any) => {
            if (data?.type === 'oauth_result' && data?.tool === toolName) {
                // Prevent duplicate processing of the same signal (with 2s debounce)
                const signalId = `${data.ts}-${data.status}`;
                if (signalHandledRef.current === signalId) return;
                signalHandledRef.current = signalId;

                if (data.status === 'success') {
                    toast.success('Calendrier connecté !');
                    // Small delay to ensure Railway has stored the tokens
                    setTimeout(() => checkStatus(), 1500);
                } else {
                    toast.error('Échec de la connexion: ' + (data.error || 'Erreur inconnue'));
                }
                localStorage.removeItem('oauth_result');

                // Clear ref after some time
                setTimeout(() => { signalHandledRef.current = null; }, 2000);
            }
        }

        const handleStorage = (event: StorageEvent) => {
            if (event.key === 'oauth_result' && event.newValue) {
                try {
                    handleResult(JSON.parse(event.newValue));
                } catch (e) { }
            }
            // Compatibility for old keys
            if (event.key === 'google-auth-success' || event.key === 'oauth_success') {
                const ts = Date.now();
                handleResult({ type: 'oauth_result', tool: 'google_calendar', status: 'success', ts });
                localStorage.removeItem(event.key);
            }
        }

        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            handleResult(event.data);
        }

        if (bc) {
            bc.onmessage = (event) => handleResult(event.data);
        }
        window.addEventListener('storage', handleStorage)
        window.addEventListener('message', handleMessage)

        // Initial check for storage
        const pending = localStorage.getItem('oauth_result');
        if (pending) {
            try { handleResult(JSON.parse(pending)); } catch (e) { }
        }

        return () => {
            if (bc) bc.close();
            window.removeEventListener('storage', handleStorage)
            window.removeEventListener('message', handleMessage)
        }
    }, [checkStatus])

    const fetchCalendarData = async () => {
        setEventsLoading(true)
        try {
            const { auth } = await import('@/utils/firebase')
            const userId = auth.currentUser?.uid

            const eventsRes = await fetch(`/api/v1/tools/${toolName}/execute`, {
                method: 'POST',
                headers: { ...(await getApiHeaders()), 'Content-Type': 'application/json', 'x-claire-uid': userId || '' },
                body: JSON.stringify({ parameters: { operation: 'listEvents', maxResults: 10 } })
            })

            if (eventsRes.ok) {
                const eventsData = await eventsRes.json()
                if (eventsData.result && eventsData.result.success) {
                    setUpcomingEvents(eventsData.result.events)
                }
            }
        } catch (e) {
        } finally {
            setEventsLoading(false)
        }
    }

    const handleConnect = async () => {
        try {
            setOperatingAuth(true)
            const { auth } = await import('@/utils/firebase')
            const userId = auth.currentUser?.uid
            if (!userId) throw new Error('User not authenticated')

            await openOAuthPopup({ toolName, provider }, userId)

            // Wait for Railway to finish saving tokens before checking status
            toast.success('Calendrier connecté !')
            await new Promise(resolve => setTimeout(resolve, 1500))
            await checkStatus()
        } catch (error: any) {
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
            setCalendarInfo(null)
            setUpcomingEvents([])
            toast.success('Calendrier déconnecté')
        } catch (error) {
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
            toast.error('Échec de la génération de l\'email', { id: toastId })
        } finally {
            setPreparingEmailId(null)
        }
    }

    // Success UI for the popup window itself - moved here to follow rules of hooks
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
            </div>
        </Page>
    )
}
