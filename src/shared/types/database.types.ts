export type Role = 'teacher' | 'student';

export type Difficulty = number; // 1-10 scale, where 1 is easiest and 10 is hardest

export type LevelStatus = 'not_started' | 'in_progress' | 'completed';

export type ModerationStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  class?: string;
  role: Role;
  is_editor: boolean; // Students with this flag can create levels
  generated_login?: string;
  email?: string;
  generated_password?: string;
  proficiency_level?: 'beginner' | 'intermediate' | 'advanced';
  proficiency_score?: number;
  proficiency_last_assessed?: string;
  proficiency_manual_override?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Level {
  id: string;
  title: string;
  description: string;
  educational_context?: string;
  reference_solution: string;
  test_cases: DBTestCase[];
  hints?: string[];
  difficulty: Difficulty;
  order_index: number;
  topic?: string;
  language: string;
  target_skills: string[];
  is_remedial: boolean;
  remedial_for?: string[];
  allowed_classes?: string[]; // NULL or empty = available to all
  created_by?: string;
  moderation_status: ModerationStatus;
  moderator_id?: string;
  moderation_notes?: string;
  moderated_at?: string;
  created_at: string;
  updated_at: string;
}

// Note: TestCase is defined in execution.types.ts
// Note: Submission is defined in submission.types.ts
// Note: UserProgress is defined in submission.types.ts

export interface DBTestCase {
  input: string;
  output: string;
  description?: string;
}

export interface DBUserProgress {
  id: string;
  student_id: string;
  level_id: string;
  status: LevelStatus;
  best_attempt_id?: string;
  attempts_count: number;
  hints_used?: string[];
  time_spent_seconds: number;
  completed_at?: string;
  started_at?: string;
  updated_at: string;
}

export interface DBSubmission {
  id: string;
  user_id: string;
  level_id: string;
  code: string;
  status: 'pending' | 'passed' | 'failed';
  submitted_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}
