-- ============================================
-- Migration: Add Skill Tracking System
-- Description: Tracks student skills and weak areas for adaptive learning
-- ============================================

-- Create skill_categories table
CREATE TABLE IF NOT EXISTS public.skill_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  parent_category UUID REFERENCES public.skill_categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_skill_profile table
CREATE TABLE IF NOT EXISTS public.user_skill_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_category_id UUID NOT NULL REFERENCES public.skill_categories(id) ON DELETE CASCADE,
  proficiency INTEGER NOT NULL DEFAULT 0 CHECK (proficiency >= 0 AND proficiency <= 100),
  mistake_count INTEGER NOT NULL DEFAULT 0,
  practice_count INTEGER NOT NULL DEFAULT 0,
  last_practiced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, skill_category_id)
);

-- Add indexes
CREATE INDEX idx_user_skill_profile_user_id ON public.user_skill_profile(user_id);
CREATE INDEX idx_user_skill_profile_skill_category_id ON public.user_skill_profile(skill_category_id);
CREATE INDEX idx_user_skill_profile_proficiency ON public.user_skill_profile(proficiency);

-- Enable RLS
ALTER TABLE public.skill_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skill_profile ENABLE ROW LEVEL SECURITY;

-- RLS Policies for skill_categories (read-only for all authenticated users)
CREATE POLICY "Everyone can view skill categories"
  ON public.skill_categories FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for user_skill_profile
CREATE POLICY "Students can view own skill profile"
  ON public.user_skill_profile FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Teachers can view all skill profiles"
  ON public.user_skill_profile FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'editor')
    )
  );

CREATE POLICY "System can insert skill profiles"
  ON public.user_skill_profile FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update skill profiles"
  ON public.user_skill_profile FOR UPDATE
  TO authenticated
  USING (true);

-- Insert default skill categories
INSERT INTO public.skill_categories (name, description) VALUES
  ('syntax', 'Синтаксис и базовые конструкции языка'),
  ('variables', 'Переменные и типы данных'),
  ('operators', 'Операторы и выражения'),
  ('conditionals', 'Условные операторы (if/else)'),
  ('loops', 'Циклы (for/while)'),
  ('functions', 'Функции и методы'),
  ('arrays', 'Массивы и списки'),
  ('strings', 'Строки и работа с текстом'),
  ('objects', 'Объекты и структуры данных'),
  ('debugging', 'Отладка и поиск ошибок'),
  ('algorithms', 'Алгоритмы и логика'),
  ('io', 'Ввод/вывод данных')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- Function: Get student weak areas
