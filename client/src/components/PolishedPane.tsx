import { useEffect, useRef, useState } from 'react';
import { Typography, Tag, Button, Input, message } from 'antd';
import { CopyOutlined, ReloadOutlined } from '@ant-design/icons';
import { SceneType } from '../types';

interface PolishedPaneProps {
  text: string;
  isStreaming: boolean;
  scene: SceneType;
  polishDone: boolean;
  hasError: boolean;
  sentenceProgress?: { done: number; total: number };
  onRetry?: () => void;
  onEdit?: (newText: string) => void;
}

const sceneLabels: Record<SceneType, string> = {
  general: '通用',
  email: '邮件',
  chat: '聊天',
  meeting: '纪要',
  code: '代码',
};

export default function PolishedPane({
  text,
  isStreaming,
  scene,
  polishDone,
  hasError,
  sentenceProgress,
  onRetry,
  onEdit,
}: PolishedPaneProps) {
  const [flash, setFlash] = useState(false);
  const prevPolishDone = useRef(false);
  const [editingText, setEditingText] = useState(text);

  useEffect(() => {
    if (!isStreaming) {
      setEditingText(text);
    }
  }, [text, isStreaming]);

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
    const copyText = editingText || text;
    navigator.clipboard.writeText(copyText).then(
      () => message.success('已复制到剪贴板'),
      () => message.error('复制失败'),
    );
  };

  const handleEditBlur = () => {
    if (editingText !== text && editingText.trim() && onEdit) {
      onEdit(editingText);
    }
  };

  const isEditable = polishDone && !isStreaming && !hasError && text;

  if (!text && !isStreaming && !hasError) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 select-none">
        <Typography.Text type="secondary">改写结果将显示在这里</Typography.Text>
      </div>
    );
  }

  const commonStyle: React.CSSProperties = {
    fontSize: scene === 'code' ? 13 : 15,
    lineHeight: scene === 'code' ? 1.6 : 1.8,
    fontFamily: scene === 'code'
      ? "'Fira Code', 'Cascadia Code', 'Consolas', monospace"
      : undefined,
    background: scene === 'code' ? '#f8f9fa' : undefined,
    borderRadius: scene === 'code' ? 8 : undefined,
    padding: scene === 'code' ? '12px 16px' : undefined,
    color: hasError && !text ? '#999' : undefined,
  };

  return (
    <div
      className="transition-all duration-500"
      style={{
        boxShadow: flash ? '0 0 0 3px rgba(99, 102, 241, 0.3)' : '0 0 0 0px transparent',
        borderRadius: 8,
        padding: 4,
      }}
    >
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Tag color="indigo">{sceneLabels[scene]}</Tag>
        {isStreaming && (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            生成中...
          </Typography.Text>
        )}
        {sentenceProgress && sentenceProgress.total > 0 && (
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            ({sentenceProgress.done}/{sentenceProgress.total})
          </Typography.Text>
        )}
        {polishDone && (
          <Typography.Text type="success" style={{ fontSize: 12 }}>
            完成
          </Typography.Text>
        )}
        {hasError && !isStreaming && (
          <Typography.Text type="danger" style={{ fontSize: 12 }}>
            改写失败
          </Typography.Text>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {hasError && !isStreaming && onRetry && (
            <Button type="text" size="small" icon={<ReloadOutlined />} onClick={onRetry} danger>
              重试
            </Button>
          )}
          {polishDone && text && (
            <Button type="text" size="small" icon={<CopyOutlined />} onClick={handleCopy}>
              {scene === 'code' ? '复制代码' : '复制'}
            </Button>
          )}
        </div>
      </div>

      {isEditable ? (
        <Input.TextArea
          value={editingText}
          onChange={(e) => setEditingText(e.target.value)}
          onBlur={handleEditBlur}
          autoSize={{ minRows: 3, maxRows: 14 }}
          style={{
            ...commonStyle,
            resize: 'none',
            border: '1px solid #e8e8e8',
          }}
        />
      ) : (
        <Typography.Paragraph style={{ ...commonStyle, whiteSpace: 'pre-wrap' }}>
          {hasError && !text ? '请点击重试按钮重新生成' : text}
          {isStreaming && <span className="streaming-cursor" />}
          {!text && isStreaming && (
            <span className="inline-block w-2 h-4 bg-indigo-400 animate-pulse rounded-sm align-middle" />
          )}
        </Typography.Paragraph>
      )}

      <style>{`
        .streaming-cursor {
          display: inline-block;
          width: 2px;
          height: 1.1em;
          background: #6366f1;
          margin-left: 1px;
          vertical-align: text-bottom;
          animation: blink-cursor 0.8s step-end infinite;
        }
        @keyframes blink-cursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
