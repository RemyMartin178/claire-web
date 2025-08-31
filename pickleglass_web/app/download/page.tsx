'use client'

import { useEffect } from 'react'
import { Download, Smartphone, Monitor, Tablet } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

export default function DownloadPage() {
  const { user: userInfo, loading } = useAuth();
  const router = useRouter();

  if (loading || !userInfo) {
    return null
  }

  return (
    <div className="p-8 animate-fade-in">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Télécharger PickleGlass</h1>
        <p className="text-lg text-gray-600 mb-12">
          Utilisez PickleGlass sur différentes plateformes
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg border border-gray-200 p-8 hover:shadow-lg transition-shadow">
            <Monitor className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Desktop</h3>
            <p className="text-gray-600 mb-6">Windows, macOS, Linux</p>
            <button className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors">
              <Download className="h-5 w-5 inline mr-2" />
              Télécharger le bureau
            </button>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-8 hover:shadow-lg transition-shadow">
            <Smartphone className="h-16 w-16 text-[#9ca3af] mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Mobile</h3>
            <p className="text-gray-600 mb-6">iOS, Android</p>
            <div className="space-y-3">
              <button className="w-full bg-gray-900 text-white py-3 px-6 rounded-lg hover:bg-gray-800 transition-colors">
                App Store
              </button>
              <button className="w-full bg-[#9ca3af] text-white py-3 px-6 rounded-lg hover:bg-[#8b8b8b] transition-colors">
                Google Play
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-8 hover:shadow-lg transition-shadow">
            <Tablet className="h-16 w-16 text-purple-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Tablet</h3>
            <p className="text-gray-600 mb-6">iPad, Android Tablet</p>
            <button className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 transition-colors">
              <Download className="h-5 w-5 inline mr-2" />
              Télécharger le tablette
            </button>
          </div>
        </div>

        <div className="mt-12 p-6 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration requise</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Windows</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Windows 10 ou version ultérieure</li>
                <li>• 4 Go de RAM</li>
                <li>• 100 Mo d’espace disque</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">macOS</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• macOS 11.0 ou version ultérieure</li>
                <li>• 4 Go de RAM</li>
                <li>• 100 Mo d’espace disque</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Mobile</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• iOS 14.0 ou version ultérieure</li>
                <li>• Android 8.0 ou version ultérieure</li>
                <li>• 50 Mo d’espace disque</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Un problème ? Consultez notre <a href="/help" className="text-blue-600 hover:text-blue-700">Centre d’aide</a>.
          </p>
        </div>
      </div>
    </div>
  )
} 