-- ============================================
CREATE OR REPLACE FUNCTION get_student_weak_areas(p_user_id UUID, p_limit INTEGER DEFAULT 3)
RETURNS TABLE(
  skill_name TEXT,
  proficiency INTEGER,
  mistake_count INTEGER,
  practice_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sc.name,
    usp.proficiency,
    usp.mistake_count,
    usp.practice_count
  FROM public.user_skill_profile usp
  JOIN public.skill_categories sc ON sc.id = usp.skill_category_id
  WHERE usp.user_id = p_user_id
  ORDER BY usp.proficiency ASC, usp.mistake_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Function: Update skill proficiency based on submission
-- ============================================
CREATE OR REPLACE FUNCTION update_skill_proficiency(
  p_user_id UUID,
  p_skill_name TEXT,
  p_success BOOLEAN,
  p_quality_score INTEGER DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_skill_category_id UUID;
  v_current_proficiency INTEGER;
  v_proficiency_change INTEGER;
BEGIN
  -- Get skill category ID
  SELECT id INTO v_skill_category_id
  FROM public.skill_categories
  WHERE name = p_skill_name;

  IF v_skill_category_id IS NULL THEN
    RAISE NOTICE 'Skill category % not found', p_skill_name;
    RETURN;
  END IF;

  -- Insert or get current proficiency
  INSERT INTO public.user_skill_profile (user_id, skill_category_id, proficiency, practice_count)
  VALUES (p_user_id, v_skill_category_id, 50, 0)
  ON CONFLICT (user_id, skill_category_id) DO NOTHING;

  SELECT proficiency INTO v_current_proficiency
  FROM public.user_skill_profile
  WHERE user_id = p_user_id AND skill_category_id = v_skill_category_id;

  -- Calculate proficiency change
  IF p_success THEN
    IF p_quality_score IS NOT NULL THEN
      -- Use quality score to adjust proficiency
      v_proficiency_change := CASE
        WHEN p_quality_score >= 90 THEN 5
        WHEN p_quality_score >= 70 THEN 3
        ELSE 2
      END;
    ELSE
      v_proficiency_change := 3;
    END IF;

    -- Update proficiency (increase)
    UPDATE public.user_skill_profile
    SET
      proficiency = LEAST(100, proficiency + v_proficiency_change),
      practice_count = practice_count + 1,
      last_practiced_at = now(),
      updated_at = now()
    WHERE user_id = p_user_id AND skill_category_id = v_skill_category_id;
  ELSE
    -- Failed submission - increase mistake count, decrease proficiency
    UPDATE public.user_skill_profile
    SET
      proficiency = GREATEST(0, proficiency - 2),
      mistake_count = mistake_count + 1,
      practice_count = practice_count + 1,
      last_practiced_at = now(),
      updated_at = now()
    WHERE user_id = p_user_id AND skill_category_id = v_skill_category_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Function: Analyze submission and update skills
-- ============================================
CREATE OR REPLACE FUNCTION analyze_submission_skills(p_submission_id UUID)
RETURNS VOID AS $$
DECLARE
  v_submission RECORD;
  v_level RECORD;
  v_skill TEXT;
  v_quality_score INTEGER;
BEGIN
  -- Get submission details
  SELECT * INTO v_submission
  FROM public.submissions
  WHERE id = p_submission_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Get level details
  SELECT * INTO v_level
  FROM public.levels
  WHERE id = v_submission.level_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Extract quality score
  v_quality_score := (v_submission.quality_metrics->>'overall_score')::INTEGER;

  -- Update proficiency for each target skill in the level
  IF v_level.target_skills IS NOT NULL THEN
    FOR v_skill IN SELECT jsonb_array_elements_text(v_level.target_skills)
    LOOP
      PERFORM update_skill_proficiency(
        v_submission.user_id,
        v_skill,
        v_submission.status = 'passed',
        v_quality_score
      );
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Trigger: Auto-analyze skills on submission
-- ============================================
CREATE OR REPLACE FUNCTION trigger_analyze_submission_skills()
RETURNS TRIGGER AS $$
BEGIN
  -- Only analyze when submission is completed (not pending)
  IF NEW.status IN ('passed', 'failed') AND
     (OLD IS NULL OR OLD.status = 'pending') THEN
    PERFORM analyze_submission_skills(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS after_submission_complete_analyze_skills ON public.submissions;
CREATE TRIGGER after_submission_complete_analyze_skills
  AFTER INSERT OR UPDATE ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_analyze_submission_skills();

-- ============================================
-- Grant permissions
-- ============================================
GRANT SELECT ON public.skill_categories TO authenticated;
GRANT SELECT ON public.user_skill_profile TO authenticated;
GRANT EXECUTE ON FUNCTION get_student_weak_areas TO authenticated;
GRANT EXECUTE ON FUNCTION update_skill_proficiency TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_submission_skills TO authenticated;

COMMENT ON TABLE public.skill_categories IS 'Skill categories for tracking student proficiency';
COMMENT ON TABLE public.user_skill_profile IS 'Individual student skill proficiency tracking';
COMMENT ON FUNCTION get_student_weak_areas IS 'Returns top N weak areas for a student';
COMMENT ON FUNCTION update_skill_proficiency IS 'Updates skill proficiency based on submission result';
COMMENT ON FUNCTION analyze_submission_skills IS 'Analyzes submission and updates related skills';
