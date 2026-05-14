const fetch = require('node-fetch');

// Configuration
const API_BASE_URL = 'http://localhost:3000';

// Liste des abonnements à corriger (remplace par tes vrais IDs)
const SUBSCRIPTIONS = [
  {
    userId: '4WMHoL0dCaera6qyp2LhrPPPpJt2', // Ton vrai user ID
    subscriptionId: 'sub_1SHjleAjfdK87nxfCa4oss7k' // Ton subscription ID
  }
];

async function fixSubscription(userId, subscriptionId) {
  try {
    console.log(`🔧 Correction de l'abonnement pour l'utilisateur ${userId}...`);
    
    const response = await fetch(`${API_BASE_URL}/api/admin/fix-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
        subscriptionId: subscriptionId
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Abonnement corrigé avec succès!');
      console.log('📅 Date de renouvellement:', result.renewalDateFormatted);
      return { success: true, result };
    } else {
      const error = await response.text();
      console.error('❌ Erreur API:', response.status, error);
      return { success: false, error: error };
    }
    
  } catch (error) {
    console.error('💥 Erreur:', error.message);
    return { success: false, error: error.message };
  }
}

async function fixAllSubscriptions() {
  console.log('🚀 Début de la correction des abonnements...');
  console.log(`📊 Nombre d'abonnements à corriger: ${SUBSCRIPTIONS.length}`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const subscription of SUBSCRIPTIONS) {
    const result = await fixSubscription(subscription.userId, subscription.subscriptionId);
    
    if (result.success) {
      successCount++;
    } else {
      errorCount++;
    }
    
    // Pause entre les requêtes
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🎉 Résumé de la correction:');
  console.log(`✅ Abonnements corrigés: ${successCount}`);
  console.log(`❌ Erreurs: ${errorCount}`);
}

console.log('📋 CORRECTION SIMPLE DES ABONNEMENTS');
console.log('1. Utilise l\'API route existante /api/admin/fix-subscription');
console.log('2. Corrige les abonnements un par un');
console.log('3. Affiche un résumé');
console.log('');

// Vérifier si les IDs sont configurés
const hasConfiguredIds = SUBSCRIPTIONS.some(sub => 
  sub.userId !== 'ton-user-id-ici'
);

if (!hasConfiguredIds) {
  console.log('⚠️ Veuillez d\'abord configurer les IDs dans SUBSCRIPTIONS');
  console.log('📝 userId: Remplace par ton user ID depuis Firestore');
  console.log('📝 subscriptionId: Remplace par ton subscription ID depuis Firestore');
} else {
  fixAllSubscriptions();
}
