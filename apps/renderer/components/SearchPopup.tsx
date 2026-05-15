'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { searchConversations, Session } from '@/utils/api'
import { MessageSquare } from 'lucide-react'

interface SearchPopupProps {
  isOpen: boolean
  onClose: () => void
}

export default function SearchPopup({ isOpen, onClose }: SearchPopupProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsLoading(true)
    try {
      const results = await searchConversations(query)
      setSearchResults(results)
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    handleSearch(query)
  }

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm flex items-start justify-center pt-16 z-50 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-180"
      onClick={handleBackgroundClick}
    >
      <div className="bg-white/95 dark:bg-[#09090b]/95 backdrop-blur-md rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-neutral-200 dark:border-white/10 transform-gpu motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:slide-in-from-top-2 motion-safe:duration-180">
        <div className="flex items-center px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
          <Search className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={handleInputChange}
            placeholder="Rechercher dans vos conversations..."
            className="flex-1 text-neutral-900 dark:text-white text-base border-0 focus:outline-none placeholder-gray-400 bg-transparent"
          />
          <button
            onClick={onClose}
            className="ml-3 p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full flex-shrink-0 transform-gpu transition-[background-color,transform] duration-180 ease-apple active:scale-95"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>


        {searchQuery && (
          <div className="max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-3"></div>
                <p className="text-gray-500 text-sm">Recherche en cours...</p>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {searchResults.map((result) => {
                  const timestamp = new Date(result.started_at * 1000).toLocaleString()

                  return (
                    <div
                      key={result.id}
                      className="p-3 hover:bg-[#f4f4f5] dark:hover:bg-[#27272a]/50 cursor-pointer transform-gpu transition-[background-color,transform] duration-180 ease-apple active:scale-[0.995]"
                      onClick={() => {
                        router.push(`/activity/${result.id}`)
                        onClose()
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <MessageSquare className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-neutral-900 dark:text-white mb-1 truncate">
                            {result.title || 'Conversation sans titre'}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">{timestamp}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-12 text-center">
                <Search className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Aucun r&eacute;sultat trouv&eacute; pour &quot;{searchQuery}&quot;</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 
