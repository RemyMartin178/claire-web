const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const pngToIcoLib = require('png-to-ico');

// png-to-ico expose sa fonction principale selon qu'il s'agit d'un import ES ou CJS
const pngToIco = pngToIcoLib.default || pngToIcoLib;

const srcPath = path.join(__dirname, '../public/full ronded claire logo Fond blanc logo noir.png');

async function processIcons() {
    try {
        console.log('1. Generation d\'un PNG standardise en memoire...');

        // Creer un buffer PNG 256x256 via Sharp (cela nettoie toute metadonnee ou profil ICC qui pourrait faire planter png-to-ico)
        const pngBuffer = await sharp(srcPath)
            .resize(256, 256, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            // Enlever les metadonnees et optimiser le png brut
            .withMetadata(false)
            .png({ quality: 100 })
            .toBuffer();

        console.log('2. Generation du fichier multi-resolution .ico via png-to-ico...');
        // png-to-ico s'occupe de transformer l'image en un paquet de BMP et PNG selon la spec Windows stricte
        const icoBuffer = await pngToIco(pngBuffer);

        const outPath = path.join(__dirname, '../build/icon.ico');
        const assetPath = path.join(__dirname, '../src/ui/assets/logo.ico');

        fs.writeFileSync(outPath, icoBuffer);
        fs.writeFileSync(assetPath, icoBuffer);

        console.log('✓ build/icon.ico (haute qualite, multi-res certifie) genere !');
    } catch (err) {
        console.error('Erreur lors de la generation :', err);
        process.exit(1);
    }
}

processIcons();
