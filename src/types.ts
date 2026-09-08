export type RoundId = 'hr' | 'hm' | 'coding' | 'case' | 'debrief' | 'hoe';
export interface Round { id: RoundId; title: string; blurb: string }
export interface Question { id: string; round: RoundId; category: string; question: string; code?: string; answer: string[]; keyPoints: string[]; followUps?: string[] }
export type Rating = 1 | 2 | 3;
export interface ProgressEntry { rating: Rating; seen: number; lastSeen: number }
export type Progress = Record<string, ProgressEntry>;
export type Notes = Record<string, string>;
export interface Persisted { version: 1; progress: Progress; notes: Notes }
