-- Add notes column to workouts (used for Strava deduplication: strava_${id})
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS notes TEXT;
