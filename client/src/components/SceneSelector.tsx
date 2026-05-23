import { Segmented } from 'antd';
import {
  FileTextOutlined,
  MailOutlined,
  MessageOutlined,
  ScheduleOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import { SceneType } from '../types';

interface SceneSelectorProps {
  value: SceneType;
  onChange: (scene: SceneType) => void;
  disabled: boolean;
}

const scenes: { key: SceneType; label: string; icon: React.ReactNode }[] = [
  { key: 'general', label: '通用', icon: <FileTextOutlined /> },
  { key: 'email', label: '邮件', icon: <MailOutlined /> },
  { key: 'chat', label: '聊天', icon: <MessageOutlined /> },
  { key: 'meeting', label: '纪要', icon: <ScheduleOutlined /> },
  { key: 'code', label: '代码', icon: <CodeOutlined /> },
];

export default function SceneSelector({ value, onChange, disabled }: SceneSelectorProps) {
  return (
    <Segmented
      value={value}
      onChange={(val) => onChange(val as SceneType)}
      options={scenes.map((s) => ({
        value: s.key,
        label: (
          <span className="flex items-center gap-1">
            {s.icon}
            <span className="hidden sm:inline">{s.label}</span>
          </span>
        ),
      }))}
      disabled={disabled}
      size="middle"
      style={{ background: '#f5f5f5' }}
    />
  );
}
