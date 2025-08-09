'use client'

import { useMemo } from 'react'
import { useChatStore } from '@/stores/chatStore'
import { ChatListItem } from './ChatListItem'
import { Section } from './Section'

export function ChatList() {
  const { 
    selectedChatId, 
    filteredChats, 
    pinnedChats, 
    recentChats, 
    allChats,
    selectChat,
    collapsedSections,
    toggleSection
  } = useChatStore()

  const sections = useMemo(() => [
    {
      id: 'pinned',
      title: 'Épinglés',
      chats: pinnedChats,
      collapsible: true,
      showCount: true
    },
    {
      id: 'recent',
      title: 'Récents',
      chats: recentChats,
      collapsible: true,
      showCount: true
    },
    {
      id: 'all',
      title: 'Toutes les conversations',
      chats: allChats,
      collapsible: false,
      showCount: false
    }
  ], [pinnedChats, recentChats, allChats])

  if (filteredChats.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-gray-400 text-sm mb-2">
            Aucune conversation trouvée
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-3 space-y-4">
        {sections.map((section) => {
          if (section.chats.length === 0) return null
          
          const isCollapsed = collapsedSections.has(section.id)
          
          return (
            <Section
              key={section.id}
              title={section.title}
              collapsible={section.collapsible}
              showCount={section.showCount}
              isCollapsed={isCollapsed}
              onToggle={() => toggleSection(section.id)}
            >
              {!isCollapsed && (
                <div className="space-y-1">
                  {section.chats.map((chat) => (
                    <ChatListItem
                      key={chat.id}
                      chat={chat}
                      isSelected={selectedChatId === chat.id}
                      onSelect={selectChat}
                    />
                  ))}
                </div>
              )}
            </Section>
          )
        })}
      </div>
    </div>
  )
}
