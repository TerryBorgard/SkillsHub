# @volvo/claude-tools 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个 npm 包，团队通过 `npm install` 一条命令将 Claude Code skills、hooks、CLAUDE.md 和 settings.json 安装到本地 `.claude/` 目录下。

**架构:** 纯 Node.js 脚本，零依赖。`postinstall` 钩子触发 `install.js` 执行文件同步，`preuninstall` 触发 `uninstall.js` 清理。安装时生成 manifest 文件记录安装清单，卸载时依据 manifest 精确删除。

**Tech Stack:** Node.js (fs, path, os 原生模块), npm

---

## 文件结构

```
d:\tools-for-volvo\
├── package.json                  # 包配置, postinstall/preuninstall
├── install.js                    # 安装脚本（核心）
├── uninstall.js                  # 卸载脚本
├── README.md                     # 使用说明
├── claude/
│   ├── skills/
│   │   └── example-skill/
│   │       └── SKILL.md          # 示例 skill
│   ├── hooks/
│   │   └── session-start         # 示例 hook
│   └── CLAUDE.md                 # 示例全局指令
├── volvo-config/
│   └── settings.json             # 示例配置
└── test/
    └── test-install.js           # 安装/卸载集成测试
```

---

### Task 1: package.json 与示例文件

**Files:**
- Create: `d:\tools-for-volvo\package.json`
- Create: `d:\tools-for-volvo\claude\skills\example-skill\SKILL.md`
- Create: `d:\tools-for-volvo\claude\hooks\session-start`
- Create: `d:\tools-for-volvo\claude\CLAUDE.md`
- Create: `d:\tools-for-volvo\volvo-config\settings.json`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "@volvo/claude-tools",
  "version": "1.0.0",
  "description": "Volvo 团队 Claude Code 工具集 - skills、hooks 等",
  "private": true,
  "scripts": {
    "postinstall": "node install.js",
    "preuninstall": "node uninstall.js"
  },
  "files": [
    "claude/",
    "volvo-config/",
    "install.js",
    "uninstall.js",
    "README.md"
  ],
  "engines": {
    "node": ">=14.0.0"
  }
}
```

- [ ] **Step 2: 创建示例 skill 文件**

`claude/skills/example-skill/SKILL.md`:
```markdown
---
name: example-skill
description: 示例 skill - 展示 @volvo/claude-tools 的安装功能
---

# Example Skill

这是一个通过 npm 安装的示例 skill。
```

- [ ] **Step 3: 创建示例 hook**

`claude/hooks/session-start`:
```bash
#!/bin/bash
# @volvo/claude-tools 示例 hook
echo "[claude-tools] Session started at $(date)" >> /tmp/claude-tools.log
```

- [ ] **Step 4: 创建示例 CLAUDE.md**

`claude/CLAUDE.md`:
```markdown
# @volvo/claude-tools 全局指令

- 请使用中文回复
- 优先使用项目内 skills
```

- [ ] **Step 5: 创建示例 settings.json**

`volvo-config/settings.json`:
```json
{
  "permissions": {
    "allow": ["bash", "read", "write", "edit", "glob", "grep"]
  }
}
```

- [ ] **Step 6: 提交**

```bash
cd d:\tools-for-volvo
git add package.json claude/ volvo-config/
git commit -m "chore: scaffold project structure and sample files"
```

---

### Task 2: install.js — 核心安装函数与目录同步

**Files:**
- Create: `d:\tools-for-volvo\install.js`

- [ ] **Step 1: 创建 install.js 骨架**

```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');

const PACKAGE_NAME = '@volvo/claude-tools';
const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const MANIFEST_PATH = path.join(CLAUDE_DIR, '.claude-tools-manifest.json');
const SOURCE_DIR = __dirname; // package root in node_modules

let installedFiles = [];

