#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    if (!exists) return;
    const stats = fs.statSync(src);
    if (stats.isDirectory()) {
        fs.mkdirSync(dest, { recursive: true });
        for (const child of fs.readdirSync(src)) {
            copyRecursiveSync(path.join(src, child), path.join(dest, child));
        }
    } else {
        fs.copyFileSync(src, dest);
    }
}

const root = path.join(__dirname, '..');
const extDir = path.join(root, 'extension');
const buildDir = path.join(root, 'build');
const chromeDir = path.join(buildDir, 'chrome');

// prepare build/chrome
if (fs.existsSync(chromeDir)) {
    fs.rmSync(chromeDir, { recursive: true, force: true });
}
fs.mkdirSync(chromeDir, { recursive: true });

// copy extension files
copyRecursiveSync(extDir, chromeDir);

// read and adjust manifest for Chrome (MV3)
const manifestPath = path.join(extDir, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
delete manifest.browser_specific_settings;
if (!manifest.manifest_version || manifest.manifest_version < 3) {
    manifest.manifest_version = 3;
    if (manifest.background && Array.isArray(manifest.background.scripts)) {
        manifest.background = { service_worker: manifest.background.scripts[0] || 'dist/background.js' };
    } else {
        manifest.background = { service_worker: 'dist/background.js' };
    }
    if (manifest.browser_action) {
        manifest.action = manifest.browser_action;
        delete manifest.browser_action;
    }
    if (Array.isArray(manifest.web_accessible_resources)) {
        if (manifest.web_accessible_resources.length > 0) {
            manifest.web_accessible_resources = [{ resources: manifest.web_accessible_resources, matches: ['<all_urls>'] }];
        } else {
            manifest.web_accessible_resources = [];
        }
    }
}

fs.writeFileSync(path.join(chromeDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

// create zip using PowerShell (Windows)
const zipDest = path.join(buildDir, 'auto-youtube-shorts-scroller-chrome.zip');
try {
    const cmd = `powershell -NoProfile -Command "New-Item -ItemType Directory -Force -Path '${buildDir}' | Out-Null; Compress-Archive -Path '${chromeDir}\\*' -DestinationPath '${zipDest}' -Force"`;
    execSync(cmd, { stdio: 'inherit' });
    console.log('Created Chrome build:', zipDest);
} catch (err) {
    console.error('Failed to create zip with PowerShell:', err.message);
    process.exit(1);
}
