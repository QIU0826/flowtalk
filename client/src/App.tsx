import { useState, useCallback, useEffect } from 'react';
import { Layout, Typography, Card, message } from 'antd';
import { SoundOutlined } from '@ant-design/icons';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import RecordButton from './components/RecordButton';
import RawPane from './components/RawPane';
import PolishedPane from './components/PolishedPane';
// SceneType imported when scene selector is added in later PR

const { Header, Content } = Layout;

export default function App() {
  const [sentences, setSentences] = useState<string[]>([]);
  const [interim, setInterim] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFinal = useCallback((sentence: string) => {
    setSentences((prev) => [...prev, sentence]);
    setInterim('');
  }, []);

  const handleInterim = useCallback((text: string) => {
    setInterim(text);
  }, []);

  const handleError = useCallback((err: string) => {
    setError(err);
    message.error(err);
  }, []);

  const handleStateChange = useCallback((recording: boolean) => {
    setIsRecording(recording);
  }, []);

  const { isSupported, start, stop, duration } = useSpeechRecognition({
    onFinal: handleFinal,
    onInterim: handleInterim,
    onError: handleError,
    onStateChange: handleStateChange,
  });

  // Keyboard shortcut: space bar
  const spaceHeldRef = { current: false };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !spaceHeldRef.current) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        spaceHeldRef.current = true;
        start();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        spaceHeldRef.current = false;
        stop();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [start, stop]);

  const hasContent = sentences.length > 0 || !!interim;

  return (
    <Layout className="min-h-screen bg-gray-50">
      <Header
        className="flex items-center px-6"
        style={{
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          height: 56,
        }}
      >
        <div className="flex items-center gap-2">
          <SoundOutlined style={{ fontSize: 20, color: '#6366f1' }} />
          <Typography.Title level={5} style={{ margin: 0, fontWeight: 700 }}>
            FlowTalk
          </Typography.Title>
        </div>
      </Header>

      <Content className="p-6 max-w-5xl mx-auto w-full">
        <div className="flex flex-col items-center py-8">
          <RecordButton
            isRecording={isRecording}
            isSupported={isSupported}
            duration={duration}
            onStart={start}
            onStop={stop}
          />
        </div>

        <div
          className="grid gap-4 mt-4"
          style={{
            gridTemplateColumns: hasContent ? '1fr 1fr' : '1fr',
            minHeight: 300,
          }}
        >
          <Card
            title="原文"
            size="small"
            styles={{
              body: { minHeight: 240, maxHeight: 480, overflow: 'auto' },
            }}
          >
            <RawPane
              sentences={sentences}
              interim={interim}
              isRecording={isRecording}
            />
          </Card>

          {hasContent && (
            <Card
              title="改写"
              size="small"
              styles={{
                body: { minHeight: 240, maxHeight: 480, overflow: 'auto' },
              }}
            >
              <PolishedPane
                text=""
                isStreaming={false}
                scene="general"
              />
            </Card>
          )}
        </div>

        {error && (
          <div className="text-center mt-4">
            <Typography.Text type="danger">{error}</Typography.Text>
          </div>
        )}
      </Content>
    </Layout>
  );
}
