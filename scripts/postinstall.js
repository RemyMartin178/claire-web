#!/usr/bin/env node
// Cross-platform postinstall: runs on Windows, macOS, Linux
// Skipped on Vercel and other CI environments that set VERCEL=1

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

if (process.env.VERCEL === '1') process.exit(0);

// 1. Install native electron app deps
try {
  const ebPath = path.join(__dirname, '../node_modules/.bin/electron-builder');
  execSync(`"${ebPath}" install-app-deps`, { stdio: 'inherit' });
} catch (e) {
  console.warn('[postinstall] electron-builder install-app-deps failed (non-fatal):', e.message);
}

// 2. Patch electron.exe icon on Windows (dev mode branding)
if (process.platform !== 'win32') process.exit(0);

const electronExe = path.join(__dirname, '../node_modules/electron/dist/electron.exe');
const iconPath    = path.join(__dirname, '../build/icon.ico');
const rcedit      = path.join(__dirname, '../node_modules/rcedit/bin/rcedit-x64.exe');

if (!fs.existsSync(electronExe) || !fs.existsSync(iconPath) || !fs.existsSync(rcedit)) {
  console.log('[postinstall] Skipping icon patch (missing rcedit or icon).');
  process.exit(0);
}

try {
  execSync(`"${rcedit}" "${electronExe}" --set-icon "${iconPath}" --set-version-string "ProductName" "Claire" --set-version-string "FileDescription" "Claire" --set-version-string "CompanyName" "Claire" --set-version-string "InternalName" "Claire" --set-version-string "OriginalFilename" "Claire.exe" --set-file-version "1.0.0.0" --set-product-version "1.0.0.0"`, { stdio: 'inherit' });
  console.log('[postinstall] electron.exe patched with Claire icon.');
} catch (e) {
  console.warn('[postinstall] Icon patch failed (non-fatal):', e.message);
}
