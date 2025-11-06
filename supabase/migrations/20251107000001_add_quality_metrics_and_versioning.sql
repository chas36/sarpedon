-- Add quality metrics and versioning to submissions table
-- This migration enhances the AI feedback system with detailed code quality metrics

-- Add quality_metrics column to store detailed code evaluation
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS quality_metrics JSONB DEFAULT NULL;

-- Add ai_feedback column to store complete AI feedback
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS ai_feedback TEXT DEFAULT NULL;

-- Add version number for code history tracking
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Create index on quality_metrics for querying
CREATE INDEX IF NOT EXISTS idx_submissions_quality_metrics
ON public.submissions USING GIN (quality_metrics);

-- Create index on version for efficient version queries
CREATE INDEX IF NOT EXISTS idx_submissions_version
ON public.submissions(user_id, level_id, version DESC);

-- Add comments
COMMENT ON COLUMN public.submissions.quality_metrics IS 'JSON object with code quality scores: {overall_score, readability, correctness, efficiency, best_practices}';
COMMENT ON COLUMN public.submissions.ai_feedback IS 'AI-generated feedback text for the student';
COMMENT ON COLUMN public.submissions.version IS 'Version number for code history (auto-incremented per user/level)';

-- Create function to auto-increment version number
CREATE OR REPLACE FUNCTION set_submission_version()
RETURNS TRIGGER AS $$
BEGIN
  -- If version is not set, calculate it based on existing submissions
  IF NEW.version IS NULL OR NEW.version = 1 THEN
    SELECT COALESCE(MAX(version), 0) + 1
    INTO NEW.version
    FROM public.submissions
    WHERE user_id = NEW.user_id AND level_id = NEW.level_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-set version on insert
DROP TRIGGER IF EXISTS set_submission_version_trigger ON public.submissions;
CREATE TRIGGER set_submission_version_trigger
  BEFORE INSERT ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION set_submission_version();

-- Add helper view for latest submissions with quality metrics
CREATE OR REPLACE VIEW latest_submissions_with_quality AS
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

COMMENT ON VIEW latest_submissions_with_quality IS 'Shows the latest version of each submission for each user/level combination';

-- Grant appropriate permissions
GRANT SELECT ON latest_submissions_with_quality TO authenticated;
