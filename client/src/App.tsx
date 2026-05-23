import { useState, useCallback, useEffect, useRef } from 'react';
import { Layout, Typography, Card, Button, message } from 'antd';
import { SoundOutlined, ClearOutlined } from '@ant-design/icons';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useRewrite } from './hooks/useRewrite';
import { useHistory, HistoryItem } from './hooks/useHistory';
import { usePersonalDict } from './hooks/usePersonalDict';
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

  const [clickMode, setClickMode] = useState(false);
  const clickModeRef = useRef(false);
  clickModeRef.current = clickMode;

  const [sessions, setSessions] = useState<number[]>([]);
  const sessionStartRef = useRef<number>(0);

  const [sentenceTexts, setSentenceTexts] = useState<Map<number, string>>(new Map());
  const [polishedText, setPolishedText] = useState('');
  const polishedTextRef = useRef('');
  const polishDoneRef = useRef(false);
  const [hasRewriteError, setHasRewriteError] = useState(false);

  const { items: historyItems, addItem, removeItem, clearAll } = useHistory();
  const { learnFromEdit, getDictContext } = usePersonalDict();

  // Refs to break stale closures and track latest values
  const sentencesRef = useRef<string[]>([]);
  sentencesRef.current = sentences;
  const startPolishRef = useRef<(text: string, scene: string) => void>(() => {});
  const addSentenceRef = useRef<(sentence: string, scene: string) => void>(() => {});
  const startRef = useRef<() => void>(() => {});
  const stopRef = useRef<() => void>(() => {});
  const isRecordingRef = useRef(false);

  const handleFinal = useCallback((sentence: string) => {
    setSentences((prev) => [...prev, sentence]);
    addSentenceRef.current(sentence, sceneRef.current);
    setInterim('');
  }, []);

  const handleInterim = useCallback((text: string) => {
    setInterim(text);
  }, []);

  const handleError = useCallback((err: string) => {
    setError(err);
    setHasRewriteError(true);
    message.error(err);
  }, []);

  const handleStateChange = useCallback((recording: boolean) => {
    isRecordingRef.current = recording;
    setIsRecording(recording);
    if (!recording) {
      setSentences((current) => {
        if (current.length > 0) {
          polishDoneRef.current = false;
          setSessions((prev) => [...prev, current.length]);
          startPolishRef.current(current.join(''), sceneRef.current);
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
    setHasRewriteError(false);

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
    getDictContext,
  });

  // Keep refs in sync with latest callbacks
  startPolishRef.current = startPolish;
  addSentenceRef.current = addSentence;

  const sentenceProgress = isPolishing
    ? { done: 0, total: 0 }
    : { done: sentenceTexts.size, total: sentences.length };

  const { isSupported, start, stop, duration } = useSpeechRecognition({
    onFinal: handleFinal,
    onInterim: handleInterim,
    onError: handleError,
    onStateChange: handleStateChange,
  });

  // Keep start/stop refs in sync
  startRef.current = start;
  stopRef.current = stop;

  // Stable keyboard handler — use refs to avoid listener churn
  const spaceHeldRef = useRef(false);
  const spaceJustReleasedRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || spaceHeldRef.current) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      e.preventDefault();
      spaceHeldRef.current = true;
      spaceJustReleasedRef.current = false;

      if (clickModeRef.current) {
        // Click mode: space toggles recording
        if (isRecordingRef.current) {
          stopRef.current();
        } else {
          sessionStartRef.current = Date.now();
          startRef.current();
        }
      } else {
        // Hold mode: start immediately
        if (!isRecordingRef.current) {
          sessionStartRef.current = Date.now();
        }
        startRef.current();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      e.preventDefault();
      spaceHeldRef.current = false;
      spaceJustReleasedRef.current = true;
      if (!clickModeRef.current) {
        stopRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Scene auto-rewrite: when scene changes and content exists, re-polish with new scene
  const sceneInitializedRef = useRef(false);
  useEffect(() => {
    if (!sceneInitializedRef.current) {
      sceneInitializedRef.current = true;
      return;
    }
    const rawText = sentencesRef.current.join('');
    if (!rawText.trim()) return;
    if (isRecordingRef.current || isPolishing) return;
    startPolishRef.current(rawText, sceneRef.current);
  }, [scene]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEdit = useCallback(
    (newText: string) => {
      const oldText = polishedTextRef.current;
      if (oldText && oldText !== newText) {
        learnFromEdit(oldText, newText, sceneRef.current);
      }
      setPolishedText(newText);
      polishedTextRef.current = newText;
    },
    [learnFromEdit],
  );

  const handleClear = useCallback(() => {
    setSentences([]);
    setInterim('');
    setSessions([]);
    setSentenceTexts(new Map());
    setPolishedText('');
    polishDoneRef.current = false;
    setHasRewriteError(false);
    setError(null);
    resetRewrite();
  }, [resetRewrite]);

  const handleRetry = useCallback(() => {
    const rawText = sentences.join('');
    if (!rawText.trim()) return;
    setHasRewriteError(false);
    polishDoneRef.current = false;
    startPolishRef.current(rawText, sceneRef.current);
  }, [sentences]);

  const handleRestore = useCallback((item: HistoryItem) => {
    setSentences([item.raw]);
    setSessions([1]);
    setSentenceTexts(new Map());
    setPolishedText(item.polished);
    polishedTextRef.current = item.polished;
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
          disabled={isRecording}
        />
      </Header>

      <Content className="p-6 max-w-5xl mx-auto w-full">
        <div className="flex flex-col items-center py-8">
          <RecordButton
            isRecording={isRecording}
            isSupported={isSupported}
            duration={duration}
            clickMode={clickMode}
            onModeChange={setClickMode}
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
                hasError={hasRewriteError}
                sentenceProgress={sentenceProgress}
                onRetry={handleRetry}
                onEdit={handleEdit}
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
