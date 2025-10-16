export type AdminUserPayload = {
  accountId: string;
  name: string;
  email: string;
  provider: 'LINE' | 'Google' | 'Email';
  lineId?: string;
  lastLogin: string; // ISO
};

// LocalStorage upsert (kept for offline fallback)
export function upsertLocalAdminUser(payload: AdminUserPayload) {
  try {
    const raw = localStorage.getItem('nighton_admin_users');
    const list: AdminUserPayload[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(u => u.accountId === payload.accountId || (!!payload.email && u.email === payload.email));
    if (idx >= 0) list[idx] = { ...list[idx], ...payload }; else list.push(payload);
    localStorage.setItem('nighton_admin_users', JSON.stringify(list));
  } catch {}
}

// Placeholder for future cloud sync (API ready later)
export async function syncUserToServer(payload: AdminUserPayload): Promise<void> {
  try {
    // For now, also upsert into Supabase if env is configured
    const { supabase } = await import('./supabase');
    const row = {
      account_id: payload.accountId,
      name: payload.name,
      email: payload.email,
      provider: payload.provider,
      line_id: payload.lineId || null,
      last_login: payload.lastLogin,
      updated_at: new Date().toISOString(),
    };
    // Try update by account_id first
    const { error: upErr } = await supabase
      .from('users')
      .upsert(row, { onConflict: 'account_id' });
    if (upErr) {
      // fallback: try update by email unique
      await supabase.from('users').upsert(row, { onConflict: 'email' });
    }
  } catch {
    // Intentionally swallow for now; we'll implement retry/backoff later
  }
}


