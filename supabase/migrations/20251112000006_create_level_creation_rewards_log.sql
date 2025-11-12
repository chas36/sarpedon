-- Create table to log rewards for level creation
-- This provides transparency and history of points awarded

CREATE TABLE IF NOT EXISTS public.level_creation_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id UUID NOT NULL REFERENCES public.levels(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  moderator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  points_awarded INTEGER NOT NULL,
  difficulty INTEGER NOT NULL,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure we only award once per level
  UNIQUE(level_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_level_creation_rewards_author
  ON public.level_creation_rewards(author_id);
CREATE INDEX IF NOT EXISTS idx_level_creation_rewards_level
  ON public.level_creation_rewards(level_id);
CREATE INDEX IF NOT EXISTS idx_level_creation_rewards_awarded_at
  ON public.level_creation_rewards(awarded_at DESC);

-- RLS policies
ALTER TABLE public.level_creation_rewards ENABLE ROW LEVEL SECURITY;

-- Students can view their own rewards
CREATE POLICY "Students can view own rewards"
  ON public.level_creation_rewards FOR SELECT
  USING (author_id = auth.uid());

-- Teachers can view all rewards
CREATE POLICY "Teachers can view all rewards"
  ON public.level_creation_rewards FOR SELECT
  USING (is_teacher());

-- Only system can insert (via trigger)
CREATE POLICY "Only system can insert rewards"
  ON public.level_creation_rewards FOR INSERT
  WITH CHECK (false); -- Prevent manual inserts

-- Add comment
COMMENT ON TABLE public.level_creation_rewards IS
  'Log of points awarded to student editors for approved levels';

-- Update the trigger function to log rewards
CREATE OR REPLACE FUNCTION award_points_for_level_creation()
RETURNS TRIGGER AS $$
DECLARE
  points_to_award INTEGER;
  author_current_score INTEGER;
  author_current_level TEXT;
  reward_exists BOOLEAN;
BEGIN
  -- Only award points when status changes to 'approved'
  IF NEW.moderation_status = 'approved' AND
     OLD.moderation_status != 'approved' AND
     NEW.created_by IS NOT NULL THEN

    -- Check if reward already exists (safety check)
    SELECT EXISTS(
      SELECT 1 FROM public.level_creation_rewards
      WHERE level_id = NEW.id
    ) INTO reward_exists;

    IF reward_exists THEN
      RAISE NOTICE 'Reward already exists for level %', NEW.id;
      RETURN NEW;
    END IF;

    -- Calculate points: difficulty * 10
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

    -- Log the reward
    INSERT INTO public.level_creation_rewards (
      level_id,
      author_id,
      moderator_id,
      points_awarded,
      difficulty
    ) VALUES (
      NEW.id,
      NEW.created_by,
      NEW.moderator_id,
      points_to_award,
      NEW.difficulty
    );

    RAISE NOTICE 'Awarded % points to author % for level approval (difficulty: %)',
                 points_to_award, NEW.created_by, NEW.difficulty;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate trigger (to use updated function)
DROP TRIGGER IF EXISTS trigger_award_points_for_level_creation ON public.levels;
CREATE TRIGGER trigger_award_points_for_level_creation
  AFTER UPDATE ON public.levels
  FOR EACH ROW
  EXECUTE FUNCTION award_points_for_level_creation();
