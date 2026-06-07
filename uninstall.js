#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');

const PACKAGE_NAME = '@dtt_wow/skills-hub';
const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const MANIFEST_PATH = path.join(CLAUDE_DIR, '.claude-tools-manifest.json');
const BACKUPS_DIR = path.join(CLAUDE_DIR, '.claude-tools-backups');

function main() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.log(`\n📍 ${PACKAGE_NAME}: no manifest found, nothing to clean up.\n`);
    return;
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  console.log(`\n📍 Uninstalling ${PACKAGE_NAME}...\n`);

  const dirsToCheck = new Set();

  for (const entry of manifest) {
    const filePath = entry.path || entry;

    if (entry.type === 'modified') {
      // Restore from backup
      const backupPath = path.join(BACKUPS_DIR, entry.name);
      if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, filePath);
        console.log(`  Restored: ${filePath}`);
        // Remove backup file
        fs.unlinkSync(backupPath);
      } else {
        // No backup means we created it — safe to delete
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`  Removed: ${filePath}`);
        }
      }
    } else {
      // type: 'new' — delete the file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`  Removed: ${filePath}`);
        dirsToCheck.add(path.dirname(filePath));
      } else {
        console.log(`  Not found, skipped: ${filePath}`);
      }
    }
  }

  // Clean up empty directories (deepest first)
  const sortedDirs = [...dirsToCheck].sort().reverse();
  for (const dir of sortedDirs) {
    try {
      if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
        fs.rmdirSync(dir);
        console.log(`  Removed empty dir: ${dir}`);
      }
    } catch (e) {
      // Skip directories that can't be removed
    }
  }

  // Remove backups directory if empty
  try {
    if (fs.existsSync(BACKUPS_DIR) && fs.readdirSync(BACKUPS_DIR).length === 0) {
      fs.rmdirSync(BACKUPS_DIR);
    }
  } catch (e) {
    // Skip
  }

  // Remove manifest file
  fs.unlinkSync(MANIFEST_PATH);
  console.log(`\n✅ ${PACKAGE_NAME} uninstalled successfully`);
}

main();
