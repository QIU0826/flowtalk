import { useRef, useCallback, useState } from 'react';

const PENDING_TIMEOUT = 30_000;

interface UseRewriteOptions {
  onSentenceText: (index: number, text: string) => void;
  onPolishText: (text: string) => void;
  onPolishDone: () => void;
  onError: (error: string) => void;
  getDictContext?: () => string;
}

interface UseRewriteReturn {
  addSentence: (sentence: string, scene: string, emailStyle?: string) => void;
  startPolish: (fullText: string, scene: string, model?: string, emailStyle?: string) => void;
  isPolishing: boolean;
  reset: () => void;
}

export function useRewrite(options: UseRewriteOptions): UseRewriteReturn {
  const { onSentenceText, onPolishText, onPolishDone, onError, getDictContext } = options;

  const [isPolishing, setIsPolishing] = useState(false);

  const sentenceIndexRef = useRef(0);
  const nextExpectedRef = useRef(0);
  const pending = useRef(new Map<number, string>());
  const hasCompleted = useRef(new Set<number>());
  const lastPolishedTextRef = useRef('');
  const abortControllersRef = useRef(new Set<AbortController>());

  const flushPending = useCallback(() => {
    while (pending.current.has(nextExpectedRef.current)) {
      const text = pending.current.get(nextExpectedRef.current)!;
      onSentenceText(nextExpectedRef.current, text);
      pending.current.delete(nextExpectedRef.current);
      nextExpectedRef.current++;
    }
  }, [onSentenceText]);

  const streamConsume = useCallback(
    async (
      url: string,
      body: unknown,
      onChunk: (text: string) => void,
      onDone: () => void,
    ) => {
      const controller = new AbortController();
      abortControllersRef.current.add(controller);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: 'Request failed' }));
          onError(err.error || `HTTP ${response.status}`);
          onDone();
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          onDone();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                onDone();
                return;
              }
              try {
                const text = JSON.parse(data);
                if (typeof text === 'string') {
                  onChunk(text);
                }
              } catch {
                // ignore parse errors for partial chunks
              }
            }
          }
        }
        onDone();
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        onError((err as Error).message);
        onDone();
      } finally {
        abortControllersRef.current.delete(controller);
      }
    },
    [onError],
  );

  const addSentence = useCallback(
    (sentence: string, scene: string, emailStyle?: string) => {
      const index = sentenceIndexRef.current++;

      // Set timeout for this sentence
      const timeoutId = setTimeout(() => {
        if (hasCompleted.current.has(index)) return;
        // Timeout: use original text as placeholder
        hasCompleted.current.add(index);
        pending.current.set(index, sentence);
        flushPending();
      }, PENDING_TIMEOUT);

      streamConsume(
        '/api/rewrite/sentence',
        {
          sentence,
          scene,
          emailStyle,
          dictContext: getDictContext?.() || '',
          context: lastPolishedTextRef.current
            ? { previousPolished: lastPolishedTextRef.current }
            : undefined,
        },
        (chunk) => {
          // Accumulate in pending buffer
          const existing = pending.current.get(index) || '';
          pending.current.set(index, existing + chunk);
          flushPending();
        },
        () => {
          clearTimeout(timeoutId);
          hasCompleted.current.add(index);
          // Store the completed text for context in next sentence
          const finalText = pending.current.get(index) || sentence;
          lastPolishedTextRef.current = finalText;
          flushPending();
        },
      );
    },
    [streamConsume, flushPending],
  );

  const startPolish = useCallback(
    (fullText: string, scene: string, model?: string, emailStyle?: string) => {
      setIsPolishing(true);

      // Cancel pending sentence rewrites
      for (const ctrl of abortControllersRef.current) {
        ctrl.abort();
      }
      abortControllersRef.current.clear();

      let polishedText = '';

      streamConsume(
        '/api/rewrite/polish',
        { text: fullText, scene, dictContext: getDictContext?.() || '', model, emailStyle },
        (chunk) => {
          polishedText += chunk;
          onPolishText(polishedText);
        },
        () => {
          lastPolishedTextRef.current = polishedText;
          setIsPolishing(false);
          onPolishDone();
        },
      );
    },
    [streamConsume, onPolishText, onPolishDone],
  );

  const reset = useCallback(() => {
    for (const ctrl of abortControllersRef.current) {
      ctrl.abort();
    }
    abortControllersRef.current.clear();
    sentenceIndexRef.current = 0;
    nextExpectedRef.current = 0;
    pending.current.clear();
    hasCompleted.current.clear();
    lastPolishedTextRef.current = '';
    setIsPolishing(false);
  }, []);

  return { addSentence, startPolish, isPolishing, reset };
}
