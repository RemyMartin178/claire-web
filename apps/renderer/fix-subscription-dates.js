// Script pour corriger les dates d'abonnement depuis Stripe
// Usage: node fix-subscription-dates.js

const Stripe = require('stripe');
const admin = require('firebase-admin');

// Initialiser Firebase Admin
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID || "dedale-database",
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}

const db = admin.firestore();

// Initialiser Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-09-30.clover',
});

async function fixSubscriptionDates() {
  const subscriptionId = 'sub_1SHnevAjfdK87nxfQCQfA29R';
  const userId = '1buGL667K0XiMCSZTiSbmcECdFf1';

  console.log('🔍 Récupération des données depuis Stripe...');
  
  try {
    // Récupérer l'abonnement depuis Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    console.log('\n📊 Données Stripe:');
    console.log('Status:', stripeSubscription.status);
    console.log('Current period start:', new Date(stripeSubscription.current_period_start * 1000).toLocaleString('fr-FR'));
    console.log('Current period end:', new Date(stripeSubscription.current_period_end * 1000).toLocaleString('fr-FR'));
    console.log('Cancel at period end:', stripeSubscription.cancel_at_period_end);
    
    // Mettre à jour Firestore
    console.log('\n✏️  Mise à jour de Firestore...');
    
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      'subscription.currentPeriodStart': admin.firestore.Timestamp.fromDate(
        new Date(stripeSubscription.current_period_start * 1000)
      ),
      'subscription.currentPeriodEnd': admin.firestore.Timestamp.fromDate(
        new Date(stripeSubscription.current_period_end * 1000)
      ),
      'subscription.status': stripeSubscription.status,
      'subscription.cancelAtPeriodEnd': stripeSubscription.cancel_at_period_end,
      'subscription.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
    });
    
    console.log('✅ Mise à jour réussie!');
    console.log('\n📅 Nouvelle date de renouvellement:', new Date(stripeSubscription.current_period_end * 1000).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

fixSubscriptionDates();

