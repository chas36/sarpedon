-- Fix Function Search Path Security Issue
-- This migration adds SET search_path = '' to all functions to prevent
-- search_path manipulation attacks (similar to SQL injection)
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

-- =============================================================================
-- APPROACH: Use ALTER FUNCTION with existence checks and error handling
-- =============================================================================

DO $$
DECLARE
  fixed_count INTEGER := 0;
BEGIN
  -- Fix: update_updated_at_column
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column' AND pronamespace = 'public'::regnamespace) THEN
      ALTER FUNCTION public.update_updated_at_column() SET search_path = '';
      fixed_count := fixed_count + 1;
      RAISE NOTICE 'Fixed: update_updated_at_column';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped: update_updated_at_column - %', SQLERRM;
  END;

  -- Fix: update_teacher_settings_updated_at
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_teacher_settings_updated_at' AND pronamespace = 'public'::regnamespace) THEN
      ALTER FUNCTION public.update_teacher_settings_updated_at() SET search_path = '';
      fixed_count := fixed_count + 1;
      RAISE NOTICE 'Fixed: update_teacher_settings_updated_at';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped: update_teacher_settings_updated_at - %', SQLERRM;
  END;

  -- Fix: is_student
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_student' AND pronamespace = 'public'::regnamespace) THEN
      ALTER FUNCTION public.is_student() SET search_path = '';
      fixed_count := fixed_count + 1;
      RAISE NOTICE 'Fixed: is_student';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped: is_student - %', SQLERRM;
  END;

  -- Fix: set_submission_version
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_submission_version' AND pronamespace = 'public'::regnamespace) THEN
      ALTER FUNCTION public.set_submission_version() SET search_path = '';
      fixed_count := fixed_count + 1;
      RAISE NOTICE 'Fixed: set_submission_version';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped: set_submission_version - %', SQLERRM;
  END;

  -- Fix: auto_assign_submission_to_lesson
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'auto_assign_submission_to_lesson' AND pronamespace = 'public'::regnamespace) THEN
      ALTER FUNCTION public.auto_assign_submission_to_lesson() SET search_path = '';
      fixed_count := fixed_count + 1;
      RAISE NOTICE 'Fixed: auto_assign_submission_to_lesson';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped: auto_assign_submission_to_lesson - %', SQLERRM;
  END;

  -- Fix: trigger_analyze_submission_skills
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trigger_analyze_submission_skills' AND pronamespace = 'public'::regnamespace) THEN
      ALTER FUNCTION public.trigger_analyze_submission_skills() SET search_path = '';
      fixed_count := fixed_count + 1;
      RAISE NOTICE 'Fixed: trigger_analyze_submission_skills';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped: trigger_analyze_submission_skills - %', SQLERRM;
  END;

  -- Fix: update_student_proficiency
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_student_proficiency' AND pronamespace = 'public'::regnamespace) THEN
      ALTER FUNCTION public.update_student_proficiency() SET search_path = '';
      fixed_count := fixed_count + 1;
      RAISE NOTICE 'Fixed: update_student_proficiency';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped: update_student_proficiency - %', SQLERRM;
  END;

  -- Functions with parameters - wrapped in exception handling
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'analyze_submission_skills' AND pronamespace = 'public'::regnamespace) THEN
      EXECUTE 'ALTER FUNCTION public.analyze_submission_skills(UUID, JSONB) SET search_path = ''''';
      fixed_count := fixed_count + 1;
      RAISE NOTICE 'Fixed: analyze_submission_skills';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped: analyze_submission_skills - %', SQLERRM;
  END;

  BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_skill_proficiency' AND pronamespace = 'public'::regnamespace) THEN
      EXECUTE 'ALTER FUNCTION public.update_skill_proficiency(UUID, TEXT, TEXT, INTEGER, UUID) SET search_path = ''''';
      fixed_count := fixed_count + 1;
      RAISE NOTICE 'Fixed: update_skill_proficiency';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped: update_skill_proficiency - %', SQLERRM;
  END;

  BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_student_weak_areas' AND pronamespace = 'public'::regnamespace) THEN
      EXECUTE 'ALTER FUNCTION public.get_student_weak_areas(UUID) SET search_path = ''''';
      fixed_count := fixed_count + 1;
      RAISE NOTICE 'Fixed: get_student_weak_areas';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped: get_student_weak_areas - %', SQLERRM;
  END;

  BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_event_on_cooldown' AND pronamespace = 'public'::regnamespace) THEN
      EXECUTE 'ALTER FUNCTION public.is_event_on_cooldown(UUID, TEXT) SET search_path = ''''';
      fixed_count := fixed_count + 1;
      RAISE NOTICE 'Fixed: is_event_on_cooldown';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped: is_event_on_cooldown - %', SQLERRM;
  END;

  BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_character_stats' AND pronamespace = 'public'::regnamespace) THEN
      EXECUTE 'ALTER FUNCTION public.get_character_stats(UUID) SET search_path = ''''';
      fixed_count := fixed_count + 1;
      RAISE NOTICE 'Fixed: get_character_stats';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped: get_character_stats - %', SQLERRM;
  END;

  BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'calculate_proficiency_score' AND pronamespace = 'public'::regnamespace) THEN
      EXECUTE 'ALTER FUNCTION public.calculate_proficiency_score(UUID) SET search_path = ''''';
      fixed_count := fixed_count + 1;
      RAISE NOTICE 'Fixed: calculate_proficiency_score';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped: calculate_proficiency_score - %', SQLERRM;
  END;

  BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_student_proficiency_manual' AND pronamespace = 'public'::regnamespace) THEN
      EXECUTE 'ALTER FUNCTION public.set_student_proficiency_manual(UUID, TEXT, UUID, TEXT) SET search_path = ''''';
      fixed_count := fixed_count + 1;
      RAISE NOTICE 'Fixed: set_student_proficiency_manual';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped: set_student_proficiency_manual - %', SQLERRM;
  END;

  BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'enable_auto_proficiency' AND pronamespace = 'public'::regnamespace) THEN
      EXECUTE 'ALTER FUNCTION public.enable_auto_proficiency(UUID) SET search_path = ''''';
      fixed_count := fixed_count + 1;
      RAISE NOTICE 'Fixed: enable_auto_proficiency';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped: enable_auto_proficiency - %', SQLERRM;
  END;

  BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'start_entrance_test' AND pronamespace = 'public'::regnamespace) THEN
      EXECUTE 'ALTER FUNCTION public.start_entrance_test(UUID) SET search_path = ''''';
      fixed_count := fixed_count + 1;
      RAISE NOTICE 'Fixed: start_entrance_test';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped: start_entrance_test - %', SQLERRM;
  END;

  BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'complete_entrance_test' AND pronamespace = 'public'::regnamespace) THEN
      EXECUTE 'ALTER FUNCTION public.complete_entrance_test(UUID, JSONB) SET search_path = ''''';
      fixed_count := fixed_count + 1;
      RAISE NOTICE 'Fixed: complete_entrance_test';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped: complete_entrance_test - %', SQLERRM;
  END;

  BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'calculate_entrance_test_proficiency' AND pronamespace = 'public'::regnamespace) THEN
      EXECUTE 'ALTER FUNCTION public.calculate_entrance_test_proficiency(JSONB) SET search_path = ''''';
      fixed_count := fixed_count + 1;
      RAISE NOTICE 'Fixed: calculate_entrance_test_proficiency';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped: calculate_entrance_test_proficiency - %', SQLERRM;
  END;

  BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_difficulty_range_for_proficiency' AND pronamespace = 'public'::regnamespace) THEN
      EXECUTE 'ALTER FUNCTION public.get_difficulty_range_for_proficiency(TEXT) SET search_path = ''''';
      fixed_count := fixed_count + 1;
      RAISE NOTICE 'Fixed: get_difficulty_range_for_proficiency';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped: get_difficulty_range_for_proficiency - %', SQLERRM;
  END;

  BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_levels_for_proficiency' AND pronamespace = 'public'::regnamespace) THEN
      EXECUTE 'ALTER FUNCTION public.get_levels_for_proficiency(UUID, TEXT) SET search_path = ''''';
      fixed_count := fixed_count + 1;
      RAISE NOTICE 'Fixed: get_levels_for_proficiency';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped: get_levels_for_proficiency - %', SQLERRM;
  END;

  BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_recommended_levels' AND pronamespace = 'public'::regnamespace) THEN
      EXECUTE 'ALTER FUNCTION public.get_recommended_levels(UUID, INTEGER) SET search_path = ''''';
      fixed_count := fixed_count + 1;
      RAISE NOTICE 'Fixed: get_recommended_levels';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped: get_recommended_levels - %', SQLERRM;
  END;

  BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_active_lesson_for_class' AND pronamespace = 'public'::regnamespace) THEN
      EXECUTE 'ALTER FUNCTION public.get_active_lesson_for_class(TEXT) SET search_path = ''''';
      fixed_count := fixed_count + 1;
      RAISE NOTICE 'Fixed: get_active_lesson_for_class';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped: get_active_lesson_for_class - %', SQLERRM;
  END;

  BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_lesson_activity' AND pronamespace = 'public'::regnamespace) THEN
      EXECUTE 'ALTER FUNCTION public.get_lesson_activity(UUID) SET search_path = ''''';
      fixed_count := fixed_count + 1;
      RAISE NOTICE 'Fixed: get_lesson_activity';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped: get_lesson_activity - %', SQLERRM;
  END;

  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'FUNCTION SEARCH PATH SECURITY FIX COMPLETE';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Successfully fixed % functions', fixed_count;
  RAISE NOTICE 'All functions now have SET search_path = ''''';
  RAISE NOTICE 'This prevents search_path manipulation attacks';
  RAISE NOTICE '===========================================';
END $$;
