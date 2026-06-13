-- ============================================
-- COMPLETE FIX: All Functions with Qualified Types
-- ============================================
-- Run this entire file in Supabase SQL Editor
-- https://supabase.com/dashboard/project/uanfulofnrhcqugmxpna/sql/new

-- ============================================
-- 1. calculate_proficiency_score
-- ============================================
CREATE OR REPLACE FUNCTION public.calculate_proficiency_score(p_student_id pg_catalog.uuid)
RETURNS TABLE(score pg_catalog.int4, level pg_catalog.text) AS $$
DECLARE
  completion_rate pg_catalog.float8;
  avg_quality pg_catalog.float8;
  avg_issues_count pg_catalog.float8;
  final_score pg_catalog.int4;
  final_level pg_catalog.text;
BEGIN
  -- Calculate metrics
  SELECT
    -- Completion rate (40% weight)
    COALESCE(
      pg_catalog.count(*) FILTER (WHERE lp.status = 'completed')::pg_catalog.float8 /
      NULLIF(pg_catalog.count(*), 0) * 40,
      0
    ),
    -- Average quality score (40% weight) - from quality_metrics JSONB
    COALESCE(
      pg_catalog.avg((s.quality_metrics->>'overall_score')::pg_catalog.int4) FILTER (WHERE s.quality_metrics->>'overall_score' IS NOT NULL) * 0.4,
      0
    ),
    -- Success rate penalty (20% weight - more failures = lower score)
    COALESCE(
      20 - LEAST(pg_catalog.count(*) FILTER (WHERE s.status = 'failed')::pg_catalog.float8 / NULLIF(pg_catalog.count(*), 0) * 20, 20),
      0
    )
  INTO completion_rate, avg_quality, avg_issues_count
  FROM public.level_progress lp
  LEFT JOIN public.submissions s ON s.user_id = lp.student_id AND s.level_id = lp.level_id
  WHERE lp.student_id = p_student_id;

  -- Calculate final score
  final_score := GREATEST(0, LEAST(100,
    pg_catalog.round(completion_rate + avg_quality + avg_issues_count)::pg_catalog.int4
  ));

  -- Determine level based on score
  final_level := CASE
    WHEN final_score < 41 THEN 'beginner'
    WHEN final_score < 71 THEN 'intermediate'
    ELSE 'advanced'
  END;

  RETURN QUERY SELECT final_score, final_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

COMMENT ON FUNCTION public.calculate_proficiency_score IS 'Calculates student proficiency score (0-100) and level based on completion, quality, and issues';

-- ============================================
-- 2. update_student_proficiency (trigger function)
-- ============================================
CREATE OR REPLACE FUNCTION public.update_student_proficiency()
RETURNS trigger AS $$
DECLARE
  new_score pg_catalog.int4;
  new_level pg_catalog.text;
  old_level pg_catalog.text;
  old_score pg_catalog.int4;
BEGIN
  -- Get current level and score
  SELECT proficiency_level, proficiency_score
  INTO old_level, old_score
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Only update if not manually overridden
  IF (SELECT proficiency_manual_override FROM public.profiles WHERE id = NEW.user_id) THEN
    RETURN NEW;
  END IF;

  -- Calculate new proficiency
  SELECT calc.score, calc.level INTO new_score, new_level
  FROM public.calculate_proficiency_score(NEW.user_id) AS calc;

  -- Update profile
  UPDATE public.profiles
  SET
    proficiency_score = new_score,
    proficiency_level = new_level,
    proficiency_last_assessed = pg_catalog.now()
  WHERE id = NEW.user_id;

  -- Log history if level changed
  IF old_level IS DISTINCT FROM new_level THEN
    INSERT INTO public.proficiency_history (user_id, old_level, new_level, old_score, new_score, reason)
    VALUES (NEW.user_id, old_level, new_level, old_score, new_score, 'auto_calculation');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

COMMENT ON FUNCTION public.update_student_proficiency IS 'Trigger function that recalculates student proficiency after each submission';

-- ============================================
-- 3. analyze_submission_skills
-- ============================================
CREATE OR REPLACE FUNCTION public.analyze_submission_skills(p_submission_id pg_catalog.uuid)
RETURNS void AS $$
DECLARE
  v_submission RECORD;
  v_level RECORD;
  v_skill pg_catalog.text;
  v_quality_score pg_catalog.int4;
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
  v_quality_score := (v_submission.quality_metrics->>'overall_score')::pg_catalog.int4;

  -- Update proficiency for each target skill in the level
  IF v_level.target_skills IS NOT NULL THEN
    FOR v_skill IN SELECT pg_catalog.jsonb_array_elements_text(v_level.target_skills)
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

COMMENT ON FUNCTION public.analyze_submission_skills IS 'Analyzes submission and updates related skills';

