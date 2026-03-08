-- Fix goals_goal_type_check to include 'fat_burn'
ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_goal_type_check;
ALTER TABLE goals ADD CONSTRAINT goals_goal_type_check
  CHECK (goal_type IN ('weight_loss', 'muscle_gain', 'maintenance', 'fat_burn'));

-- Add fiber column to meals for AI estimation
ALTER TABLE meals ADD COLUMN IF NOT EXISTS fiber numeric;
