const fetch = require('node-fetch');

// Configuration
const API_BASE_URL = 'http://localhost:3000'; // ou ton URL de production

// Liste des abonnements à corriger (ajoute tous les utilisateurs avec abonnements)
const SUBSCRIPTIONS_TO_FIX = [
  {
    userId: 'ton-user-id-ici', // Remplace par ton vrai user ID
    subscriptionId: 'sub_1SHjleAjfdK87nxfCa4oss7k' // Ton subscription ID
  },
  // Ajoute d'autres utilisateurs ici si nécessaire :
  // {
  //   userId: 'autre-user-id',
  //   subscriptionId: 'autre-subscription-id'
  // }
];

async function fixSingleSubscription(userId, subscriptionId) {
  try {
    console.log(`\n🔧 Correction de l'abonnement pour l'utilisateur ${userId}...`);
    console.log(`📋 Subscription ID: ${subscriptionId}`);
    
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
  console.log('🚀 Début de la correction de tous les abonnements...');
  console.log(`📊 Nombre d'abonnements à corriger: ${SUBSCRIPTIONS_TO_FIX.length}`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const subscription of SUBSCRIPTIONS_TO_FIX) {
    const result = await fixSingleSubscription(subscription.userId, subscription.subscriptionId);
    
    if (result.success) {
      successCount++;
    } else {
      errorCount++;
    }
    
    // Pause entre les requêtes pour éviter de surcharger l'API
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🎉 Résumé de la correction:');
  console.log(`✅ Abonnements corrigés: ${successCount}`);
  console.log(`❌ Erreurs: ${errorCount}`);
}

// Instructions d'utilisation
console.log('📋 INSTRUCTIONS:');
console.log('1. Remplace les IDs dans SUBSCRIPTIONS_TO_FIX');
console.log('2. Assure-toi que ton serveur Next.js tourne sur localhost:3000');
console.log('3. Relance ce script');
console.log('');

// Vérifier si les IDs sont configurés
const hasConfiguredIds = SUBSCRIPTIONS_TO_FIX.some(sub => 
  sub.userId !== 'ton-user-id-ici' && sub.subscriptionId !== 'sub_1SHjleAjfdK87nxfCa4oss7k'
);

if (!hasConfiguredIds) {
  console.log('⚠️ Veuillez d\'abord configurer les IDs dans SUBSCRIPTIONS_TO_FIX');
  console.log('📝 userId: Remplace par ton user ID depuis Firestore');
  console.log('📝 subscriptionId: Remplace par ton subscription ID depuis Firestore');
} else {
  fixAllSubscriptions();
}
