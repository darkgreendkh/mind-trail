# Mind Trail

> 本地优先的学习路径可视化工具 — 主线向下，支线向右，永远知道自己学到哪了。
>
> A local-first tool for visualizing learning paths: a vertical main line, rightward branches.

学习时我们经常从主问题跳进细节，再跳进细节的细节，最后忘了自己原本在学什么。Mind Trail 把学习路径画成一张图：**主线向下推进**（正常学习），**支线向右展开**（探索细节），并始终高亮**当前节点**，让你随时知道——我从哪来、现在在哪、下一步是继续主线还是展开支线。

没有后端、没有账号、不联网。所有数据都存在浏览器的 `localStorage` 里，刷新不丢。

```text
  刷算法题 (已完成)
      │
      ▼
  Agent Loop  ──►  Prompt 包含哪些  ──►  Prefix 是什么
   (当前)
      │
      ▼
  Memory 部分
```

## 核心特性

- **主线 / 支线两种连接**：主线是向下的粗实线（`继续主线`），支线是向右的细线（`创建支线`），都带箭头，一眼可分。
- **当前节点高亮**：当前节点更粗的边框 + 阴影 + 右上角「当前」标记；工具栏一键「回到当前节点」。
- **三种节点状态**：进行中 / 已完成 / 已放弃，对应不同配色。
- **节点编辑**：右侧 Inspector 编辑标题、状态、笔记；**双击节点**可直接行内改标题。
- **删除即删子树**：删除一个节点会连同它的所有后代和相关连线一起删除，不留孤儿节点。
- **自动整理布局**：一键把整张图重排成「主线向下、支线向右、父节点在分支上居中」的整齐结构。
- **多项目本地管理**：在 Project Home 新建 / 打开 / 删除多张学习图，下次启动自动回到上次打开的项目。
- **同步持久化**：每一次改动都立即写入 `localStorage`，刷新、关标签页都不丢。

## 快速开始

需要 Node.js 20.19+ 或 22.12+（Vite 8 的要求）。

```bash
npm install
npm run dev      # 启动开发服务器：http://localhost:5173
```

打开浏览器即可使用，无需任何配置或登录。

## 使用

- 点击节点 = 选中它并设为当前节点。
- 在右侧 Inspector 里编辑标题 / 状态 / 笔记，改动自动保存。
- 双击节点可直接行内编辑标题。
- 拖拽节点可调整位置（位置也会保存）；滚轮缩放，空白处拖拽平移。

快捷键（选中节点时生效，正在输入文字时不触发）：

| 快捷键 | 行为 |
| --- | --- |
| `Enter` | 继续主线（在下方新建主线节点） |
| `Tab` | 创建支线（在右侧新建支线节点） |
| `Delete` / `Backspace` | 删除当前节点及其子树 |

## 技术栈

| 层 | 选型 |
| --- | --- |
| 构建 | [Vite](https://vitejs.dev/) + TypeScript |
| UI | [React 19](https://react.dev/) + [Tailwind CSS 4](https://tailwindcss.com/) |
| 画布 | [React Flow (`@xyflow/react`)](https://reactflow.dev/) — 节点、连线、拖拽、缩放、平移 |
| 状态 | [Zustand 5](https://zustand-demo.pmnd.rs/) — 单一数据源 |
| 持久化 | 浏览器 `localStorage`（key：`mind-trail:v0.1.0`） |
| 测试 | [Vitest 4](https://vitest.dev/)（逻辑层 TDD） |

## 项目结构

三层严格分离，依赖方向只能是 **lib → store → features**：

```text
src/
  lib/         # 纯逻辑（无 React / 无 Zustand），TDD 主战场
    storage.ts #   localStorage 读写、默认项目/节点、坏数据兜底
    tree.ts    #   基于边表的 getChildren / getParentId / getDescendants
    layout.ts  #   建节点定位 + autoLayout 全图重排
  store/
    useMindTrailStore.ts  # Zustand 单一数据源，每次改动同步持久化
  features/    # UI（薄层：渲染 store、派发 action）
    home/      #   ProjectHome 项目列表 + ConfirmDialog
    workbench/ #   Toolbar、Canvas、Inspector、TrailNodeView、快捷键
  types.ts     # 共享类型
docs/          # 产品规格、路线图、变更记录、实现计划
```

架构与画布同步的若干微妙细节（React Flow handle、测量、持久化）记录在 [`CLAUDE.md`](CLAUDE.md)。

## 开发脚本

```bash
npm run dev          # 开发服务器
npm run build        # tsc 类型检查 + vite 生产构建
npm test             # vitest 跑一遍
npm run test:watch   # vitest 监听
npm run typecheck    # 仅 tsc --noEmit
```

## 数据与隐私

所有数据只存在你自己浏览器的 `localStorage`（key `mind-trail:v0.1.0`），不会上传到任何服务器。换浏览器或清除站点数据会丢失，目前还没有导入 / 导出（见路线图）。

## 文档

- [产品规格 `docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md) — 权威的产品行为定义
- [路线图 `docs/ROADMAP.md`](docs/ROADMAP.md) — 后续版本方向
- [变更记录 `docs/CHANGELOG.md`](docs/CHANGELOG.md)
- [实现计划 `docs/specs/`](docs/specs/) — v0.1.0 的实现细节
- [`CLAUDE.md`](CLAUDE.md) — 给 AI / 开发者的代码库导览

## 状态

v0.1.0 — 核心闭环已可日常使用。刻意不做的范围（撤销/重做、搜索、导出、AI、云同步、账号、标签）见 [`docs/ROADMAP.md`](docs/ROADMAP.md)。

## 许可

个人项目，暂未采用开源许可。
