-- ============================================
-- FIX: analyze_submission_skills function
-- ============================================
-- Исправление: FOREACH не работает с JSONB, используем FOR с jsonb_array_elements_text
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

COMMENT ON FUNCTION analyze_submission_skills IS 'Analyzes submission and updates related skills';
