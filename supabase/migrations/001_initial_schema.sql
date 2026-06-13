-- Sarpedon Educational Platform
-- Initial Schema Migration

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- ============================================
-- Note: auth.users table is managed by Supabase Auth
-- This table extends it with application-specific fields

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'student', 'editor')),
  class TEXT,
  generated_login TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_generated_login ON public.profiles(generated_login);

-- ============================================
-- LEVELS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.levels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  educational_context TEXT,
  reference_solution TEXT NOT NULL,
  test_cases JSONB NOT NULL DEFAULT '[]'::jsonb,
  hints JSONB DEFAULT '[]'::jsonb,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  order_index INTEGER NOT NULL,
  topic TEXT,
  language TEXT NOT NULL DEFAULT 'python',
  target_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_remedial BOOLEAN NOT NULL DEFAULT FALSE,
  remedial_for JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX idx_levels_difficulty ON public.levels(difficulty);
CREATE INDEX idx_levels_is_remedial ON public.levels(is_remedial);
CREATE INDEX idx_levels_order_index ON public.levels(order_index);
CREATE INDEX idx_levels_created_by ON public.levels(created_by);

-- ============================================
-- STUDENT ATTEMPTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.student_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  level_id UUID NOT NULL REFERENCES public.levels(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  test_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'passed', 'failed', 'error')),
  error_patterns JSONB DEFAULT '[]'::jsonb,
  execution_time_ms INTEGER,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_student_attempts_student_id ON public.student_attempts(student_id);
CREATE INDEX idx_student_attempts_level_id ON public.student_attempts(level_id);
CREATE INDEX idx_student_attempts_status ON public.student_attempts(status);
CREATE INDEX idx_student_attempts_submitted_at ON public.student_attempts(submitted_at);

-- ============================================
-- LEVEL PROGRESS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.level_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  level_id UUID NOT NULL REFERENCES public.levels(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('not_started', 'in_progress', 'completed')),
  best_attempt_id UUID REFERENCES public.student_attempts(id) ON DELETE SET NULL,
  attempts_count INTEGER NOT NULL DEFAULT 0,
  hints_used JSONB DEFAULT '[]'::jsonb,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, level_id)
);

-- Indexes
CREATE INDEX idx_level_progress_student_id ON public.level_progress(student_id);
CREATE INDEX idx_level_progress_level_id ON public.level_progress(level_id);
CREATE INDEX idx_level_progress_status ON public.level_progress(status);

-- ============================================
-- ADAPTIVE LEARNING RECOMMENDATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.adaptive_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  error_pattern TEXT NOT NULL,
  recommended_levels JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence_score DECIMAL(3, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed BOOLEAN NOT NULL DEFAULT FALSE
);

-- Indexes
CREATE INDEX idx_adaptive_recommendations_student_id ON public.adaptive_recommendations(student_id);
CREATE INDEX idx_adaptive_recommendations_completed ON public.adaptive_recommendations(completed);

-- ============================================
-- COMPETITIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.competitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  level_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_competitions_status ON public.competitions(status);
CREATE INDEX idx_competitions_start_date ON public.competitions(start_date);
CREATE INDEX idx_competitions_end_date ON public.competitions(end_date);

-- ============================================
-- TEAMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX idx_teams_competition_id ON public.teams(competition_id);

-- ============================================
-- TEAM MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(team_id, student_id)
);

-- Indexes
CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX idx_team_members_student_id ON public.team_members(student_id);

-- ============================================
-- TEAM SCORES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.team_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  level_id UUID NOT NULL REFERENCES public.levels(id) ON DELETE CASCADE,
  total_score INTEGER NOT NULL DEFAULT 0,
  completed_by JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(team_id, level_id)
);

-- Indexes
CREATE INDEX idx_team_scores_team_id ON public.team_scores(team_id);
CREATE INDEX idx_team_scores_level_id ON public.team_scores(level_id);

-- ============================================
-- TRIGGER: Update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at column
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_levels_updated_at BEFORE UPDATE ON public.levels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_level_progress_updated_at BEFORE UPDATE ON public.level_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competitions_updated_at BEFORE UPDATE ON public.competitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_scores_updated_at BEFORE UPDATE ON public.team_scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE public.profiles IS 'User profiles extending Supabase Auth users';
COMMENT ON TABLE public.levels IS 'Programming challenge levels';
COMMENT ON TABLE public.student_attempts IS 'Student code submissions and test results';
COMMENT ON TABLE public.level_progress IS 'Student progress tracking for each level';
COMMENT ON TABLE public.adaptive_recommendations IS 'AI-powered learning recommendations';
COMMENT ON TABLE public.competitions IS 'Team-based competitions';
COMMENT ON TABLE public.teams IS 'Competition teams';
COMMENT ON TABLE public.team_members IS 'Team membership';
COMMENT ON TABLE public.team_scores IS 'Team scores per level';
