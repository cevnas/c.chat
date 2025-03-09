-- Add missing columns to user_settings table
ALTER TABLE IF EXISTS public.user_settings 
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'english',
ADD COLUMN IF NOT EXISTS api_key TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS sound_effects BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS font_size TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS notifications BOOLEAN DEFAULT true;

-- Update any existing rows to have default values
UPDATE public.user_settings 
SET language = 'english' WHERE language IS NULL;

UPDATE public.user_settings 
SET api_key = '' WHERE api_key IS NULL;

UPDATE public.user_settings 
SET sound_effects = true WHERE sound_effects IS NULL;

UPDATE public.user_settings 
SET font_size = 'medium' WHERE font_size IS NULL;

UPDATE public.user_settings 
SET notifications = true WHERE notifications IS NULL; 