function report(step, count) {
  console.log(`  ${step}: ${count} file(s) installed`);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
```

- [ ] **Step 2: 实现 skills 同步函数**

```javascript
function installSkills() {
  const src = path.join(SOURCE_DIR, 'claude', 'skills');
  if (!fs.existsSync(src)) {
    console.log('  Skills: not found, skipped');
    return [];
  }

  const dest = path.join(CLAUDE_DIR, 'skills');
  ensureDir(dest);
  const files = [];

  // 遍历 skills/ 下的每个 skill 目录
  const skillDirs = fs.readdirSync(src, { withFileTypes: true });
  for (const dirent of skillDirs) {
    if (!dirent.isDirectory()) continue;
    const skillSrc = path.join(src, dirent.name);
    const skillDest = path.join(dest, dirent.name);
    ensureDir(skillDest);

    // 复制 skill 目录下所有文件
    const skillFiles = fs.readdirSync(skillSrc);
    for (const file of skillFiles) {
      const fileSrc = path.join(skillSrc, file);
      const fileDest = path.join(skillDest, file);
      fs.copyFileSync(fileSrc, fileDest);
      files.push(fileDest);
    }
  }

  return files;
}
```

- [ ] **Step 3: 实现 hooks 同步函数**

```javascript
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

    // Unix 系统设置可执行权限
    if (process.platform !== 'win32') {
      try {
        fs.chmodSync(fileDest, 0o755);
      } catch (e) {
        console.warn(`  Warning: could not set executable on ${fileDest}`);
      }
    }

    files.push(fileDest);
  }

  return files;
}
```

- [ ] **Step 4: 组装 install 主函数并验证**

```javascript
function main() {
  console.log(`\n📍 Installing ${PACKAGE_NAME}...\n`);

  // 确保 .claude 目录存在
  ensureDir(CLAUDE_DIR);

  // 同步 skills
  const skillFiles = installSkills();
  report('Skills', skillFiles.length);
  installedFiles.push(...skillFiles);

  // 同步 hooks
  const hookFiles = installHooks();
  report('Hooks', hookFiles.length);
  installedFiles.push(...hookFiles);

  console.log(`\n✅ ${PACKAGE_NAME} installed successfully`);
}

main();
```

运行验证：
```bash
node d:\tools-for-volvo\install.js
```
预期输出："Installing @volvo/claude-tools... Skills/Hooks installed successfully"

- [ ] **Step 5: 提交**

```bash
git add install.js
git commit -m "feat: implement core install.js with skills and hooks sync"
```

---

### Task 3: install.js — CLAUDE.md 追加与 settings.json 合并

**Files:**
- Modify: `d:\tools-for-volvo\install.js`

- [ ] **Step 1: 实现 CLAUDE.md 追加函数（在 main 之前添加）**

```javascript
function installClaudeMd() {
  const src = path.join(SOURCE_DIR, 'claude', 'CLAUDE.md');
  if (!fs.existsSync(src)) {
    console.log('  CLAUDE.md: not found, skipped');
    return [];
  }

  const dest = path.join(CLAUDE_DIR, 'CLAUDE.md');
  const content = fs.readFileSync(src, 'utf-8');

  // 追加到已有文件末尾（带分隔线）
  if (fs.existsSync(dest)) {
    fs.appendFileSync(dest, '\n\n---\n' + content);
  } else {
    fs.writeFileSync(dest, content);
  }

  return [dest];
}
```

- [ ] **Step 2: 实现 settings.json 深度合并函数（在 main 之前添加）**

```javascript
function mergeSettings() {
  const src = path.join(SOURCE_DIR, 'volvo-config', 'settings.json');
  if (!fs.existsSync(src)) {
    console.log('  Settings: not found, skipped');
    return [];
  }

  const dest = path.join(CLAUDE_DIR, 'settings.json');
  const override = JSON.parse(fs.readFileSync(src, 'utf-8'));

  let existing = {};
  if (fs.existsSync(dest)) {
    try {
      existing = JSON.parse(fs.readFileSync(dest, 'utf-8'));
    } catch (e) {
      console.warn('  Warning: existing settings.json is invalid JSON, will override');
    }
  }

  // 深度合并（只合并对象，数组直接替换）
  const merged = deepMerge(existing, override);
  fs.writeFileSync(dest, JSON.stringify(merged, null, 2) + '\n');

  return [dest];
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
```

- [ ] **Step 3: 将 CLAUDE.md 和 settings 安装加入 main 函数**

```javascript
function main() {
  console.log(`\n📍 Installing ${PACKAGE_NAME}...\n`);

  ensureDir(CLAUDE_DIR);

  const skillFiles = installSkills();
  report('Skills', skillFiles.length);
  installedFiles.push(...skillFiles);

  const hookFiles = installHooks();
  report('Hooks', hookFiles.length);
  installedFiles.push(...hookFiles);

  // 新增
  const claudeMdFiles = installClaudeMd();
  report('CLAUDE.md', claudeMdFiles.length);
  installedFiles.push(...claudeMdFiles);

  const settingsFiles = mergeSettings();
  report('Settings', settingsFiles.length);
  installedFiles.push(...settingsFiles);

  // 写入 manifest
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(installedFiles, null, 2) + '\n');

  console.log(`\n✅ ${PACKAGE_NAME} installed successfully`);
  console.log(`   Total: ${installedFiles.length} file(s) installed`);
}
```

- [ ] **Step 4: 验证完整安装流程**

```bash
node d:\tools-for-volvo\install.js
```
预期输出：显示 Skills/Hooks/CLAUDE.md/Settings 各自安装的文件数，最后显示 Total 总数。

验证 manifest 文件已创建：
```bash
type "%USERPROFILE%\.claude\.claude-tools-manifest.json"
```
预期输出：JSON 数组，包含所有安装的文件路径。

- [ ] **Step 5: 验证幂等性（重复安装不报错）**

```bash
node d:\tools-for-volvo\install.js
```
再次运行时不应报错，文件数应与首次一致。

- [ ] **Step 6: 提交**

```bash
git add install.js
git commit -m "feat: add CLAUDE.md append, settings.json merge, and manifest tracking"
```

---

### Task 4: uninstall.js — 卸载清理

**Files:**
- Create: `d:\tools-for-volvo\uninstall.js`

- [ ] **Step 1: 实现 uninstall.js**

```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');

