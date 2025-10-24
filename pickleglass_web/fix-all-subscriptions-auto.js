// Utiliser fetch natif de Node.js 18+ ou installer node-fetch@2
const fetch = globalThis.fetch || require('node-fetch');

// Configuration
const API_BASE_URL = 'http://localhost:3000'; // ou ton URL de production

async function getAllUsersWithSubscriptions() {
  try {
    console.log('🔍 Récupération de tous les utilisateurs avec abonnements...');
    
    // Appel à une nouvelle API route qui liste tous les utilisateurs avec abonnements
    const response = await fetch(`${API_BASE_URL}/api/admin/list-subscriptions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`📊 Trouvé ${data.subscriptions.length} utilisateurs avec abonnements`);
      return data.subscriptions;
    } else {
      console.error('❌ Erreur lors de la récupération des utilisateurs:', response.status);
      return [];
    }
    
  } catch (error) {
    console.error('💥 Erreur:', error.message);
    return [];
  }
}

async function fixSingleSubscription(userId, subscriptionId) {
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

async function fixAllSubscriptionsAutomatically() {
  console.log('🚀 Début de la correction automatique de tous les abonnements...');
  
  // 1. Récupérer tous les utilisateurs avec abonnements
  const subscriptions = await getAllUsersWithSubscriptions();
  
  if (subscriptions.length === 0) {
    console.log('⚠️ Aucun utilisateur avec abonnement trouvé');
    return;
  }
  
  console.log(`📊 Nombre d'abonnements à corriger: ${subscriptions.length}`);
  
  let successCount = 0;
  let errorCount = 0;
  
  // 2. Corriger chaque abonnement
  for (let i = 0; i < subscriptions.length; i++) {
    const subscription = subscriptions[i];
    console.log(`\n[${i + 1}/${subscriptions.length}] Traitement de l'utilisateur ${subscription.userId}...`);
    
    const result = await fixSingleSubscription(subscription.userId, subscription.subscriptionId);
    
    if (result.success) {
      successCount++;
    } else {
      errorCount++;
    }
    
    // Pause entre les requêtes pour éviter de surcharger l'API
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n🎉 Résumé de la correction automatique:');
  console.log(`✅ Abonnements corrigés: ${successCount}`);
  console.log(`❌ Erreurs: ${errorCount}`);
  console.log(`📊 Total traité: ${subscriptions.length}`);
}

// Lancer la correction automatique
console.log('📋 CORRECTION AUTOMATIQUE DES ABONNEMENTS');
console.log('1. Récupère automatiquement tous les utilisateurs avec abonnements');
console.log('2. Corrige tous leurs abonnements en une fois');
console.log('3. Affiche un résumé complet');
console.log('');

fixAllSubscriptionsAutomatically();
