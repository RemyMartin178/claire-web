'use client'

import { HelpCircle, Book, MessageCircle, Mail } from 'lucide-react'
import { useRedirectIfNotAuth } from '@/utils/auth'
// SUPPRIMER : import { useTranslation } from 'react-i18next';

export default function HelpPage() {
  // SUPPRIMER : const { t } = useTranslation();
  const userInfo = useRedirectIfNotAuth()

  if (!userInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Centre d’aide</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <Book className="h-6 w-6 text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Bien démarrer</h2>
            </div>
            <p className="text-gray-600 mb-4">Nouveau sur PickleGlass ? Découvrez les fonctionnalités de base et les méthodes de configuration.</p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Configuration de contextes personnalisés</li>
              <li>• Sélection de préréglages et création de contextes personnalisés</li>
              <li>• Consultation de l’historique d’activité</li>
              <li>• Modification des paramètres</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <HelpCircle className="h-6 w-6 text-green-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Questions fréquentes</h2>
            </div>
            <p className="text-gray-600 mb-4">Consultez les questions fréquemment posées et les réponses des autres utilisateurs.</p>
            <div className="space-y-3">
              <details className="text-sm">
                <summary className="font-medium text-gray-700 cursor-pointer">Comment changer de contexte ?</summary>
                <p className="text-gray-600 mt-2 pl-4">Sur la page Personnaliser, sélectionnez un préréglage ou saisissez un contexte personnalisé, puis cliquez sur le bouton Enregistrer.</p>
              </details>
              <details className="text-sm">
                <summary className="font-medium text-gray-700 cursor-pointer">Où puis-je consulter mon historique d’activité ?</summary>
                <p className="text-gray-600 mt-2 pl-4">Vous pouvez consulter vos anciennes activités sur la page Mon activité.</p>
              </details>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <MessageCircle className="h-6 w-6 text-purple-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Communauté</h2>
            </div>
            <p className="text-gray-600 mb-4">Échangez avec d’autres utilisateurs et partagez vos astuces.</p>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">Rejoindre la communauté</button>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <Mail className="h-6 w-6 text-red-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Nous contacter</h2>
            </div>
            <p className="text-gray-600 mb-4">Vous n’avez pas trouvé de solution ? Contactez-nous directement.</p>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">Contacter par e-mail</button>
          </div>
        </div>

        <div className="mt-8 p-6 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">💡 Astuce</h3>
          <p className="text-gray-700">Chaque contexte est optimisé pour différentes situations. Choisissez le préréglage adapté à votre environnement de travail ou créez votre propre contexte personnalisé !</p>
        </div>
      </div>
    </div>
  )
} 