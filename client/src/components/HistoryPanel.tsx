import { useState } from 'react';
import { Card, List, Typography, Tag, Button, Popconfirm } from 'antd';
import { DeleteOutlined, HistoryOutlined, DownOutlined, RightOutlined } from '@ant-design/icons';
import { HistoryItem } from '../hooks/useHistory';
import { SceneType } from '../types';

interface HistoryPanelProps {
  items: HistoryItem[];
  onRestore: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

const sceneLabels: Record<SceneType, string> = {
  general: '通用',
  email: '邮件',
  chat: '聊天',
  meeting: '纪要',
  code: '代码',
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
}

export default function HistoryPanel({ items, onRestore, onDelete, onClearAll }: HistoryPanelProps) {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <Card
      title={
        <span
          className="flex items-center gap-2 cursor-pointer select-none"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <RightOutlined style={{ fontSize: 11 }} /> : <DownOutlined style={{ fontSize: 11 }} />}
          <HistoryOutlined />
          历史记录
          {items.length > 0 && (
            <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
              ({items.length})
            </Typography.Text>
          )}
        </span>
      }
      extra={
        items.length > 0 && !collapsed && (
          <Popconfirm
            title="清空全部历史记录？"
            onConfirm={onClearAll}
            okText="确认"
            cancelText="取消"
          >
            <Button type="text" size="small" danger>
              清空
            </Button>
          </Popconfirm>
        )
      }
      size="small"
      styles={{ body: collapsed ? { padding: 0 } : { padding: 0, maxHeight: 360, overflow: 'auto' } }}
    >
      {!collapsed && items.length === 0 && (
        <div className="text-center text-gray-400 py-8">
          <Typography.Text type="secondary">暂无记录</Typography.Text>
        </div>
      )}
      {!collapsed && items.length > 0 && (
        <List
          dataSource={items}
          renderItem={(item) => (
          <List.Item
            onClick={() => onRestore(item)}
            style={{
              padding: '10px 16px',
              cursor: 'pointer',
              borderBottom: '1px solid #f0f0f0',
            }}
            className="hover:bg-gray-50 transition-colors"
            actions={[
              <DeleteOutlined
                key="delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item.id);
                }}
                style={{ color: '#999', fontSize: 13 }}
              />,
            ]}
          >
            <List.Item.Meta
              title={
                <div className="flex items-center gap-2">
                  <Tag color="indigo" style={{ margin: 0, fontSize: 11, lineHeight: '18px' }}>
                    {sceneLabels[item.scene]}
                  </Tag>
                  <Typography.Text
                    style={{ fontSize: 13, maxWidth: 240 }}
                    ellipsis
                  >
                    {item.raw.slice(0, 40)}
                  </Typography.Text>
                </div>
              }
              description={
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                  {formatTime(item.timestamp)} · {item.raw.length}字 · {item.duration}s
                </Typography.Text>
              }
            />
          </List.Item>
          )}
        />
      )}
    </Card>
  );
}
