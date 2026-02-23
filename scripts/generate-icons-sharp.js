const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const srcPath = path.join(__dirname, '../public/full ronded claire logo Fond blanc logo noir.png');

async function processIcons() {
    try {
        console.log('Traitement du logo avec Sharp...');

        // 1. build/icon.png (256x256 pour electron-builder)
        // 256x256 est la taille la plus fiable pour la conversion ICO par electron-builder sous Windows
        await sharp(srcPath)
            .resize(256, 256, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .png({ quality: 100 })
            .toFile(path.join(__dirname, '../build/icon.png'));
        console.log('✓ build/icon.png (256x256) genere');

        // 2. src/ui/assets/logo.png (256x256 pour les notifications internes)
        await sharp(srcPath)
            .resize(256, 256, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .png({ quality: 100 })
            .toFile(path.join(__dirname, '../src/ui/assets/logo.png'));
        console.log('✓ src/ui/assets/logo.png (256x256) genere');

        console.log('\nTous les logos ont ete generes avec succes via Sharp !');
    } catch (err) {
        console.error('Erreur lors de la generation :', err);
        process.exit(1);
    }
}

processIcons();
