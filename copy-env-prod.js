const fs = require('fs');
const path = require('path');

// Script exécuté APRÈS le build par electron-builder (afterPack hook)
exports.default = async function (context) {
  const sourceEnv = path.join(context.appOutDir, '..', '..', '.env');
  const targetEnv = path.join(context.appOutDir, 'resources', '.env');

  console.log('[copy-env-prod] Copying .env file...');
  console.log('[copy-env-prod] Source:', sourceEnv);
  console.log('[copy-env-prod] Target:', targetEnv);

  if (fs.existsSync(sourceEnv)) {
    // Lire le fichier avec les bonnes fins de ligne
    const envContent = fs.readFileSync(sourceEnv, 'utf8');
    
    // S'assurer que le dossier resources existe
    const targetDir = path.dirname(targetEnv);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Écrire avec les fins de ligne LF (Unix) pour éviter les problèmes
    fs.writeFileSync(targetEnv, envContent.replace(/\r\n/g, '\n'), 'utf8');
    
    console.log('[copy-env-prod] ✅ .env copied successfully');
    console.log('[copy-env-prod] File size:', fs.statSync(targetEnv).size, 'bytes');
    console.log('[copy-env-prod] Lines:', envContent.split('\n').length);
  } else {
    console.warn('[copy-env-prod] ⚠️  Source .env not found, skipping copy');
  }
};

