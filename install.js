#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');

const PACKAGE_NAME = '@volvo/claude-tools';
const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const MANIFEST_PATH = path.join(CLAUDE_DIR, '.claude-tools-manifest.json');
const BACKUPS_DIR = path.join(CLAUDE_DIR, '.claude-tools-backups');
const SOURCE_DIR = __dirname;

let installedFiles = [];

function report(step, count) {
  console.log(`  ${step}: ${count} file(s) installed`);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function installSkills() {
  const src = path.join(SOURCE_DIR, 'claude', 'skills');
  if (!fs.existsSync(src)) {
    console.log('  Skills: not found, skipped');
    return [];
  }

  const dest = path.join(CLAUDE_DIR, 'skills');
  ensureDir(dest);
  const files = [];

  const skillDirs = fs.readdirSync(src, { withFileTypes: true });
  for (const dirent of skillDirs) {
    if (!dirent.isDirectory()) continue;
    const skillSrc = path.join(src, dirent.name);
    const skillDest = path.join(dest, dirent.name);
    ensureDir(skillDest);

    const skillFiles = fs.readdirSync(skillSrc);
    for (const file of skillFiles) {
      const fileSrc = path.join(skillSrc, file);
      const fileDest = path.join(skillDest, file);
      fs.copyFileSync(fileSrc, fileDest);
      files.push({ path: fileDest, type: 'new' });
    }
  }

  return files;
}

function installHooks() {
  const src = path.join(SOURCE_DIR, 'claude', 'hooks');
  if (!fs.existsSync(src)) {
    console.log('  Hooks: not found, skipped');
    return [];
  }

  const dest = path.join(CLAUDE_DIR, 'hooks');
  ensureDir(dest);
  const files = [];

  const hookFiles = fs.readdirSync(src);
  for (const file of hookFiles) {
    const fileSrc = path.join(src, file);
    const fileDest = path.join(dest, file);
    fs.copyFileSync(fileSrc, fileDest);

    // Set executable permission on Unix systems
    if (process.platform !== 'win32') {
      try {
        fs.chmodSync(fileDest, 0o755);
      } catch (e) {
        console.warn(`  Warning: could not set executable on ${fileDest}`);
      }
    }

    files.push({ path: fileDest, type: 'new' });
  }

  return files;
}

function installClaudeMd() {
  const src = path.join(SOURCE_DIR, 'claude', 'CLAUDE.md');
  if (!fs.existsSync(src)) {
    console.log('  CLAUDE.md: not found, skipped');
    return [];
  }

  const dest = path.join(CLAUDE_DIR, 'CLAUDE.md');
  const content = fs.readFileSync(src, 'utf-8');

  // Backup existing file before modifying (only once)
  if (fs.existsSync(dest)) {
    const backupPath = path.join(BACKUPS_DIR, 'CLAUDE.md');
    if (!fs.existsSync(backupPath)) {
      ensureDir(BACKUPS_DIR);
      fs.copyFileSync(dest, backupPath);
    }
  }

  // Append to existing file with a separator, or create new file
  if (fs.existsSync(dest)) {
    fs.appendFileSync(dest, '\n\n---\n' + content);
  } else {
    fs.writeFileSync(dest, content);
  }

  return [{ path: dest, type: 'modified', name: 'CLAUDE.md' }];
}

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

function mergeSettings() {
  const src = path.join(SOURCE_DIR, 'volvo-config', 'settings.json');
  if (!fs.existsSync(src)) {
    console.log('  Settings: not found, skipped');
    return [];
  }

  const dest = path.join(CLAUDE_DIR, 'settings.json');
  const override = JSON.parse(fs.readFileSync(src, 'utf-8'));

  // Backup existing file before modifying (only once)
  if (fs.existsSync(dest)) {
    const backupPath = path.join(BACKUPS_DIR, 'settings.json');
    if (!fs.existsSync(backupPath)) {
      ensureDir(BACKUPS_DIR);
      fs.copyFileSync(dest, backupPath);
    }
  }

  let existing = {};
  if (fs.existsSync(dest)) {
    try {
      existing = JSON.parse(fs.readFileSync(dest, 'utf-8'));
    } catch (e) {
      console.warn('  Warning: existing settings.json is invalid JSON, will override');
    }
  }

  // Deep merge existing with override (override takes precedence)
  const merged = deepMerge(existing, override);
  fs.writeFileSync(dest, JSON.stringify(merged, null, 2) + '\n');

  return [{ path: dest, type: 'modified', name: 'settings.json' }];
}

function main() {
  console.log(`\n📍 Installing ${PACKAGE_NAME}...\n`);

  ensureDir(CLAUDE_DIR);

  // Clear previous manifest tracking
  installedFiles = [];

  const skillFiles = installSkills();
  report('Skills', skillFiles.length);
  installedFiles.push(...skillFiles);

  const hookFiles = installHooks();
  report('Hooks', hookFiles.length);
  installedFiles.push(...hookFiles);

  const claudeMdFiles = installClaudeMd();
  report('CLAUDE.md', claudeMdFiles.length);
  installedFiles.push(...claudeMdFiles);

  const settingsFiles = mergeSettings();
  report('Settings', settingsFiles.length);
  installedFiles.push(...settingsFiles);

  // Write manifest for uninstall tracking
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(installedFiles, null, 2) + '\n');

  console.log(`\n✅ ${PACKAGE_NAME} installed successfully`);
  console.log(`   Total: ${installedFiles.length} file(s) installed`);
}

main();
