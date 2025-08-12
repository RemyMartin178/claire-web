'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageSquare, Edit3, Pin, Trash2, MoreHorizontal } from 'lucide-react'
import * as ContextMenu from '@radix-ui/react-context-menu'
import { useChatStore, Chat } from '@/stores/chatStore'
import clsx from 'clsx'

interface ChatListItemProps {
  chat: Chat
  isSelected: boolean
  onSelect: (id: string) => void
}

export function ChatListItem({ chat, isSelected, onSelect }: ChatListItemProps) {
  const { renameChat, removeChat, pinToggle, archive } = useChatStore()
  const [showActions, setShowActions] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [newTitle, setNewTitle] = useState(chat.title)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleRename = () => {
    if (newTitle.trim() && newTitle !== chat.title) {
      renameChat(chat.id, newTitle.trim())
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

  const handleClick = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      setIsRenaming(true)
    } else {
      onSelect(chat.id)
    }
  }

  const handleDelete = () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette conversation ?')) {
      removeChat(chat.id)
    }
  }

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isRenaming])

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <div
          className={clsx(
            'group relative flex items-center px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 h-14',
            isSelected
              ? 'bg-blue-500/20 text-white border-l-2 border-blue-500'
              : 'text-gray-300 hover:bg-white/5 hover:text-white'
          )}
          onClick={handleClick}
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
                className="w-full bg-transparent border-none outline-none text-sm text-white"
                maxLength={50}
              />
            ) : (
              <div className="text-sm font-medium truncate">{chat.title}</div>
            )}
            
            {chat.preview && (
              <div className="text-xs text-gray-400 truncate mt-1">
                {chat.preview}
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
                className="p-1 hover:bg-white/10 rounded"
                title="Renommer"
              >
                <Edit3 className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  pinToggle(chat.id)
                }}
                className={clsx(
                  'p-1 hover:bg-white/10 rounded',
                  chat.pinned && 'text-yellow-400'
                )}
                title={chat.pinned ? "Désépingler" : "Épingler"}
              >
                <Pin className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete()
                }}
                className="p-1 hover:bg-white/10 rounded"
                title="Supprimer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </ContextMenu.Trigger>

      <ContextMenu.Portal>
          <ContextMenu.Content className="min-w-[200px] bg-gray-800 border border-gray-700 rounded-lg p-1 shadow-lg">
          <ContextMenu.Item
            className="flex items-center px-3 py-2 text-sm text-white hover:bg-white/10 rounded cursor-pointer"
            onClick={() => onSelect(chat.id)}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Ouvrir
          </ContextMenu.Item>
          
          <ContextMenu.Item
            className="flex items-center px-3 py-2 text-sm text-white hover:bg-white/10 rounded cursor-pointer"
            onClick={() => setIsRenaming(true)}
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Renommer
          </ContextMenu.Item>
          
          <ContextMenu.Item
            className="flex items-center px-3 py-2 text-sm text-white hover:bg-white/10 rounded cursor-pointer"
            onClick={() => pinToggle(chat.id)}
          >
            <Pin className="w-4 h-4 mr-2" />
            {chat.pinned ? 'Désépingler' : 'Épingler'}
          </ContextMenu.Item>
          
          <ContextMenu.Separator className="h-px bg-gray-700 my-1" />
          
          <ContextMenu.Item
            className="flex items-center px-3 py-2 text-sm text-white hover:bg-white/10 rounded cursor-pointer"
            onClick={() => archive(chat.id)}
          >
            <MoreHorizontal className="w-4 h-4 mr-2" />
            Archiver
          </ContextMenu.Item>
          
          <ContextMenu.Item
            className="flex items-center px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded cursor-pointer"
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Supprimer
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}
