# @volvo/claude-tools

Volvo 团队 Claude Code 工具集。通过 npm 一键安装 skills、hooks 和配置到 `~/.claude/`。

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

卸载时自动恢复原始配置，不留残留。

## 目录结构

```
node_modules/@volvo/claude-tools/
├── claude/
│   ├── skills/          # → ~/.claude/skills/（覆盖目录）
│   ├── hooks/           # → ~/.claude/hooks/（覆盖文件，设可执行权限）
│   └── CLAUDE.md        # → ~/.claude/CLAUDE.md（追加内容）
├── volvo-config/
│   └── settings.json    # → ~/.claude/settings.json（JSON 深度合并）
├── install.js           # 安装脚本 (postinstall)
├── uninstall.js         # 卸载脚本 (preuninstall)
└── README.md            # 使用说明
```

## 映射规则

| 包内路径 | 安装目标 | 处理方式 |
|---------|---------|---------|
| `claude/skills/*` | `~/.claude/skills/*` | 覆盖目录 |
| `claude/hooks/*` | `~/.claude/hooks/*` | 覆盖文件，保留可执行权限 |
| `claude/CLAUDE.md` | `~/.claude/CLAUDE.md` | 追加内容 |
| `volvo-config/settings.json` | `~/.claude/settings.json` | JSON 深度合并 |

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
