'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { getAssistants, type Assistant } from "@/utils/api"
import { useAuth, isGuestUser } from "@/utils/auth"
import { Page, PageHeader } from '@/components/Page'
import { 
  Search, 
  Plus, 
  Sparkles,
  Loader2,
  AlertCircle
} from 'lucide-react'

export default function AIAgentsPage() {
  const router = useRouter()
  const { user, isAuthReady } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [assistants, setAssistants] = useState<Assistant[]>([])
  const [error, setError] = useState<string | null>(null)
  
  // Check if user is guest
  const isUserGuest = isGuestUser(user)

  // Load assistants data
  useEffect(() => {
    const loadAssistants = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const data = await getAssistants();
        setAssistants(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load assistants')
        console.error('Error loading assistants:', err)
      } finally {
        setIsLoading(false)
      }
    }

    if (isAuthReady) {
      loadAssistants()
    }
  }, [isAuthReady])

  const filteredAssistants = assistants.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Chargement des agents...</span>
        </div>
      </div>
    )
  }

  return (
    <Page>
      <PageHeader 
        title="Agents IA" 
        description="Découvrez et gérez vos assistants IA personnalisés"
        actions={
          <Button 
            onClick={() => router.push('/ai-agents/create')}
            className="bg-[#3b82f6] text-white hover:bg-[#2563eb]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Créer un agent
          </Button>
        }
      />

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input 
              placeholder="Rechercher un agent..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg w-full text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>
        </div>

        <main>
          {error && (
            <Card className="bg-white border border-orange-200 mb-6">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-orange-800 mb-1">Backend non disponible</h3>
                    <p className="text-sm text-orange-700">
                      La connexion au backend Claire n'est pas disponible. Pour utiliser les agents IA, veuillez configurer le backend.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {filteredAssistants.length === 0 && !error ? (
            <Card className="bg-white">
              <CardContent className="text-center py-20">
                <div className="mx-auto w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                  <Sparkles className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-2xl font-heading font-semibold text-[#282828] mb-3">
                  Aucun agent IA pour l'instant
                </h3>
                <p className="text-gray-600 max-w-md mx-auto mb-8">
                  Créez votre premier agent IA personnalisé pour automatiser vos tâches et améliorer votre productivité.
                </p>
                <Button 
                  onClick={() => router.push('/ai-agents/create')}
                  className="bg-[#3b82f6] text-white hover:bg-[#2563eb]"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Créer votre premier agent
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAssistants.map((agent) => (
                <Card key={agent.id} className="bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Sparkles className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800">{agent.name}</h3>
                          <Badge variant={agent.status === 'active' ? 'default' : 'secondary'} className="text-xs mt-1">
                            {agent.status === 'active' ? 'Actif' : 'Inactif'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {agent.description}
                    </p>

                    <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                      <span>Modèle: {agent.model}</span>
                      {agent.tools && agent.tools.length > 0 && (
                        <span>{agent.tools.length} outils</span>
                      )}
                    </div>

                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => router.push(`/ai-agents/${agent.id}`)}
                        className="flex-1 text-[#374151] border-gray-300 hover:bg-gray-50"
                      >
                        Voir détails
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => {/* Handle chat */}}
                        className="flex-1 bg-[#3b82f6] text-white hover:bg-[#2563eb]"
                      >
                        Discuter
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
    </Page>
  )
}
