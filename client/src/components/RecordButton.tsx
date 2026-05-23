import { useRef } from 'react';
import { Space, Typography, Switch } from 'antd';
import { AudioOutlined, AudioMutedOutlined, PauseCircleOutlined } from '@ant-design/icons';

interface RecordButtonProps {
  isRecording: boolean;
  isSupported: boolean;
  duration: number;
  clickMode: boolean;
  onModeChange: (clickMode: boolean) => void;
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
  clickMode,
  onModeChange,
  onStart,
  onStop,
}: RecordButtonProps) {
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);

  if (!isSupported) {
    return (
      <Typography.Text type="secondary">
        当前浏览器不支持语音识别，请使用 Chrome 浏览器
      </Typography.Text>
    );
  }

  const handleMouseDown = () => {
    if (clickMode) return;
    isLongPressRef.current = false;
    pressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      onStart();
    }, 150);
  };

  const handleMouseUp = () => {
    if (clickMode) return;
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    if (isLongPressRef.current) {
      onStop();
    }
  };

  const handleClick = () => {
    if (!clickMode) return;
    if (isRecording) {
      onStop();
    } else {
      onStart();
    }
  };

  const handleMouseLeave = () => {
    if (!clickMode && isLongPressRef.current) {
      onStop();
      isLongPressRef.current = false;
    }
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const buttonClass = `
    relative w-24 h-24 rounded-full border-none cursor-pointer
    flex items-center justify-center transition-all duration-300
    select-none outline-none
    ${isRecording
      ? 'bg-red-500 shadow-[0_0_0_8px_rgba(239,68,68,0.2)] scale-110'
      : 'bg-indigo-500 hover:bg-indigo-600 shadow-[0_0_0_4px_rgba(99,102,241,0.15)]'
    }
  `;

  const buttonStyle = {
    animation: isRecording ? 'pulse-ring 2s ease-in-out infinite' : 'none',
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onTouchStart={(e) => {
          if (clickMode) return;
          e.preventDefault();
          isLongPressRef.current = false;
          pressTimerRef.current = setTimeout(() => {
            isLongPressRef.current = true;
            onStart();
          }, 150);
        }}
        onTouchEnd={(e) => {
          if (clickMode) {
            e.preventDefault();
            handleClick();
            return;
          }
          e.preventDefault();
          if (pressTimerRef.current) {
            clearTimeout(pressTimerRef.current);
            pressTimerRef.current = null;
          }
          if (isLongPressRef.current) {
            onStop();
          }
        }}
        className={buttonClass}
        style={buttonStyle}
      >
        {isRecording ? (
          clickMode ? (
            <PauseCircleOutlined style={{ fontSize: 32, color: '#fff' }} />
          ) : (
            <AudioOutlined style={{ fontSize: 32, color: '#fff' }} />
          )
        ) : (
          <AudioMutedOutlined style={{ fontSize: 32, color: '#fff' }} />
        )}
      </button>

      <Space direction="vertical" size={4} align="center">
        <Typography.Text strong style={{ fontSize: 15 }}>
          {isRecording
            ? clickMode ? '点击停止' : '松开停止'
            : clickMode ? '点击开始' : '按住说话'}
        </Typography.Text>
        {isRecording && (
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            {formatDuration(duration)}
          </Typography.Text>
        )}

        <div className="flex items-center gap-2">
          <Switch
            size="small"
            checked={clickMode}
            onChange={onModeChange}
            disabled={isRecording}
          />
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            {clickMode ? '点击模式' : '按住模式'}
          </Typography.Text>
        </div>

        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {clickMode ? '点击按钮或空格开始/停止' : '或按空格键'}
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
