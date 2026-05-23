import { Modal, Table, Button, Typography, Tag, Popconfirm, Empty } from 'antd';
import { DeleteOutlined, BookOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

interface Correction {
  wrong: string;
  correct: string;
  scene: string;
  timestamp: number;
}

interface DictManagerProps {
  open: boolean;
  corrections: Correction[];
  onClose: () => void;
  onDelete: (timestamp: number) => void;
  onClearAll: () => void;
}

const sceneLabels: Record<string, string> = {
  general: '通用',
  email: '邮件',
  chat: '聊天',
  meeting: '纪要',
  code: '代码',
};

export default function DictManager({
  open,
  corrections,
  onClose,
  onDelete,
  onClearAll,
}: DictManagerProps) {
  const columns: ColumnsType<Correction> = [
    {
      title: '原词',
      dataIndex: 'wrong',
      key: 'wrong',
      width: 180,
      render: (text: string) => (
        <Typography.Text delete type="secondary">
          {text}
        </Typography.Text>
      ),
    },
    {
      title: '纠正为',
      dataIndex: 'correct',
      key: 'correct',
      width: 180,
      render: (text: string) => (
        <Typography.Text strong style={{ color: '#6366f1' }}>
          {text}
        </Typography.Text>
      ),
    },
    {
      title: '场景',
      dataIndex: 'scene',
      key: 'scene',
      width: 80,
      render: (scene: string) => (
        <Tag>{sceneLabels[scene] || scene}</Tag>
      ),
    },
    {
      title: '学习时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 140,
      render: (ts: number) => (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {new Date(ts).toLocaleString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Typography.Text>
      ),
    },
    {
      title: '',
      key: 'action',
      width: 50,
      render: (_, record) => (
        <Popconfirm
          title="删除此条纠正？"
          onConfirm={() => onDelete(record.timestamp)}
          okText="删除"
          cancelText="取消"
        >
          <Button type="text" size="small" icon={<DeleteOutlined />} danger />
        </Popconfirm>
      ),
    },
  ];

  return (
    <Modal
      title={
        <span>
          <BookOutlined style={{ marginRight: 8, color: '#6366f1' }} />
          个人词库
        </span>
      }
      open={open}
      onCancel={onClose}
      width={680}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
        corrections.length > 0 && (
          <Popconfirm
            key="clear"
            title="确定清空全部词库？"
            onConfirm={onClearAll}
            okText="确定"
            cancelText="取消"
          >
            <Button danger>清空词库</Button>
          </Popconfirm>
        ),
      ]}
    >
      <Typography.Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 16 }}>
        编辑改写结果时自动学习你的用词偏好，改写时优先采用。点击删除图标可移除单个词条。
      </Typography.Paragraph>
      <Table
        columns={columns}
        dataSource={corrections}
        rowKey="timestamp"
        size="small"
        pagination={{ pageSize: 15, size: 'small' }}
        locale={{ emptyText: <Empty description="还没有学到任何词条" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
      />
    </Modal>
  );
}
