'use client'

import { Download, Smartphone, Monitor, Tablet } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Page } from '@/components/Page'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function DownloadPage() {
  const { user: userInfo, loading } = useAuth();
  const router = useRouter();

  if (loading || !userInfo) {
    return null
  }

  return (
    <Page>
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-3xl font-heading font-semibold text-[#282828] mb-4">Télécharger Claire</h1>
        <p className="text-lg text-gray-600 mb-12">
          Utilisez Claire sur différentes plateformes
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="bg-white hover:shadow-lg transition-shadow">
            <CardContent className="p-8 text-center">
              <Monitor className="h-16 w-16 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-heading font-semibold text-[#282828] mb-2">Desktop</h3>
              <p className="text-gray-600 mb-6">Windows, macOS, Linux</p>
              <Button className="w-full">
                <Download className="h-5 w-5 mr-2" />
                Télécharger le bureau
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white hover:shadow-lg transition-shadow">
            <CardContent className="p-8 text-center">
              <Smartphone className="h-16 w-16 text-secondary mx-auto mb-4" />
              <h3 className="text-xl font-heading font-semibold text-[#282828] mb-2">Mobile</h3>
              <p className="text-gray-600 mb-6">iOS, Android</p>
              <div className="space-y-3">
                <Button className="w-full">
                  App Store
                </Button>
                <Button className="w-full" variant="secondary">
                  Google Play
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white hover:shadow-lg transition-shadow">
            <CardContent className="p-8 text-center">
              <Tablet className="h-16 w-16 text-secondary mx-auto mb-4" />
              <h3 className="text-xl font-heading font-semibold text-[#282828] mb-2">Tablet</h3>
              <p className="text-gray-600 mb-6">iPad, Android Tablet</p>
              <Button className="w-full" variant="secondary">
                <Download className="h-5 w-5 mr-2" />
                Télécharger la tablette
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-12 bg-subtle-bg">
          <CardContent className="p-6">
            <h3 className="text-lg font-heading font-semibold text-[#282828] mb-4">Configuration requise</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div>
                <h4 className="font-medium text-[#282828] mb-2">Windows</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Windows 10 ou version ultérieure</li>
                  <li>• 4 Go de RAM</li>
                  <li>• 100 Mo d'espace disque</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-[#282828] mb-2">macOS</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• macOS 11.0 ou version ultérieure</li>
                  <li>• 4 Go de RAM</li>
                  <li>• 100 Mo d'espace disque</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-[#282828] mb-2">Mobile</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• iOS 14.0 ou version ultérieure</li>
                  <li>• Android 8.0 ou version ultérieure</li>
                  <li>• 50 Mo d'espace disque</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Un problème ? Consultez notre <a href="/help" className="text-primary hover:text-primary-hover">Centre d'aide</a>.
          </p>
        </div>
      </div>
    </Page>
  )
}
