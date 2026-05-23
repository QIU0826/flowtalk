import OpenAI from 'openai';
import { Response } from 'express';

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
});

const MODEL = 'deepseek-v4-flash';

// ─── Scene prompt templates ───────────────────────────────────────

const SCENE_PROMPTS: Record<string, { system: string; sentence: string }> = {
  general: {
    system: `你是一个文字润色助手。请将语音转录的口语化文本改写为干净流畅的书面文字。

规则：
1. 移除语气词（嗯、那个、就是、然后、反正、这个嘛……）
2. 修正口语化重复和断句错误
3. 自动添加标点符号和段落分隔
4. 保留原意和表达风格，不做过度改写
5. 如果原文包含明显的噪音识别错误，忽略并基于可理解的部分输出`,

    sentence: `你是一个文字润色助手。将语音转录的口语化文本改写为干净的文字。
规则：移除语气词、修正断句错误、添加标点。保留原意，不做过度改写。`,
  },

  email: {
    system: `你是一个商务写作助手。将语音转录改写为正式得体的邮件。

规则：
1. 自动添加合适的称呼（根据语境判断）和落款
2. 在开头添加邮件主题行（格式：主题：XXX）
3. 使用正式得体的语气，段落分明
4. 如果用户口述中提到了收件人，在称呼中使用
5. 去除语气词和口语化表达`,

    sentence: `你是一个商务写作助手。将语音转录改写为正式得体的邮件文字。
规则：使用正式语气、段落分明。`,
  },

  chat: {
    system: `你是一个聊天辅助工具。将语音转录改写为适合即时通讯的文字。

规则：
1. 去除语气词，但保持口语感和短句节奏
2. 使用自然随意的表达，不要太正式
3. 不要过度改长，保持聊天消息的简洁感
4. 如果有明显情绪表达，保留它`,

    sentence: `你是一个聊天辅助工具。将语音转录改写为适合即时通讯的文字。
规则：去除语气词但保持口语感和短句节奏，不要太正式、不要太长。`,
  },

  meeting: {
    system: `你是一个会议纪要整理助手。将语音转录改写为结构化的会议纪要。

规则：
1. 提取关键决策项，用"## 决策"标记
2. 提取待办事项，用"## 待办"标记，格式为：- [ ] 事项
3. 提取重要时间节点，用"## 时间节点"标记
4. 去掉讨论过程中的冗余内容和语气词
5. 如果信息不足以生成完整纪要，只输出已知部分，不要编造`,

    sentence: `你是一个会议纪要整理助手。将语音转录改写为结构化的纪要。
规则：提取决策项、待办事项、时间节点。去掉冗余内容和语气词。`,
  },

  code: {
    system: `你是一个代码注释生成器。将语音转录输出为 JSDoc 格式的代码注释。

规则：
1. 保留用户口述中的技术术语不做改写（如 Promise、userId、async、useState）
2. 如果口述中没有明确类型，根据变量名合理推断，标注在 JSDoc 类型中
3. 如果口述信息不足以生成完整注释，只生成已知字段，不要编造
4. 输出严格使用以下格式，不输出任何其他内容：

/**
 * <一句话功能描述>
 * @param {类型} 参数名 - <参数说明>
 * @returns {类型} <返回值说明>
 */

输入示例："这个函数叫 getUserName，参数是 userId 字符串，返回用户名或者 null"

输出示例：
/**
 * 根据用户ID获取用户名
 * @param {string} userId - 用户ID
 * @returns {string|null} 用户名，如果不存在则返回null
 */`,

    sentence: `你是一个代码注释生成器。将语音转录输出为 JSDoc 格式的代码注释。
规则：保留技术术语、根据变量名推断类型、不要编造、输出标准JSDoc格式。`,
  },
};

// ─── Builder functions ────────────────────────────────────────────

function buildPolishPrompt(fullText: string, scene: string): string {
  const template = SCENE_PROMPTS[scene] || SCENE_PROMPTS.general;

  return `${template.system}

请输出改写后的完整文本。

原文：
"""
${fullText}
"""`;
}

function buildSentencePrompt(
  sentence: string,
  context: { previousPolished?: string } | undefined,
  scene: string,
): string {
  const template = SCENE_PROMPTS[scene] || SCENE_PROMPTS.general;
  let prompt = template.sentence;

  if (context?.previousPolished) {
    prompt += `\n前文改写结果（供参考，帮助理解指代和衔接）：\n"${context.previousPolished}"`;
  }

  prompt += `\n当前句子："${sentence}"\n改写后：`;
  return prompt;
}

// ─── SSE streaming helpers ────────────────────────────────────────

async function streamToSSE(
  prompt: string,
  res: Response,
  maxTokens: number,
): Promise<void> {
  try {
    const stream = await client.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
      temperature: 0.3,
      max_tokens: maxTokens,
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        res.write(`data: ${JSON.stringify(delta)}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[rewrite] ${message}`);
    if (!res.headersSent) {
      res.status(500).json({ error: message });
    } else {
      res.write(`data: ${JSON.stringify(`\n[出错: ${message}]`)}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────

export async function rewriteSentence(
  sentence: string,
  context: { previousPolished?: string } | undefined,
  scene: string,
  res: Response,
): Promise<void> {
  const prompt = buildSentencePrompt(sentence, context, scene || 'general');
  await streamToSSE(prompt, res, 500);
}

export async function rewritePolish(
  fullText: string,
  scene: string,
  res: Response,
): Promise<void> {
  const prompt = buildPolishPrompt(fullText, scene || 'general');
  await streamToSSE(prompt, res, 2000);
}