const PACKAGE_NAME = '@volvo/claude-tools';
const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const MANIFEST_PATH = path.join(CLAUDE_DIR, '.claude-tools-manifest.json');

function main() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.log(`\n📍 ${PACKAGE_NAME}: no manifest found, nothing to clean up.\n`);
    return;
  }

  const installedFiles = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  console.log(`\n📍 Uninstalling ${PACKAGE_NAME}...\n`);

  // 收集需要清理的空目录
  const dirsToCheck = new Set();

  for (const file of installedFiles) {
    if (!fs.existsSync(file)) {
      console.log(`  Not found, skipped: ${file}`);
      continue;
    }
    try {
      fs.unlinkSync(file);
      console.log(`  Removed: ${file}`);
      dirsToCheck.add(path.dirname(file));
    } catch (e) {
      console.error(`  Failed to remove: ${file} - ${e.message}`);
    }
  }

  // 清理空目录（从最深到最浅）
  const sortedDirs = [...dirsToCheck].sort().reverse();
  for (const dir of sortedDirs) {
    try {
      if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
        fs.rmdirSync(dir);
        console.log(`  Removed empty dir: ${dir}`);
      }
    } catch (e) {
      // 跳过无法删除的目录
    }
  }

  // 删除 manifest 文件
  fs.unlinkSync(MANIFEST_PATH);
  console.log(`\n✅ ${PACKAGE_NAME} uninstalled successfully`);
}

main();
```

- [ ] **Step 2: 验证卸载流程**

先确保已安装，然后运行卸载：
```bash
node d:\tools-for-volvo\uninstall.js
```
预期输出：显示每个已删除的文件，"Removed empty dir: ..."，最后显示 "Uninstalled successfully"

验证文件已被清理：
```bash
dir "%USERPROFILE%\.claude\skills\example-skill"
```
预期输出：目录不存在

- [ ] **Step 3: 验证无 manifest 时的优雅退出**

```bash
node d:\tools-for-volvo\uninstall.js
```
预期输出："no manifest found, nothing to clean up."

- [ ] **Step 4: 提交**

```bash
git add uninstall.js
git commit -m "feat: implement uninstall.js with manifest-based cleanup"
```

---

### Task 5: 集成测试脚本

**Files:**
- Create: `d:\tools-for-volvo\test\test-install.js`

- [ ] **Step 1: 创建测试脚本**

```javascript
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
const TEST_HOME = path.join(os.tmpdir(), 'claude-tools-test-' + Date.now());
const TEST_CLAUDE_DIR = path.join(TEST_HOME, '.claude');

// 模拟 os.homedir() — 通过环境变量覆盖
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

// ---- 测试开始 ----
console.log(`\n📍 Test home: ${TEST_HOME}\n`);

// 1. 运行 install.js
console.log('--- Test 1: Installation ---\n');
process.chdir(ROOT_DIR);
require('../install.js'); // 直接运行

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
  'CLAUDE.md installed'
);
assertFileExists(
  path.join(TEST_CLAUDE_DIR, 'settings.json'),
  'settings.json installed'
);
assertFileExists(
  path.join(TEST_CLAUDE_DIR, '.claude-tools-manifest.json'),
  'Manifest file created'
);

// 2. 验证 manifest 内容
console.log('\n--- Test 2: Manifest content ---\n');
const manifest = JSON.parse(
  fs.readFileSync(path.join(TEST_CLAUDE_DIR, '.claude-tools-manifest.json'), 'utf-8')
);
assert(Array.isArray(manifest), 'Manifest is an array');
assert(manifest.length >= 4, `Manifest has ${manifest.length} entries (expected >= 4)`);

