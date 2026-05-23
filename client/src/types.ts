export interface SpeechRecognitionResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
}

export type SceneType = 'general' | 'email' | 'chat' | 'meeting' | 'code';
export type EmailStyle = 'formal' | 'casual';

export interface SceneConfig {
  key: SceneType;
  label: string;
  icon: string;
}
