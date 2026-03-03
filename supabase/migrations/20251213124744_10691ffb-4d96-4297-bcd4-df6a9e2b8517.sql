-- Add nutritional goals to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS daily_calories_goal integer DEFAULT 2000,
ADD COLUMN IF NOT EXISTS daily_protein_goal integer DEFAULT 150,
ADD COLUMN IF NOT EXISTS daily_carbs_goal integer DEFAULT 250,
ADD COLUMN IF NOT EXISTS daily_fat_goal integer DEFAULT 65;

-- Add favorites and ratings to recipes table
ALTER TABLE public.recipes 
ADD COLUMN IF NOT EXISTS is_favorite boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS rating integer CHECK (rating >= 1 AND rating <= 5);

-- Create policy for updating recipes (for favorites and ratings)
CREATE POLICY "Users can update their own recipes" 
ON public.recipes 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);