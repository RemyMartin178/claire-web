const admin = require('firebase-admin');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '.env') });

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

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
    });
}

const db = admin.firestore();

async function injectTechSession() {
    const targetEmail = 'pantherg719@gmail.com';
    const usersSnapshot = await db.collection('users').where('email', '==', targetEmail).limit(1).get();

    if (usersSnapshot.empty) {
        console.error(`❌ User not found: ${targetEmail}`);
        process.exit(1);
    }

    const uid = usersSnapshot.docs[0].id;
    const sessionRef = db.collection('users').doc(uid).collection('sessions').doc();
    const sessionId = sessionRef.id;

    const startedAt = new Date();
    startedAt.setHours(startedAt.getHours() - 1);

    await sessionRef.set({
        title: 'Discussion Technique : Intégration API Stripe',
        session_type: 'tech',
        startedAt: admin.firestore.Timestamp.fromDate(startedAt),
        endedAt: admin.firestore.Timestamp.fromDate(new Date())
    });

    const summaryData = {
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
        model: 'gpt-4o',
        text: "## Résumé technique\nL'équipe a exploré l'intégration de Stripe pour le nouveau système de facturation. Les points de friction identifiés concernent la gestion des webhooks et la synchronisation des statuts d'abonnement.\n\n## Décisions\n- Utilisation de Stripe Checkout pour simplifier le flux de paiement initial.\n- Mise en place d'un worker dédié pour traiter les webhooks de manière asynchrone.",
        tldr: "Focus sur l'intégration Stripe : choix de Stripe Checkout et architecture worker pour les webhooks.",
        bulletPoints: [
            "Validation de Stripe Checkout pour les nouveaux abonnements.",
            "Nécessité d'un worker asynchrone pour les webhooks.",
            "Synchronisation des métadonnées client vers Firestore."
        ],
        actionItems: [
            { owner: 'Thomas', task: "Configurer le compte de test Stripe et générer les clés API.", due: "Lundi" },
            { owner: 'Vous', task: "Rédiger la documentation technique du worker de webhooks.", due: "Mercredi" }
        ]
    };

    await sessionRef.collection('summary').doc('data').set(summaryData);

    const transcriptsRef = sessionRef.collection('transcripts');
    await transcriptsRef.add({
        startAt: admin.firestore.Timestamp.fromDate(startedAt),
        endAt: admin.firestore.Timestamp.fromDate(new Date(startedAt.getTime() + 10000)),
        speaker: 'other',
        text: "On a besoin d'avancer sur Stripe. Thomas, tu penses quoi de Checkout ?",
        lang: 'fr',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await transcriptsRef.add({
        startAt: admin.firestore.Timestamp.fromDate(new Date(startedAt.getTime() + 11000)),
        endAt: admin.firestore.Timestamp.fromDate(new Date(startedAt.getTime() + 20000)),
        speaker: 'me',
        text: "Checkout c'est bien pour commencer vite. Par contre pour les webhooks, il nous faut un truc solide. Thomas, tu prends les clés et moi je m'occupe de la doc du worker.",
        lang: 'fr',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Tech Session Created: ${sessionId}`);
    process.exit(0);
}

injectTechSession().catch(err => {
    console.error(err);
    process.exit(1);
});
