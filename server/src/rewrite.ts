import OpenAI from 'openai';
import { Response } from 'express';

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
});

const MODEL = 'deepseek-v4-flash';

const GENERAL_PROMPT = `你是一个文字润色助手。请将以下语音转录的口语化文本改写为干净流畅的书面文字。

规则：
1. 移除语气词（嗯、那个、就是、然后、反正、这个嘛、怎么说呢……）
2. 修正口语化重复和断句错误
3. 自动添加标点符号和段落分隔
4. 保留原意和表达风格，不做过度改写
5. 如果原文包含明显的噪音识别错误（乱码/无意义字符），忽略并基于可理解的部分输出

输出改写后的纯文本，不需要任何解释。`;

function buildSentencePrompt(sentence: string, context?: { previousPolished?: string }): string {
  let prompt = GENERAL_PROMPT;
  if (context?.previousPolished) {
    prompt += `\n\n前文改写结果（供参考，帮助理解当前句的指代关系和衔接）：\n"${context.previousPolished}"`;
  }
  prompt += `\n\n当前句子：\n"${sentence}"\n\n改写后：`;
  return prompt;
}

function buildPolishPrompt(fullText: string, scene: string): string {
  return `${GENERAL_PROMPT}

场景要求：
- 如果场景是"通用"：正常分段
- 如果场景是"会议纪要"：提取决策项、待办事项、时间节点，分条输出
- 如果场景是"邮件"：使用正式语气，添加合适的称呼和落款

当前场景：${scene}

全文：
"""
${fullText}
"""

请输出改写后的完整文本：`;
}

export async function rewriteSentence(
  sentence: string,
  context: { previousPolished?: string } | undefined,
  res: Response,
): Promise<void> {
  const prompt = buildSentencePrompt(sentence, context);

  try {
    const stream = await client.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
      temperature: 0.3,
      max_tokens: 500,
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
    console.error(`[rewrite:sentence] ${message}`);
    if (!res.headersSent) {
      res.status(500).json({ error: message });
    } else {
      res.write(`data: ${JSON.stringify(`\n\n[改写出错: ${message}]`)}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }
}

export async function rewritePolish(
  fullText: string,
  scene: string,
  res: Response,
): Promise<void> {
  const prompt = buildPolishPrompt(fullText, scene);

  try {
    const stream = await client.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
      temperature: 0.3,
      max_tokens: 2000,
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
    console.error(`[rewrite:polish] ${message}`);
    if (!res.headersSent) {
      res.status(500).json({ error: message });
    } else {
      res.write(`data: ${JSON.stringify(`\n\n[全局润色出错: ${message}]`)}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }
}
