-- Create profiles table for storing user data and Threads credentials
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  threads_app_id TEXT,
  threads_access_token TEXT,
  threads_app_secret TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create post templates table
CREATE TABLE public.post_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  comment TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create scheduled posts table
CREATE TABLE public.scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  template_id UUID REFERENCES public.post_templates(id) ON DELETE CASCADE,
  generated_content TEXT,
  interval_value INTEGER NOT NULL,
  interval_unit TEXT NOT NULL CHECK (interval_unit IN ('minutes', 'hours', 'days')),
  next_post_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'error')),
  last_posted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create post history table
CREATE TABLE public.post_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  scheduled_post_id UUID REFERENCES public.scheduled_posts(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  posted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  threads_post_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  error_message TEXT
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for post_templates
CREATE POLICY "Users can view their own templates"
  ON public.post_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own templates"
  ON public.post_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON public.post_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON public.post_templates FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for scheduled_posts
CREATE POLICY "Users can view their own scheduled posts"
  ON public.scheduled_posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scheduled posts"
  ON public.scheduled_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled posts"
  ON public.scheduled_posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled posts"
  ON public.scheduled_posts FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for post_history
CREATE POLICY "Users can view their own post history"
  ON public.post_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own post history"
  ON public.post_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_post_templates
  BEFORE UPDATE ON public.post_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_scheduled_posts
  BEFORE UPDATE ON public.scheduled_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();