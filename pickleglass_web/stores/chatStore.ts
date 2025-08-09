import { create } from 'zustand'

export type Chat = {
  id: string
  title: string
  preview: string
  updatedAt: number
  pinned: boolean
  archived?: boolean
}

interface ChatStore {
  chats: Chat[]
  selectedChatId: string | null
  searchQuery: string
  sidebarWidth: number
  isCollapsed: boolean
  collapsedSections: Set<string>
  
  // Actions
  createChat: (title?: string) => void
  renameChat: (id: string, title: string) => void
  removeChat: (id: string) => void
  pinToggle: (id: string) => void
  selectChat: (id: string) => void
  search: (query: string) => void
  reorder: (idsInSection: string[]) => void
  archive: (id: string) => void
  setSidebarWidth: (width: number) => void
  toggleCollapse: () => void
  toggleSection: (sectionId: string) => void
  
  // Computed
  filteredChats: Chat[]
  pinnedChats: Chat[]
  recentChats: Chat[]
  allChats: Chat[]
}

// Mock data - 25 conversations variées
const mockChats: Chat[] = [
  {
    id: '1',
    title: 'Prompt pour cursor sidebar',
    preview: 'Comment créer une sidebar responsive avec React et Tailwind...',
    updatedAt: Date.now() - 1000 * 60 * 30, // 30 min ago
    pinned: true
  },
  {
    id: '2',
    title: 'Comparaison GPT-4 et GPT-5',
    preview: 'Analyse des différences entre les modèles...',
    updatedAt: Date.now() - 1000 * 60 * 60 * 2, // 2h ago
    pinned: false
  },
  {
    id: '3',
    title: 'Bon vs Joyeux anniversaire',
    preview: 'Discussion sur les nuances linguistiques...',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
    pinned: false
  },
  {
    id: '4',
    title: 'Options pour carte rapide',
    preview: 'Exploration des alternatives pour les cartes de crédit...',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 2, // 2 days ago
    pinned: true
  },
  {
    id: '5',
    title: 'Power saison 2 déception',
    preview: 'Avis sur la deuxième saison de Power...',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 3, // 3 days ago
    pinned: false
  },
  {
    id: '6',
    title: 'Pas de GPT-5 encore',
    preview: 'Pourquoi GPT-5 n\'est pas encore disponible...',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 4, // 4 days ago
    pinned: false
  },
  {
    id: '7',
    title: 'Photo déformée analyse',
    preview: 'Comment analyser et corriger les photos déformées...',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 5, // 5 days ago
    pinned: false
  },
  {
    id: '8',
    title: 'Blackout et mémoire',
    preview: 'Impact des blackouts sur la mémoire...',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 6, // 6 days ago
    pinned: false
  },
  {
    id: '9',
    title: 'Jouer à stake',
    preview: 'Guide pour jouer au poker sur Stake...',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 7, // 7 days ago
    pinned: false
  },
  {
    id: '10',
    title: 'Filigranes dans contrats location',
    preview: 'Comment gérer les filigranes dans les contrats...',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 8, // 8 days ago
    pinned: false
  },
  {
    id: '11',
    title: 'Architecture microservices',
    preview: 'Défis et avantages des microservices...',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 9, // 9 days ago
    pinned: false
  },
  {
    id: '12',
    title: 'Optimisation React performance',
    preview: 'Techniques pour améliorer les performances React...',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 10, // 10 days ago
    pinned: true
  },
  {
    id: '13',
    title: 'Design patterns JavaScript',
    preview: 'Patterns courants en JavaScript moderne...',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 11, // 11 days ago
    pinned: false
  },
  {
    id: '14',
    title: 'Tests unitaires Jest',
    preview: 'Bonnes pratiques pour les tests avec Jest...',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 12, // 12 days ago
    pinned: false
  },
  {
    id: '15',
    title: 'Déploiement AWS',
    preview: 'Guide de déploiement sur Amazon Web Services...',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 13, // 13 days ago
    pinned: false
  },
  {
    id: '16',
    title: 'Gestion état Redux',
    preview: 'Alternatives modernes à Redux...',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 14, // 14 days ago
    pinned: false
  },
  {
    id: '17',
    title: 'API REST vs GraphQL',
    preview: 'Comparaison des approches API...',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 15, // 15 days ago
    pinned: false
  },
  {
    id: '18',
    title: 'TypeScript avancé',
    preview: 'Fonctionnalités avancées de TypeScript...',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 16, // 16 days ago
    pinned: false
  },
  {
    id: '19',
    title: 'CSS Grid Layout',
    preview: 'Maîtriser CSS Grid pour des layouts complexes...',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 17, // 17 days ago
    pinned: false
  },
  {
    id: '20',
    title: 'Sécurité web moderne',
    preview: 'Bonnes pratiques de sécurité pour le web...',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 18, // 18 days ago
    pinned: false
  },
  {
    id: '21',
    title: 'CI/CD avec GitHub Actions',
    preview: 'Automatisation du déploiement...',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 19, // 19 days ago
    pinned: false
  },
  {
    id: '22',
    title: 'Base de données NoSQL',
    preview: 'Quand utiliser MongoDB vs PostgreSQL...',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 20, // 20 days ago
    pinned: false
  },
  {
    id: '23',
    title: 'Machine Learning basics',
    preview: 'Introduction au machine learning...',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 21, // 21 days ago
    pinned: false
  },
  {
    id: '24',
    title: 'Blockchain développement',
    preview: 'Créer des smart contracts avec Solidity...',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 22, // 22 days ago
    pinned: false
  },
  {
    id: '25',
    title: 'DevOps culture',
    preview: 'Adopter une culture DevOps dans l\'équipe...',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 23, // 23 days ago
    pinned: false
  }
]

