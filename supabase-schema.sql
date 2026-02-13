-- ============================================
-- SAELO DATABASE SCHEMA
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ============================================

-- 1. PROFILES (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  used_space_gb NUMERIC(5,2) DEFAULT 0,
  ai_analyses_used INTEGER DEFAULT 0,
  ai_analyses_limit INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. EMAILS
CREATE TABLE public.emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  external_id TEXT,
  provider TEXT NOT NULL CHECK (provider IN ('gmail', 'outlook')),
  label TEXT CHECK (label IN ('Work', 'Personal', 'School', 'Business', 'Invoices', 'Newsletters', 'Uncategorized')),
  provider_account_email TEXT,
  sender TEXT NOT NULL,
  subject TEXT NOT NULL,
  preview TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT emails_user_provider_external_unique UNIQUE (user_id, provider, external_id)
);

-- 3. CALENDAR_EVENTS
CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  external_id TEXT,
  provider TEXT CHECK (provider IN ('google', 'outlook')),
  title TEXT NOT NULL,
  start_hour NUMERIC(4,2),
  time TEXT,
  duration TEXT,
  category TEXT CHECK (category IN ('Work', 'Personal')),
  account TEXT,
  color TEXT DEFAULT '#4285F4',
  date DATE NOT NULL,
  location TEXT,
  is_all_day BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT calendar_events_user_provider_external_unique UNIQUE (user_id, provider, external_id)
);

-- 4. CONTACTS
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  photo TEXT,
  where_met TEXT,
  when_met TEXT,
  why TEXT,
  status TEXT CHECK (status IN ('New Connection', 'Followed-Up', 'Reached Out')),
  group_name TEXT,
  role TEXT,
  company TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. WORKSPACES
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  document_count INTEGER DEFAULT 0,
  last_modified TEXT,
  type TEXT CHECK (type IN ('Business', 'Personal', 'Admin', 'Creative')),
  color TEXT DEFAULT '#4285F4',
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TRANSACTIONS
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date TEXT NOT NULL,
  store TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  category TEXT CHECK (category IN ('Income', 'Personal Expenses', 'Business Expenses')),
  status TEXT CHECK (status IN ('Paid', 'Pending', 'Received', 'Due')),
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. PROJECT_TODOS
CREATE TABLE public.project_todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  task TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. PROJECT_FILES
CREATE TABLE public.project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_size TEXT,
  last_edited TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. DRAFTS
CREATE TABLE public.drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT,
  target_account TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_emails_user_provider ON public.emails (user_id, provider);
CREATE INDEX IF NOT EXISTS idx_emails_user_timestamp ON public.emails (user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_provider ON public.calendar_events (user_id, provider);

-- ============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Emails
CREATE POLICY "Users can view own emails" ON public.emails
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own emails" ON public.emails
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own emails" ON public.emails
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own emails" ON public.emails
  FOR DELETE USING (auth.uid() = user_id);

-- Calendar Events
CREATE POLICY "Users can view own events" ON public.calendar_events
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own events" ON public.calendar_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own events" ON public.calendar_events
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own events" ON public.calendar_events
  FOR DELETE USING (auth.uid() = user_id);

-- Contacts
CREATE POLICY "Users can view own contacts" ON public.contacts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contacts" ON public.contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contacts" ON public.contacts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own contacts" ON public.contacts
  FOR DELETE USING (auth.uid() = user_id);

-- Workspaces
CREATE POLICY "Users can view own workspaces" ON public.workspaces
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own workspaces" ON public.workspaces
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own workspaces" ON public.workspaces
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own workspaces" ON public.workspaces
  FOR DELETE USING (auth.uid() = user_id);

-- Transactions
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transactions" ON public.transactions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own transactions" ON public.transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Project Todos (access via workspace ownership)
CREATE POLICY "Users can view own project todos" ON public.project_todos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.workspaces WHERE id = project_todos.project_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can insert own project todos" ON public.project_todos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.workspaces WHERE id = project_todos.project_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can update own project todos" ON public.project_todos
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.workspaces WHERE id = project_todos.project_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can delete own project todos" ON public.project_todos
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.workspaces WHERE id = project_todos.project_id AND user_id = auth.uid())
  );

-- Project Files (access via workspace ownership)
CREATE POLICY "Users can view own project files" ON public.project_files
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.workspaces WHERE id = project_files.project_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can insert own project files" ON public.project_files
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.workspaces WHERE id = project_files.project_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can update own project files" ON public.project_files
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.workspaces WHERE id = project_files.project_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can delete own project files" ON public.project_files
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.workspaces WHERE id = project_files.project_id AND user_id = auth.uid())
  );

-- Drafts
CREATE POLICY "Users can view own drafts" ON public.drafts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own drafts" ON public.drafts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own drafts" ON public.drafts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own drafts" ON public.drafts
  FOR DELETE USING (auth.uid() = user_id);
