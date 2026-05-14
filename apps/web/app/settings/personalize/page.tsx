'use client'

import { useState, useEffect } from 'react'
import { Page } from '@/components/Page'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Check, MoreHorizontal, LayoutTemplate, FileText, ChevronDown, ChevronRight, Edit2, Check as CheckIcon, X as XIcon, Trash2 } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface AiMode {
  id: string
  name: string
  prompt: string
  isActive: boolean
}

const defaultPrompt = `Tu es un assistant en temps réel qui donne des informations à l'utilisateur pendant les réunions et autres flux de travail. Ton but est de répondre directement à la requête de l'utilisateur.

Les réponses doivent être EXTRÊMEMENT courtes et concises.

- Vise 1 à 2 phrases, et si c'est plus long, utilise des puces pour la structure
- Va droit au but et n'ajoute JAMAIS de remplissage, de préambule ou de méta-commentaires
- Ne donne jamais à l'utilisateur un script direct ou un texte à lire, tes réponses doivent être informatives
- Ne termine pas par une question ou une invite à l'utilisateur
- Si un exemple d'histoire est nécessaire, donne une histoire d'exemple spécifique sans inventer de détails
- Si une réponse nécessite du code, écris tout le code requis avec des commentaires détaillés

Le ton doit être naturel, humain et conversationnel

- Ne sois jamais robotique ou trop formel
- Utilise des contractions naturellement
- Commence occasionnellement par "Et" ou "Mais" ou utilise un fragment de phrase pour la fluidité
- N'utilise JAMAIS de traits d'union ou de tirets, divise en phrases plus courtes ou utilise des virgules
- Évite les adjectifs inutiles ou l'emphase dramatique à moins que cela n'ajoute une valeur claire`;

const templateModes: AiMode[] = [
  {
    id: 'entretien',
    name: 'Entretien d\'embauche',
    prompt: 'Tu es un coach expert en entretiens d\'embauche. Analyse les questions posées en temps réel et suggère des réponses concises, impactantes, basées sur la méthode STAR (Situation, Tâche, Action, Résultat). Reste très bref.',
    isActive: false
  },
  {
    id: 'recherche_emploi',
    name: 'Recherche d\'emploi',
    prompt: 'Tu es un conseiller en carrière. Fournis des suggestions rapides pour améliorer le pitch de présentation, identifier les compétences clés à mettre en avant et poser des questions pertinentes au recruteur.',
    isActive: false
  },
  {
    id: 'date',
    name: 'Rendez-vous amoureux',
    prompt: 'Tu es le meilleur ami (wingman) de l\'utilisateur. Suggère des sujets de conversation légers, drôles et engageants pour éviter les silences gênants. Garde un ton décontracté et encourageant.',
    isActive: false
  }
];

