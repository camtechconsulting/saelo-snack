export function transformEmail(row) {
  return {
    id: row.id,
    provider: row.provider,
    externalId: row.external_id,
    label: row.label,
    providerAccountEmail: row.provider_account_email,
    sender: row.sender,
    subject: row.subject,
    preview: row.preview,
    timestamp: row.timestamp,
    isRead: row.is_read,
  };
}

export function transformEvent(row) {
  return {
    id: row.id,
    title: row.title,
    startHour: row.start_hour,
    time: row.time,
    duration: row.duration,
    category: row.category,
    account: row.account,
    color: row.color,
    date: row.date,
    location: row.location,
    isAllDay: row.is_all_day,
    provider: row.provider,
    externalId: row.external_id,
  };
}

export function transformContact(row) {
  return {
    id: row.id,
    name: row.name,
    photo: row.photo,
    where: row.where_met,
    when: row.when_met,
    why: row.why,
    status: row.status,
    group: row.group_name,
    role: row.role,
    company: row.company,
    phone: row.phone,
  };
}

export function transformWorkspace(row) {
  return {
    id: row.id,
    title: row.title,
    documentCount: row.document_count,
    lastModified: row.last_modified,
    type: row.type,
    color: row.color,
    image: row.image,
  };
}

export function transformTransaction(row) {
  return {
    id: row.id,
    date: row.date,
    store: row.store,
    amount: Number(row.amount),
    category: row.category,
    status: row.status,
    summary: row.summary,
  };
}

export function transformTodo(row) {
  return {
    id: row.id,
    task: row.task,
    completed: row.completed,
  };
}

export function transformFile(row) {
  return {
    id: row.id,
    fileName: row.file_name,
    fileSize: row.file_size,
    lastEdited: row.last_edited,
  };
}

export function transformProfile(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatar_url,
    usedSpace: Number(row.used_space_gb),
    aiAnalysesUsed: row.ai_analyses_used,
    aiAnalysesLimit: row.ai_analyses_limit,
  };
}
