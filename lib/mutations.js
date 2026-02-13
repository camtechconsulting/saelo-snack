import { supabase } from './supabase';

// -- Sanitization helpers --
const str = (val, maxLen = 500) => (typeof val === 'string' ? val.trim().slice(0, maxLen) : '');
const safeAmount = (val) => {
  const n = Number(val);
  if (isNaN(n)) return 0;
  return Math.min(Math.max(n, -999999999), 999999999);
};
const allowedValues = (val, allowed, fallback) => allowed.includes(val) ? val : fallback;

export async function insertTransaction(userId, fields) {
  const category = allowedValues(fields.category, ['Income', 'Personal Expenses', 'Business Expenses'], 'Personal Expenses');
  let amount = safeAmount(fields.amount);
  // Auto-negate: expenses should be stored as negative, income as positive
  if (category !== 'Income' && amount > 0) amount = -amount;
  if (category === 'Income' && amount < 0) amount = -amount;

  return supabase.from('transactions').insert({
    user_id: userId,
    date: str(fields.date, 50),
    store: str(fields.store, 200),
    amount,
    category,
    status: allowedValues(fields.status, ['Paid', 'Pending', 'Received', 'Due'], 'Pending'),
    summary: fields.summary ? str(fields.summary, 1000) : null,
  }).select().single();
}

export async function insertContact(userId, fields) {
  return supabase.from('contacts').insert({
    user_id: userId,
    name: str(fields.name, 200),
    role: fields.role ? str(fields.role, 200) : null,
    company: fields.company ? str(fields.company, 200) : null,
    phone: fields.phone ? str(fields.phone, 30) : null,
    group_name: fields.group ? str(fields.group, 100) : null,
    where_met: fields.whereMet ? str(fields.whereMet, 200) : null,
    why: fields.why ? str(fields.why, 500) : null,
    when_met: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    status: 'New Connection',
  }).select().single();
}

export async function insertCalendarEvent(userId, fields) {
  const startHour = fields.time ? parseTimeToHour(fields.time) : null;
  return supabase.from('calendar_events').insert({
    user_id: userId,
    title: str(fields.title, 200),
    date: str(fields.date, 20),
    time: fields.time ? str(fields.time, 20) : null,
    start_hour: startHour,
    duration: fields.duration ? str(fields.duration, 50) : null,
    location: fields.location ? str(fields.location, 300) : null,
    category: allowedValues(fields.category, ['Work', 'Personal'], 'Personal'),
    color: fields.category === 'Work' ? '#D4AF37' : '#6B8E4E',
    is_all_day: false,
  }).select().single();
}

export async function insertWorkspace(userId, fields) {
  const validType = allowedValues(fields.type, ['Business', 'Personal', 'Admin', 'Creative'], 'Personal');
  const colorMap = { Business: '#D4AF37', Personal: '#6B8E4E', Admin: '#584738', Creative: '#5B7B9A' };
  return supabase.from('workspaces').insert({
    user_id: userId,
    title: str(fields.title, 200),
    type: validType,
    color: colorMap[validType] || '#D4AF37',
    document_count: 0,
    last_modified: 'Just now',
  }).select().single();
}

export async function deleteWorkspace(workspaceId) {
  return supabase.from('workspaces').delete().eq('id', workspaceId);
}

export async function insertEmail(userId, fields) {
  return supabase.from('emails').insert({
    user_id: userId,
    external_id: fields.externalId ? str(fields.externalId, 200) : null,
    provider: allowedValues(fields.provider, ['gmail', 'outlook'], 'gmail'),
    sender: str(fields.sender, 200),
    subject: str(fields.subject, 500),
    preview: fields.preview ? str(fields.preview, 500) : null,
    timestamp: fields.timestamp || new Date().toISOString(),
    label: allowedValues(fields.label, ['Work', 'Personal', 'School', 'Business', 'Invoices', 'Newsletters', 'Uncategorized'], 'Uncategorized'),
    provider_account_email: fields.providerAccountEmail ? str(fields.providerAccountEmail, 200) : null,
    is_read: !!fields.is_read,
  }).select().single();
}

export async function insertDraft(userId, fields) {
  return supabase.from('drafts').insert({
    user_id: userId,
    type: str(fields.type, 100),
    title: str(fields.title, 300),
    detail: fields.detail ? str(fields.detail, 2000) : null,
    target_account: fields.targetAccount ? str(fields.targetAccount, 100) : null,
    status: allowedValues(fields.status, ['pending', 'approved', 'rejected'], 'pending'),
  }).select().single();
}

export async function syncDeviceContacts(userId, deviceContacts) {
  // Fetch existing contact names to avoid duplicates
  const { data: existing } = await supabase
    .from('contacts')
    .select('name')
    .eq('user_id', userId);

  const existingNames = new Set((existing || []).map(c => c.name?.toLowerCase()));

  const newContacts = deviceContacts
    .filter(c => c.name && !existingNames.has(c.name.toLowerCase()))
    .map(c => ({
      user_id: userId,
      name: str(c.name, 200),
      phone: c.phone ? str(c.phone, 30) : null,
      company: c.company ? str(c.company, 200) : null,
      role: c.role ? str(c.role, 200) : null,
      when_met: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      status: 'New Connection',
    }));

  if (newContacts.length === 0) {
    return { data: [], count: 0 };
  }

  const { data, error } = await supabase.from('contacts').insert(newContacts).select();
  return { data, error, count: newContacts.length };
}

function parseTimeToHour(timeStr) {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const period = match[3];
  if (period) {
    if (period.toUpperCase() === 'PM' && h !== 12) h += 12;
    if (period.toUpperCase() === 'AM' && h === 12) h = 0;
  }
  return h + m / 60;
}