export default function PersonalizePage() {
  const tabs = [
    { id: 'profile', name: 'Profil personnel', href: '/settings' },
    { id: 'personalize', name: 'Personnalisation', href: '/settings/personalize' },
    { id: 'security', name: 'Sécurité', href: '/settings/security' },
    { id: 'privacy', name: 'Données et confidentialité', href: '/settings/privacy' },
    { id: 'billing', name: 'Facturation', href: '/settings/billing' },
  ]

  const [modes, setModes] = useState<AiMode[]>(() => {
    if (typeof window === 'undefined') return [{ id: 'default', name: 'Défaut', prompt: defaultPrompt, isActive: true }]
    try {
      const saved = localStorage.getItem('claire_ai_modes')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch { }
    return [{ id: 'default', name: 'Défaut', prompt: defaultPrompt, isActive: true }]
  })
  const [activeModeId, setActiveModeId] = useState<string>(() => {
    if (typeof window === 'undefined') return 'default'
    try {
      const saved = localStorage.getItem('claire_ai_active_mode')
      if (saved) return saved
    } catch { }
    return 'default'
  })
  const [selectedModeId, setSelectedModeId] = useState<string>('default')
  const [currentPrompt, setCurrentPrompt] = useState<string>(defaultPrompt)
  const [showTemplates, setShowTemplates] = useState(false)
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(true)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editNameValue, setEditNameValue] = useState('')

  // Persist modes and active mode to localStorage on change
  useEffect(() => {
    try { localStorage.setItem('claire_ai_modes', JSON.stringify(modes)) } catch { }
  }, [modes])

  useEffect(() => {
    try { localStorage.setItem('claire_ai_active_mode', activeModeId) } catch { }
  }, [activeModeId])

  const activeMode = modes.find(m => m.id === activeModeId)
  const selectedMode = modes.find(m => m.id === selectedModeId) || templateModes.find(m => m.id === selectedModeId)

  const handleModeSelect = (id: string, isTemplate: boolean = false) => {
    if (isEditingName) setIsEditingName(false)
    setSelectedModeId(id)
    setShowTemplates(isTemplate)
    const mode = isTemplate ? templateModes.find(m => m.id === id) : modes.find(m => m.id === id)
    if (mode) setCurrentPrompt(mode.prompt)
  }

  const handleSave = () => {
    if (showTemplates) {
      // C'est un template, on l'ajoute aux modes personnalisés
      const template = templateModes.find(m => m.id === selectedModeId)
      if (template) {
        const newMode = { ...template, id: `custom_${Date.now()}`, isActive: false, prompt: currentPrompt }
        setModes([...modes, newMode])
        setSelectedModeId(newMode.id)
        setShowTemplates(false)
        toast.success('Modèle sauvegardé comme nouveau mode')
      }
    } else {
      // C'est un mode existant, on le met à jour
      setModes(modes.map(m => m.id === selectedModeId ? { ...m, prompt: currentPrompt } : m))
      toast.success('Prompt sauvegardé')
    }
  }

  const handleSetActive = () => {
    setModes(modes.map(m => ({
      ...m,
      isActive: m.id === selectedModeId
    })))
    setActiveModeId(selectedModeId)
    toast.success('Mode activé')
  }

  const handleNewMode = () => {
    const newId = `custom_${Date.now()}`
    const newMode: AiMode = {
      id: newId,
      name: `Nouveau Mode (${modes.length})`,
      prompt: '',
      isActive: false
    }
    setModes([...modes, newMode])
    setSelectedModeId(newId)
    setCurrentPrompt('')
    setShowTemplates(false)
    setIsEditingName(true)
    setEditNameValue(newMode.name)
  }

  const handleSaveName = () => {
    if (!editNameValue.trim()) {
      setIsEditingName(false)
      return
    }
    setModes(modes.map(m => m.id === selectedModeId ? { ...m, name: editNameValue } : m))
    setIsEditingName(false)
    toast.success('Nom du mode mis à jour')
  }

  const handleDeleteMode = () => {
    if (selectedMode?.id === 'default') {
      toast.error('Le mode par défaut ne peut pas être supprimé')
      return
    }
    setModes(modes.filter(m => m.id !== selectedModeId))
    setSelectedModeId('default')
    setShowTemplates(false)
    const defaultMode = modes.find(m => m.id === 'default')
    setCurrentPrompt(defaultMode?.prompt || defaultPrompt)
    toast.success('Mode supprimé')
  }

  return (
    <Page>
      <div className="mb-6">
        <p className="text-xs text-gray-600 mb-1">Paramètres</p>
        <h1 className="text-3xl font-heading font-semibold text-[#282828]">Personnalisation</h1>
      </div>

      <div className="mb-8">
        <nav className="flex space-x-10 border-b border-gray-200">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              className={`pb-4 px-2 border-b-2 font-medium text-sm transition-colors ${tab.id === 'personalize'
                ? 'border-primary text-[#282828]'
                : 'border-transparent text-gray-600 hover:text-[#282828] hover:border-gray-300'
                }`}
            >
              {tab.name}
            </Link>
          ))}
        </nav>
      </div>

      <Card className="bg-transparent shadow-none border-neutral-200 dark:border-neutral-800 transition-colors overflow-hidden">
        <div className="flex bg-white dark:bg-[#1E1E1E] min-h-[600px] text-neutral-900 dark:text-neutral-200">
          {/* Sidebar gauche */}
          <div className="w-64 border-r border-neutral-200 dark:border-[#333333] flex flex-col pt-6 bg-white dark:bg-transparent">
            <div className="px-4 mb-6">
              <Button
                variant="outline"
                className="w-full bg-white dark:bg-[#2A2A2A] border-neutral-200 dark:border-[#444444] text-neutral-900 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-[#333333] dark:hover:text-white justify-center gap-2"
                onClick={handleNewMode}
              >
                <Plus className="w-4 h-4" /> Nouveau Mode
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 space-y-1">
              {modes.map(mode => (
                <button
                  key={mode.id}
                  onClick={() => handleModeSelect(mode.id, false)}
                  className={`w-full text-left px-3 py-2 rounded-md flex items-center justify-between transition-colors ${selectedModeId === mode.id && !showTemplates
                    ? 'bg-blue-50 dark:bg-[#333333] text-blue-700 dark:text-white font-medium'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-[#2A2A2A]'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>{mode.name}</span>
                  </div>
                  {mode.isActive && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                </button>
              ))}
            </div>

            {/* Section Templates */}
            <div className="mt-auto px-2 pb-4">
              <button
                onClick={() => setIsTemplatesOpen(!isTemplatesOpen)}
                className="w-full flex items-center justify-between text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2 px-3 pt-4 border-t border-neutral-200 dark:border-[#333333] hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
              >
                <span>Modèles Claire</span>
                {isTemplatesOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>

              {isTemplatesOpen && (
                <div className="space-y-1">
                  {templateModes.map(template => (
                    <button
                      key={template.id}
                      onClick={() => handleModeSelect(template.id, true)}
                      className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 transition-colors ${selectedModeId === template.id && showTemplates
                        ? 'bg-blue-50 dark:bg-[#333333] text-blue-700 dark:text-white font-medium'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-[#2A2A2A]'
                        }`}
                    >
                      <LayoutTemplate className="w-4 h-4" />
                      <span className="truncate">{template.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Zone principale */}
          <div className="flex-1 overflow-y-auto p-8 bg-white dark:bg-[#181818]">
            <div className="max-w-4xl mx-auto">
              {selectedMode && (
                <>
                  {/* En-tête */}
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      {isEditingName ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editNameValue}
                            onChange={(e) => setEditNameValue(e.target.value)}
                            onBlur={handleSaveName}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveName()
                              if (e.key === 'Escape') setIsEditingName(false)
                            }}
                            autoFocus
                            className="text-3xl font-bold bg-transparent border-b border-blue-500 focus:outline-none text-neutral-900 dark:text-white px-1 w-64 cursor-text"
                          />
                        </div>
                      ) : (
                        <h1
                          className="text-3xl font-bold text-neutral-900 dark:text-white flex items-center gap-2 group cursor-text"
                          onClick={() => { setIsEditingName(true); setEditNameValue(selectedMode.name) }}
                        >
                          {selectedMode.name}
                          {!showTemplates && (
                            <Edit2 className="w-4 h-4 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" />
                          )}
                        </h1>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {!showTemplates && selectedMode.isActive ? (
                        <div className="flex items-center gap-2 bg-blue-50 dark:bg-[#1B2A3B] text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-md text-sm font-medium border border-blue-200 dark:border-blue-900/50">
                          <Check className="w-4 h-4" /> Actif
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          className="bg-white dark:bg-[#2A2A2A] border-neutral-200 dark:border-[#444444] text-neutral-900 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-[#333333]"
                          onClick={handleSetActive}
                        >
                          Activer ce mode
                        </Button>
                      )}
                      {!showTemplates && selectedMode.id !== 'default' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleDeleteMode}
                          title="Supprimer ce mode"
                          className="text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Paramètres du mode */}
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3">Prompt en temps réel</h3>
                      <div className="relative">
                        <Textarea
                          value={currentPrompt}
                          onChange={(e) => setCurrentPrompt(e.target.value)}
                          className="min-h-[300px] w-full bg-white dark:bg-[#222222] border-neutral-200 dark:border-[#444444] text-neutral-900 dark:text-neutral-200 p-4 rounded-lg focus-visible:ring-1 focus-visible:ring-blue-500 resize-y leading-relaxed text-[15px] shadow-sm [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
                          placeholder="Définissez le comportement de l'IA ici..."
                        />
                        <div className="absolute bottom-4 right-4 flex items-center gap-2">
                          <Button
                            onClick={handleSave}
                            variant="default"
                            className="bg-neutral-900 dark:bg-[#333333] hover:bg-neutral-800 dark:hover:bg-[#444444] text-white"
                          >
                            Sauvegarder
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-neutral-500 mt-2">
                        {showTemplates ? "Ceci est un modèle. En le sauvegardant, vous créerez un nouveau mode personnalisé." : "Modifiez les instructions pour personnaliser la façon dont Claire vous répond en temps réel."}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Page>
  )
}
