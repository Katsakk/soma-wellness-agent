
ALTER TABLE public.goals 
  ADD COLUMN IF NOT EXISTS gender text DEFAULT 'male',
  ADD COLUMN IF NOT EXISTS age integer DEFAULT 30;
