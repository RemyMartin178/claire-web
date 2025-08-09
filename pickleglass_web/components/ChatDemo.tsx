'use client'

import { useState } from 'react'
import { useChatStore } from '@/stores/chatStore'

export default function ChatDemo() {
  const { chats, addChat, deleteChat, renameChat } = useChatStore()
  const [newChatTitle, setNewChatTitle] = useState('')

  const handleAddRandomChat = () => {
    const titles = [
      'Discussion sur React Hooks',
      'Architecture microservices',
      'Optimisation des performances',
      'Design patterns en JavaScript',
      'Tests unitaires avec Jest',
      'Déploiement sur AWS',
      'Gestion d\'état avec Redux',
      'API REST vs GraphQL'
    ]
    
    const randomTitle = titles[Math.floor(Math.random() * titles.length)]
    addChat({
      title: randomTitle,
      lastMessage: `Nouvelle conversation sur ${randomTitle.toLowerCase()}...`
    })
  }

  const handleAddCustomChat = () => {
    if (newChatTitle.trim()) {
      addChat({
        title: newChatTitle,
        lastMessage: 'Conversation personnalisée créée'
      })
      setNewChatTitle('')
    }
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">
        Démonstration des fonctionnalités
      </h3>
      
      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            onClick={handleAddRandomChat}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Ajouter une conversation aléatoire
          </button>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={newChatTitle}
              onChange={(e) => setNewChatTitle(e.target.value)}
              placeholder="Titre de la conversation"
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && handleAddCustomChat()}
            />
            <button
              onClick={handleAddCustomChat}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              Ajouter
            </button>
          </div>
        </div>
        
        <div className="text-sm text-gray-300">
          <p className="mb-2">Fonctionnalités disponibles :</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Cliquez sur une conversation pour la sélectionner</li>
            <li>Survolez une conversation pour voir les actions (renommer/supprimer)</li>
            <li>Utilisez la barre de recherche pour filtrer les conversations</li>
            <li>Cliquez sur "Nouvelle conversation" pour en créer une</li>
            <li>La sidebar se réduit automatiquement sur mobile</li>
          </ul>
        </div>
        
        <div className="text-xs text-gray-400">
          <p>Total des conversations : {chats.length}</p>
        </div>
      </div>
    </div>
  )
}
