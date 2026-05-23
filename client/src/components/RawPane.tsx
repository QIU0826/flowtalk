import { useState } from 'react';
import { Typography } from 'antd';
import { CloseOutlined } from '@ant-design/icons';

interface RawPaneProps {
  sentences: string[];
  interim: string;
  isRecording: boolean;
  sessionBreakpoints?: number[];
  onDeleteSentence?: (index: number) => void;
}

export default function RawPane({
  sentences,
  interim,
  isRecording,
  sessionBreakpoints,
  onDeleteSentence,
}: RawPaneProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const hasContent = sentences.length > 0 || interim;

  if (!hasContent) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 select-none">
        <Typography.Text type="secondary">
          {isRecording ? '正在聆听...' : '按住按钮或空格键开始说话'}
        </Typography.Text>
      </div>
    );
  }

  const canDelete = !!onDeleteSentence && !isRecording;

  return (
    <div className="space-y-2">
      {sentences.map((sentence, i) => {
        const isSessionStart = sessionBreakpoints?.includes(i);

        return (
          <div
            key={i}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
            style={{ position: 'relative' }}
          >
            {isSessionStart && i > 0 && (
              <div className="flex items-center gap-2 my-3">
                <div className="flex-1 border-t border-dashed border-gray-200" />
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                  新一段
                </Typography.Text>
                <div className="flex-1 border-t border-dashed border-gray-200" />
              </div>
            )}

            <div className="flex items-start gap-2 group">
              <Typography.Paragraph
                style={{ marginBottom: 8, fontSize: 15, lineHeight: 1.7, flex: 1 }}
              >
                {sentence}
              </Typography.Paragraph>

              {canDelete && hoveredIndex === i && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSentence?.(i);
                  }}
                  className="cursor-pointer text-gray-400 hover:text-red-500 transition-colors mt-1"
                  title="删除此句"
                >
                  <CloseOutlined style={{ fontSize: 12 }} />
                </span>
              )}
            </div>
          </div>
        );
      })}

      {interim && (
        <Typography.Text
          type="secondary"
          italic
          style={{
            fontSize: 14,
            opacity: 0.6,
            transition: 'opacity 0.3s',
          }}
        >
          {interim}
        </Typography.Text>
      )}
    </div>
  );
}
