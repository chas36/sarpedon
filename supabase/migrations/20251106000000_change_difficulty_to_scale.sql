-- Change difficulty from enum to integer scale (1-10)

-- First, convert existing difficulties to numeric scale:
-- easy -> 3
-- medium -> 5
-- hard -> 8

-- Add new column with integer type
ALTER TABLE public.levels ADD COLUMN difficulty_scale INTEGER;

-- Migrate existing data
UPDATE public.levels
SET difficulty_scale = CASE
  WHEN difficulty = 'easy' THEN 3
  WHEN difficulty = 'medium' THEN 5
  WHEN difficulty = 'hard' THEN 8
  ELSE 5 -- default to medium if somehow null
END;

-- Make the new column NOT NULL
ALTER TABLE public.levels ALTER COLUMN difficulty_scale SET NOT NULL;

-- Add constraint for 1-10 scale
ALTER TABLE public.levels ADD CONSTRAINT difficulty_scale_range CHECK (difficulty_scale >= 1 AND difficulty_scale <= 10);

-- Drop the old difficulty column
ALTER TABLE public.levels DROP COLUMN difficulty;

-- Rename the new column to difficulty
ALTER TABLE public.levels RENAME COLUMN difficulty_scale TO difficulty;

-- Drop old index if exists
DROP INDEX IF EXISTS idx_levels_difficulty;

-- Create new index
CREATE INDEX idx_levels_difficulty ON public.levels(difficulty);

-- Add comment
COMMENT ON COLUMN public.levels.difficulty IS 'Difficulty level on a scale of 1-10, where 1 is easiest and 10 is hardest';
