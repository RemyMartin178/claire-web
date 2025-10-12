'use client'

import { HelpCircle, Book, MessageCircle, Mail } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Page } from '@/components/Page'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function HelpPage() {
  const { user: userInfo, loading } = useAuth();
  const router = useRouter();

  if (loading || !userInfo) {
    return null
  }

  return (
    <Page>
      <h1 className="text-3xl font-heading font-semibold text-[#282828] mb-8">Centre d'aide</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <Book className="h-6 w-6 text-primary mr-3" />
              <h2 className="text-xl font-heading font-semibold text-[#282828]">Bien démarrer</h2>
            </div>
            <p className="text-gray-600 mb-4">Nouveau sur Claire ? Découvrez les fonctionnalités de base et les méthodes de configuration.</p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Configuration de contextes personnalisés</li>
              <li>• Sélection de préréglages et création de contextes personnalisés</li>
              <li>• Consultation de l'historique d'activité</li>
              <li>• Modification des paramètres</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <HelpCircle className="h-6 w-6 text-secondary mr-3" />
              <h2 className="text-xl font-heading font-semibold text-[#282828]">Questions fréquentes</h2>
            </div>
            <p className="text-gray-600 mb-4">Consultez les questions fréquemment posées et les réponses des autres utilisateurs.</p>
            <div className="space-y-3">
              <details className="text-sm">
                <summary className="font-medium text-gray-700 cursor-pointer">Comment changer de contexte ?</summary>
                <p className="text-gray-600 mt-2 pl-4">Sur la page Personnaliser, sélectionnez un préréglage ou saisissez un contexte personnalisé, puis cliquez sur le bouton Enregistrer.</p>
              </details>
              <details className="text-sm">
                <summary className="font-medium text-gray-700 cursor-pointer">Où puis-je consulter mon historique d'activité ?</summary>
                <p className="text-gray-600 mt-2 pl-4">Vous pouvez consulter vos anciennes activités sur la page Mon activité.</p>
              </details>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <MessageCircle className="h-6 w-6 text-secondary mr-3" />
              <h2 className="text-xl font-heading font-semibold text-[#282828]">Communauté</h2>
            </div>
            <p className="text-gray-600 mb-4">Échangez avec d'autres utilisateurs et partagez vos astuces.</p>
            <Button variant="link" className="p-0 h-auto text-primary">Rejoindre la communauté</Button>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <Mail className="h-6 w-6 text-primary mr-3" />
              <h2 className="text-xl font-heading font-semibold text-[#282828]">Nous contacter</h2>
            </div>
            <p className="text-gray-600 mb-4">Vous n'avez pas trouvé de solution ? Contactez-nous directement.</p>
            <Button variant="link" className="p-0 h-auto text-primary">Contacter par e-mail</Button>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6">
          <h3 className="text-lg font-heading font-semibold text-[#282828] mb-2">💡 Astuce</h3>
          <p className="text-gray-700">Chaque contexte est optimisé pour différentes situations. Choisissez le préréglage adapté à votre environnement de travail ou créez votre propre contexte personnalisé !</p>
        </CardContent>
      </Card>
    </Page>
  )
}
