import { useState, useCallback, useEffect, useRef } from 'react';
import { Layout, Typography, Card, Button, message } from 'antd';
import { SoundOutlined, ClearOutlined } from '@ant-design/icons';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useRewrite } from './hooks/useRewrite';
import { useHistory, HistoryItem } from './hooks/useHistory';
import RecordButton from './components/RecordButton';
import RawPane from './components/RawPane';
import PolishedPane from './components/PolishedPane';
import SceneSelector from './components/SceneSelector';
import HistoryPanel from './components/HistoryPanel';
import { SceneType } from './types';

const { Header, Content } = Layout;

export default function App() {
  const [sentences, setSentences] = useState<string[]>([]);
  const [interim, setInterim] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scene, setScene] = useState<SceneType>('general');
  const sceneRef = useRef<SceneType>('general');
  sceneRef.current = scene;

  // Append mode: track recording sessions for separator
  const [sessions, setSessions] = useState<number[]>([]);

  // Timing
  const sessionStartRef = useRef<number>(0);

  // Sentence-level rewrite results
  const [sentenceTexts, setSentenceTexts] = useState<Map<number, string>>(new Map());

  // Global polish result
  const [polishedText, setPolishedText] = useState('');
  const polishedTextRef = useRef('');
  const polishDoneRef = useRef(false);

  // History
  const { items: historyItems, addItem, removeItem, clearAll } = useHistory();

  const handleFinal = useCallback((sentence: string) => {
    setSentences((prev) => [...prev, sentence]);
    addSentence(sentence, sceneRef.current);
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
    if (!recording) {
      setSentences((current) => {
        if (current.length > 0) {
          polishDoneRef.current = false;

          // Record this session's sentence range
          setSessions((prev) => [...prev, current.length]);

          startPolish(current.join(''), sceneRef.current);
        }
        return current;
      });
    }
  }, []);

  const handleSentenceText = useCallback((index: number, text: string) => {
    setSentenceTexts((prev) => {
      const next = new Map(prev);
      next.set(index, text);
      return next;
    });
  }, []);

  const handlePolishText = useCallback((text: string) => {
    setPolishedText(text);
    polishedTextRef.current = text;
    setSentenceTexts(new Map());
  }, []);

  const handlePolishDone = useCallback(() => {
    polishDoneRef.current = true;

    // Save to history
    const rawText = sentences.join('');
    const finalPolished = polishedTextRef.current;
    if (rawText.trim() && finalPolished) {
      const duration = sessionStartRef.current
        ? Math.round((Date.now() - sessionStartRef.current) / 1000)
        : 0;
      addItem({
        raw: rawText,
        polished: finalPolished,
        scene: sceneRef.current,
        timestamp: Date.now(),
        duration,
      });
    }
  }, [sentences, addItem]);

  const { addSentence, startPolish, isPolishing, reset: resetRewrite } = useRewrite({
    onSentenceText: handleSentenceText,
    onPolishText: handlePolishText,
    onPolishDone: handlePolishDone,
    onError: handleError,
  });

  const sentenceProgress = isPolishing
    ? { done: 0, total: 0 }
    : { done: sentenceTexts.size, total: sentences.length };

  const { isSupported, start, stop, duration } = useSpeechRecognition({
    onFinal: handleFinal,
    onInterim: handleInterim,
    onError: handleError,
    onStateChange: handleStateChange,
  });

  // Keyboard shortcut: space bar
  const spaceHeldRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !spaceHeldRef.current) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        spaceHeldRef.current = true;
        if (!isRecording) {
          sessionStartRef.current = Date.now();
        }
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
  }, [start, stop, isRecording]);

  // Clear all
  const handleClear = useCallback(() => {
    setSentences([]);
    setInterim('');
    setSessions([]);
    setSentenceTexts(new Map());
    setPolishedText('');
    polishDoneRef.current = false;
    setError(null);
    resetRewrite();
  }, [resetRewrite]);

  // Restore from history
  const handleRestore = useCallback((item: HistoryItem) => {
    setSentences([item.raw]);
    setSessions([1]);
    setSentenceTexts(new Map());
    setPolishedText(item.polished);
    polishDoneRef.current = true;
    setScene(item.scene);
  }, []);

  const hasContent = sentences.length > 0 || !!interim;

  const rightPaneText = isPolishing || polishedText
    ? polishedText
    : Array.from(sentenceTexts.entries())
        .sort(([a], [b]) => a - b)
        .map(([, text]) => text)
        .join('');

  return (
    <Layout className="min-h-screen bg-gray-50">
      <Header
        className="flex items-center justify-between px-6"
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
        <SceneSelector
          value={scene}
          onChange={setScene}
          disabled={isRecording || isPolishing}
        />
      </Header>

      <Content className="p-6 max-w-5xl mx-auto w-full">
        <div className="flex flex-col items-center py-8">
          <RecordButton
            isRecording={isRecording}
            isSupported={isSupported}
            duration={duration}
            onStart={() => {
              sessionStartRef.current = Date.now();
              start();
            }}
            onStop={stop}
          />
        </div>

        <div className="flex items-center justify-between mb-3 mt-4">
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            {hasContent ? `${sentences.join('').length} 字` : '按住按钮或空格键开始'}
          </Typography.Text>
          {hasContent && (
            <Button
              type="text"
              size="small"
              icon={<ClearOutlined />}
              onClick={handleClear}
              disabled={isRecording || isPolishing}
            >
              清空
            </Button>
          )}
        </div>

        <div
          className="grid gap-4"
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
              sessionBreakpoints={sessions}
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
                text={rightPaneText}
                isStreaming={isPolishing}
                polishDone={polishDoneRef.current}
                scene={scene}
                sentenceProgress={sentenceProgress}
              />
            </Card>
          )}
        </div>

        {error && (
          <div className="text-center mt-4">
            <Typography.Text type="danger">{error}</Typography.Text>
          </div>
        )}

        <div className="mt-6">
          <HistoryPanel
            items={historyItems}
            onRestore={handleRestore}
            onDelete={removeItem}
            onClearAll={clearAll}
          />
        </div>
      </Content>
    </Layout>
  );
}
