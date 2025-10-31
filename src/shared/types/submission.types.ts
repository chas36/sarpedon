/**
 * Submission status enum
 */
export type SubmissionStatus = 'pending' | 'passed' | 'failed';

/**
 * Submission type for student code submissions
 */
export interface Submission {
  id: string;
  user_id: string;
  level_id: string;
  code: string;
  status: SubmissionStatus;
  submitted_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Data for creating a new submission
 */
export interface CreateSubmissionData {
  level_id: string;
  code: string;
  status?: SubmissionStatus;
}

/**
 * Data for updating a submission
 */
export interface UpdateSubmissionData {
  code?: string;
  status?: SubmissionStatus;
  completed_at?: string | null;
}

/**
 * Submission with level details
 */
export interface SubmissionWithLevel extends Submission {
  level: {
    id: string;
    title: string;
    difficulty: 'easy' | 'medium' | 'hard';
    topic: string;
  };
}

/**
 * Progress statistics for a user
 */
export interface UserProgress {
  total_levels: number;
  completed_levels: number;
  in_progress_levels: number;
  completion_percentage: number;
  total_submissions: number;
  passed_submissions: number;
  failed_submissions: number;
}
