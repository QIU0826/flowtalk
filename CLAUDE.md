# FlowTalk — AI语音输入工具

## 项目定位
七牛云 XEngineer 暑期实训营「第一批次议题」参赛作品（课题：语音输入法）。

不只是语音转文字，核心差异化是 **AI 语义改写层**。现有产品只做识别不做改写，用户拿到的原始转录充满语气词和断句混乱。FlowTalk 在识别之后加了一层 AI 改写——去噪、润色、分段、场景匹配格式。

## 技术栈
- 前端：React 18 + TypeScript + Vite + Ant Design 5.x + Tailwind CSS
- 后端：Node.js + Express + TypeScript + DeepSeek V4 API（OpenAI 兼容接口）
- 语音：Web Speech API（Chrome SpeechRecognition），本地零延迟
- 传输：HTTP POST + SSE（Server-Sent Events），不用 Socket.IO
- 存储：localStorage（历史记录 + 个人词库），无数据库

## 核心架构

```
浏览器 Web Speech API (isFinal 事件)
    │
    ├─ interim → 左栏临时提示区（灰色斜体，不持久化）
    └─ isFinal → 左栏正文追加
                  │
                  ▼
          POST /api/rewrite/sentence
            { sentence, scene, context.previousPolished, dictContext }
                  │
                  ▼
          DeepSeek V4 Flash (stream:true)
                  │
                  ▼
          SSE 逐字流式返回 → reorder buffer → 右栏按序追加
                  │
                  │  (松开按钮)
                  ▼
          POST /api/rewrite/polish
            { text, scene, dictContext, model? }
                  │
                  ▼
          首次: DeepSeek V4 Flash (快速, 2-4s)
          换种说法: DeepSeek V4 Pro (深度, 5-8s)
                  │
                  ▼
          SSE 逐字流式返回 → 右栏逐字覆盖替换
                  │
                  ▼
          闪烁提示"完成" → 自动保存历史记录
```

## 模型分配策略

| 阶段 | 模型 | 延迟 | 触发方式 |
|------|------|------|---------|
| 逐句改写 | deepseek-v4-flash | <1s 首字 | 每句 isFinal 自动 |
| 首次润色 | deepseek-v4-flash | 2-4s | 松开按钮自动 |
| 换种说法 | deepseek-v4-pro | 5-8s | 用户点击按钮主动触发 |

逐句改写强依赖实时反馈，Flash 够快且配合场景领域词库能覆盖常见纠错。全局润色首次用 Flash 快速出结果，用户不满意点"换种说法"切 Pro 深度重写。

## 关键功能模块

### 音频采集 (useSpeechRecognition)
- 按住说话 / 点击切换双模式
- CSS 呼吸动画（pulse-ring），不引入额外音频流
- onend 自动重启（Chrome 静音自动停止的 workaround）
- 空格键联动（按住模式下按住说话，点击模式下 toggle）

### AI 改写管线 (useRewrite + server/rewrite.ts)
- **两级处理**：逐句改写（sentence-level）+ 全局润色（final polish）
- **Reorder Buffer**：Map + nextExpectedIndex，30s 超时跳过防止卡死
- **上下文传递**：逐句改写携带 `previousPolished` 解决代词指代
- **个人词库注入**：`dictContext` 从 localStorage 读取用户纠正历史
- **SSE 消费**：fetch + ReadableStream，不引入 EventSource

### 5 种场景预设
| 场景 | 行为 | 领域词库 |
|------|------|---------|
| 通用 | 去噪+标点+分段，**粗体**标记纠正 | 语义不通时上下文推断 |
| 商务邮件 | 正式语气+称呼落款+主题行 | OKR/KPI/复盘/对齐/排期 |
| 即时聊天 | 去语气词保留口语感 | — |
| 会议纪要 | 提取决策+待办+时间节点 | ROI/Q1/交付/迭代 |
| 代码注释 | JSDoc 格式，等宽字体 | 栈/堆/异步/闭包/回调/迭代器 |

### 交互细节
- **追加模式（默认）**：松开不清空左栏，再次按住追加，自动虚线分隔
- **场景回溯**：切换场景时已有内容自动用新场景 prompt 重写
- **可编辑改写**：润色完成后右栏切换为 Input.TextArea，失焦自动保存
- **个人词库学习**：编辑差异自动提取纠正词对，后续改写注入
- **单句撤回**：左栏 hover 显示 × 按钮，删除后自动重写
- **历史回填**：点击历史项恢复原文+改写结果到左右栏
- **清空/重试/换种说法/复制**：按钮组覆盖全操作路径

