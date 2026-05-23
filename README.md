# FlowTalk — 语音AI输入工具

不只是语音转文字，更是"你说人话，它出成文稿"的AI输入工具。

**核心功能**：语音识别后，通过 DeepSeek V4 进行 AI 语义改写——去语气词、纠错断句、场景匹配格式，直接产出可用的文字。

## Demo 视频

> [Demo 视频链接]（待上传至 B站/云盘后更新）

## 功能特性

- **按住说话**：按住空格键或按钮开始录音，松开停止。追加模式下内容累积不覆盖
- **两级AI改写**：
  - 逐句实时改写：每句话说完立即流式输出改写结果（打字机效果）
  - 全局润色：松开按钮后对全文做最终格式对齐和段落优化
- **5种场景预设**：
  - 通用 — 去噪 + 标点 + 分段
  - 商务邮件 — 正式语气 + 自动称呼落款 + 主题行
  - 即时聊天 — 保留口语感，简洁自然的短句
  - 会议纪要 — 提取决策 + 待办 + 时间节点，结构化输出
  - 代码注释 — 保留技术术语，输出标准 JSDoc 格式
- **追加模式**：松开后不清空原文，再次按住说话内容追加，适合连续口述长文档
- **历史记录**：自动保存最近20条，点击可回填恢复，支持单条删除和全部清空
- **双栏对比**：左侧原文 vs 右侧AI改写，支持一键复制

## 技术栈

| 层 | 技术 | 用途 |
|---|------|------|
| 前端框架 | React 18 + TypeScript | UI 渲染 |
| 构建工具 | Vite 6 | 开发与打包 |
| UI 组件库 | Ant Design 5.x | Button, Card, Segmented, List, Tag, message 等 |
| 样式 | Tailwind CSS 3.x | 布局与辅助样式 |
| 语音识别 | Web Speech API (Chrome SpeechRecognition) | 浏览器端实时语音识别 |
| 后端框架 | Express 4.x + TypeScript | HTTP 服务 + SSE 端点 |
| AI 引擎 | DeepSeek V4 API (deepseek-v4-flash) | 语义改写（OpenAI 兼容接口） |
| 开发运行 | tsx | TypeScript 直接运行 |

## 第三方依赖说明

### 前端

| 包名 | 用途 | 许可证 |
|------|------|--------|
| react / react-dom | UI 框架 | MIT |
| antd / @ant-design/icons | UI 组件库 | MIT |
| tailwindcss / autoprefixer / postcss | 样式工具链 | MIT |
| vite / @vitejs/plugin-react | 构建工具 | MIT |
| typescript | 类型检查 | Apache-2.0 |

### 后端

| 包名 | 用途 | 许可证 |
|------|------|--------|
| express | HTTP 服务框架 | MIT |
| cors | 跨域中间件 | MIT |
| openai | DeepSeek V4 API 调用（OpenAI 兼容协议） | Apache-2.0 |
| tsx | TypeScript 开发运行 | MIT |

### 原创功能模块

以下为本项目自主开发的核心功能模块：

1. **两级 SSE 改写管线**（`server/src/rewrite.ts`）：逐句改写 + 全局润色的流水线架构，每级都通过 Server-Sent Events 实现流式输出
2. **SSE Reorder Buffer**（`client/src/hooks/useRewrite.ts`）：处理并发句子请求的乱序问题，含30秒超时跳过和上下文传递机制
3. **场景 Prompt 模板系统**：5 种场景的独立 prompt 工程，每种场景有针对性的输出格式和改写规则
4. **音频采集与交互逻辑**（`client/src/hooks/useSpeechRecognition.ts`）：按住说话、追加模式、onend 自动重启等交互逻辑
5. **追加模式与历史回填**（`client/src/hooks/useHistory.ts`）：localStorage 持久化 + 一键恢复到左右栏
6. **场景选择器与代码注释模式**（`client/src/components/`）：分段控制器 + 等宽字体/复制代码

## 快速开始

### 环境要求

- Node.js >= 18
- Chrome 90+（Web Speech API 仅在 Chrome 中支持完整的中文识别）
- DeepSeek API Key（[获取地址](https://platform.deepseek.com/api_keys)）

### 安装与运行

```bash
# 1. 克隆仓库
git clone https://github.com/QIU0826/flowtalk.git
cd flowtalk

# 2. 安装依赖
cd client && npm install
cd ../server && npm install
cd ..

# 3. 配置 API Key
cp server/.env.example server/.env
# 编辑 server/.env，填入你的 DEEPSEEK_API_KEY

# 4. 启动服务（两个终端）
# 终端1：启动后端
cd server && npm run dev    # http://localhost:3001

# 终端2：启动前端
cd client && npm run dev    # http://localhost:5173
```

打开 Chrome 访问 `http://localhost:5173`，按住空格键或屏幕按钮开始说话。

## 项目结构

```
flowtalk/
├── client/                  # 前端 (React 18 + Vite)
│   └── src/
│       ├── hooks/           # 自定义 Hooks
│       │   ├── useSpeechRecognition.ts   # Web Speech API 封装
│       │   ├── useRewrite.ts            # SSE 改写管线 + Reorder Buffer
│       │   └── useHistory.ts            # 历史记录管理
│       ├── components/      # UI 组件
│       │   ├── RecordButton.tsx         # 按住说话按钮
│       │   ├── RawPane.tsx              # 左栏原文展示
│       │   ├── PolishedPane.tsx         # 右栏改写展示
│       │   ├── SceneSelector.tsx        # 场景选择器
│       │   └── HistoryPanel.tsx         # 历史记录面板
│       ├── types/
│       │   ├── types.ts                 # 公共类型定义
│       │   └── speech-recognition.d.ts  # Web Speech API 类型声明
│       ├── App.tsx          # 主应用组件
│       └── main.tsx         # 入口
├── server/                  # 后端 (Express + TypeScript)
│   └── src/
│       ├── index.ts         # Express 服务 + 路由注册
│       └── rewrite.ts       # DeepSeek V4 改写引擎 + Prompt 模板
└── package.json             # 根配置（统一启动脚本）
```

## 架构设计

```
Chrome 浏览器                     Node.js 服务端
─────────────                     ────────────
Web Speech API                    Express + CORS
  │  interim → 临时提示区
  │  isFinal → 左栏追加           POST /api/rewrite/sentence
  │              │                    │ DeepSeek V4 (stream:true)
  │              │ 逐句 SSE 流 ←──────┘ 逐句改写 + 前句上下文
  │              ▼
  │           右栏流式追加
  │
[松开按钮]
  │  POST /api/rewrite/polish
  │    { text, scene }
  │           │ DeepSeek V4 (stream:true)
  │           │ 全局润色 + 场景模板
  │  SSE 流 ←┘
  ▼
右栏逐字覆盖为最终版本
  │
  ▼
自动保存到历史记录 (localStorage)
```

## 注意事项

- **浏览器兼容**：语音识别功能依赖 Chrome 的 Web Speech API，请使用 Chrome 90+ 访问
- **API 配置**：需要在 `server/.env` 中配置有效的 DeepSeek API Key
- **HTTPS 环境**：Web Speech API 在 localhost 下可直接使用。如果部署到生产环境，需要 HTTPS 才能访问麦克风
- **麦克风权限**：首次使用需要允许浏览器访问麦克风

## 开发记录

本项目为 2026 TRAE AI 全栈挑战赛参赛作品（课题：语音输入法），3天开发周期（2026.05.23–05.25）。

PR 记录详见 [GitHub Pull Requests](https://github.com/QIU0826/flowtalk/pulls)。
