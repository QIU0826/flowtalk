import { Space, Typography } from 'antd';
import { AudioOutlined, AudioMutedOutlined } from '@ant-design/icons';

interface RecordButtonProps {
  isRecording: boolean;
  isSupported: boolean;
  duration: number;
  onStart: () => void;
  onStop: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function RecordButton({
  isRecording,
  isSupported,
  duration,
  onStart,
  onStop,
}: RecordButtonProps) {
  if (!isSupported) {
    return (
      <Typography.Text type="secondary">
        当前浏览器不支持语音识别，请使用 Chrome 浏览器
      </Typography.Text>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onMouseDown={(e) => {
          e.preventDefault();
          onStart();
        }}
        onMouseUp={(e) => {
          e.preventDefault();
          onStop();
        }}
        onMouseLeave={() => {
          if (isRecording) onStop();
        }}
        onTouchStart={(e) => {
          e.preventDefault();
          onStart();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          onStop();
        }}
        className={`
          relative w-24 h-24 rounded-full border-none cursor-pointer
          flex items-center justify-center transition-all duration-300
          select-none outline-none
          ${isRecording
            ? 'bg-red-500 shadow-[0_0_0_8px_rgba(239,68,68,0.2)] scale-110'
            : 'bg-indigo-500 hover:bg-indigo-600 shadow-[0_0_0_4px_rgba(99,102,241,0.15)]'
          }
        `}
        style={{
          animation: isRecording ? 'pulse-ring 2s ease-in-out infinite' : 'none',
        }}
      >
        {isRecording ? (
          <AudioOutlined style={{ fontSize: 32, color: '#fff' }} />
        ) : (
          <AudioMutedOutlined style={{ fontSize: 32, color: '#fff' }} />
        )}
      </button>

      <Space direction="vertical" size={0} align="center">
        <Typography.Text strong style={{ fontSize: 15 }}>
          {isRecording ? '松开停止' : '按住说话'}
        </Typography.Text>
        {isRecording && (
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            {formatDuration(duration)}
          </Typography.Text>
        )}
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          或按空格键
        </Typography.Text>
      </Space>

      <style>{`
        @keyframes pulse-ring {
          0%, 100% {
            box-shadow: 0 0 0 8px rgba(239, 68, 68, 0.2);
          }
          50% {
            box-shadow: 0 0 0 18px rgba(239, 68, 68, 0.05);
          }
        }
      `}</style>
    </div>
  );
}
