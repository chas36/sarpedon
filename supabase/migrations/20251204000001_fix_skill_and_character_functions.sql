-- Fix functions to use fully qualified table names
-- This is required when using SET search_path = '' for security
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

-- ============================================
-- Function: Get student weak areas (WITH QUALIFIED NAMES)
-- ============================================
CREATE OR REPLACE FUNCTION public.get_student_weak_areas(p_user_id UUID, p_limit INTEGER DEFAULT 3)
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

COMMENT ON FUNCTION public.get_student_weak_areas IS 'Returns top N weak areas for a student (with qualified table names)';

-- ============================================
-- Function: Update skill proficiency (WITH QUALIFIED NAMES)
-- ============================================
CREATE OR REPLACE FUNCTION public.update_skill_proficiency(
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
  -- Get skill category ID (QUALIFIED NAME)
  SELECT id INTO v_skill_category_id
  FROM public.skill_categories
  WHERE name = p_skill_name;

  IF v_skill_category_id IS NULL THEN
    RAISE NOTICE 'Skill category % not found', p_skill_name;
    RETURN;
  END IF;

  -- Insert or get current proficiency (QUALIFIED NAME)
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

    -- Update proficiency (increase) (QUALIFIED NAME)
    UPDATE public.user_skill_profile
    SET
      proficiency = LEAST(100, proficiency + v_proficiency_change),
      practice_count = practice_count + 1,
      last_practiced_at = now(),
      updated_at = now()
    WHERE user_id = p_user_id AND skill_category_id = v_skill_category_id;
  ELSE
    -- Failed submission - increase mistake count, decrease proficiency (QUALIFIED NAME)
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

COMMENT ON FUNCTION public.update_skill_proficiency IS 'Updates skill proficiency based on submission result (with qualified table names)';

-- ============================================
-- Function: Analyze submission and update skills (WITH QUALIFIED NAMES)
-- ============================================
CREATE OR REPLACE FUNCTION public.analyze_submission_skills(p_submission_id UUID)
RETURNS VOID AS $$
DECLARE
  v_submission RECORD;
  v_level RECORD;
  v_skill TEXT;
  v_quality_score INTEGER;
BEGIN
  -- Get submission details (QUALIFIED NAME)
  SELECT * INTO v_submission
  FROM public.submissions
  WHERE id = p_submission_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Get level details (QUALIFIED NAME)
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
      PERFORM public.update_skill_proficiency(
        v_submission.user_id,
        v_skill,
        v_submission.status = 'passed',
        v_quality_score
      );
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

COMMENT ON FUNCTION public.analyze_submission_skills IS 'Analyzes submission and updates related skills (with qualified table names)';

-- ============================================
-- Function: Get character stats (WITH QUALIFIED NAMES)
-- ============================================
CREATE OR REPLACE FUNCTION public.get_character_stats(p_user_id UUID)
RETURNS TABLE (
  character_name TEXT,
  total_interactions BIGINT,
  feedback_count BIGINT,
  event_count BIGINT,
  last_interaction TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ci.character_name,
    COUNT(*) as total_interactions,
    COUNT(*) FILTER (WHERE ci.interaction_type = 'feedback') as feedback_count,
    COUNT(*) FILTER (WHERE ci.interaction_type = 'event') as event_count,
    MAX(ci.created_at) as last_interaction
  FROM public.character_interactions ci
  WHERE ci.user_id = p_user_id
  GROUP BY ci.character_name
  ORDER BY total_interactions DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

COMMENT ON FUNCTION public.get_character_stats IS 'Get character interaction statistics for a user (with qualified table names)';

-- ============================================
-- Function: Check if event is on cooldown (WITH QUALIFIED NAMES)
-- ============================================
CREATE OR REPLACE FUNCTION public.is_event_on_cooldown(
  p_user_id UUID,
  p_event_type TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.character_events_history
    WHERE user_id = p_user_id
      AND event_type = p_event_type
      AND cooldown_until > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

COMMENT ON FUNCTION public.is_event_on_cooldown IS 'Check if a specific event type is on cooldown for a user (with qualified table names)';

-- ============================================
-- Trigger Function: Auto-analyze skills on submission (WITH QUALIFIED NAMES)
-- ============================================
CREATE OR REPLACE FUNCTION public.trigger_analyze_submission_skills()
RETURNS TRIGGER AS $$
BEGIN
  -- Only analyze when submission is completed (not pending)
  IF NEW.status IN ('passed', 'failed') AND
     (OLD IS NULL OR OLD.status = 'pending') THEN
    PERFORM public.analyze_submission_skills(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

COMMENT ON FUNCTION public.trigger_analyze_submission_skills IS 'Trigger function to analyze skills after submission completion (with qualified function names)';

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  function_record RECORD;
  success_count INTEGER := 0;
  total_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Verifying functions with qualified names';
  RAISE NOTICE '===========================================';

  FOR function_record IN
    SELECT
      p.proname as function_name,
      pg_get_function_arguments(p.oid) as arguments
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'get_student_weak_areas',
        'update_skill_proficiency',
        'analyze_submission_skills',
        'get_character_stats',
        'is_event_on_cooldown',
        'trigger_analyze_submission_skills'
      )
  LOOP
    total_count := total_count + 1;
    RAISE NOTICE '✓ Function recreated: %(%)', function_record.function_name, function_record.arguments;
    success_count := success_count + 1;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  IF success_count = total_count THEN
    RAISE NOTICE 'SUCCESS: All % functions fixed', success_count;
  ELSE
    RAISE WARNING 'WARNING: % of % functions fixed', success_count, total_count;
  END IF;
  RAISE NOTICE '===========================================';
END $$;
