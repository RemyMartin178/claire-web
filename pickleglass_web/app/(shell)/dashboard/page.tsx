'use client'

import { useChatStore } from '@/stores/chatStore'

export default function DashboardPage() {
  const { selectedChatId, chats } = useChatStore()
  const selectedChat = chats.find(chat => chat.id === selectedChatId)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-[#0f1115] border-b border-white/10 p-4">
        <h1 className="text-xl font-semibold text-white">
          {selectedChat ? selectedChat.title : 'Sélectionnez une conversation'}
        </h1>
      </div>
      
      {/* Content */}
      <div className="flex-1 p-6">
        {selectedChat ? (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/5 rounded-lg p-6 border border-white/10">
              <h2 className="text-lg font-medium text-white mb-4">
                {selectedChat.title}
              </h2>
              <p className="text-gray-300 mb-4">
                {selectedChat.preview}
              </p>
              <div className="text-sm text-gray-400">
                Dernière activité : {new Date(selectedChat.updatedAt).toLocaleString('fr-FR')}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-white mb-2">
                Bienvenue dans Claire
              </h2>
              <p className="text-gray-400 mb-6">
                Sélectionnez une conversation existante ou créez-en une nouvelle pour commencer.
              </p>
              <div className="bg-white/5 rounded-lg p-6 border border-white/10 max-w-md mx-auto">
                <h3 className="text-lg font-medium text-white mb-3">
                  Fonctionnalités disponibles :
                </h3>
                <ul className="text-gray-300 text-sm space-y-2">
                  <li>• Créer de nouvelles conversations</li>
                  <li>• Rechercher dans les conversations</li>
                  <li>• Renommer et supprimer des conversations</li>
                  <li>• Interface responsive et intuitive</li>
                  <li>• Design inspiré de ChatGPT</li>
                  <li>• Sidebar collapsible</li>
                  <li>• État géré avec Zustand</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
