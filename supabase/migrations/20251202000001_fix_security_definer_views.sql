-- Fix Security Definer Views
-- This migration removes SECURITY DEFINER from views to follow Supabase best practices
-- Views should use SECURITY INVOKER (default) to enforce RLS on underlying tables

-- =============================================================================
-- 1. FIX latest_submissions_with_quality VIEW
-- =============================================================================

-- Drop and recreate without SECURITY DEFINER
DROP VIEW IF EXISTS public.latest_submissions_with_quality;

CREATE VIEW public.latest_submissions_with_quality
WITH (security_invoker=true) AS
SELECT DISTINCT ON (user_id, level_id)
  id,
  user_id,
  level_id,
  code,
  status,
  quality_metrics,
  ai_feedback,
  version,
  submitted_at,
  completed_at
FROM public.submissions
ORDER BY user_id, level_id, version DESC;

COMMENT ON VIEW public.latest_submissions_with_quality IS 'Shows the latest version of each submission for each user/level combination';

-- Grant appropriate permissions
GRANT SELECT ON public.latest_submissions_with_quality TO authenticated;

-- =============================================================================
-- 2. FIX class_proficiency_stats VIEW
-- =============================================================================

-- Drop and recreate without SECURITY DEFINER
DROP VIEW IF EXISTS public.class_proficiency_stats;

CREATE VIEW public.class_proficiency_stats
WITH (security_invoker=true) AS
SELECT
  class,
  COUNT(*) FILTER (WHERE proficiency_level = 'beginner') as beginners,
  COUNT(*) FILTER (WHERE proficiency_level = 'intermediate') as intermediate,
  COUNT(*) FILTER (WHERE proficiency_level = 'advanced') as advanced,
  ROUND(AVG(proficiency_score)::NUMERIC, 1) as avg_score,
  COUNT(*) as total_students
FROM public.profiles
WHERE role = 'student' AND class IS NOT NULL
GROUP BY class;

COMMENT ON VIEW public.class_proficiency_stats IS 'Proficiency distribution by class for teacher analytics';

-- Grant permissions
GRANT SELECT ON public.class_proficiency_stats TO authenticated;

-- =============================================================================
-- 3. FIX recent_proficiency_changes VIEW
-- =============================================================================

-- Drop and recreate without SECURITY DEFINER
DROP VIEW IF EXISTS public.recent_proficiency_changes;

CREATE VIEW public.recent_proficiency_changes
WITH (security_invoker=true) AS
SELECT
  ph.user_id,
  p.first_name,
  p.last_name,
  p.class,
  ph.old_level,
  ph.new_level,
  ph.new_score,
  ph.reason,
  ph.changed_at,
  CASE
    WHEN ph.new_level = 'intermediate' AND ph.old_level = 'beginner' THEN 'Beginner → Intermediate'
    WHEN ph.new_level = 'advanced' AND ph.old_level = 'intermediate' THEN 'Intermediate → Advanced'
    WHEN ph.new_level = 'advanced' AND ph.old_level = 'beginner' THEN 'Beginner → Advanced'
    ELSE 'Level Down'
  END as progression
FROM public.proficiency_history ph
JOIN public.profiles p ON p.id = ph.user_id
WHERE ph.changed_at > NOW() - INTERVAL '7 days'
  AND ph.old_level IS NOT NULL
  AND ph.new_level != ph.old_level
ORDER BY ph.changed_at DESC;

COMMENT ON VIEW public.recent_proficiency_changes IS 'Students who changed proficiency levels in the last 7 days';

-- Grant permissions
GRANT SELECT ON public.recent_proficiency_changes TO authenticated;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Verify that views no longer have SECURITY DEFINER
DO $$
DECLARE
  view_record RECORD;
  definer_count INTEGER := 0;
BEGIN
  FOR view_record IN
    SELECT
      c.relname as view_name,
      CASE
        WHEN c.reloptions IS NULL THEN 'No options'
        ELSE c.reloptions::text
      END as options
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'v'
      AND n.nspname = 'public'
      AND c.relname IN ('latest_submissions_with_quality', 'class_proficiency_stats', 'recent_proficiency_changes')
  LOOP
    RAISE NOTICE 'View: % - Options: %', view_record.view_name, view_record.options;

    -- Check if security_invoker=true is set
    IF view_record.options LIKE '%security_invoker=true%' THEN
      RAISE NOTICE '  ✓ Using security_invoker=true (correct)';
    ELSE
      RAISE WARNING '  ✗ Not explicitly using security_invoker';
      definer_count := definer_count + 1;
    END IF;
  END LOOP;

  IF definer_count = 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'SUCCESS: All views fixed';
    RAISE NOTICE '===========================================';
  ELSE
    RAISE WARNING 'Some views may still have issues';
  END IF;
END $$;
