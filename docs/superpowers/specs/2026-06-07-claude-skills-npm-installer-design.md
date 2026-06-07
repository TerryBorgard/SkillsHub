# Claude Code Skills NPM 快速安装工具 — 设计文档

## 概述

将 Claude Code 的 skills、hooks 等配置打包成 npm 包，团队通过 `npm install` 一条命令快速安装到本地 `.claude/` 目录下。以 superpowers 插件的目录结构为参考，实现极简的零学习成本分发方案。

## 目标

- 团队内部快速分发 Claude Code 技能和配置
- 一条命令完成安装，零学习成本
- 支持版本管理和增量更新
- 卸载自动清理，不留残留
- 跨平台支持（Windows / macOS / Linux）

## 目录结构

```
@volvo/claude-tools/
├── package.json             # name: @volvo/claude-tools, postinstall 脚本
├── README.md                # 使用说明
├── install.js               # 安装脚本（核心逻辑）
├── uninstall.js             # 卸载清理脚本
├── claude/
│   ├── skills/              # → 复制到 ~/.claude/skills/
│   │   ├── my-skill/
│   │   │   ├── SKILL.md          # 技能核心文件（YAML frontmatter）
│   │   │   └── ...               # 技能附属文件
│   │   └── another-skill/
│   │       └── SKILL.md
│   ├── hooks/               # → 复制到 ~/.claude/hooks/
│   │   └── session-start         # 会话启动钩子
│   └── CLAUDE.md            # → 追加到 ~/.claude/CLAUDE.md
└── volvo-config/
    └── settings.json        # → JSON 合并到 ~/.claude/settings.json
```

### 映射规则

| 包内路径 | 安装目标 | 处理方式 |
|---------|---------|---------|
| `claude/skills/*` | `~/.claude/skills/*` | 覆盖目录 |
| `claude/hooks/*` | `~/.claude/hooks/*` | 覆盖文件，保留可执行权限 |
| `claude/CLAUDE.md` | `~/.claude/CLAUDE.md` | 追加内容 |
| `volvo-config/settings.json` | `~/.claude/settings.json` | JSON 深度合并 |

## package.json

```json
{
  "name": "@volvo/claude-tools",
  "version": "1.0.0",
  "description": "Volvo 团队 Claude Code 工具集",
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
  ]
}
```

- `"private": true` — 适合团队私有包，防止误发布到公共 npm
- `"files"` — 只打包需要的文件，不包含 `.git`、`node_modules` 等

## 安装逻辑 (install.js)

```
npm install @volvo/claude-tools
        │
        ▼
  触发 postinstall → install.js
        │
        ├── 1. 确定目标目录 (.claude/)
        │
        ├── 2. 同步 skills/  → ~/.claude/skills/ (覆盖目录)
        │
        ├── 3. 同步 hooks/   → ~/.claude/hooks/ (覆盖文件 + 保留可执行权限)
        │
        ├── 4. 处理 CLAUDE.md → ~/.claude/CLAUDE.md (追加)
        │
        ├── 5. 合并 settings.json → ~/.claude/settings.json (JSON 深度合并)
        │
        └── 6. 输出安装报告
```

### 核心设计原则

- **幂等性**：重复 install 不会产生重复文件或错误
- **全覆盖**：`npm update` 时自动覆盖所有文件，保证团队一致性
- **跨平台**：使用 `path.join`、`os.homedir()` 等 API 兼容 Windows / macOS / Linux
- **错误容忍**：某个目录不存在则跳过，不阻塞安装过程

## 卸载逻辑 (uninstall.js)

```
npm uninstall @volvo/claude-tools
        │
        ▼
  触发 preuninstall → uninstall.js
        │
        ├── 1. 读取包的安装清单（安装时生成 .manifest.json）
        │
        └── 2. 删除安装时写入的所有文件
```

- 安装时在 `~/.claude/` 下生成 `.claude-tools-manifest.json`，记录本包安装的所有文件路径
- 卸载时读取 manifest，逐条删除
- 不删除其他包安装的文件，也不删除用户自己创建的文件

## 发布与安装流程

### 发布

```bash
# 在 Git 仓库目录下
npm login                        # 登录 npm（私有 registry 或 npmjs.org）
npm version patch                # 升级版本号（patch / minor / major）
npm publish                      # 发布
```

### 安装

```bash
npm install @volvo/claude-tools
# 或指定版本
npm install @volvo/claude-tools@1.0.1
```

### 更新

```bash
npm update @volvo/claude-tools
# → npm 下载新版本 → postinstall 触发 → 自动全覆盖
```

### 卸载

```bash
npm uninstall @volvo/claude-tools
# → preuninstall 触发 → 自动清理安装的文件
```

## 错误处理与边界情况

| 场景 | 处理方式 |
|------|---------|
| `.claude/` 目录不存在 | 自动逐级创建 |
| 文件写入权限不足 | 打印明确错误提示 |
| 源目录不存在 | 跳过并提示 |
| 磁盘空间不足 | 捕获错误，友好提示 |
| 跨平台路径差异 | 使用 `path.join` / `os.homedir()` 统一处理 |
| hooks 权限 | Unix 系统自动设置 `+x`，Windows 跳过 |
| 多次安装 | 全覆盖，幂等处理 |
| 多包同名文件 | 后安装的覆盖先安装的 |

## 未涉及的范围（后续可扩展）

- 不涉及 CLI 交互式命令（保持纯 postinstall 自动安装）
- 不涉及 npm registry 选择（默认使用配置好的 npm registry）
- 不涉及版本冲突检测（全覆盖策略，后安装为准）
