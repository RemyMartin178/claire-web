'use client'

import { useEffect } from 'react'
import { useChatStore } from '@/stores/chatStore'
import { useLocalStorage } from '@/lib/useLocalStorage'
import { useAuth } from '@/contexts/AuthContext'
import { Header } from './Header'
import { Search } from './Search'
import { ChatList } from './ChatList'
import { Footer } from './Footer'
import { ResizeHandle } from './ResizeHandle'
import Avatar from '@/components/Avatar'
import clsx from 'clsx'

interface SidebarProps {
  onChatSelect?: (chatId: string) => void
}

export function Sidebar({ onChatSelect }: SidebarProps) {
  const { 
    sidebarWidth, 
    setSidebarWidth, 
    isCollapsed, 
    selectedChatId,
    selectChat 
  } = useChatStore()
  
  const { user } = useAuth()

  // Persist sidebar width in localStorage
  const [storedWidth, setStoredWidth] = useLocalStorage('sidebar-width', 420)
  const [storedCollapsed, setStoredCollapsed] = useLocalStorage('sidebar-collapsed', false)

  // Initialize from localStorage
  useEffect(() => {
    if (storedWidth !== sidebarWidth) {
      setSidebarWidth(storedWidth)
    }
  }, [storedWidth, sidebarWidth, setSidebarWidth])

  // Persist changes to localStorage
  useEffect(() => {
    setStoredWidth(sidebarWidth)
  }, [sidebarWidth, setStoredWidth])

  useEffect(() => {
    setStoredCollapsed(isCollapsed)
  }, [isCollapsed, setStoredCollapsed])

  // Initialize collapsed state from localStorage
  useEffect(() => {
    if (storedCollapsed !== isCollapsed) {
      useChatStore.getState().toggleCollapse()
    }
  }, [storedCollapsed, isCollapsed])

  // Handle chat selection
  const handleChatSelect = (chatId: string) => {
    selectChat(chatId)
    onChatSelect?.(chatId)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        // Toggle collapse would be handled by the store
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (isCollapsed) {
    return (
      <div
              className="w-16 border-r flex flex-col relative"
      style={{
        backgroundColor: 'var(--bg-elevated-secondary)',
        borderColor: 'var(--card-border)',
        transition: 'width 400ms cubic-bezier(0.25, 0.46, 0.45, 0.94), background-color 300ms ease',
        willChange: 'width',
        transformOrigin: 'left center'
      }}
      >
        <div className="p-3 border-b" style={{
          borderColor: 'var(--card-border)',
          transition: 'opacity 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94) 100ms, transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94) 100ms',
          transform: 'translateX(0)',
          opacity: 1
        }}>
          <button
            onClick={() => useChatStore.getState().toggleCollapse()}
            className="w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200"
            style={{
              color: 'var(--text-secondary)',
              backgroundColor: 'transparent'
            }}
            title="Développer la sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 flex flex-col items-center py-4 space-y-2" style={{
          transition: 'opacity 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94) 150ms, transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94) 150ms',
          transform: 'translateX(0)',
          opacity: 1
        }}>
          <button
            onClick={() => useChatStore.getState().createChat()}
            className="w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200"
            style={{
              color: 'var(--text-secondary)',
              backgroundColor: 'transparent'
            }}
            title="Nouvelle conversation"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          
          {/* Show first few chats as icons */}
          <div style={{
            transition: 'opacity 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94) 200ms, transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94) 200ms',
            transform: 'translateX(0)',
            opacity: 1
          }}>
            {useChatStore.getState().chats.slice(0, 8).map((chat) => (
            <button
              key={chat.id}
              onClick={() => handleChatSelect(chat.id)}
              className={clsx(
                'w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200',
                selectedChatId === chat.id
                  ? 'text-[color:var(--text-primary)]'
                  : 'text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]'
              )}
              style={{
                backgroundColor: selectedChatId === chat.id ? 'var(--surface-hover)' : 'transparent'
              }}
              title={chat.title}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
            ))}
          </div>
        </div>

        {/* User avatar at bottom - same as expanded version */}
        <div className="p-3 border-t" style={{
          borderColor: 'var(--card-border)',
          transition: 'opacity 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94) 250ms, transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94) 250ms',
          transform: 'translateX(0)',
          opacity: 1
        }}>
          <div className="flex items-center justify-center">
            <Avatar
              name={user ? (user.display_name || user.email || 'COLLAPSED') : 'COLLAPSED'}
              size="sm"
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="border-r flex flex-col relative z-10 overflow-hidden"
      style={{
        backgroundColor: 'var(--bg-elevated-secondary)',
        width: `${sidebarWidth}px`,
        borderColor: 'var(--card-border)',
        transition: 'width 400ms cubic-bezier(0.25, 0.46, 0.45, 0.94), background-color 300ms ease',
        willChange: 'width',
        transformOrigin: 'left center'
      }}
    >
      <Header />
      
      <div className="p-3 border-b" style={{
        borderColor: 'var(--card-border)',
        transition: 'opacity 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94) 100ms, transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94) 100ms',
        transform: 'translateX(0)',
        opacity: 1
      }}>
        <Search />
      </div>

      <div style={{
        transition: 'opacity 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94) 150ms, transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94) 150ms',
        transform: 'translateX(0)',
        opacity: 1
      }}>
        <ChatList />
      </div>

      <div style={{
        transition: 'opacity 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94) 200ms, transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94) 200ms',
        transform: 'translateX(0)',
        opacity: 1
      }}>
        <Footer />
      </div>
      
      <ResizeHandle />
    </div>
  )
}
