import { useRef, useCallback, useState, useEffect } from 'react';

interface UseSpeechRecognitionOptions {
  onFinal: (sentence: string) => void;
  onInterim: (text: string) => void;
  onError: (error: string) => void;
  onStateChange: (recording: boolean) => void;
}

interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  isRecording: boolean;
  start: () => void;
  stop: () => void;
  duration: number;
}

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions,
): UseSpeechRecognitionReturn {
  const { onFinal, onInterim, onError, onStateChange } = options;

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isHoldingRef = useRef(false);
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const clearDurationTimer = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
  }, []);

  const startDurationTimer = useCallback(() => {
    setDuration(0);
    const startTime = Date.now();
    durationTimerRef.current = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 200);
  }, []);

  const createRecognition = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR!();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'zh-CN';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript || '';
        const isFinal = result.isFinal;

        if (isFinal && transcript.trim()) {
          onFinal(transcript.trim());
        } else if (!isFinal && transcript.trim()) {
          onInterim(transcript.trim());
        }
      }
    };

    recognition.onerror = (event: Event) => {
      const error = event as SpeechRecognitionErrorEvent;
      if (error.error === 'not-allowed') {
        onError('麦克风权限被拒绝，请在浏览器设置中允许访问麦克风');
      } else if (error.error === 'no-speech') {
        // 用户静音，不报错，自动重启由 onend 处理
        return;
      } else if (error.error !== 'aborted') {
        onError(`语音识别出错: ${error.error}`);
      }
    };

    recognition.onend = () => {
      // 如果用户还在按住，自动重启
      if (isHoldingRef.current) {
        try {
          recognition.start();
        } catch {
          // restart failed, will be handled by isHoldingRef check
        }
        return;
      }
      setIsRecording(false);
      onStateChange(false);
      clearDurationTimer();
    };

    return recognition;
  }, [onFinal, onInterim, onError, onStateChange, clearDurationTimer]);

  const start = useCallback(() => {
    if (!isSupported) {
      onError('当前浏览器不支持语音识别，请使用 Chrome 浏览器');
      return;
    }

    isHoldingRef.current = true;

    if (!recognitionRef.current) {
      recognitionRef.current = createRecognition();
    }

    try {
      recognitionRef.current.start();
      setIsRecording(true);
      onStateChange(true);
      startDurationTimer();
    } catch {
      // already started, ignore
    }
  }, [isSupported, createRecognition, onError, onStateChange, startDurationTimer]);

  const stop = useCallback(() => {
    isHoldingRef.current = false;

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    onStateChange(false);
    clearDurationTimer();
  }, [onStateChange, clearDurationTimer]);

  useEffect(() => {
    return () => {
      isHoldingRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      clearDurationTimer();
    };
  }, [clearDurationTimer]);

  return { isSupported, isRecording, start, stop, duration };
}
