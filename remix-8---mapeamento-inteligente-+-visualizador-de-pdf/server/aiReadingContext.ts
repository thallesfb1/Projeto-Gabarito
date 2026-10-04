import type { AIExtraction } from '../src/utils/aiExtraction.ts';
import type { AIJobProgress } from '../src/utils/aiJobs.ts';

export interface AIReadingContext {
  report: (progress: AIJobProgress) => Promise<void>;
  loadPart: (part: number, fingerprint: string) => Promise<AIExtraction | null>;
  savePart: (part: number, fingerprint: string, extraction: AIExtraction) => Promise<void>;
  log?: (event: { attempt: number; status: number; durationMs: number; part?: number }) => void;
}
