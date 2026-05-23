import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from 'docx';

function formatTime(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function triggerDownload(content: Blob | string, filename: string, mime?: string) {
  const blob = typeof content === 'string'
    ? new Blob([content], { type: mime || 'text/plain;charset=utf-8' })
    : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Markdown ──────────────────────────────────────────────────────

export function exportMarkdown(text: string) {
  const header = `# 会议纪要\n\n> 导出时间：${formatTime()}\n\n---\n\n`;
  triggerDownload(header + text, `会议纪要_${formatTime().replace(/[:\s]/g, '_')}.md`, 'text/markdown;charset=utf-8');
}

// ─── HTML ──────────────────────────────────────────────────────────

function markdownToHTML(md: string): string {
  let html = md
    // Headings
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Unordered list items
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Paragraphs (double newlines)
    .replace(/\n\n/g, '</p><p>')
    // Remaining single newlines to <br>
    .replace(/\n/g, '<br>');

  // Wrap consecutive <li> items in <ul>
  html = html.replace(/((?:<li>.*?<\/li><br>)+)/g, (match) => {
    return '<ul>' + match.replace(/<br>/g, '') + '</ul>';
  });

  return html;
}

export function exportHTML(text: string) {
  const body = markdownToHTML(text);
  const doc = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>会议纪要</title>
  <style>
    body {
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
      line-height: 1.8;
      color: #333;
    }
    h1 { font-size: 1.6em; border-bottom: 2px solid #6366f1; padding-bottom: 8px; }
    h2 { font-size: 1.3em; color: #6366f1; margin-top: 24px; }
    h3 { font-size: 1.1em; }
    ul { padding-left: 24px; }
    li { margin: 6px 0; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>会议纪要</h1>
  <p><em>导出时间：${formatTime()}</em></p>
  <hr>
  <p>${body}</p>
</body>
</html>`;
  triggerDownload(doc, `会议纪要_${formatTime().replace(/[:\s]/g, '_')}.html`, 'text/html;charset=utf-8');
}

// ─── Word (docx) ───────────────────────────────────────────────────

function parseSections(text: string): { heading: string; level: number; items: string[] }[] {
  const sections: { heading: string; level: number; items: string[] }[] = [];
  const lines = text.split('\n');
  let current: { heading: string; level: number; items: string[] } | null = null;

  for (const line of lines) {
    const h2 = line.match(/^## (.+)/);
    const h3 = line.match(/^### (.+)/);
    const li = line.match(/^- (.+)/);

    if (h2 || h3) {
      if (current) sections.push(current);
      current = {
        heading: (h2 || h3)![1],
        level: h2 ? 2 : 3,
        items: [],
      };
    } else if (li && current) {
      current.items.push(li[1]);
    } else if (line.trim() && current) {
      current.items.push(line.trim());
    }
  }
  if (current) sections.push(current);
  return sections;
}

export async function exportDocx(text: string) {
  const sections = parseSections(text);
  const children: Paragraph[] = [];

  // Title
  children.push(
    new Paragraph({
      text: '会议纪要',
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `导出时间：${formatTime()}`, italics: true, color: '888888', size: 20 })],
      spacing: { after: 400 },
    }),
  );

  // Sections
  for (const sec of sections) {
    children.push(
      new Paragraph({
        text: sec.heading,
        heading: sec.level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
        spacing: { before: 300, after: 200 },
      }),
    );

    for (const item of sec.items) {
      const isTodo = item.startsWith('[ ] ') || item.startsWith('[x] ');
      const displayText = isTodo ? item.slice(4) : item;

      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: isTodo ? '☐ ' : '• ',
              color: isTodo ? '6366f1' : '333333',
            }),
            new TextRun({
              text: displayText,
              strike: item.startsWith('[x] '),
            }),
          ],
          spacing: { after: 100 },
          indent: { left: 400 },
        }),
      );
    }
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, `会议纪要_${formatTime().replace(/[:\s]/g, '_')}.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
}
