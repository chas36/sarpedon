import { Level, UserProgress } from './database.types';

export interface LevelWithProgress extends Level {
  progress?: UserProgress;
}

export interface SubmissionResult {
  isCorrect: boolean;
  feedback: string;
  showReferenceSolution: boolean;
  character?: string;
  mood?: string;
}
