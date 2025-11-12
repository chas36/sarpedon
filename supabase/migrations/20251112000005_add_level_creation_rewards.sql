-- Add rewards system for level creation by student editors
-- When a teacher approves a level, the author gets points based on difficulty

-- Function to award points to student editor when their level is approved
CREATE OR REPLACE FUNCTION award_points_for_level_creation()
RETURNS TRIGGER AS $$
DECLARE
  points_to_award INTEGER;
  author_current_score INTEGER;
  author_current_level TEXT;
BEGIN
  -- Only award points when status changes to 'approved'
  IF NEW.moderation_status = 'approved' AND
     OLD.moderation_status != 'approved' AND
     NEW.created_by IS NOT NULL THEN

    -- Calculate points: difficulty * 10
    -- difficulty ranges from 1 to 10, so points range from 10 to 100
    points_to_award := NEW.difficulty * 10;

    -- Get current proficiency score
    SELECT proficiency_score, proficiency_level
    INTO author_current_score, author_current_level
    FROM public.profiles
    WHERE id = NEW.created_by;

    -- Update author's proficiency score
    UPDATE public.profiles
    SET
      proficiency_score = COALESCE(proficiency_score, 0) + points_to_award,
      proficiency_last_assessed = NOW()
    WHERE id = NEW.created_by;

    -- Log this event (optional, for transparency)
    -- You can create a separate log table if needed

    RAISE NOTICE 'Awarded % points to author % for level approval (difficulty: %)',
                 points_to_award, NEW.created_by, NEW.difficulty;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on levels table
DROP TRIGGER IF EXISTS trigger_award_points_for_level_creation ON public.levels;
CREATE TRIGGER trigger_award_points_for_level_creation
  AFTER UPDATE ON public.levels
  FOR EACH ROW
  EXECUTE FUNCTION award_points_for_level_creation();

-- Add comment
COMMENT ON FUNCTION award_points_for_level_creation() IS
  'Awards points to student editors when their levels are approved. Points = difficulty * 10';
