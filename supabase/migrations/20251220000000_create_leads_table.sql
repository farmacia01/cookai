-- Create leads table
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS leads_email_idx ON public.leads(email);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON public.leads(created_at DESC);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role to insert (for backend operations)
CREATE POLICY "Service role can insert leads" ON public.leads
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy: Allow authenticated users to insert their own leads
CREATE POLICY "Users can insert leads" ON public.leads
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Allow service role to read all leads (for admin operations)
CREATE POLICY "Service role can read all leads" ON public.leads
  FOR SELECT
  TO service_role
  USING (true);

-- Policy: Allow anon to insert (for signup without auth)
CREATE POLICY "Anon can insert leads" ON public.leads
  FOR INSERT
  TO anon
  WITH CHECK (true);

