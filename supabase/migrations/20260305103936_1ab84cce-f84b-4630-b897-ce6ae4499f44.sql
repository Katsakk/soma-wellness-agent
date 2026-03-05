
ALTER TABLE public.goals 
  ADD COLUMN IF NOT EXISTS current_weight numeric,
  ADD COLUMN IF NOT EXISTS height numeric,
  ADD COLUMN IF NOT EXISTS exercise_days_per_week integer DEFAULT 3;