## 项目结构

```
flowtalk/
├── client/                          # React 前端
│   └── src/
│       ├── hooks/
│       │   ├── useSpeechRecognition.ts   # Web Speech API 封装
│       │   ├── useRewrite.ts            # SSE改写管线 + Reorder Buffer
│       │   ├── useHistory.ts            # localStorage 历史记录
│       │   └── usePersonalDict.ts       # 个人词库学习
│       ├── components/
│       │   ├── RecordButton.tsx         # 按住/点击双模式按钮
│       │   ├── RawPane.tsx              # 左栏原文 + 单句删除
│       │   ├── PolishedPane.tsx         # 右栏改写 + 可编辑
│       │   ├── SceneSelector.tsx        # 5场景分段控制器
│       │   └── HistoryPanel.tsx         # 历史列表 + 回填
│       ├── types/
│       │   ├── types.ts                 # 公共类型
│       │   └── speech-recognition.d.ts  # Web Speech API 类型声明
│       ├── App.tsx                      # 主应用（全部状态管理）
│       └── main.tsx                     # 入口
├── server/                          # Express 后端
│   └── src/
│       ├── index.ts                     # 路由注册 + dotenv
│       ├── rewrite.ts                   # DeepSeek V4 调用 + 场景prompt模板
│       └── .env.example                 # API Key 配置示例
├── package.json                     # 根配置（concurrently 启动脚本）
├── README.md                        # 依赖清单 + 原创模块 + 架构
├── REQUIREMENTS.md                  # 产品需求文档
└── .gitignore
```

## 关键代码约定
- 前端 SSE 消费用原生 `fetch()` + `ReadableStream`，不引入 EventSource/Socket.IO
- DeepSeek V4 调用通过 openai SDK（OpenAI 兼容），`stream: true`
- 所有闭包陷阱用 ref 解决：`startPolishRef` / `addSentenceRef` / `startRef` / `stopRef`
- 键盘事件 useEffect 依赖 `[]`，通过 ref 访问最新回调，避免监听器反复销毁重建
- Web Speech API `interim` → 灰色斜体临时区，`isFinal` → 左栏正文追加
- 代码注释场景右栏等宽字体 + 灰色背景 + "复制代码"按钮
- 暗色主题暂未启用（当前浅色主题），后续可直接切 Ant Design `theme.darkAlgorithm`

## 错误处理
- 麦克风权限被拒 → 明确提示 + 引导用户修改浏览器设置
- 逐句改写失败 → 该句保留原文，不阻塞后续句子（30s 超时用原文占位）
- 全局润色失败 → 保留逐句累积结果 + 显示重试按钮 + 错误提示
- onend 自动停止 → 检测 `isHoldingRef`，按住中自动 `restart()`

## 启动方式
```bash
# 安装
cd client && npm install
cd ../server && npm install

# 配置 API Key
cp server/.env.example server/.env
# 编辑 server/.env 填入 DEEPSEEK_API_KEY

# 启动（两个终端）
cd server && npm run dev    # http://localhost:3001
cd client && npm run dev    # http://localhost:5173
```

## 15 PR 记录

| PR | 日期 | 内容 |
|----|------|------|
| #1 | 5/23 | 项目脚手架（前后端基础架构） |
| #2 | 5/23 | 音频采集 + Web Speech API STT |
| #3 | 5/23 | 改写管线（逐句+全局 SSE） |
| #4 | 5/23 | 场景预设系统（5种 prompt 模板） |
| #5 | 5/23 | 追加模式 + 历史记录 + 回填 |
| #6 | 5/23 | 流式改写 UI（打字机光标+进度） |
| #7 | 5/23 | 错误处理 + 重试 + .env 配置 |
| #8 | 5/23 | README（依赖清单+原创模块+架构） |
| #9 | 5/23 | 历史记录不保存 + 空格键 Bug 修复 |
| #10 | 5/23 | 场景切换自动回溯改写 |
| #11 | 5/23 | 点击/按住双模式录音 |
| #12 | 5/23 | 改写结果可编辑 + 个人词库学习 |
| #13 | 5/23 | Prompt 优化（同音词纠错+领域词库） |
| #14 | 5/23 | 单句撤回 + 换种说法 |
| #15 | 5/23 | Flash/Pro 分阶段模型策略 |

## 后续优化方向
- 动态模型路由：根据 confidence 自动选择 Flash/Pro
- 方言支持：替换 Web Speech API 为云端 STT
- 多模态输入：支持粘贴图片/截图文字改写
- 端侧模型：on-device LLM 实时改写
