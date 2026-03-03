-- Create subscriptions table for Hubla integration
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  hubla_subscription_id TEXT UNIQUE NOT NULL,
  hubla_user_id TEXT NOT NULL,
  product_id TEXT,
  product_name TEXT,
  status TEXT NOT NULL DEFAULT 'inactive',
  credits INTEGER DEFAULT 0,
  billing_cycle_months INTEGER,
  payment_method TEXT,
  auto_renew BOOLEAN DEFAULT true,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own subscription" 
ON public.subscriptions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Service role can manage all subscriptions (for webhook)
CREATE POLICY "Service role can manage subscriptions" 
ON public.subscriptions 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_subscriptions_hubla_id ON public.subscriptions(hubla_subscription_id);
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();