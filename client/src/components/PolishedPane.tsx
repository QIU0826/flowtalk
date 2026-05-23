import { useEffect, useRef, useState } from 'react';
import { Typography, Tag } from 'antd';
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
      </div>
      <Typography.Paragraph
        style={{
          fontSize: 15,
          lineHeight: 1.8,
          whiteSpace: 'pre-wrap',
        }}
      >
        {text || (
          <span className="inline-block w-2 h-4 bg-indigo-400 animate-pulse rounded-sm align-middle" />
        )}
      </Typography.Paragraph>
    </div>
  );
}
