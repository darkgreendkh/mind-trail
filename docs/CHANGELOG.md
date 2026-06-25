# Changelog

所有重要变更都会记录在这个文件中。

格式参考 Keep a Changelog，但保持轻量。版本号遵循语义化版本的基本形式。

## [0.1.0] - Unreleased

### Added

- 定义 Mind Trail 的初始产品方向：本地 Web 学习路径可视化工具。
- 确定 v0.1.0 采用 Project Home + Workbench MVP 结构。
- 确定支持多个本地学习图，并默认打开上次项目。
- 确定 Workbench 包含顶部工具栏、React Flow 主画布和右侧节点 Inspector。
- 确定核心节点模型：标题、状态、笔记、位置。
- 确定节点状态枚举：进行中、已完成、已放弃。
- 确定主线向下、支线向右的画布规则。
- 确定节点操作：继续主线、创建支线、修改状态、删除节点。
- 确定删除节点采用删除子树规则。
- 确定自动整理布局采用全图重排规则。
- 确定本地持久化使用 localStorage。
- 确定 v0.1.0 快捷键：Enter、Tab、Delete。
- 新增 `docs/PRODUCT_SPEC.md` 作为当前产品规格源文档。
- 新增 `docs/ROADMAP.md` 记录后续计划。
- 新增 `docs/CHANGELOG.md` 记录版本变更。

### Not Included

- 登录。
- 云同步。
- 导出。
- AI 总结。
- 复杂知识图谱。
- 多人协作。
- 标签系统。
- 撤销 / 重做。
- 搜索节点。
