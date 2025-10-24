const admin = require('firebase-admin');
const Stripe = require('stripe');
const fs = require('fs');
const path = require('path');

// Charger les variables d'environnement depuis .env.local
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
    console.log('✅ Variables d\'environnement chargées depuis .env.local');
  } else {
    console.log('⚠️ Fichier .env.local non trouvé');
  }
}

// Charger les variables d'environnement
loadEnvFile();

// Initialize Firebase Admin
if (!admin.apps.length) {
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
    client_x509_cert_url: process.env.FIREBASE_CLIENT_EMAIL
      ? `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
      : undefined
  };

  console.log('🔧 Configuration Firebase:', {
    hasProjectId: !!serviceAccount.project_id,
    hasPrivateKey: !!serviceAccount.private_key,
    hasClientEmail: !!serviceAccount.client_email,
    privateKeyLength: serviceAccount.private_key?.length || 0
  });

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}

const db = admin.firestore();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function fixExistingSubscriptions() {
  try {
    console.log('🔍 Recherche des abonnements à corriger...');
    
    // Récupérer tous les utilisateurs avec un abonnement Stripe
    const usersSnapshot = await db.collection('users')
      .where('subscription.stripeSubscriptionId', '!=', null)
      .get();
    
    console.log(`📊 Trouvé ${usersSnapshot.size} utilisateurs avec abonnement Stripe`);
    
    let fixedCount = 0;
    let errorCount = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      try {
        const userData = userDoc.data();
        const subscription = userData.subscription;
        const stripeSubscriptionId = subscription.stripeSubscriptionId;
        
        if (!stripeSubscriptionId) {
          console.log(`⚠️ Pas d'ID d'abonnement Stripe pour l'utilisateur ${userDoc.id}`);
          continue;
        }
        
        console.log(`\n🔄 Traitement de l'utilisateur ${userDoc.id} (${userData.email})`);
        console.log(`📋 Abonnement Stripe: ${stripeSubscriptionId}`);
        
        // Récupérer les vraies données depuis Stripe
        const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        
        console.log('📅 Dates actuelles dans Firestore:', {
          currentPeriodStart: subscription.currentPeriodStart?.toDate?.() || subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd?.toDate?.() || subscription.currentPeriodEnd
        });
        
        console.log('📅 Dates réelles depuis Stripe:', {
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
          status: stripeSubscription.status
        });
        
        // Mettre à jour avec les vraies dates
        await userDoc.ref.update({
          'subscription.currentPeriodStart': admin.firestore.Timestamp.fromDate(
            new Date(stripeSubscription.current_period_start * 1000)
          ),
          'subscription.currentPeriodEnd': admin.firestore.Timestamp.fromDate(
            new Date(stripeSubscription.current_period_end * 1000)
          ),
          'subscription.status': stripeSubscription.status,
          'subscription.cancelAtPeriodEnd': stripeSubscription.cancel_at_period_end || false,
          'subscription.updatedAt': admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Abonnement mis à jour avec succès');
        fixedCount++;
        
      } catch (error) {
        console.error(`❌ Erreur pour l'utilisateur ${userDoc.id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n🎉 Résumé:`);
    console.log(`✅ Abonnements corrigés: ${fixedCount}`);
    console.log(`❌ Erreurs: ${errorCount}`);
    
  } catch (error) {
    console.error('💥 Erreur générale:', error);
  }
}

// Exécuter le script
fixExistingSubscriptions()
  .then(() => {
    console.log('🏁 Script terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
  });
