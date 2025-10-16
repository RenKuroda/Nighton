import React from 'react';
import { supabase } from '../../utils/supabase';

type Provider = 'LINE' | 'Google' | 'Email';

export type AdminUser = {
  accountId: string;
  name: string;
  email: string;
  provider: Provider;
  lineId?: string;
  lastLogin: string; // ISO
};

function readAdminUsers(): AdminUser[] {
  try { return JSON.parse(localStorage.getItem('nighton_admin_users') || '[]') as AdminUser[]; } catch { return []; }
}

const AdminDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [query, setQuery] = React.useState('');
  const [provider, setProvider] = React.useState<Provider | 'ALL'>('ALL');
  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [sortKey, setSortKey] = React.useState<keyof AdminUser>('lastLogin');
  const [sortAsc, setSortAsc] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('users')
        .select('account_id,name,email,provider,line_id,last_login')
        .order('last_login', { ascending: false });
      const mapped: AdminUser[] = (data || []).map(r => ({
        accountId: r.account_id as string,
        name: (r.name as string) || '',
        email: (r.email as string) || '',
        provider: (r.provider as any) || 'Email',
        lineId: (r.line_id as string) || undefined,
        lastLogin: (r.last_login as string) || new Date(0).toISOString(),
      }));
      setUsers(mapped);
    })();
  }, []);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = users.filter(u => {
      if (provider !== 'ALL' && u.provider !== provider) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.accountId.toLowerCase().includes(q)
      );
    });
    const sorted = [...base].sort((a, b) => {
      const av = a[sortKey] as any;
      const bv = b[sortKey] as any;
      if (av === bv) return 0;
      return (av > bv ? 1 : -1) * (sortAsc ? 1 : -1);
    });
    return sorted;
  }, [users, query, provider, sortKey, sortAsc]);

  const header = (label: string, key: keyof AdminUser) => (
    <th className="px-3 py-2 text-left text-slate-300 cursor-pointer" onClick={() => {
      if (sortKey === key) setSortAsc(!sortAsc); else { setSortKey(key); setSortAsc(true); }
    }}>{label}{sortKey === key ? (sortAsc ? ' ▲' : ' ▼') : ''}</th>
  );

  return (
    <div className="min-h-screen" style={{ background: '#0c0a1e' }}>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-white text-xl font-bold">Nighton Admin</h1>
          <button onClick={() => { localStorage.removeItem('nighton_admin_authed'); onLogout(); }} className="px-3 py-2 rounded-lg bg-slate-800 text-white border border-slate-700 hover:bg-slate-700">ログアウト</button>
        </div>

        <div className="flex gap-3 mb-4">
          <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="検索（名前・メール・ID）" className="flex-1 bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-2"/>
          <select value={provider} onChange={(e)=>setProvider(e.target.value as any)} className="bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-2">
            <option value="ALL">すべて</option>
            <option value="LINE">LINE</option>
            <option value="Google">Google</option>
            <option value="Email">メール</option>
          </select>
        </div>

        <div className="overflow-auto rounded-xl border border-slate-800">
          <table className="min-w-full text-sm" style={{ color: '#e5e7eb' }}>
            <thead className="bg-slate-900">
              <tr>
                {header('名前', 'name')}
                {header('アカウントID', 'accountId')}
                {header('メールアドレス', 'email')}
                {header('登録方法', 'provider')}
                {header('LINE ID', 'lineId')}
                {header('最終ログイン', 'lastLogin')}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.accountId} className="border-t border-slate-800">
                  <td className="px-3 py-2">{u.name}</td>
                  <td className="px-3 py-2 text-slate-300">{u.accountId}</td>
                  <td className="px-3 py-2 text-slate-300">{u.email}</td>
                  <td className="px-3 py-2">{u.provider}</td>
                  <td className="px-3 py-2 text-slate-300">{u.provider === 'LINE' ? (u.lineId || '-') : '-'}</td>
                  <td className="px-3 py-2 text-slate-300">{new Date(u.lastLogin).toLocaleString()}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500">ユーザーがいません</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;