export const useChatStore = create<ChatStore>((set, get) => ({
  chats: mockChats,
  selectedChatId: '1',
  searchQuery: '',
  sidebarWidth: 280,
  isCollapsed: false,
  collapsedSections: new Set(),

  // Actions
  createChat: (title = 'Nouvelle conversation') => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title,
      preview: 'Commencez une nouvelle conversation...',
      updatedAt: Date.now(),
      pinned: false
    }
    
    set((state) => ({
      chats: [newChat, ...state.chats],
      selectedChatId: newChat.id
    }))
  },

  renameChat: (id: string, title: string) => {
    set((state) => ({
      chats: state.chats.map(chat =>
        chat.id === id ? { ...chat, title } : chat
      )
    }))
  },

  removeChat: (id: string) => {
    set((state) => {
      const updatedChats = state.chats.filter(chat => chat.id !== id)
      const wasSelected = state.selectedChatId === id
      
      return {
        chats: updatedChats,
        selectedChatId: wasSelected && updatedChats.length > 0 ? updatedChats[0].id : null
      }
    })
  },

  pinToggle: (id: string) => {
    set((state) => ({
      chats: state.chats.map(chat =>
        chat.id === id ? { ...chat, pinned: !chat.pinned } : chat
      )
    }))
  },

  selectChat: (id: string) => {
    set({ selectedChatId: id })
  },

  search: (query: string) => {
    set({ searchQuery: query })
  },

  reorder: (idsInSection: string[]) => {
    set((state) => {
      const chatMap = new Map(state.chats.map(chat => [chat.id, chat]))
      const reorderedChats = idsInSection.map(id => chatMap.get(id)).filter(Boolean) as Chat[]
      
      // Keep other chats in their original order
      const otherChats = state.chats.filter(chat => !idsInSection.includes(chat.id))
      
      return {
        chats: [...reorderedChats, ...otherChats]
      }
    })
  },

  archive: (id: string) => {
    set((state) => ({
      chats: state.chats.map(chat =>
        chat.id === id ? { ...chat, archived: true } : chat
      )
    }))
  },

  setSidebarWidth: (width: number) => {
    set({ sidebarWidth: Math.max(240, Math.min(420, width)) })
  },

  toggleCollapse: () => {
    set((state) => ({ isCollapsed: !state.isCollapsed }))
  },

  toggleSection: (sectionId: string) => {
    set((state) => {
      const newCollapsed = new Set(state.collapsedSections)
      if (newCollapsed.has(sectionId)) {
        newCollapsed.delete(sectionId)
      } else {
        newCollapsed.add(sectionId)
      }
      return { collapsedSections: newCollapsed }
    })
  },

  // Computed
  get filteredChats() {
    const { chats, searchQuery } = get()
    if (!searchQuery.trim()) return chats.filter(chat => !chat.archived)
    
    const query = searchQuery.toLowerCase()
    return chats.filter(chat => 
      !chat.archived && (
        chat.title.toLowerCase().includes(query) ||
        chat.preview.toLowerCase().includes(query)
      )
    )
  },

  get pinnedChats() {
    return get().chats.filter(chat => chat.pinned && !chat.archived)
  },

  get recentChats() {
    const sevenDaysAgo = Date.now() - 1000 * 60 * 60 * 24 * 7
    return get().chats.filter(chat => 
      chat.updatedAt > sevenDaysAgo && !chat.pinned && !chat.archived
    )
  },

  get allChats() {
    return get().chats.filter(chat => !chat.pinned && !chat.archived)
  }
}))
