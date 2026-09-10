export type RoundId = 'hr' | 'hm' | 'coding' | 'design' | 'case' | 'debrief' | 'hoe';
export type Route = RoundId | 'weak' | 'notes' | 'stories' | 'mock' | 'search' | 'print';
export interface Round { id: RoundId; title: string; blurb: string; targetSeconds: number }
export interface Question { id: string; round: RoundId; category: string; question: string; code?: string; answer: string[]; keyPoints: string[]; followUps?: string[] }
export type Rating = 1 | 2 | 3;
export interface ProgressEntry { rating: Rating; seen: number; lastSeen: number }
export type Progress = Record<string, ProgressEntry>;
export type Notes = Record<string, string>;
export interface Story { title: string; body: string; lastRehearsed?: number }
export type Stories = Record<string, Story>;
export interface Persisted { version: 2; progress: Progress; notes: Notes; stories: Stories }
