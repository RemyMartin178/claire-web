'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertCircle, CheckCircle, X } from 'lucide-react'
import { 
  Search,
  Upload,
  FolderOpen,
  FileText,
  Plus,
  Trash2,
  BookOpen
} from 'lucide-react'
import { getApiHeaders, createKnowledgeFolder, type Folder } from '@/utils/api'
import { Page, PageHeader } from '@/components/Page'
import GuestGate from '@/components/GuestGate'

interface KnowledgeDocument {
  id: string
  title: string
  content: string
  excerpt: string
  content_type: string
  tags: string[]
  is_indexed: boolean
  word_count: number
  created_at: string
}

interface UploadStatus {
  file: File
  status: 'uploading' | 'success' | 'error'
  progress: number
  message?: string
}

export default function KnowledgeBasePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadStatus, setUploadStatus] = useState<UploadStatus[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchDocuments()
    fetchFolders()
  }, [selectedFolder])

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const folderParam = selectedFolder ? `?folder_id=${selectedFolder}` : ''
      const response = await fetch(`/api/v1/knowledge${folderParam}`, {
        headers: await getApiHeaders()
      })
      
      if (!response.ok) {
        throw new Error('Backend non disponible')
      }
      
      const documentsData = await response.json()
      setDocuments(documentsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch documents')
      console.warn('Knowledge base endpoint not available:', err)
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }

  const fetchFolders = async () => {
    try {
      const response = await fetch('/api/v1/knowledge/folders?parent_id=null', {
        headers: await getApiHeaders()
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch folders')
      }
      
      const foldersData = await response.json()
      setFolders(foldersData)
    } catch (err) {
      console.error('Failed to fetch folders:', err)
      setFolders([])
    }
  }

  const createFolder = async () => {
    if (!newFolderName.trim()) return

    try {
      const newFolder = await createKnowledgeFolder({
        name: newFolderName.trim()
      })
      
      setFolders(prev => [...prev, {
        ...newFolder,
        document_count: 0,
        total_words: 0
      }])
      
      setNewFolderName('')
      setShowNewFolderDialog(false)
      await fetchFolders()
    } catch (err) {
      console.error('Failed to create folder:', err)
      alert('Échec de la création du dossier')
    }
  }

  const handleFileUpload = async (files: FileList) => {
    const newUploads: UploadStatus[] = Array.from(files).map(file => ({
      file,
      status: 'uploading' as const,
      progress: 0
    }))
    
    setUploadStatus(prev => [...prev, ...newUploads])

    for (const upload of newUploads) {
      try {
        const content = await readFileContent(upload.file)
        
        const documentData = {
          title: upload.file.name,
          content: content,
          content_type: getContentType(upload.file),
          tags: ['uploaded', getFileTypeTag(upload.file)],
          auto_index: true,
          enable_chunking: true,
          metadata: {
            original_filename: upload.file.name,
            file_size: upload.file.size,
            upload_date: new Date().toISOString()
          }
        }
        
        const response = await fetch('/api/v1/knowledge', {
          method: 'POST',
          headers: await getApiHeaders(),
          body: JSON.stringify(documentData)
        })

        if (!response.ok) {
          throw new Error('Upload failed')
        }

        setUploadStatus(prev => prev.map(u => 
          u.file.name === upload.file.name 
            ? { ...u, status: 'success', progress: 100, message: 'Upload réussi' }
            : u
        ))

        await fetchDocuments()
      } catch (err) {
        setUploadStatus(prev => prev.map(u => 
          u.file.name === upload.file.name 
            ? { ...u, status: 'error', progress: 0, message: err instanceof Error ? err.message : 'Upload failed' }
            : u
        ))
      }
    }

    setTimeout(() => {
      setUploadStatus([])
    }, 3000)
  }

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  const getContentType = (file: File): string => {
    const extension = file.name.split('.').pop()?.toLowerCase()
    const typeMap: { [key: string]: string } = {
      'txt': 'text',
      'md': 'markdown',
      'html': 'html',
      'pdf': 'pdf',
      'json': 'json'
    }
    return typeMap[extension || ''] || 'text'
  }

  const getFileTypeTag = (file: File): string => {
    const extension = file.name.split('.').pop()?.toLowerCase()
    return extension || 'unknown'
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files)
    }
  }

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const deleteDocument = async (id: string) => {
    try {
      const response = await fetch(`/api/v1/knowledge/${id}`, {
        method: 'DELETE',
        headers: await getApiHeaders()
      })
      
      if (!response.ok) throw new Error('Failed to delete document')
      
      setDocuments(prev => prev.filter(doc => doc.id !== id))
    } catch (err) {
      console.error('Failed to delete document:', err)
    }
  }

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Chargement des documents...</span>
        </div>
      </div>
    )
  }

  return (
    <GuestGate
      feature="Knowledge Base"
      description="Connectez-vous pour accéder et gérer votre base de connaissances."
      requireAuth
    >
    <Page>
      <PageHeader title="Base de connaissances" description="Gérez vos documents et dossiers" />

        {/* Search Bar and Upload Button */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <div className="relative w-full max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input 
                placeholder="Rechercher des fichiers et dossiers" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-12 w-full bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        <main className="space-y-8 sm:space-y-12">
          {error && (
            <Card className="bg-white border border-orange-200 p-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-orange-800 mb-1">Backend non disponible</h3>
                  <p className="text-sm text-orange-700">
                    La connexion au backend Claire n'est pas disponible. Pour utiliser la base de connaissances, veuillez configurer le backend.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Folders Section */}
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Dossiers</h2>
              <Button 
                size="sm" 
                className="flex items-center gap-1.5 w-full sm:w-auto bg-secondary text-secondary-foreground hover:bg-secondary/90 text-xs sm:text-sm"
                onClick={() => setShowNewFolderDialog(true)}
              >
                <Plus className="w-4 h-4" />
                <span>Nouveau dossier</span>
              </Button>
            </div>

            {folders.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun dossier</h3>
                <p className="text-gray-500 mb-4">Créez votre premier dossier pour organiser vos documents</p>
                <Button 
                  onClick={() => setShowNewFolderDialog(true)} 
                  className="bg-[#3b82f6] text-white hover:bg-[#2563eb]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Créer un dossier
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className={`group relative cursor-pointer transition-all rounded-lg hover:bg-gray-100 ${
                      selectedFolder === folder.id ? 'ring-2 ring-primary bg-primary/5' : ''
                    }`}
                    onClick={() => setSelectedFolder(selectedFolder === folder.id ? null : folder.id)}
                  >
                    <div className="relative flex flex-col items-center p-3 sm:p-4">
                      <div className="relative mb-2 w-20 h-16 sm:w-28 sm:h-24 group-hover:scale-110 transition-transform duration-300">
                        <svg viewBox="0 0 96 80" className="w-full h-full">
                          <path
                            d="M8 16h20l8-8h52c4.4 0 8 3.6 8 8v48c0 4.4-3.6 8-8 8H8c-4.4 0-8-3.6-8-8V24c0-4.4 3.6-8 8-8z"
                            fill="#374151"
                            stroke="#1f2937"
                            strokeWidth="1"
                            className="group-hover:fill-gray-600 transition-colors duration-300"
                          />
                        </svg>
          </div>
                      
                      <div className="text-center">
                        <h3 className="font-medium text-gray-900 text-xs sm:text-sm mb-1 truncate max-w-full">
                          {folder.name}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {folder.document_count} {folder.document_count === 1 ? 'Fichier' : 'Fichiers'}
                        </p>
        </div>
      </div>
    </div>
                ))}
              </div>
            )}
          </div>

          {/* Upload Zone */}
          <div>
            <Card 
              className={`bg-white border-2 border-dashed rounded-xl p-6 sm:p-8 lg:p-12 text-center transition-colors ${
                dragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={handleFileSelect}
            >
              <div className="space-y-4">
                <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto ${
                  dragActive ? 'bg-primary/10' : 'bg-gray-100'
                }`}>
                  <Upload className={`w-6 h-6 sm:w-8 sm:h-8 ${dragActive ? 'text-primary' : 'text-gray-400'}`} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                    {dragActive ? 'Déposez les fichiers ici' : 'Glissez-déposez des fichiers ou cliquez pour parcourir'}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 mb-4">
                    Support pour PDF, DOCX, TXT, MD jusqu'à 10MB chacun
                  </p>
                  <Button 
                    type="button" 
                    onClick={handleFileSelect} 
                    className="bg-[#3b82f6] text-white hover:bg-[#2563eb] text-sm sm:text-base"
                  >
                    Parcourir les fichiers
                  </Button>
                </div>
              </div>
            </Card>
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.md,.html,.json"
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              className="hidden"
            />
          </div>

          {/* Upload Status */}
          {uploadStatus.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Progression du téléchargement</h3>
              {uploadStatus.map((upload, index) => (
                <Card key={index} className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                      <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{upload.file.name}</p>
                        <p className="text-xs text-gray-500">
                          {Math.round(upload.file.size / 1024)} KB
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      {upload.status === 'uploading' && (
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      )}
                      {upload.status === 'success' && (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                      {upload.status === 'error' && (
                        <X className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                  </div>
                  {upload.message && (
                    <p className="text-xs text-gray-500 mt-2">{upload.message}</p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </main>

        {/* New Folder Dialog */}
        {showNewFolderDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-sm sm:max-w-md">
              <div className="space-y-4">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Créer un nouveau dossier</h3>
                  <p className="text-xs sm:text-sm text-gray-500">Entrez un nom pour votre nouveau dossier</p>
                </div>
                
                <div>
                  <Input
                    placeholder="Nom du dossier"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="w-full"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newFolderName.trim()) {
                        createFolder();
                      }
                      if (e.key === 'Escape') {
                        setShowNewFolderDialog(false);
                        setNewFolderName('');
                      }
                    }}
                    autoFocus
                  />
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setShowNewFolderDialog(false);
                      setNewFolderName('');
                    }}
                    className="text-[#374151] border-gray-300 hover:bg-gray-50"
                  >
                    Annuler
                  </Button>
                  <Button 
                    onClick={createFolder}
                    disabled={!newFolderName.trim()}
                    className="bg-[#3b82f6] text-white hover:bg-[#2563eb] disabled:opacity-50"
                  >
                    Créer
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
    </Page>
    </GuestGate>
  )
}
