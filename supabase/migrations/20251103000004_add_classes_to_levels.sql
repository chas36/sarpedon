-- Add allowed_classes field to levels table
-- This controls which classes can see and access each level
-- If NULL or empty array - level is available to all classes

ALTER TABLE public.levels
ADD COLUMN IF NOT EXISTS allowed_classes TEXT[] DEFAULT NULL;

-- Create index for faster filtering by class
CREATE INDEX IF NOT EXISTS idx_levels_allowed_classes
ON public.levels USING GIN (allowed_classes);

-- Comment
COMMENT ON COLUMN public.levels.allowed_classes IS
  'Array of class names that can access this level. NULL or empty = available to all classes';

-- Example update to make existing levels available to all classes
-- UPDATE public.levels SET allowed_classes = NULL WHERE allowed_classes IS NULL;