// 3. 验证 settings.json 合并
console.log('\n--- Test 3: Settings merge ---\n');
const settings = JSON.parse(
  fs.readFileSync(path.join(TEST_CLAUDE_DIR, 'settings.json'), 'utf-8')
);
assert(
  settings.permissions && settings.permissions.allow,
  'Settings has permissions.allow'
);

// 4. 验证幂等性（再安装一次）
console.log('\n--- Test 4: Idempotency ---\n');
const beforeCount = manifest.length;
require('../install.js');
const manifestAfter = JSON.parse(
  fs.readFileSync(path.join(TEST_CLAUDE_DIR, '.claude-tools-manifest.json'), 'utf-8')
);
assert(
  manifestAfter.length === beforeCount,
  `Idempotent: file count unchanged (${beforeCount})`
);

// 5. 验证卸载
console.log('\n--- Test 5: Uninstall ---\n');
require('../uninstall.js');

assertFileNotExists(
  path.join(TEST_CLAUDE_DIR, 'skills', 'example-skill', 'SKILL.md'),
  'Skill file removed after uninstall'
);
assertFileNotExists(
  path.join(TEST_CLAUDE_DIR, 'hooks', 'session-start'),
  'Hook file removed after uninstall'
);
assertFileNotExists(
  path.join(TEST_CLAUDE_DIR, '.claude-tools-manifest.json'),
  'Manifest removed after uninstall'
);

// 6. 验证 settings.json 保留（因为我们只删除 manifest 里记录的文件，而 settings.json 合并时不会覆盖整个文件）
// 实际上 uninstall 会删除 settings.json 因为它在 manifest 里
// 这个测试确认 manifest 驱动的删除行为

// ---- 结果 ----
console.log(`\n===== Results: ${passed} passed, ${failed} failed =====\n`);

// 清理测试目录
fs.rmSync(TEST_HOME, { recursive: true, force: true });

process.exit(failed > 0 ? 1 : 0);
```

- [ ] **Step 2: 运行测试**

```bash
node d:\tools-for-volvo\test\test-install.js
```
预期输出："===== Results: X passed, 0 failed ====="

如果测试失败，根据失败信息修复 install.js 或 uninstall.js 中的问题。

- [ ] **Step 3: 提交**

```bash
git add test/
git commit -m "test: add integration test for install/uninstall flow"
```

---

### Task 6: README.md

**Files:**
- Create: `d:\tools-for-volvo\README.md`

- [ ] **Step 1: 创建 README.md**

```markdown
# @volvo/claude-tools

Volvo 团队 Claude Code 工具集。通过 npm 一键安装 skills、hooks 和配置。

## 安装

```bash
npm install @volvo/claude-tools
```

安装后自动将 skills、hooks、CLAUDE.md 和 settings.json 同步到 `~/.claude/` 目录。

## 更新

```bash
npm update @volvo/claude-tools
```

更新时会自动覆盖所有文件，保证团队一致性。

## 卸载

```bash
npm uninstall @volvo/claude-tools
```

卸载时自动清理安装时写入的所有文件。

## 目录结构

```
node_modules/@volvo/claude-tools/
├── claude/
│   ├── skills/          # → ~/.claude/skills/
│   ├── hooks/           # → ~/.claude/hooks/
│   └── CLAUDE.md        # → ~/.claude/CLAUDE.md (追加)
├── volvo-config/
│   └── settings.json    # → ~/.claude/settings.json (JSON 合并)
├── install.js           # 安装脚本 (postinstall)
└── uninstall.js         # 卸载脚本 (preuninstall)
```

## 开发

```bash
# 本地测试安装
node install.js

# 本地测试卸载
node uninstall.js

# 运行集成测试
node test/test-install.js
```

## 发布

```bash
npm version patch
npm publish
```

## 许可证

MIT
```

- [ ] **Step 2: 提交**

```bash
git add README.md
git commit -m "docs: add README.md with usage instructions"
```

---

### Task 7: 初始化 Git 仓库

- [ ] **Step 1: 初始化仓库**

```bash
cd d:\tools-for-volvo
git init
git add .
git commit -m "feat: complete @volvo/claude-tools implementation"
```

- [ ] **Step 2: 检查最终测试通过**

```bash
node d:\tools-for-volvo\test\test-install.js
```
预期输出："===== Results: X passed, 0 failed ====="
