import { useState, useCallback, useEffect } from 'react';

interface Correction {
  wrong: string;
  correct: string;
  scene: string;
  timestamp: number;
}

const STORAGE_KEY = 'flowtalk_dict';
const MAX_ENTRIES = 50;

function loadDict(): Correction[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveDict(items: Correction[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ENTRIES)));
  } catch { /* ignore */ }
}

// Extract simple word corrections by comparing old/new text
function extractCorrections(oldText: string, newText: string, scene: string): Correction[] {
  const results: Correction[] = [];

  // Find common prefix and suffix
  let prefixLen = 0;
  while (
    prefixLen < oldText.length &&
    prefixLen < newText.length &&
    oldText[prefixLen] === newText[prefixLen]
  ) {
    prefixLen++;
  }

  let suffixLen = 0;
  while (
    suffixLen < oldText.length - prefixLen &&
    suffixLen < newText.length - prefixLen &&
    oldText[oldText.length - 1 - suffixLen] === newText[newText.length - 1 - suffixLen]
  ) {
    suffixLen++;
  }

  const oldDiff = oldText.slice(prefixLen, oldText.length - suffixLen);
  const newDiff = newText.slice(prefixLen, newText.length - suffixLen);

  // Only record meaningful corrections (2-10 chars, word-level)
  if (oldDiff && newDiff && oldDiff !== newDiff && oldDiff.length >= 1 && newDiff.length >= 1) {
    if (oldDiff.length <= 15 && newDiff.length <= 15) {
      results.push({
        wrong: oldDiff.trim(),
        correct: newDiff.trim(),
        scene,
        timestamp: Date.now(),
      });
    }
  }

  return results;
}

interface UsePersonalDictReturn {
  corrections: Correction[];
  learnFromEdit: (oldText: string, newText: string, scene: string) => void;
  getDictContext: () => string;
}

export function usePersonalDict(): UsePersonalDictReturn {
  const [corrections, setCorrections] = useState<Correction[]>(loadDict);

  useEffect(() => {
    saveDict(corrections);
  }, [corrections]);

  const learnFromEdit = useCallback((oldText: string, newText: string, scene: string) => {
    const extracted = extractCorrections(oldText, newText, scene);
    if (extracted.length === 0) return;
    setCorrections((prev) => {
      const merged = [...extracted, ...prev];
      // Deduplicate by wrong word (keep newest)
      const seen = new Set<string>();
      return merged.filter((c) => {
        const key = c.wrong;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, MAX_ENTRIES);
    });
  }, []);

  const getDictContext = useCallback(() => {
    if (corrections.length === 0) return '';
    const recent = corrections.slice(0, 10);
    const lines = recent.map((c) => `"${c.wrong}" → "${c.correct}"`);
    return `用户词库（以下为当前用户常纠正的词对，改写时请优先采用纠正后的词）：\n${lines.join('\n')}`;
  }, [corrections]);

  return { corrections, learnFromEdit, getDictContext };
}
