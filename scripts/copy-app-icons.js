/**
 * Copie le logo Claire (public/claire_logo.png) vers les emplacements utilisés par l'app:
 * - src/ui/assets/logo.png (notifications, runtime)
 * - build/icon.png (electron-builder pour exe, setup, raccourcis Windows)
 * 
 * Usage: node scripts/copy-app-icons.js
 */

const fs = require('fs');
const path = require('path');

const SOURCE = path.join(__dirname, '../public/full ronded claire logo Fond blanc logo noir.png');
const TARGETS = [
  path.join(__dirname, '../src/ui/assets/logo.png'),
  path.join(__dirname, '../build/icon.png'),
];

if (!fs.existsSync(SOURCE)) {
  console.error('Erreur: public/claire_logo.png introuvable');
  process.exit(1);
}

const buildDir = path.dirname(TARGETS[1]);
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

for (const target of TARGETS) {
  fs.copyFileSync(SOURCE, target);
  console.log('✓', path.relative(process.cwd(), target));
}

console.log('Logo Claire copié avec succès.');
