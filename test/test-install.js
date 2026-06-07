#!/usr/bin/env node
/**
 * @volvo/claude-tools 集成测试
 *
 * 在临时目录中模拟完整的安装/卸载流程，
 * 验证文件是否正确复制、manifest 是否正常记录、卸载是否完整清理。
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT_DIR = path.resolve(__dirname, '..');

// Use temp directory as fake home
const TEST_HOME = path.join(os.tmpdir(), 'claude-tools-test-' + Date.now());
const TEST_CLAUDE_DIR = path.join(TEST_HOME, '.claude');

// Override home directory
process.env.HOME = TEST_HOME;
process.env.USERPROFILE = TEST_HOME;

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`  ✅ ${msg}`);
    passed++;
  } else {
    console.log(`  ❌ ${msg}`);
    failed++;
  }
}

function assertFileExists(filePath, msg) {
  assert(fs.existsSync(filePath), msg || `File exists: ${filePath}`);
}

function assertFileNotExists(filePath, msg) {
  assert(!fs.existsSync(filePath), msg || `File not exists: ${filePath}`);
}

function assertFileContent(filePath, expectedSubstring, msg) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    assert(content.includes(expectedSubstring), msg || `Content includes: ${expectedSubstring}`);
  } catch (e) {
    assert(false, msg || `Could not read ${filePath}`);
  }
}

// ---- Setup: create an original CLAUDE.md and settings.json ----
console.log(`\n📍 Test home: ${TEST_HOME}\n`);

fs.mkdirSync(TEST_CLAUDE_DIR, { recursive: true });
fs.writeFileSync(path.join(TEST_CLAUDE_DIR, 'CLAUDE.md'), '# Original Claude MD content\n');
fs.writeFileSync(path.join(TEST_CLAUDE_DIR, 'settings.json'), JSON.stringify({
  existingKey: 'original-value',
  nested: { keep: 'this' }
}, null, 2) + '\n');

// ---- Test 1: Installation ----
console.log('--- Test 1: Installation ---\n');

// Clear any modules cache so re-require picks up fresh state
delete require.cache[require.resolve('../install.js')];
delete require.cache[require.resolve('../uninstall.js')];

// Run install
require('../install.js');

assertFileExists(
  path.join(TEST_CLAUDE_DIR, 'skills', 'example-skill', 'SKILL.md'),
  'Skill file installed'
);
assertFileExists(
  path.join(TEST_CLAUDE_DIR, 'hooks', 'session-start'),
  'Hook file installed'
);
assertFileExists(
  path.join(TEST_CLAUDE_DIR, 'CLAUDE.md'),
  'CLAUDE.md exists'
);
assertFileExists(
  path.join(TEST_CLAUDE_DIR, 'settings.json'),
  'settings.json exists'
);
assertFileExists(
  path.join(TEST_CLAUDE_DIR, '.claude-tools-manifest.json'),
  'Manifest file created'
);
assertFileExists(
  path.join(TEST_CLAUDE_DIR, '.claude-tools-backups', 'CLAUDE.md'),
  'CLAUDE.md backup created'
);
assertFileExists(
  path.join(TEST_CLAUDE_DIR, '.claude-tools-backups', 'settings.json'),
  'settings.json backup created'
);

// ---- Test 2: Verify appended content ----
console.log('\n--- Test 2: Content verification ---\n');

assertFileContent(
  path.join(TEST_CLAUDE_DIR, 'CLAUDE.md'),
  '# Original Claude MD content',
  'CLAUDE.md preserves original content'
);
assertFileContent(
  path.join(TEST_CLAUDE_DIR, 'CLAUDE.md'),
  '@volvo/claude-tools 全局指令',
  'CLAUDE.md has appended package content'
);

const settingsContent = JSON.parse(
  fs.readFileSync(path.join(TEST_CLAUDE_DIR, 'settings.json'), 'utf-8')
);
assert(settingsContent.existingKey === 'original-value', 'Settings preserves existing key');
assert(settingsContent.nested && settingsContent.nested.keep === 'this', 'Settings preserves nested key');
assert(
  settingsContent.permissions && Array.isArray(settingsContent.permissions.allow),
  'Settings has merged permissions.allow'
);

// ---- Test 3: Manifest structure ----
console.log('\n--- Test 3: Manifest structure ---\n');

const manifest = JSON.parse(
  fs.readFileSync(path.join(TEST_CLAUDE_DIR, '.claude-tools-manifest.json'), 'utf-8')
);
assert(Array.isArray(manifest), 'Manifest is an array');
assert(manifest.length === 4, `Manifest has ${manifest.length} entries (expected 4)`);

// Each entry should have path and type
for (const entry of manifest) {
  assert(typeof entry.path === 'string', `Entry has path: ${entry.path}`);
  assert(entry.type === 'new' || entry.type === 'modified', `Entry has valid type: ${entry.type}`);
}

const newEntries = manifest.filter(e => e.type === 'new');
const modifiedEntries = manifest.filter(e => e.type === 'modified');
assert(newEntries.length === 2, `2 new entries (skills + hooks)`);
assert(modifiedEntries.length === 2, `2 modified entries (CLAUDE.md + settings.json)`);

// ---- Test 4: Idempotency ----
console.log('\n--- Test 4: Idempotency ---\n');

delete require.cache[require.resolve('../install.js')];
require('../install.js');

const manifestAfter = JSON.parse(
  fs.readFileSync(path.join(TEST_CLAUDE_DIR, '.claude-tools-manifest.json'), 'utf-8')
);
assert(
  manifestAfter.length === 4,
  `Idempotent: file count unchanged (${manifestAfter.length})`
);

// ---- Test 5: Clean uninstall ----
console.log('\n--- Test 5: Clean uninstall ---\n');

delete require.cache[require.resolve('../uninstall.js')];
require('../uninstall.js');

assertFileNotExists(
  path.join(TEST_CLAUDE_DIR, 'skills', 'example-skill', 'SKILL.md'),
  'Skill file removed'
);
assertFileNotExists(
  path.join(TEST_CLAUDE_DIR, 'hooks', 'session-start'),
  'Hook file removed'
);
assertFileNotExists(
  path.join(TEST_CLAUDE_DIR, '.claude-tools-manifest.json'),
  'Manifest removed'
);

// ---- Test 6: Verify original files restored ----
console.log('\n--- Test 6: Original files restored ---\n');

assertFileContent(
  path.join(TEST_CLAUDE_DIR, 'CLAUDE.md'),
  '# Original Claude MD content',
  'CLAUDE.md original content restored'
);

// Verify our content is no longer in CLAUDE.md
const claudeContent = fs.readFileSync(path.join(TEST_CLAUDE_DIR, 'CLAUDE.md'), 'utf-8');
assert(
  !claudeContent.includes('全局指令'),
  'CLAUDE.md no longer contains appended content'
);

const restoredSettings = JSON.parse(
  fs.readFileSync(path.join(TEST_CLAUDE_DIR, 'settings.json'), 'utf-8')
);
assert(restoredSettings.existingKey === 'original-value', 'Settings original key preserved');
assert(
  !restoredSettings.permissions,
  'Settings no longer has merged permissions'
);

// ---- Test 7: Uninstall with no manifest ----
console.log('\n--- Test 7: Uninstall without manifest ---\n');

delete require.cache[require.resolve('../uninstall.js')];
require('../uninstall.js');
// Should not throw, should print graceful message

// ---- Results ----
console.log(`\n===== Results: ${passed} passed, ${failed} failed =====\n`);

// Cleanup test directory
fs.rmSync(TEST_HOME, { recursive: true, force: true });

process.exit(failed > 0 ? 1 : 0);
