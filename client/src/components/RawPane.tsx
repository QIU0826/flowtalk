import { Typography } from 'antd';

interface RawPaneProps {
  sentences: string[];
  interim: string;
  isRecording: boolean;
}

export default function RawPane({ sentences, interim, isRecording }: RawPaneProps) {
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
      {sentences.map((sentence, i) => (
        <Typography.Paragraph
          key={i}
          style={{ marginBottom: 8, fontSize: 15, lineHeight: 1.7 }}
        >
          {sentence}
        </Typography.Paragraph>
      ))}

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
