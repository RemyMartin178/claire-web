'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, RefreshCw, Search, ShieldCheck, Users } from 'lucide-react'
import { auth } from '@/utils/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { useElectronRuntime } from '@/utils/electron'

type Account = {
  id: string
  email: string
  displayName: string
  createdAt: string | null
  isAdmin: boolean
  isMock: boolean
  subscription: {
    plan: string
    status: string
    isActive: boolean
    isLifetime: boolean
    cancelAtPeriodEnd: boolean
    currentPeriodEnd: string | null
  }
}

type AdminResponse = {
  accounts: Account[]
  stats: {
    total: number
    activeSubscriptions: number
    freeAccounts: number
    canceledSubscriptions: number
  }
}

const statusLabels: Record<string, string> = {
  active: 'Actif',
  trialing: 'Essai',
  canceled: 'Annule',
  past_due: 'Paiement en retard',
  unpaid: 'Impaye',
  incomplete: 'Incomplet',
  incomplete_expired: 'Expire',
  inactive: 'Inactif',
}

const planLabels: Record<string, string> = {
  free: 'Gratuit',
  plus: 'Plus',
  enterprise: 'Entreprise',
  lifetime: 'A vie',
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value))
}

type ChartSegment = {
  label: string
  value: number
  strokeClass: string
  dotClass: string
}

