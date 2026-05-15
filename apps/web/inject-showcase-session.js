const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('✅ ENV loaded. Project ID:', process.env.FIREBASE_PROJECT_ID);
console.log('Private Key length:', process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.length : 0);

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

async function injectShowcase() {
    const targetEmail = 'pantherg719@gmail.com';

    // Find User UID by email inside Users collection
    const usersSnapshot = await db.collection('users').where('email', '==', targetEmail).limit(1).get();

    if (usersSnapshot.empty) {
        console.error(`❌ User not found with email: ${targetEmail}`);
        process.exit(1);
    }

    const uid = usersSnapshot.docs[0].id;
    console.log(`✅ Using UID: ${uid} for ${targetEmail}`);

    // Create Session
    const sessionRef = db.collection('users').doc(uid).collection('sessions').doc();
    const sessionId = sessionRef.id;

    const startedAt = new Date();
    startedAt.setMinutes(startedAt.getMinutes() - 45); // 45 minutes ago

    const endedAt = new Date();
    endedAt.setMinutes(endedAt.getMinutes() - 5);    // 5 minutes ago

    await sessionRef.set({
        title: 'Réunion Bilan Économique Q1 2026',
        session_type: 'reunion',
        startedAt: admin.firestore.Timestamp.fromDate(startedAt),
        endedAt: admin.firestore.Timestamp.fromDate(endedAt)
    });

    console.log(`✅ Session Created: ${sessionId}`);

    // Create Summary
    const markdownSummary = `## Résumé
- Le premier trimestre démontre une performance **exceptionnelle** à l’échelle globale.

- Les revenus d'exploitation ont dépassé nos objectifs avec une croissance estimée à **+15%** sur le T1, principalement tirée par notre segment B2B. L'optimisation récentes de nos infrastructures cloud a également permis de **réduire les coûts fixes de 8%**, débloquant ainsi une marge bénéficiaire plus saine.

- Enfin, la refonte du processus d'acquisition client commence à porter ses fruits, avec un taux de conversion multiplié par **1.4x** sur les deux derniers mois. L'équipe a convenu de stabiliser ce processus avant l'entame du T2.

## À retenir
- Ne pas oublier d'envoyer le compte-rendu analytique et le **tableau de bord Q1** à l'ensemble du conseil d'administration.
- Valider le budget des campagnes de recrutement pour le semestre à venir.
- Organiser un point d'étape avec les chefs d'équipes la semaine prochaine pour réviser nos KPIs.
`;

    const summaryData = {
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
        model: 'gpt-4o',
        text: markdownSummary,
        tldr: "Bilan trimestriel très positif : +15% de croissance des revenus et baisse des coûts d'infrastructures cloud. Reste à communiquer les KPIs au conseil d'administration.",
        bulletPoints: [
            "Le chiffre d'affaires du Q1 2026 est en forte croissance (**+15%**) par rapport à l'année précédente.",
            "L'optimisation des serveurs a permis de baisser les coûts fixes de **8%**.",
            "Le taux de conversion client est en excellente progression (**1.4x**)."
        ],
        actionItems: [
            { owner: 'Vous', task: "Ne pas oublier d'envoyer le compte-rendu financier à l'équipe de direction.", due: "" },
            { owner: 'Vous', task: "Valider l'enveloppe budgétaire pour le T2", due: "" }
        ]
    };

    const summaryRef = db.collection('users').doc(uid).collection('sessions').doc(sessionId).collection('summary').doc('data');
    await summaryRef.set(summaryData);

    console.log(`✅ Summary Created with markdown styling and accurate bullet points.`);

    // Create Transcript
    const transcriptsRef = db.collection('users').doc(uid).collection('sessions').doc(sessionId).collection('transcripts');
    await transcriptsRef.add({
        startAt: admin.firestore.Timestamp.fromDate(startedAt),
        endAt: admin.firestore.Timestamp.fromDate(new Date(startedAt.getTime() + 5000)),
        speaker: 'other',
        text: "Bonjour tout le monde. Si on regarde les chiffres de ce premier trimestre, la croissance de nos revenus s'établit autour de 15%. C'est une excellente nouvelle, surtout pour le pôle B2B.",
        lang: 'fr',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await transcriptsRef.add({
        startAt: admin.firestore.Timestamp.fromDate(new Date(startedAt.getTime() + 6000)),
        endAt: admin.firestore.Timestamp.fromDate(new Date(startedAt.getTime() + 10000)),
        speaker: 'me',
        text: "Absolument. De plus, j'aimerais souligner que nos coûts d'infrastructure cloud ont baissé de 8% suite à la migration. Il ne faut juste pas oublier d'envoyer ce compte-rendu au CA avant vendredi.",
        lang: 'fr',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Transcripts added.`);

    console.log(`\n🎉 SHOWCASE SESSION READY! Open your session list and find 'Réunion Bilan Économique Q1 2026'.`);
    process.exit(0);
}

injectShowcase().catch(err => {
    console.error(err);
    process.exit(1);
});
