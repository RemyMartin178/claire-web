'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Settings, Sparkles, ChevronLeft } from 'lucide-react'
import { Page, PageHeader } from '@/components/Page'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function ModelsPage() {
  const router = useRouter()

  return (
    <Page>
      {/* Back button */}
      <Link 
        href="/settings"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-[#282828] mb-6 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Retour aux paramètres
      </Link>

      <PageHeader
        title="Modèles IA"
        description="Configurez et gérez vos modèles d'intelligence artificielle"
      />

      {/* Coming Soon Card */}
      <Card className="bg-white">
        <CardContent className="p-12 text-center">
          <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <Settings className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-2xl font-heading font-semibold text-[#282828] mb-3">
            Configuration des modèles IA
          </h3>
          <p className="text-gray-600 max-w-md mx-auto mb-8">
            La configuration avancée des modèles IA (OpenAI, Claude, Gemini, etc.) 
            arrivera prochainement. Vous pourrez gérer vos clés API et préférences de modèles.
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => router.push('/settings')}
              variant="outline"
            >
              Retour aux paramètres
            </Button>
            <Button
              onClick={() => router.push('/personalize')}
              variant="default"
            >
              Personnaliser les prompts
            </Button>
          </div>
        </CardContent>
      </Card>
    </Page>
  )
}
