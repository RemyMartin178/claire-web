'use client'

import { Plus, ChevronLeft } from 'lucide-react'
import { useChatStore } from '@/stores/chatStore'

export function Header() {
  const { createChat, toggleCollapse, isCollapsed } = useChatStore()

  const handleNewChat = () => {
    createChat()
  }

  return (
    <div className="p-3 border-b border-white/10">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-white">Conversations</h2>
        <button
          onClick={toggleCollapse}
          className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
          title={isCollapsed ? "Développer la sidebar" : "Réduire la sidebar"}
        >
          <ChevronLeft className={`w-4 h-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>
      
      <button
        onClick={handleNewChat}
        className="w-full flex items-center justify-center px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
      >
        <Plus className="w-4 h-4 mr-2" />
        Nouvelle conversation
      </button>
    </div>
  )
}
