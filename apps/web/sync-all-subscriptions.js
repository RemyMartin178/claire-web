// Script simple pour synchroniser tous les abonnements
const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:3000';

async function syncAllSubscriptions() {
  try {
    console.log('🚀 Début de la synchronisation de tous les abonnements...');
    console.log('📡 Appel de l\'API de synchronisation...');
    
    const response = await fetch(`${API_BASE_URL}/api/stripe/sync-subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Synchronisation terminée avec succès!');
      console.log(`📊 Résultats:`);
      console.log(`   - Utilisateurs synchronisés: ${result.syncedCount}`);
      console.log(`   - Erreurs: ${result.errorCount}`);
      console.log(`   - Total utilisateurs: ${result.totalUsers}`);
      
      if (result.results && result.results.length > 0) {
        console.log('\n📋 Détails des synchronisations:');
        result.results.forEach((user, index) => {
          if (user.synced) {
            console.log(`✅ ${index + 1}. ${user.email} - ${user.status} (${user.currentPeriodEnd})`);
          } else {
            console.log(`❌ ${index + 1}. ${user.email} - Erreur: ${user.error}`);
          }
        });
      }
    } else {
      const error = await response.text();
      console.error('❌ Erreur API:', response.status, error);
    }
    
  } catch (error) {
    console.error('💥 Erreur:', error.message);
  }
}

console.log('📋 SYNCHRONISATION AUTOMATIQUE DES ABONNEMENTS');
console.log('1. Récupère tous les utilisateurs avec abonnements');
console.log('2. Synchronise avec Stripe en une seule fois');
console.log('3. Met à jour Firestore automatiquement');
console.log('');

syncAllSubscriptions();
