"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  Activity, 
  CreditCard, 
  TrendingUp, 
  Calendar,
  Eye,
  EyeOff,
  RefreshCw,
  Download,
  Search,
  Shield
} from 'lucide-react'

interface AdminUser {
  uid: string
  display_name: string
  email: string
  createdAt: Date
  lastLogin?: Date
  sessionCount: number
  isActive: boolean
}

interface AdminStats {
  totalUsers: number
  activeUsers: number
  newUsersToday: number
  totalSessions: number
  activeSessions: number
}

export default function AdminPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    newUsersToday: 0,
    totalSessions: 0,
    activeSessions: 0
  })
  const [loadingData, setLoadingData] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showInactive, setShowInactive] = useState(true)

  // Debug log au chargement de la page
  console.log('ADMIN PAGE LOAD', { loading, user })

  // Vérifier si l'utilisateur est admin (uniquement martin.remy178@gmail.com)
  const isAdmin = user?.email === 'martin.remy178@gmail.com'

  useEffect(() => {
    console.log('ADMIN DEBUG:', { loading, user, isAdmin })
    if (!loading && !user) {
      window.location.replace('https://clairia.app');
    }
    if (!loading && user && !isAdmin) {
      window.location.replace('https://clairia.app');
    }
    // Si l'utilisateur est bien connecté, on supprime le marqueur de déconnexion manuelle
    if (!loading && user) {
      sessionStorage.removeItem('manuallyLoggedOut');
    }
  }, [loading, user, isAdmin]);

  // Charger les données admin
  useEffect(() => {
    if (!loading && user && isAdmin && !loadingData) {
      fetchAdminData()
    }
  }, [loading, user, isAdmin])

  const fetchAdminData = async () => {
    console.log('Admin page - fetchAdminData called')
    setLoadingData(true)
    try {
      // Simuler un délai pour voir le chargement
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const mockUsers: AdminUser[] = [
        {
          uid: '1',
          display_name: 'Jean Dupont',
          email: 'jean.dupont@example.com',
          createdAt: new Date('2024-01-15'),
          lastLogin: new Date(),
          sessionCount: 12,
          isActive: true
        },
        {
          uid: '2',
          display_name: 'Marie Martin',
          email: 'marie.martin@example.com',
          createdAt: new Date('2024-01-20'),
          lastLogin: new Date(Date.now() - 86400000),
          sessionCount: 8,
          isActive: true
        },
        {
          uid: '3',
          display_name: 'Pierre Durand',
          email: 'pierre.durand@example.com',
          createdAt: new Date('2024-01-10'),
          lastLogin: new Date(Date.now() - 604800000),
          sessionCount: 3,
          isActive: false
        }
      ]

      const mockStats: AdminStats = {
        totalUsers: 156,
        activeUsers: 89,
        newUsersToday: 12,
        totalSessions: 1247,
        activeSessions: 23
      }

      setUsers(mockUsers)
      setStats(mockStats)
      console.log('Admin page - Data loaded successfully')
    } catch (error) {
      console.error('Error fetching admin data:', error)
    } finally {
      setLoadingData(false)
      console.log('Admin page - Loading data finished')
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesActiveFilter = showInactive || user.isActive
    return matchesSearch && matchesActiveFilter
  })

  console.log('Admin page - Render state:', { loading, isAdmin, loadingData })

  // Afficher le chargement initial
  if (loading) {
    console.log('Admin page - Showing loading screen')
    return <div className="min-h-screen flex items-center justify-center text-white">Chargement de l'authentification...</div>
  }

  // Afficher l'écran d'accès refusé
  if (!user || !isAdmin) {
    console.log('Admin page - Showing access denied screen')
    return <div className="min-h-screen flex items-center justify-center text-white">Accès refusé - Panel réservé à l'administrateur</div>
  }

  // Afficher le chargement des données
  if (loadingData) {
    console.log('Admin page - Showing data loading screen')
    return <div className="min-h-screen flex items-center justify-center text-white">Chargement des données d'administration...</div>
  }

  console.log('Admin page - Rendering admin panel')
  return (
    <div className="min-h-screen w-full flex flex-col gap-8 px-4 py-8 md:px-12 md:py-12 bg-transparent">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-bold mb-1 text-white flex items-center gap-3">
            <Shield className="w-8 h-8 text-accent-light" />
            Panel d'Administration
          </h1>
          <p className="text-[#bbb]">Surveillance en temps réel de la plateforme Claire</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchAdminData}
            className="flex items-center gap-2 bg-accent-light hover:opacity-90 text-white px-4 py-2 rounded-lg font-medium shadow transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
          <button className="flex items-center gap-2 bg-[#232329] border border-[#3a3a4a] text-white px-4 py-2 rounded-lg font-medium shadow">
            <Download className="w-4 h-4" />
            Exporter
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-xl bg-[#232329] p-6 flex flex-col gap-2 border border-[#3a3a4a] shadow">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-6 h-6 text-accent-light" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.totalUsers}</div>
          <div className="text-[#bbb]">Utilisateurs totaux</div>
        </div>
        <div className="rounded-xl bg-[#232329] p-6 flex flex-col gap-2 border border-[#3a3a4a] shadow">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-6 h-6 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.activeUsers}</div>
          <div className="text-[#bbb]">Utilisateurs actifs</div>
        </div>
        <div className="rounded-xl bg-[#232329] p-6 flex flex-col gap-2 border border-[#3a3a4a] shadow">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-6 h-6 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.newUsersToday}</div>
          <div className="text-[#bbb]">Nouveaux aujourd'hui</div>
        </div>
        <div className="rounded-xl bg-[#232329] p-6 flex flex-col gap-2 border border-[#3a3a4a] shadow">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-6 h-6 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.totalSessions}</div>
          <div className="text-[#bbb]">Sessions totales</div>
        </div>
        <div className="rounded-xl bg-[#232329] p-6 flex flex-col gap-2 border border-[#3a3a4a] shadow">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-6 h-6 text-yellow-500" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.activeSessions}</div>
          <div className="text-[#bbb]">Sessions actives</div>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#bbb]" />
            <input
              type="text"
              placeholder="Rechercher un utilisateur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-[#2a2a32] border border-[#3a3a4a] rounded-lg text-white placeholder-[#bbb] focus:outline-none focus:border-accent-light"
            />
          </div>
          <button
            onClick={() => setShowInactive(!showInactive)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium shadow transition-all ${
              showInactive 
                ? 'bg-[#232329] border border-[#3a3a4a] text-white' 
                : 'bg-accent-light text-white'
            }`}
          >
            {showInactive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {showInactive ? 'Tous' : 'Actifs seulement'}
          </button>
        </div>
        <div className="text-[#bbb] text-sm">
          {filteredUsers.length} utilisateur(s) trouvé(s)
        </div>
      </div>

      {/* Tableau des utilisateurs */}
      <div className="bg-[#232329] rounded-xl border border-[#3a3a4a] shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#2a2a32]">
              <tr>
                <th className="px-6 py-4 text-left text-white font-semibold">Utilisateur</th>
                <th className="px-6 py-4 text-left text-white font-semibold">Email</th>
                <th className="px-6 py-4 text-left text-white font-semibold">Inscription</th>
                <th className="px-6 py-4 text-left text-white font-semibold">Dernière connexion</th>
                <th className="px-6 py-4 text-left text-white font-semibold">Sessions</th>
                <th className="px-6 py-4 text-left text-white font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3a3a4a]">
              {filteredUsers.map((user) => (
                <tr key={user.uid} className="hover:bg-[#2a2a32] transition-colors">
                  <td className="px-6 py-4 text-white font-medium">
                    {user.display_name}
                  </td>
                  <td className="px-6 py-4 text-[#bbb]">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 text-[#bbb]">
                    {user.createdAt.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-[#bbb]">
                    {user.lastLogin ? user.lastLogin.toLocaleDateString() : 'Jamais'}
                  </td>
                  <td className="px-6 py-4 text-[#bbb]">
                    {user.sessionCount}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.isActive 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {user.isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
} 