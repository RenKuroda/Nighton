import { createClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL) as string;
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string;

export const supabase = createClient(url, anonKey);

export type UsersRow = {
  id?: string;
  account_id: string;
  name: string;
  email: string;
  provider: string;
  line_id?: string | null;
  last_login?: string | null;
  // optional fields for presence sync
  status?: string | null;
  available_from?: string | null;
  avatar_url?: string | null;
  share_scope?: string | null;
  visible_to?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type NightonSettingsRow = {
  account_id: string;
  default_status: 'FREE' | 'BUSY';
  default_available_from: string | null; // time
  default_share_scope?: string | null;
  shared_with?: string[] | null;
  updated_at?: string | null;
};

export async function searchUserByAccountId(accountId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('account_id,name,email,provider,line_id,last_login')
    .eq('account_id', accountId)
    .maybeSingle();
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Supabase search error:', error);
    return null;
  }
  return data as UsersRow | null;
}

export async function readNightonDefaults(accountId: string) {
  const { data, error } = await supabase
    .from('nighton_settings')
    .select('default_status,default_available_from,default_share_scope,shared_with')
    .eq('account_id', accountId)
    .maybeSingle();
  if (error) return null;
  return data as any;
}

export async function upsertNightonDefaults(
  accountId: string,
  defaultStatus: 'FREE'|'BUSY',
  defaultTime: string | null,
  defaultShareScope?: string | null,
  sharedWith?: string[] | null,
) {
  await supabase
    .from('nighton_settings')
    .upsert({
      account_id: accountId,
      default_status: defaultStatus,
      default_available_from: defaultTime,
      default_share_scope: defaultShareScope ?? null,
      shared_with: sharedWith ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'account_id' });
}