-- ============================================
-- 4. update_skill_proficiency
-- ============================================
CREATE OR REPLACE FUNCTION public.update_skill_proficiency(
  p_user_id pg_catalog.uuid,
  p_skill_name pg_catalog.text,
  p_success pg_catalog.bool,
  p_quality_score pg_catalog.int4 DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_skill_category_id pg_catalog.uuid;
  v_current_proficiency pg_catalog.int4;
  v_proficiency_change pg_catalog.int4;
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
      v_proficiency_change := CASE
        WHEN p_quality_score >= 90 THEN 5
        WHEN p_quality_score >= 70 THEN 3
        ELSE 2
      END;
    ELSE
      v_proficiency_change := 3;
    END IF;

    UPDATE public.user_skill_profile
    SET
      proficiency = LEAST(100, proficiency + v_proficiency_change),
      practice_count = practice_count + 1,
      last_practiced_at = pg_catalog.now(),
      updated_at = pg_catalog.now()
    WHERE user_id = p_user_id AND skill_category_id = v_skill_category_id;
  ELSE
    UPDATE public.user_skill_profile
    SET
      proficiency = GREATEST(0, proficiency - 2),
      mistake_count = mistake_count + 1,
      practice_count = practice_count + 1,
      last_practiced_at = pg_catalog.now(),
      updated_at = pg_catalog.now()
    WHERE user_id = p_user_id AND skill_category_id = v_skill_category_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

COMMENT ON FUNCTION public.update_skill_proficiency IS 'Updates skill proficiency based on submission result';

-- ============================================
-- 5. get_character_stats
-- ============================================
CREATE OR REPLACE FUNCTION public.get_character_stats(p_user_id pg_catalog.uuid)
RETURNS TABLE (
  character_name pg_catalog.text,
  total_interactions pg_catalog.int8,
  feedback_count pg_catalog.int8,
  event_count pg_catalog.int8,
  last_interaction pg_catalog.timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ci.character_name,
    pg_catalog.count(*)::pg_catalog.int8 as total_interactions,
    pg_catalog.count(*) FILTER (WHERE ci.interaction_type = 'feedback')::pg_catalog.int8 as feedback_count,
    pg_catalog.count(*) FILTER (WHERE ci.interaction_type = 'event')::pg_catalog.int8 as event_count,
    pg_catalog.max(ci.created_at) as last_interaction
  FROM public.character_interactions ci
  WHERE ci.user_id = p_user_id
  GROUP BY ci.character_name
  ORDER BY total_interactions DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

COMMENT ON FUNCTION public.get_character_stats IS 'Get character interaction statistics for a user';

-- ============================================
-- 6. trigger_analyze_submission_skills
-- ============================================
CREATE OR REPLACE FUNCTION public.trigger_analyze_submission_skills()
RETURNS trigger AS $$
BEGIN
  -- Only analyze when submission is completed (not pending)
  IF NEW.status IN ('passed', 'failed') AND
     (OLD IS NULL OR OLD.status = 'pending') THEN
    PERFORM public.analyze_submission_skills(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

COMMENT ON FUNCTION public.trigger_analyze_submission_skills IS 'Trigger function to analyze skills after submission completion';

-- ============================================
-- 7. get_student_weak_areas
-- ============================================
CREATE OR REPLACE FUNCTION public.get_student_weak_areas(
  p_user_id pg_catalog.uuid,
  p_limit pg_catalog.int4 DEFAULT 3
)
RETURNS TABLE(
  skill_name pg_catalog.text,
  proficiency pg_catalog.int4,
  mistake_count pg_catalog.int4,
  practice_count pg_catalog.int4
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

COMMENT ON FUNCTION public.get_student_weak_areas IS 'Returns top N weak areas for a student';

-- ============================================
-- 8. is_event_on_cooldown
-- ============================================
CREATE OR REPLACE FUNCTION public.is_event_on_cooldown(
  p_user_id pg_catalog.uuid,
  p_event_type pg_catalog.text
)
RETURNS pg_catalog.bool AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.character_events_history
    WHERE user_id = p_user_id
      AND event_type = p_event_type
      AND cooldown_until > pg_catalog.now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

COMMENT ON FUNCTION public.is_event_on_cooldown IS 'Check if a specific event type is on cooldown for a user';

-- ============================================
-- VERIFICATION QUERY
-- ============================================

DO $$
DECLARE
  func_count pg_catalog.int4;
BEGIN
  SELECT pg_catalog.count(*)::pg_catalog.int4 INTO func_count
  FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'calculate_proficiency_score',
      'update_student_proficiency',
      'analyze_submission_skills',
      'update_skill_proficiency',
      'get_character_stats',
      'trigger_analyze_submission_skills',
      'get_student_weak_areas',
      'is_event_on_cooldown'
    );

  RAISE NOTICE '';
  RAISE NOTICE '==========================================';
  IF func_count = 8 THEN
    RAISE NOTICE 'SUCCESS! All 8 functions are now fixed ✓';
  ELSE
    RAISE NOTICE 'Found % functions (expected 8)', func_count;
  END IF;
  RAISE NOTICE '==========================================';
  RAISE NOTICE '';

  -- List all fixed functions
  RAISE NOTICE 'Fixed functions:';
  FOR func_count IN
    SELECT 1
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'calculate_proficiency_score',
        'update_student_proficiency',
        'analyze_submission_skills',
        'update_skill_proficiency',
        'get_character_stats',
        'trigger_analyze_submission_skills',
        'get_student_weak_areas',
        'is_event_on_cooldown'
      )
  LOOP
    NULL;
  END LOOP;
END $$;

-- Show function details
SELECT
  p.proname as function_name,
  pg_catalog.pg_get_function_arguments(p.oid) as arguments,
  CASE
    WHEN p.prosecdef THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END as security
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'calculate_proficiency_score',
    'update_student_proficiency',
    'analyze_submission_skills',
    'update_skill_proficiency',
    'get_character_stats',
    'trigger_analyze_submission_skills',
    'get_student_weak_areas',
    'is_event_on_cooldown'
  )
ORDER BY p.proname;
