'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  MessageSquare, 
  Search, 
  Plus, 
  MoreHorizontal, 
  Edit3, 
  Trash2, 
  ChevronDown,
  ChevronRight,
  ChevronLeft
} from 'lucide-react'
import { useChatStore, Chat } from '@/stores/chatStore'

interface ChatItemProps {
  chat: Chat
  onSelect: (chatId: string) => void
  onRename: (chatId: string, newTitle: string) => void
  onDelete: (chatId: string) => void
}

const ChatItem = ({ chat, onSelect, onRename, onDelete }: ChatItemProps) => {
  const [showActions, setShowActions] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [newTitle, setNewTitle] = useState(chat.title)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleRename = () => {
    if (newTitle.trim() && newTitle !== chat.title) {
      onRename(chat.id, newTitle.trim())
    }
    setIsRenaming(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename()
    } else if (e.key === 'Escape') {
      setNewTitle(chat.title)
      setIsRenaming(false)
    }
  }

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isRenaming])

  return (
    <div
      className={`group relative flex items-center px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 ${
        chat.isSelected
          ? 'bg-gray-700 text-white'
          : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
      }`}
      onClick={() => onSelect(chat.id)}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <MessageSquare className="w-4 h-4 mr-3 flex-shrink-0" />
      
      <div className="flex-1 min-w-0">
        {isRenaming ? (
          <input
            ref={inputRef}
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onBlur={handleRename}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent border-none outline-none text-sm"
            maxLength={50}
          />
        ) : (
          <div className="text-sm font-medium truncate">{chat.title}</div>
        )}
        
        {chat.lastMessage && (
          <div className="text-xs text-gray-400 truncate mt-1">
            {chat.lastMessage}
          </div>
        )}
      </div>

      {/* Hover Actions */}
      {showActions && !isRenaming && (
        <div className="absolute right-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsRenaming(true)
            }}
            className="p-1 hover:bg-gray-600 rounded"
            title="Renommer"
          >
            <Edit3 className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(chat.id)
            }}
            className="p-1 hover:bg-gray-600 rounded"
            title="Supprimer"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  )
}

const ChatSidebar = () => {
  const {
    chats,
    selectedChatId,
    searchQuery,
    isSidebarCollapsed,
    selectChat,
    renameChat,
    deleteChat,
    setSearchQuery,
    toggleSidebar,
    addChat
  } = useChatStore()

  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showAllChats, setShowAllChats] = useState(true)

  const filteredChats = chats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleNewChat = () => {
    addChat({
      title: 'Nouvelle conversation',
      lastMessage: 'Commencez une nouvelle conversation...'
    })
  }

  const formatTimestamp = (date: Date) => {
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString('fr-FR', { weekday: 'short' })
    } else {
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
    }
  }

  if (isSidebarCollapsed) {
    return (
      <div className="w-16 bg-gray-900 border-r border-gray-700 flex flex-col">
        <div className="p-3 border-b border-gray-700">
          <button
            onClick={toggleSidebar}
            className="w-10 h-10 flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 flex flex-col items-center py-4 space-y-2">
          <button
            onClick={handleNewChat}
            className="w-10 h-10 flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="Nouvelle conversation"
          >
            <Plus className="w-5 h-5" />
          </button>
          
          {chats.slice(0, 8).map((chat) => (
            <button
              key={chat.id}
              onClick={() => selectChat(chat.id)}
              className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
                chat.isSelected
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
              }`}
              title={chat.title}
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-80 bg-gray-900 border-r border-gray-700 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Conversations</h2>
          <button
            onClick={toggleSidebar}
            className="p-1 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
        
        <button
          onClick={handleNewChat}
          className="w-full flex items-center justify-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle conversation
        </button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher dans les conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gray-500"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <button
            onClick={() => setShowAllChats(!showAllChats)}
            className="w-full flex items-center justify-between text-gray-300 hover:text-white py-2 transition-colors"
          >
            <span className="text-sm font-medium">Toutes les conversations</span>
            {showAllChats ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          
          {showAllChats && (
            <div className="mt-2 space-y-1">
              {filteredChats.length > 0 ? (
                filteredChats.map((chat) => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    onSelect={selectChat}
                    onRename={renameChat}
                    onDelete={deleteChat}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  {searchQuery ? 'Aucune conversation trouvée' : 'Aucune conversation'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChatSidebar
