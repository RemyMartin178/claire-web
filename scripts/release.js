#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const noBump = args.includes('--no-bump');
const type = args.find(a => ['patch', 'minor', 'major'].includes(a)) || 'patch';

if (!noBump && !['patch', 'minor', 'major'].includes(type)) {
    console.error(`Usage: npm run release [patch|minor|major] [--no-bump]\nGot: "${type}"`);
    process.exit(1);
}

function run(cmd) {
    console.log(`> ${cmd}`);
    execSync(cmd, { stdio: 'inherit' });
}

function runCapture(cmd) {
    return execSync(cmd, { encoding: 'utf8' }).trim();
}

// Ensure clean working tree — ignore submodule modifications (m/M on .claude/worktrees, xerus-master)
// and untracked directories (??), which are never part of a release.
const dirty = runCapture('git status --porcelain')
    .split('\n')
    .filter(line => {
        const l = line.trim();
        if (!l) return false;
        if (l.includes('.claude/')) return false;
        if (l.includes('xerus-master/')) return false;
        if (l.startsWith('??')) return false;
        return true;
    })
    .join('\n');
if (dirty) {
    console.error('\nUncommitted changes detected — commit or stash before releasing:\n');
    console.error(dirty);
    process.exit(1);
}

// Ensure we're on main
const branch = runCapture('git rev-parse --abbrev-ref HEAD');
if (branch !== 'main') {
    console.error(`\nExpected branch "main", currently on "${branch}".`);
    process.exit(1);
}

// Local sanity build — only on Windows, where electron-builder can produce
// the NSIS installer natively. On other platforms (e.g. macOS without Wine),
// skip it: GitHub Actions builds the real Windows artifact on windows-latest.
if (process.platform === 'win32') {
    console.log('\nBuilding locally...');
    run('npm run build:win');
} else {
    console.log(`\nSkipping local Windows build (running on ${process.platform}) — CI will build it on windows-latest.`);
}

let version;

if (noBump) {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));
    version = pkg.version;
    console.log(`\nRe-releasing v${version} (no version bump)...`);
} else {
    // Bump version in package.json (no git commit yet)
    run(`npm version ${type} --no-git-tag-version`);
    const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));
    version = pkg.version;
    console.log(`\nReleasing v${version}...`);
}

const tag = `v${version}`;

if (noBump) {
    // Delete existing tag locally and remotely if re-releasing same version
    try { runCapture(`git tag -d ${tag}`); } catch (_) {}
    try { runCapture(`git push origin :refs/tags/${tag}`); } catch (_) {}
    run(`git tag ${tag}`);
    run(`git push origin ${tag}`);
} else {
    // Commit + tag
    run('git add package.json package-lock.json');
    run(`git commit -m "chore: release ${tag}"`);
    run(`git tag ${tag}`);
    run('git push');
    run(`git push origin ${tag}`);
}

console.log(`\n✓ ${tag} pushed — GitHub Actions is building and publishing the release.`);
try {
    const remoteUrl = runCapture('git remote get-url origin');
    const match = remoteUrl.match(/github\.com[:/]([^/]+\/[^/.]+)/);
    const slug = match ? match[1] : 'RemyMartin178/claire-web';
    console.log(`Monitor progress at: https://github.com/${slug}/actions`);
} catch (_) {
    console.log('Monitor progress on GitHub Actions.');
}
