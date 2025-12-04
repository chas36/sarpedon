-- ============================================
-- DIRECT FIX: Run this in Supabase SQL Editor
-- ============================================
-- This file fixes all functions to work with search_path = ''
-- Execute this entire file in the SQL Editor at:
-- https://supabase.com/dashboard/project/uanfulofnrhcqugmxpna/sql/new

-- ============================================
-- 1. Fix analyze_submission_skills function
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

-- ============================================
-- 2. Fix update_skill_proficiency function
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

-- ============================================
-- 3. Fix get_character_stats function
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

-- ============================================
-- 4. Fix trigger function
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

-- ============================================
-- 5. Fix get_student_weak_areas function
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

-- ============================================
-- 6. Fix is_event_on_cooldown function
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

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this after executing the above to verify

DO $$
DECLARE
  func_count pg_catalog.int4;
BEGIN
  SELECT pg_catalog.count(*)::pg_catalog.int4 INTO func_count
  FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'analyze_submission_skills',
      'update_skill_proficiency',
      'get_character_stats',
      'trigger_analyze_submission_skills',
      'get_student_weak_areas',
      'is_event_on_cooldown'
    );

  RAISE NOTICE '';
  RAISE NOTICE '==========================================';
  IF func_count = 6 THEN
    RAISE NOTICE 'SUCCESS! All 6 functions are now fixed ✓';
  ELSE
    RAISE NOTICE 'Found % functions (expected 6)', func_count;
  END IF;
  RAISE NOTICE '==========================================';
  RAISE NOTICE '';
END $$;
