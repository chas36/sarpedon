import { Level, DBUserProgress } from './database.types';

export interface LevelWithProgress extends Level {
  progress?: DBUserProgress;
}

export interface SubmissionResult {
  isCorrect: boolean;
  feedback: string;
  showReferenceSolution: boolean;
  character?: string;
  mood?: string;
}
