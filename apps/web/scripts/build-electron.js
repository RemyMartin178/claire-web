#!/usr/bin/env node
/**
 * Build script for Electron static export.
 * Temporarily hides app/api so Next.js doesn't try to validate API routes,
 * then restores it after the build.
 */
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const apiDir = path.join(root, 'app', 'api')
const apiDirHidden = path.join(root, 'app', '_api_electron_hidden')

function restore() {
  if (fs.existsSync(apiDirHidden)) {
    fs.renameSync(apiDirHidden, apiDir)
    console.log('[build-electron] Restored app/api')
  }
}

process.on('exit', restore)
process.on('SIGINT', () => { restore(); process.exit(1) })
process.on('uncaughtException', (err) => { restore(); console.error(err); process.exit(1) })

try {
  // Hide API routes
  fs.renameSync(apiDir, apiDirHidden)
  console.log('[build-electron] Hidden app/api for static export')

  // Run Next.js build with static export
  execSync('npx next build', {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ELECTRON_BUILD: 'true' },
  })

  console.log('[build-electron] Build complete → out/')
} finally {
  restore()
}
