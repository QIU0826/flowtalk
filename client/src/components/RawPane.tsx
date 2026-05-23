import { Typography } from 'antd';

interface RawPaneProps {
  sentences: string[];
  interim: string;
  isRecording: boolean;
  sessionBreakpoints?: number[];
}

export default function RawPane({ sentences, interim, isRecording, sessionBreakpoints }: RawPaneProps) {
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

  return (
    <div className="space-y-2">
      {sentences.map((sentence, i) => {
        // Show separator before this sentence if it's the start of a new session
        const isSessionStart = sessionBreakpoints?.includes(i);

        return (
          <div key={i}>
            {isSessionStart && i > 0 && (
              <div className="flex items-center gap-2 my-3">
                <div className="flex-1 border-t border-dashed border-gray-200" />
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                  新一段
                </Typography.Text>
                <div className="flex-1 border-t border-dashed border-gray-200" />
              </div>
            )}
            <Typography.Paragraph
              style={{ marginBottom: 8, fontSize: 15, lineHeight: 1.7 }}
            >
              {sentence}
            </Typography.Paragraph>
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
