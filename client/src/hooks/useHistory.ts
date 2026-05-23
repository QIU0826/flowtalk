import { useState, useCallback, useEffect } from 'react';
import { SceneType } from '../types';

export interface HistoryItem {
  id: string;
  raw: string;
  polished: string;
  scene: SceneType;
  timestamp: number;
  duration: number;
}

const STORAGE_KEY = 'flowtalk_history';
const MAX_ITEMS = 20;

function loadHistory(): HistoryItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data) as HistoryItem[];
  } catch {
    return [];
  }
}

function saveHistory(items: HistoryItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    // localStorage full, ignore
  }
}

interface UseHistoryReturn {
  items: HistoryItem[];
  addItem: (item: Omit<HistoryItem, 'id'>) => void;
  removeItem: (id: string) => void;
  clearAll: () => void;
}

export function useHistory(): UseHistoryReturn {
  const [items, setItems] = useState<HistoryItem[]>(loadHistory);

  useEffect(() => {
    saveHistory(items);
  }, [items]);

  const addItem = useCallback((item: Omit<HistoryItem, 'id'>) => {
    const newItem: HistoryItem = {
      ...item,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    };
    setItems((prev) => [newItem, ...prev].slice(0, MAX_ITEMS));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setItems([]);
  }, []);

  return { items, addItem, removeItem, clearAll };
}
