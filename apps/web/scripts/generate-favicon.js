/**
 * Génère public/favicon.svg à partir du logo PNG.
 * 
 * L'SVG embarque l'image PNG en base64, avec :
 * - viewBox rogné pour zoomer le logo dans l'onglet
 * - filter: invert(1) pour un logo blanc sur onglets sombres
 * 
 * Usage: node scripts/generate-favicon.js
 */

const fs = require('fs');
const path = require('path');

const PNG_PATH = path.join(__dirname, '../public/claire_logo-removebg-preview.png');
const OUT_PATH = path.join(__dirname, '../public/favicon.svg');

const pngBuffer = fs.readFileSync(PNG_PATH);
const base64 = pngBuffer.toString('base64');
const dataUri = `data:image/png;base64,${base64}`;

const svg = `<svg viewBox="10 10 80 80" xmlns="http://www.w3.org/2000/svg">
  <image href="${dataUri}" width="100" height="100" preserveAspectRatio="xMidYMid meet" style="filter: invert(1)" />
</svg>
`;

fs.writeFileSync(OUT_PATH, svg, 'utf8');
console.log('✓ favicon.svg généré avec succès dans public/');
