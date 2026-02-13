-- ============================================
-- SAELO SEED DATA
-- Run this AFTER schema migration AND after your first GitHub login.
-- Replace YOUR_USER_UUID_HERE with your actual user ID from the profiles table.
-- (Find it in Supabase Dashboard > Table Editor > profiles)
-- ============================================

DO $$
DECLARE
  uid UUID := 'YOUR_USER_UUID_HERE';
  ws1 UUID;
  ws2 UUID;
  ws3 UUID;
  ws4 UUID;
BEGIN

-- Emails
INSERT INTO public.emails (user_id, account, sender, subject, preview, timestamp, is_read) VALUES
  (uid, 'work', 'Sarah Chen', 'Q3 Budget Review Meeting', 'Hi team, please review the attached Q3 budget spreadsheet before our meeting on Thursday.', '10:32 AM', false),
  (uid, 'personal', 'Mom', 'Thanksgiving Plans', 'Hi sweetie! Just wanted to check if you and the family are still planning to come up this year.', '9:15 AM', true),
  (uid, 'invoices', 'AWS Billing', 'Your January Invoice is Ready', 'Your AWS invoice for the period of January 1-31 is now available. Total charges: $142.87.', 'Yesterday', false),
  (uid, 'work', 'David Park', 'Re: API Design Proposal', 'I reviewed the endpoints you proposed and have some concerns about the authentication flow.', 'Yesterday', true),
  (uid, 'personal', 'Netflix', 'New arrivals this week', 'Check out the latest movies and shows added to Netflix this week including the highly anticipated series.', 'Jan 30', true),
  (uid, 'work', 'HR Department', 'Important: Benefits Enrollment Deadline', 'This is a reminder that the open enrollment period for employee benefits closes on February 15th.', 'Jan 30', false),
  (uid, 'invoices', 'Stripe', 'Payment Receipt - $49.00', 'Payment of $49.00 USD was successfully processed for your subscription to Pro Plan.', 'Jan 29', true),
  (uid, 'personal', 'Alex Rivera', 'Weekend hiking trip?', 'Hey! A few of us are planning to hit the trails this Saturday morning. Thinking about the Ridge Loop.', 'Jan 29', false),
  (uid, 'work', 'Jira', '[PROJ-412] Bug: Login timeout on slow connections', 'A new issue has been assigned to you. Priority: High. Reporter: QA Team.', 'Jan 28', true),
  (uid, 'invoices', 'Google Workspace', 'Your monthly statement', 'Your Google Workspace Business Standard billing statement for January is now available.', 'Jan 28', true);

-- Calendar Events
INSERT INTO public.calendar_events (user_id, title, start_hour, time, duration, category, account, color, date, location, is_all_day) VALUES
  (uid, 'Product Sync', 10, '10:00 AM', '1h', 'Work', 'Google', '#4285F4', '2026-02-02', 'Meeting Room B', false),
  (uid, 'Gym Session', 12.5, '12:30 PM', '1.5h', 'Personal', 'Local', '#34A853', '2026-02-02', 'Equinox', false),
  (uid, 'Family Dinner', 18.5, '6:30 PM', '2h', 'Personal', 'Outlook', '#AF52DE', '2026-02-03', 'Mama Ricotta''s', false),
  (uid, 'Board Meeting', 9, '9:00 AM', '3h', 'Work', 'Outlook', '#4285F4', '2026-02-04', 'Executive Suite', false),
  (uid, 'Groundhog Day', NULL, NULL, NULL, NULL, NULL, '#70757a', '2026-02-02', NULL, true);

