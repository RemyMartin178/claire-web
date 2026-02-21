# Public Assets

This folder contains static files.

## Favicon (favicon.svg)

Le favicon (icône de l'onglet navigateur) est un SVG généré dynamiquement par le script `scripts/generate-favicon.js`. Il embarque le logo PNG en base64, avec :

- **viewBox** ajusté pour zoomer le logo dans l'onglet
- **filter: invert(1)** pour un logo blanc lisible sur onglets sombres

**Pour régénérer** après changement du logo : `npm run favicon`

## Logo Image

**claire_logo-removebg-preview.png** - Logo Claire

- Utilisé dans la sidebar, les pages login/register, et pour générer le favicon 