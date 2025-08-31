import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/utils/firebase'

export async function GET(request: NextRequest) {
  try {
    const currentUser = auth.currentUser
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Récupérer les informations du provider depuis Firebase
    const providerData = currentUser.providerData
    
    // Détecter le type d'authentification
    let authType = 'email' // Par défaut
    
    if (providerData && providerData.length > 0) {
      const provider = providerData[0]
      
      if (provider.providerId === 'google.com') {
        authType = 'google'
      } else if (provider.providerId === 'password') {
        authType = 'email'
      }
    } else {
      // Fallback basé sur l'email si pas de provider data
      const email = currentUser.email || ''
      if (email.includes('@gmail.com') || 
          email.includes('@google.com') || 
          email.includes('@googlemail.com')) {
        authType = 'google'
      } else {
        authType = 'email'
      }
    }

    return NextResponse.json({ 
      authType,
      email: currentUser.email,
      providerId: providerData?.[0]?.providerId || 'unknown'
    })
    
  } catch (error) {
    console.error('Erreur lors de la récupération du type d\'auth:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
