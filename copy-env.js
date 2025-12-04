// Script pour copier .env dans le build après compilation
const fs = require('fs');
const path = require('path');

const sourceEnv = path.join(__dirname, '.env');
const targetEnv = path.join(__dirname, 'dist', 'win-unpacked', '.env');

if (fs.existsSync(sourceEnv)) {
    try {
        // Créer le dossier si nécessaire
        const targetDir = path.dirname(targetEnv);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        
        // Copier le fichier
        fs.copyFileSync(sourceEnv, targetEnv);
        console.log('✅ .env copié dans dist/win-unpacked/');
    } catch (error) {
        console.error('❌ Erreur lors de la copie du .env:', error.message);
    }
} else {
    console.log('⚠️ Fichier .env introuvable à la racine du projet');
}

