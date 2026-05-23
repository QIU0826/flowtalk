import { useState, useCallback, useEffect, useRef } from 'react';
import { Layout, Typography, Card, Button, message, Popconfirm, Segmented } from 'antd';
import { SoundOutlined, ClearOutlined, BookOutlined } from '@ant-design/icons';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useRewrite } from './hooks/useRewrite';
import { useHistory, HistoryItem } from './hooks/useHistory';
import { usePersonalDict } from './hooks/usePersonalDict';
import RecordButton from './components/RecordButton';
import RawPane from './components/RawPane';
import PolishedPane from './components/PolishedPane';
import SceneSelector from './components/SceneSelector';
import HistoryPanel from './components/HistoryPanel';
import DictManager from './components/DictManager';
import { SceneType, EmailStyle } from './types';

const { Header, Content } = Layout;

const sceneLabels: Record<SceneType, string> = {
  general: '通用',
  email: '邮件',
  chat: '聊天',
  meeting: '纪要',
  code: '代码',
};

export default function App() {
  const [sentences, setSentences] = useState<string[]>([]);
  const [interim, setInterim] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scene, setScene] = useState<SceneType>('general');
  const sceneRef = useRef<SceneType>('general');
  sceneRef.current = scene;

  const [emailStyle, setEmailStyle] = useState<EmailStyle>('formal');
  const emailStyleRef = useRef<EmailStyle>('formal');
  emailStyleRef.current = emailStyle;

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
  const { learnFromEdit, getDictContext, corrections, removeCorrection, clearAll: clearDict } = usePersonalDict();
  const [dictOpen, setDictOpen] = useState(false);

  // Refs to break stale closures and track latest values
  const sentencesRef = useRef<string[]>([]);
  sentencesRef.current = sentences;
  const startPolishRef = useRef<(text: string, scene: string, model?: string, emailStyle?: string) => void>(() => {});
  const addSentenceRef = useRef<(sentence: string, scene: string, emailStyle?: string) => void>(() => {});
  const startRef = useRef<() => void>(() => {});
  const stopRef = useRef<() => void>(() => {});
  const isRecordingRef = useRef(false);

  // Scene result cache: avoid redundant API calls when switching back
  interface CacheEntry { polished: string; rawText: string; emailStyle: string }
  const sceneCacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const invalidateCache = () => { sceneCacheRef.current.clear(); };

  const handleFinal = useCallback((sentence: string) => {
    setSentences((prev) => [...prev, sentence]);
    addSentenceRef.current(sentence, sceneRef.current, emailStyleRef.current);
    setInterim('');
    invalidateCache();
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
          startPolishRef.current(current.join(''), sceneRef.current, undefined, emailStyleRef.current);
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

    // Save to scene cache
    const rawText = sentences.join('');
    if (rawText.trim() && polishedTextRef.current) {
      sceneCacheRef.current.set(sceneRef.current, {
        polished: polishedTextRef.current,
        rawText,
        emailStyle: emailStyleRef.current,
      });
    }
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

  // Scene auto-rewrite: when scene changes and content exists, check cache first
  const sceneInitializedRef = useRef(false);
  useEffect(() => {
    if (!sceneInitializedRef.current) {
      sceneInitializedRef.current = true;
      return;
    }
    const rawText = sentencesRef.current.join('');
    if (!rawText.trim()) return;
    if (isRecordingRef.current || isPolishing) return;

    const cached = sceneCacheRef.current.get(scene);
    if (cached) {
    }
    if (cached && cached.rawText === rawText && cached.emailStyle === emailStyleRef.current) {
      setPolishedText(cached.polished);
      polishedTextRef.current = cached.polished;
      polishDoneRef.current = true;
      setSentenceTexts(new Map());
      setHasRewriteError(false);
      return;
    }

    message.info(`正在用「${sceneLabels[sceneRef.current]}」场景重新改写…`, 1.5);
    startPolishRef.current(rawText, sceneRef.current, undefined, emailStyleRef.current);
  }, [scene]); // eslint-disable-line react-hooks/exhaustive-deps

  // When emailStyle changes while on email scene, re-polish with new style
  const emailStyleInitRef = useRef(false);
  useEffect(() => {
    if (!emailStyleInitRef.current) {
      emailStyleInitRef.current = true;
      return;
    }
    if (sceneRef.current !== 'email') return;
    const rawText = sentencesRef.current.join('');
    if (!rawText.trim()) return;
    if (isRecordingRef.current || isPolishing) return;

    const cached = sceneCacheRef.current.get('email');
    if (cached && cached.rawText === rawText && cached.emailStyle === emailStyleRef.current) {
      setPolishedText(cached.polished);
      polishedTextRef.current = cached.polished;
      polishDoneRef.current = true;
      setSentenceTexts(new Map());
      setHasRewriteError(false);
      return;
    }

    message.info(`正在用「邮件·${emailStyleRef.current === 'formal' ? '正式' : '轻量'}」风格重写…`, 1.5);
    startPolishRef.current(rawText, sceneRef.current, undefined, emailStyleRef.current);
  }, [emailStyle]); // eslint-disable-line react-hooks/exhaustive-deps

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
    invalidateCache();
  }, [resetRewrite]);

  const handleDeleteSentence = useCallback(
    (index: number) => {
      invalidateCache();
      setSentences((prev) => {
        const next = prev.filter((_, i) => i !== index);
        if (next.length === 0) {
          setSessions([]);
          setSentenceTexts(new Map());
          setPolishedText('');
          polishDoneRef.current = false;
          return [];
        }
        startPolishRef.current(next.join(''), sceneRef.current, undefined, emailStyleRef.current);
        return next;
      });
    },
    [],
  );

  const handleRegenerate = useCallback(() => {
    const rawText = sentences.join('');
    if (!rawText.trim()) return;
    sceneCacheRef.current.delete(sceneRef.current);
    polishDoneRef.current = false;
    startPolishRef.current(rawText, sceneRef.current, 'deepseek-v4-pro', emailStyleRef.current);
  }, [sentences]);

  const handleRetry = useCallback(() => {
    const rawText = sentences.join('');
    if (!rawText.trim()) return;
    sceneCacheRef.current.delete(sceneRef.current);
    setHasRewriteError(false);
    polishDoneRef.current = false;
    startPolishRef.current(rawText, sceneRef.current, undefined, emailStyleRef.current);
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
        <div className="flex items-center gap-3">
          <Button
            type="text"
            size="small"
            icon={<BookOutlined />}
            onClick={() => setDictOpen(true)}
          >
            词库
            {corrections.length > 0 && (
              <span className="ml-1 text-xs text-indigo-500">({corrections.length})</span>
            )}
          </Button>
          <SceneSelector
            value={scene}
            onChange={setScene}
            disabled={isRecording}
          />
          {scene === 'email' && (
            <Segmented
              size="small"
              value={emailStyle}
              onChange={(val) => setEmailStyle(val as EmailStyle)}
              options={[
                { value: 'formal', label: '正式' },
                { value: 'casual', label: '轻量' },
              ]}
            />
          )}
        </div>
      </Header>

      <Content className="p-6 max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between mb-3">
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            {hasContent ? `${sentences.join('').length} 字` : '按住按钮或空格键开始'}
          </Typography.Text>
          <Popconfirm
            title="确定清空当前全部内容？"
            onConfirm={handleClear}
            okText="确定"
            cancelText="取消"
            placement="bottomRight"
          >
            <Button
              type="text"
              size="small"
              icon={<ClearOutlined />}
              disabled={!hasContent || isRecording || isPolishing}
            >
              清空
            </Button>
          </Popconfirm>
        </div>

        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: '1fr 1fr',
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
              onDeleteSentence={handleDeleteSentence}
            />
          </Card>

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
              onRegenerate={handleRegenerate}
            />
          </Card>
        </div>

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
      <DictManager
        open={dictOpen}
        corrections={corrections}
        onClose={() => setDictOpen(false)}
        onDelete={removeCorrection}
        onClearAll={clearDict}
      />
    </Layout>
  );
}