-- Contacts
INSERT INTO public.contacts (user_id, name, photo, where_met, when_met, why, status, group_name, role, company, phone) VALUES
  (uid, 'Sarah Jenkins', 'https://i.pravatar.cc/150?u=sarah', 'TechCrunch Disrupt', 'Feb 02, 2026', 'Discussing AI infrastructure for the new platform', 'New Connection', 'Partners', 'Head of Infrastructure', 'Nexus AI', '+1 (555) 123-4567'),
  (uid, 'Marcus Chen', 'https://i.pravatar.cc/150?u=marcus', 'Blue Bottle Coffee', 'Jan 28, 2026', 'Quarterly review of vendor contracts', 'Followed-Up', 'Vendors', 'Account Manager', 'SupplyChain Pro', '+1 (555) 987-6543'),
  (uid, 'Elena Rodriguez', 'https://i.pravatar.cc/150?u=elena', 'Direct Message / LinkedIn', 'Yesterday', 'Requested portfolio for freelance design work', 'Reached Out', 'Colleagues', 'Senior UX Designer', 'Creative Studio', '+1 (555) 456-7890');

-- Workspaces (capture IDs for child tables)
INSERT INTO public.workspaces (id, user_id, title, document_count, last_modified, type, color, image)
VALUES (gen_random_uuid(), uid, 'Client: TechCorp', 12, '2h ago', 'Business', '#4285F4', 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=400&q=80')
RETURNING id INTO ws1;

INSERT INTO public.workspaces (id, user_id, title, document_count, last_modified, type, color, image)
VALUES (gen_random_uuid(), uid, 'Home Renovation', 5, 'Yesterday', 'Personal', '#34A853', 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80')
RETURNING id INTO ws2;

INSERT INTO public.workspaces (id, user_id, title, document_count, last_modified, type, color, image)
VALUES (gen_random_uuid(), uid, 'Tax Records 2025', 8, 'Feb 01, 2026', 'Admin', '#FBBC05', 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=400&q=80')
RETURNING id INTO ws3;

INSERT INTO public.workspaces (id, user_id, title, document_count, last_modified, type, color, image)
VALUES (gen_random_uuid(), uid, 'Freelance Portfolio', 15, 'Jan 28, 2026', 'Creative', '#AF52DE', 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=400&q=80')
RETURNING id INTO ws4;

-- Project Todos (for TechCorp workspace)
INSERT INTO public.project_todos (project_id, task, completed) VALUES
  (ws1, 'Review updated service agreement', false),
  (ws1, 'Follow up with stakeholders on Q1 goals', true),
  (ws1, 'Verify tax compliance documents', false);

-- Project Files (for TechCorp workspace)
INSERT INTO public.project_files (project_id, file_name, file_size, last_edited) VALUES
  (ws1, 'Proposal_v1.pdf', '2.4 MB', '2d ago'),
  (ws1, 'Proposal_v2.pdf', '2.4 MB', '2d ago');

-- Transactions
INSERT INTO public.transactions (user_id, date, store, amount, category, status, summary) VALUES
  (uid, 'Feb 02', 'Amazon Web Services', -450.00, 'Business Expenses', 'Paid', 'Cloud hosting monthly subscription'),
  (uid, 'Feb 02', 'Starbucks', -6.50, 'Personal Expenses', 'Pending', 'Client coffee meeting'),
  (uid, 'Feb 01', 'Stripe Payout', 2500.00, 'Income', 'Received', 'Weekly platform revenue'),
  (uid, 'Jan 31', 'Adobe Creative Cloud', -52.99, 'Business Expenses', 'Paid', 'Design software tools'),
  (uid, 'Jan 30', 'Whole Foods', -120.40, 'Personal Expenses', 'Paid', 'Grocery restock'),
  (uid, 'Jan 28', 'Client: TechCorp', 1500.00, 'Income', 'Received', 'Project Milestone 2'),
  (uid, 'Jan 27', 'Tax Payment Q1', -2100.00, 'Business Expenses', 'Paid', 'Estimated quarterly tax'),
  (uid, 'Jan 25', 'Blue Bottle Coffee', -5.75, 'Personal Expenses', 'Paid', 'Coffee'),
  (uid, 'Jan 22', 'WeWork Office', -600.00, 'Business Expenses', 'Paid', 'Monthly hot desk rental'),
  (uid, 'Jan 20', 'Invoice #402 (Unpaid)', -320.00, 'Business Expenses', 'Due', 'Pending contractor payment');

END $$;
