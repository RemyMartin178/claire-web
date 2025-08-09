'use client'

import { useState } from 'react'
import ChatSidebar from '@/components/ChatSidebar'
import ChatDemo from '@/components/ChatDemo'
import { useChatStore } from '@/stores/chatStore'

export default function ChatPage() {
  const { selectedChatId, chats } = useChatStore()
  const selectedChat = chats.find(chat => chat.id === selectedChatId)

  return (
    <div className="flex h-screen bg-gray-800">
      <ChatSidebar />
      
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gray-900 border-b border-gray-700 p-4">
          <h1 className="text-xl font-semibold text-white">
            {selectedChat ? selectedChat.title : 'Sélectionnez une conversation'}
          </h1>
        </div>
        
        {/* Chat Content */}
        <div className="flex-1 p-6">
          {selectedChat ? (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                <h2 className="text-lg font-medium text-white mb-4">
                  {selectedChat.title}
                </h2>
                <p className="text-gray-300 mb-4">
                  {selectedChat.lastMessage}
                </p>
                <div className="text-sm text-gray-400">
                  Dernière activité : {selectedChat.timestamp.toLocaleString('fr-FR')}
                </div>
              </div>
              
              <ChatDemo />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-2xl mx-auto">
                <h2 className="text-2xl font-semibold text-white mb-2">
                  Bienvenue dans Claire Chat
                </h2>
                <p className="text-gray-400 mb-6">
                  Sélectionnez une conversation existante ou créez-en une nouvelle pour commencer.
                </p>
                
                <ChatDemo />
                
                <div className="bg-gray-900 rounded-lg p-6 border border-gray-700 mt-6">
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
    </div>
  )
}
