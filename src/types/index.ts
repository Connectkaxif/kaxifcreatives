export type PromptLength = 'quick' | 'balanced' | 'detailed' | 'extended' | 'comprehensive';
export type LockMode = 'reload' | 'free' | 'protect';

export interface Character {
  id: string;
  name: string;
  appearance: string;
  aliases?: string;
  locked: boolean;
}

export interface GeneratedPrompt {
  id: string;
  sceneLine: string;
  generatedText: string;
  lineNumber: number;
  characters: string[];
}
