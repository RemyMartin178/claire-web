'use client'

import { useState, useEffect, useRef } from 'react'
import { Search as SearchIcon } from 'lucide-react'
import { useChatStore } from '@/stores/chatStore'

export function Search() {
  const { searchQuery, search, filteredChats, selectChat } = useChatStore()
  const [localQuery, setLocalQuery] = useState(searchQuery)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      search(localQuery)
    }, 250)

    return () => clearTimeout(timer)
  }, [localQuery, search])

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(-1)
  }, [searchQuery])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        setLocalQuery('')
        search('')
        inputRef.current?.blur()
        break
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < filteredChats.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && filteredChats[selectedIndex]) {
          selectChat(filteredChats[selectedIndex].id)
          setLocalQuery('')
          search('')
          inputRef.current?.blur()
        }
        break
    }
  }

  return (
    <div className="relative">
      <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        ref={inputRef}
        type="text"
        placeholder="Rechercher dans les conversations"
        value={localQuery}
        onChange={(e) => setLocalQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
      />
    </div>
  )
}
