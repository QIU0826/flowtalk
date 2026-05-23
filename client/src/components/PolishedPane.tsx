import { useEffect, useRef, useState } from 'react';
import { Typography, Tag, Button, message } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { SceneType } from '../types';

interface PolishedPaneProps {
  text: string;
  isStreaming: boolean;
  scene: SceneType;
  polishDone: boolean;
}

const sceneLabels: Record<SceneType, string> = {
  general: '通用',
  email: '邮件',
  chat: '聊天',
  meeting: '纪要',
  code: '代码',
};

export default function PolishedPane({ text, isStreaming, scene, polishDone }: PolishedPaneProps) {
  const [flash, setFlash] = useState(false);
  const prevPolishDone = useRef(false);

  useEffect(() => {
    if (polishDone && !prevPolishDone.current && text) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 1200);
      prevPolishDone.current = true;
      return () => clearTimeout(timer);
    }
    if (!polishDone) {
      prevPolishDone.current = false;
    }
  }, [polishDone, text]);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(
      () => message.success('已复制到剪贴板'),
      () => message.error('复制失败'),
    );
  };

  if (!text && !isStreaming) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 select-none">
        <Typography.Text type="secondary">改写结果将显示在这里</Typography.Text>
      </div>
    );
  }

  return (
    <div
      className="transition-all duration-500"
      style={{
        boxShadow: flash ? '0 0 0 3px rgba(99, 102, 241, 0.3)' : '0 0 0 0px transparent',
        borderRadius: 8,
        padding: 4,
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Tag color="indigo">{sceneLabels[scene]}</Tag>
        {isStreaming && (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            生成中...
          </Typography.Text>
        )}
        {polishDone && (
          <Typography.Text type="success" style={{ fontSize: 12 }}>
            完成
          </Typography.Text>
        )}
        {polishDone && text && (
          <Button
            type="text"
            size="small"
            icon={<CopyOutlined />}
            onClick={handleCopy}
            style={{ marginLeft: 'auto', fontSize: 12 }}
          >
            {scene === 'code' ? '复制代码' : '复制'}
          </Button>
        )}
      </div>

      <Typography.Paragraph
        style={{
          fontSize: scene === 'code' ? 13 : 15,
          lineHeight: scene === 'code' ? 1.6 : 1.8,
          whiteSpace: 'pre-wrap',
          fontFamily: scene === 'code'
            ? "'Fira Code', 'Cascadia Code', 'Consolas', monospace"
            : undefined,
          background: scene === 'code' ? '#f8f9fa' : undefined,
          padding: scene === 'code' ? '12px 16px' : undefined,
          borderRadius: scene === 'code' ? 8 : undefined,
        }}
      >
        {text || (
          <span className="inline-block w-2 h-4 bg-indigo-400 animate-pulse rounded-sm align-middle" />
        )}
      </Typography.Paragraph>
    </div>
  );
}