function DonutChart({ title, centerLabel, segments }: { title: string; centerLabel: string; segments: ChartSegment[] }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)
  let offset = 0

  return (
    <div className="flex flex-col rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="text-sm font-medium">{title}</h2>
      <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:justify-around">
        <div className="relative h-40 w-40 shrink-0">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 42 42" role="img" aria-label={`${title} : ${total} comptes`}>
            <circle cx="21" cy="21" r="15.9" fill="none" strokeWidth="5" className="stroke-neutral-100 dark:stroke-neutral-800" />
            {total > 0 && segments.map((segment) => {
              const percentage = (segment.value / total) * 100
              const dashOffset = -offset
              offset += percentage
              return (
                <circle
                  key={segment.label}
                  cx="21"
                  cy="21"
                  r="15.9"
                  fill="none"
                  pathLength="100"
                  strokeWidth="5"
                  strokeDasharray={`${percentage} ${100 - percentage}`}
                  strokeDashoffset={dashOffset}
                  className={segment.strokeClass}
                />
              )
            })}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-semibold tabular-nums">{total}</span>
            <span className="text-xs text-neutral-500">{centerLabel}</span>
          </div>
        </div>
        <div className="w-full max-w-xs space-y-3">
          {segments.map((segment) => (
            <div key={segment.label} className="flex items-center justify-between gap-6 text-sm">
              <span className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                <span className={`h-2.5 w-2.5 rounded-full ${segment.dotClass}`} />
                {segment.label}
              </span>
              <span className="font-medium tabular-nums">{segment.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const router = useRouter()
  const { isAdmin, loading: authLoading } = useAuth()
  const isElectronRuntime = useElectronRuntime()
  const [data, setData] = useState<AdminResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const loadAccounts = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) throw new Error('Session introuvable')

      const response = await fetch('/api/admin/list-subscriptions', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Chargement impossible')
      setData(payload)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authLoading || isElectronRuntime === null) return
    if (!isAdmin || isElectronRuntime) {
      router.replace('/activity')
      return
    }
    void loadAccounts()
  }, [authLoading, isAdmin, isElectronRuntime, router])

  const filteredAccounts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return data?.accounts || []
    return (data?.accounts || []).filter((account) =>
      [account.displayName, account.email, account.subscription.plan, account.subscription.status]
        .some((value) => value.toLowerCase().includes(normalizedQuery))
    )
  }, [data, query])

  const analytics = useMemo(() => {
    const accounts = data?.accounts || []
    const today = new Date().toDateString()
    const todayAccounts = accounts.filter((account) =>
      account.createdAt && new Date(account.createdAt).toDateString() === today
    )

    return {
      subscriptions: [
        { label: 'Actifs', value: data?.stats.activeSubscriptions ?? 0, strokeClass: 'stroke-emerald-500', dotClass: 'bg-emerald-500' },
        { label: 'Gratuits', value: data?.stats.freeAccounts ?? 0, strokeClass: 'stroke-blue-500', dotClass: 'bg-blue-500' },
        { label: 'Inactifs', value: Math.max(0, accounts.length - (data?.stats.activeSubscriptions ?? 0) - (data?.stats.freeAccounts ?? 0)), strokeClass: 'stroke-neutral-400', dotClass: 'bg-neutral-400' },
      ],
      today: [
        { label: 'Abonnements actifs', value: todayAccounts.filter((account) => account.subscription.isActive).length, strokeClass: 'stroke-emerald-500', dotClass: 'bg-emerald-500' },
        { label: 'Comptes gratuits', value: todayAccounts.filter((account) => account.subscription.plan === 'free').length, strokeClass: 'stroke-blue-500', dotClass: 'bg-blue-500' },
        { label: 'Autres', value: todayAccounts.filter((account) => !account.subscription.isActive && account.subscription.plan !== 'free').length, strokeClass: 'stroke-neutral-400', dotClass: 'bg-neutral-400' },
      ],
    }
  }, [data])

  if (authLoading || isElectronRuntime === null || (!isAdmin || isElectronRuntime)) return null

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-500">
            <ShieldCheck className="h-4 w-4" /> Administration
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Comptes utilisateurs</h1>
          <p className="mt-1 text-sm text-neutral-500">Vue en temps reel des comptes et abonnements Claire.</p>
        </div>
        <button
          onClick={() => void loadAccounts()}
          disabled={loading}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-sm font-medium transition hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Tous les comptes', data?.stats.total ?? 0],
          ['Abonnements actifs', data?.stats.activeSubscriptions ?? 0],
          ['Comptes gratuits', data?.stats.freeAccounts ?? 0],
          ['Abonnements termines', data?.stats.canceledSubscriptions ?? 0],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-sm text-neutral-500">{label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DonutChart title="Repartition des abonnements" centerLabel="comptes" segments={analytics.subscriptions} />
        <DonutChart title="Inscriptions aujourd'hui" centerLabel="aujourd'hui" segments={analytics.today} />
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-col gap-3 border-b border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4" /> {filteredAccounts.length} compte{filteredAccounts.length !== 1 ? 's' : ''}
          </div>
          <label className="relative block w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un compte..."
              className="h-10 w-full rounded-lg border border-neutral-200 bg-transparent pl-9 pr-3 text-sm outline-none focus:border-neutral-400 dark:border-neutral-700"
            />
          </label>
        </div>

        {error ? (
          <div className="flex items-center gap-2 p-6 text-sm text-red-600"><AlertCircle className="h-4 w-4" /> {error}</div>
        ) : loading ? (
          <div className="p-10 text-center text-sm text-neutral-500">Chargement des comptes...</div>
        ) : filteredAccounts.length === 0 ? (
          <div className="p-10 text-center text-sm text-neutral-500">Aucun compte trouve.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500 dark:bg-neutral-950/50">
                <tr>
                  <th className="px-5 py-3 font-medium">Compte</th>
                  <th className="px-5 py-3 font-medium">Offre</th>
                  <th className="px-5 py-3 font-medium">Abonnement</th>
                  <th className="px-5 py-3 font-medium">Renouvellement</th>
                  <th className="px-5 py-3 font-medium">Creation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filteredAccounts.map((account) => (
                  <tr key={account.id} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 font-medium">
                        {account.displayName || account.email || 'Sans nom'}
                        {account.isAdmin && <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] uppercase text-violet-700 dark:bg-violet-950 dark:text-violet-300">Admin</span>}
                      </div>
                      <div className="mt-0.5 text-xs text-neutral-500">{account.email || account.id}</div>
                    </td>
                    <td className="px-5 py-4 font-medium">{account.subscription.isLifetime ? 'A vie' : (planLabels[account.subscription.plan] || account.subscription.plan)}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${account.subscription.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'}`}>
                        {statusLabels[account.subscription.status] || account.subscription.status}
                      </span>
                      {account.subscription.cancelAtPeriodEnd && <div className="mt-1 text-xs text-amber-600">Resiliation programmee</div>}
                    </td>
                    <td className="px-5 py-4 text-neutral-600 dark:text-neutral-300">{formatDate(account.subscription.currentPeriodEnd)}</td>
                    <td className="px-5 py-4 text-neutral-600 dark:text-neutral-300">{formatDate(account.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
