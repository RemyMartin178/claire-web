const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// Script exécuté APRÈS le build par electron-builder (afterPack hook)
exports.default = async function (context) {
  const sourceEnv = path.join(context.appOutDir, '..', '..', '.env');
  const targetEnv = path.join(context.appOutDir, 'resources', '.env');

  console.log('[copy-env-prod] Copying .env file...');
  console.log('[copy-env-prod] Source:', sourceEnv);
  console.log('[copy-env-prod] Target:', targetEnv);

  if (fs.existsSync(sourceEnv)) {
    const envContent = fs.readFileSync(sourceEnv, 'utf8');

    const targetDir = path.dirname(targetEnv);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    fs.writeFileSync(targetEnv, envContent.replace(/\r\n/g, '\n'), 'utf8');

    console.log('[copy-env-prod] ✅ .env copied successfully');
    console.log('[copy-env-prod] File size:', fs.statSync(targetEnv).size, 'bytes');
    console.log('[copy-env-prod] Lines:', envContent.split('\n').length);
  } else {
    console.warn('[copy-env-prod] ⚠️  Source .env not found, skipping copy');
  }

  // Patch the Windows executable with correct icon and version strings
  // (signAndEditExecutable: false skips this automatically, so we do it manually)
  if (process.platform === 'win32') {
    const exeName = context.packager.appInfo.productFilename + '.exe';
    const exePath = path.join(context.appOutDir, exeName);

    // Find rcedit — shipped by electron-builder's own dependencies
    const rceditCandidates = [
      path.join(__dirname, 'node_modules', 'rcedit', 'bin', 'rcedit-x64.exe'),
      path.join(__dirname, 'node_modules', 'electron-builder', 'node_modules', 'rcedit', 'bin', 'rcedit-x64.exe'),
      path.join(__dirname, 'node_modules', 'app-builder-lib', 'node_modules', 'rcedit', 'bin', 'rcedit-x64.exe'),
    ];
    const rceditPath = rceditCandidates.find(p => fs.existsSync(p));

    const iconPath = path.join(__dirname, 'build', 'icon.ico');
    const pkg = require('./package.json');
    const version = pkg.version + '.0'; // e.g. "0.2.5.0"

    if (!fs.existsSync(exePath)) {
      console.warn('[copy-env-prod] ⚠️  Executable not found:', exePath);
    } else if (!rceditPath) {
      console.warn('[copy-env-prod] ⚠️  rcedit not found in node_modules — skipping PE resource patch');
      console.warn('[copy-env-prod]    Task Manager may still show "Electron". Run: npm install rcedit --save-dev');
    } else if (!fs.existsSync(iconPath)) {
      console.warn('[copy-env-prod] ⚠️  build/icon.ico not found — skipping icon patch');
    } else {
      console.log('[copy-env-prod] Patching', exeName, 'with rcedit...');
      try {
        execFileSync(rceditPath, [
          exePath,
          '--set-icon', iconPath,
          '--set-version-string', 'ProductName', 'Claire',
          '--set-version-string', 'FileDescription', 'Claire',
          '--set-version-string', 'CompanyName', 'Claire',
          '--set-version-string', 'InternalName', 'Claire',
          '--set-version-string', 'OriginalFilename', exeName,
          '--set-file-version', version,
          '--set-product-version', version,
        ], { stdio: 'inherit' });
        console.log('[copy-env-prod] ✅ PE resources patched — Task Manager will show "Claire"');
      } catch (err) {
        console.error('[copy-env-prod] ❌ rcedit failed:', err.message);
      }
    }
  }
};
