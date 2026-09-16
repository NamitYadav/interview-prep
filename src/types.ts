export type RoundId = 'hr' | 'hm' | 'coding' | 'design' | 'case' | 'debrief' | 'hoe' | 'lead' | 'arch';
export type Route = RoundId | 'weak' | 'notes' | 'stories' | 'mock' | 'search' | 'print';
export type RoleId = 'senior' | 'staff' | 'lead' | 'architect';
export interface Role { id: RoleId; title: string; blurb: string; rounds: RoundId[] }
export interface Round { id: RoundId; title: string; blurb: string; targetSeconds: number }
export interface Question {
  id: string; round: RoundId; category: string; question: string; code?: string; scratch?: true;
  /** JSX that mounts this component with sample props, e.g. `<Tabs tabs={[...]} />`. The
   *  sandbox appends `__render(<preview/>)` after the pad's code. Only meaningful with
   *  `scratch: true`; a scratch question without it runs console-only. */
  preview?: string;
  answer: string[]; keyPoints: string[]; followUps?: string[];
  // Material to use only when the interviewer digs. Kept out of `answer` so the
  // word-budget test in data.test.ts measures only what you actually say first.
  deeper?: string[];
  /** Roles that see this question. Absent = every role whose loop includes q.round. */
  roles?: RoleId[];
}
export type Rating = 1 | 2 | 3;
export interface ProgressEntry { rating: Rating; seen: number; lastSeen: number }
export type Progress = Record<string, ProgressEntry>;
export type Notes = Record<string, string>;
export interface Story { title: string; body: string; lastRehearsed?: number }
export type Stories = Record<string, Story>;
export interface Persisted { version: 2; progress: Progress; notes: Notes; stories: Stories }
