export type Role = 'teacher' | 'student' | 'editor';

export type Difficulty = number; // 1-10 scale, where 1 is easiest and 10 is hardest

export type LevelStatus = 'not_started' | 'in_progress' | 'completed';

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  class?: string;
  role: Role;
  generated_login?: string;
  email?: string;
  generated_password?: string;
  created_at: string;
  updated_at: string;
}

export interface Level {
  id: string;
  title: string;
  description: string;
  educational_context?: string;
  reference_solution: string;
  test_cases: TestCase[];
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
  created_at: string;
  updated_at: string;
}

export interface TestCase {
  input: string;
  output: string;
  description?: string;
}

export interface UserProgress {
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

export interface Submission {
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
