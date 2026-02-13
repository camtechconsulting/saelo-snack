-- ============================================
-- EMAIL SCHEMA MIGRATION — Phase 1
-- Run in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ============================================
-- Problem: google-sync writes wrong columns. Emails table needs:
-- 1. external_id for dedup (Gmail/Outlook message IDs)
-- 2. provider column (gmail/outlook) instead of account CHECK
-- 3. label column for Saelo's AI-assigned categories
-- 4. provider_account_email to track which connected account this came from
-- ============================================

-- Step 1: Drop the old CHECK constraint on account
ALTER TABLE public.emails DROP CONSTRAINT IF EXISTS emails_account_check;

-- Step 2: Add new columns
ALTER TABLE public.emails
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS label TEXT,
  ADD COLUMN IF NOT EXISTS provider_account_email TEXT;

-- Step 3: Add CHECK constraints for new columns
ALTER TABLE public.emails
  ADD CONSTRAINT emails_provider_check CHECK (provider IN ('gmail', 'outlook'));

ALTER TABLE public.emails
  ADD CONSTRAINT emails_label_check CHECK (label IN ('Work', 'Personal', 'School', 'Business', 'Invoices', 'Newsletters', 'Uncategorized'));

-- Step 4: Make provider NOT NULL (after backfilling existing rows if any)
-- If there are existing rows, backfill first:
UPDATE public.emails SET provider = 'gmail' WHERE provider IS NULL AND account IS NOT NULL;
UPDATE public.emails SET label = 'Uncategorized' WHERE label IS NULL;

-- Now make provider NOT NULL
ALTER TABLE public.emails ALTER COLUMN provider SET NOT NULL;

-- Step 5: Drop the old account column (replaced by provider + label)
ALTER TABLE public.emails DROP COLUMN IF EXISTS account;

-- Step 6: Make timestamp a TIMESTAMPTZ instead of TEXT for proper sorting
ALTER TABLE public.emails ALTER COLUMN timestamp TYPE TIMESTAMPTZ USING timestamp::TIMESTAMPTZ;

-- Step 7: Add unique constraint for dedup (provider + external_id per user)
ALTER TABLE public.emails
  ADD CONSTRAINT emails_user_provider_external_unique UNIQUE (user_id, provider, external_id);

-- Step 8: Add index for fast inbox queries
CREATE INDEX IF NOT EXISTS idx_emails_user_provider ON public.emails (user_id, provider);
CREATE INDEX IF NOT EXISTS idx_emails_user_timestamp ON public.emails (user_id, timestamp DESC);

-- ============================================
-- CALENDAR EVENTS SCHEMA FIX
-- ============================================
-- google-sync writes google_event_id which doesn't exist

ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS provider TEXT;

ALTER TABLE public.calendar_events
  ADD CONSTRAINT calendar_events_provider_check CHECK (provider IN ('google', 'outlook'));

-- Add unique constraint for dedup
ALTER TABLE public.calendar_events
  ADD CONSTRAINT calendar_events_user_provider_external_unique UNIQUE (user_id, provider, external_id);

CREATE INDEX IF NOT EXISTS idx_calendar_events_user_provider ON public.calendar_events (user_id, provider);
