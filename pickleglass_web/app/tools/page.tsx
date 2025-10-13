'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertCircle, X } from 'lucide-react'
import { 
  Search,
  Settings,
  PlayCircle,
  Wrench
} from 'lucide-react'
import { getApiHeaders } from '@/utils/api'
import { Page, PageHeader } from '@/components/Page'
import { PremiumGate } from '@/components/PremiumGate'

interface Tool {
  id: string
  name: string
  description: string
  icon: string
  category: string
  status: 'active' | 'inactive'
  is_enabled: boolean
  usage_count: number
  success_rate: number
  provider: string
}

export default function ToolsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [tools, setTools] = useState<Tool[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    fetchTools()
  }, [])

  const fetchTools = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Try to fetch tools from API
      const response = await fetch('/api/v1/tools', {
        headers: await getApiHeaders()
      })
      
      if (!response.ok) {
        throw new Error('Backend non disponible')
      }
      
      const toolsData = await response.json()
      setTools(toolsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tools')
      console.warn('Tools endpoint not available:', err)
      // Set demo tools for display purposes
      setTools([])
    } finally {
      setLoading(false)
    }
  }

  const categories = ['all', 'web_search', 'calculation', 'utility', 'system']

  const filteredTools = tools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tool.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Chargement des outils...</span>
        </div>
      </div>
    )
  }

  return (
    <Page>
      <PageHeader title="Outils & Intégrations" description="Gérez et configurez les outils Claire" />

      <PremiumGate 
        feature="Intégrations avec des outils externes"
        plan="plus"
        className="mb-6"
      >

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input 
              placeholder="Rechercher des outils..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg w-full text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <main>
          {/* Category Filter */}
          <div className="mb-8">
            <div className="flex space-x-4">
              {categories.map(category => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className={`capitalize ${
                    selectedCategory === category 
                      ? 'bg-[#3b82f6] text-white hover:bg-[#2563eb]' 
                      : 'text-[#374151] border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {category.replace('_', ' ')}
                </Button>
              ))}
            </div>
          </div>

          {error && (
            <Card className="bg-white border border-orange-200 p-6 mb-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-orange-800 mb-1">Backend non disponible</h3>
                  <p className="text-sm text-orange-700">
                    La connexion au backend Claire n'est pas disponible. Pour utiliser les outils, veuillez configurer le backend.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Tools Grid */}
          {filteredTools.length === 0 ? (
            <Card className="bg-white p-12 text-center">
              <div className="mx-auto w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <Wrench className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-2xl font-heading font-semibold text-[#282828] mb-3">
                Aucun outil disponible
              </h3>
              <p className="text-gray-600 max-w-md mx-auto mb-8">
                Les outils et intégrations Claire seront disponibles une fois le backend configuré.
                Connectez des services externes pour étendre les capacités de Claire.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTools.map((tool) => (
                <Card key={tool.id} className="bg-white border border-gray-200 rounded-xl p-4 h-[220px] flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center p-1">
                        <Wrench className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-lg font-semibold text-gray-800 truncate">{tool.name}</h3>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch 
                        checked={tool.is_enabled}
                        onCheckedChange={() => {/* Handle toggle */}}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3 flex-1 overflow-hidden" style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {tool.description}
                  </p>

                  <div className="grid grid-cols-2 gap-3 mb-3 text-xs flex-shrink-0">
                    <div>
                      <span className="text-gray-500">Succès:</span>
                      <span className="ml-1 font-medium">{tool.success_rate}%</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Utilisations:</span>
                      <span className="ml-1 font-medium">{tool.usage_count}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500">Fournisseur:</span>
                      <span className="ml-1 font-medium">{tool.provider}</span>
                    </div>
                  </div>

                  <div className="flex space-x-2 mt-auto flex-shrink-0">
                    <Button 
                      size="sm" 
                      className="flex-1 bg-[#3b82f6] text-white hover:bg-[#2563eb]"
                    >
                      <PlayCircle className="w-4 h-4 mr-1" />
                      Tester
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="px-3 text-[#374151] border-gray-300 hover:bg-gray-50"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
      </PremiumGate>
    </Page>
  )
}
