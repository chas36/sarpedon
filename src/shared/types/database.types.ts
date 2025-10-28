export type Role = 'teacher' | 'student' | 'editor';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type LevelStatus = 'not_started' | 'in_progress' | 'completed';

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  class?: string;
  role: Role;
  generated_login?: string;
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
  user_id: string;
  level_id: string;
  status: LevelStatus;
  attempts: number;
  last_solution?: string;
  completed_at?: string;
  created_at: string;
}

export interface Submission {
  id: string;
  user_id: string;
  level_id: string;
  code: string;
  is_correct: boolean;
  ai_feedback?: string;
  submitted_at: string;
}
