-- Change difficulty from enum to integer scale (1-10)

-- Add new column with integer type if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'levels' AND column_name = 'difficulty_scale'
  ) THEN
    ALTER TABLE public.levels ADD COLUMN difficulty_scale INTEGER;
  END IF;
END $$;

-- Migrate existing data
-- Check if difficulty is already an integer or text
DO $$
BEGIN
  -- Try to handle both cases: if difficulty is integer, just copy it
  -- If it's text, convert from easy/medium/hard to numeric
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'levels'
    AND column_name = 'difficulty'
    AND data_type = 'integer'
  ) THEN
    -- Difficulty is already integer, just copy it
    UPDATE public.levels
    SET difficulty_scale = difficulty
    WHERE difficulty_scale IS NULL;
  ELSE
    -- Difficulty is text, convert it
    UPDATE public.levels
    SET difficulty_scale = CASE
      WHEN difficulty = 'easy' THEN 3
      WHEN difficulty = 'medium' THEN 5
      WHEN difficulty = 'hard' THEN 8
      ELSE 5 -- default to medium if somehow null
    END
    WHERE difficulty_scale IS NULL;
  END IF;
END $$;

-- Make the new column NOT NULL only if it exists and has data
ALTER TABLE public.levels ALTER COLUMN difficulty_scale SET NOT NULL;

-- Add constraint for 1-10 scale (drop first if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'difficulty_scale_range'
    AND table_name = 'levels'
  ) THEN
    ALTER TABLE public.levels DROP CONSTRAINT difficulty_scale_range;
  END IF;
END $$;

ALTER TABLE public.levels ADD CONSTRAINT difficulty_scale_range CHECK (difficulty_scale >= 1 AND difficulty_scale <= 10);

-- Drop the old difficulty column if it still exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'levels' AND column_name = 'difficulty'
  ) THEN
    ALTER TABLE public.levels DROP COLUMN difficulty;
  END IF;
END $$;

-- Rename the new column to difficulty if it hasn't been renamed yet
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'levels' AND column_name = 'difficulty_scale'
  ) THEN
    ALTER TABLE public.levels RENAME COLUMN difficulty_scale TO difficulty;
  END IF;
END $$;

-- Drop old index if exists
DROP INDEX IF EXISTS idx_levels_difficulty;

-- Create new index
CREATE INDEX IF NOT EXISTS idx_levels_difficulty ON public.levels(difficulty);

-- Add comment
COMMENT ON COLUMN public.levels.difficulty IS 'Difficulty level on a scale of 1-10, where 1 is easiest and 10 is hardest';
