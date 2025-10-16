import React from 'react';
import { Scope, User, Status } from '../types';
import { useToast } from './ToastProvider';
import { searchUserByAccountId } from '../utils/supabase';
import { useFriendRequests } from '../hooks/useFriendRequests';

type RequestsStore = {
  sent: Array<{ toAccountId: string; scope: Scope; name: string; avatarUrl?: string }>;
  received: Array<{ fromAccountId: string; name: string; avatarUrl?: string }>;
};

function readRequests(): RequestsStore {
  try {
    const raw = localStorage.getItem('nighton_requests');
    if (!raw) return { sent: [], received: [] };
    const parsed = JSON.parse(raw) as RequestsStore;
    return { sent: parsed.sent || [], received: parsed.received || [] };
  } catch {
    return { sent: [], received: [] };
  }
}

function writeRequests(store: RequestsStore) {
  try { localStorage.setItem('nighton_requests', JSON.stringify(store)); } catch {}
}

function readContacts(): User[] {
  try { return JSON.parse(localStorage.getItem('nighton_users') || '[]') as User[]; } catch { return []; }
}

function writeContacts(users: User[]) {
  try { localStorage.setItem('nighton_users', JSON.stringify(users)); } catch {}
}

type DirectoryEntry = { name: string; avatarUrl?: string };
function readDirectory(): Record<string, DirectoryEntry> {
  try { return JSON.parse(localStorage.getItem('nighton_directory') || '{}') as Record<string, DirectoryEntry>; } catch { return {}; }
}
function writeDirectory(dir: Record<string, DirectoryEntry>) {
  try { localStorage.setItem('nighton_directory', JSON.stringify(dir)); } catch {}
}
function readSelfFromSettings() {
  try {
    const raw = localStorage.getItem('nighton_settings');
    if (!raw) return null;
    const s = JSON.parse(raw) as { accountId?: string; displayName?: string; avatarUrl?: string };
    if (!s?.accountId) return null;
    return { accountId: s.accountId.toUpperCase(), name: s.displayName || '自分', avatarUrl: s.avatarUrl };
  } catch { return null; }
}

interface UserAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  myAccountId?: string;
  existingUsers: User[];
  onAdded: (user: User) => void;
}

const UserAddModal: React.FC<UserAddModalProps> = ({ isOpen, onClose, myAccountId, existingUsers, onAdded }) => {
  // Early return BEFORE any hook calls to keep hooks order consistent
  if (!isOpen) return null;

  const [tab, setTab] = React.useState<'search' | 'pending'>('search');
  const [accountId, setAccountId] = React.useState('');
  const [scope, setScope] = React.useState<Scope>(Scope.PUBLIC);
  const [result, setResult] = React.useState<{ name: string; accountId: string; avatarUrl?: string; isSelf?: boolean } | null>(null);
  const [searched, setSearched] = React.useState(false);
  const contacts = React.useMemo(() => readContacts(), []);
  const { showToast } = useToast();
  const [pendingScopes, setPendingScopes] = React.useState<Record<string, Scope>>({});
  const { sendRequest, getReceivedPending, getSentPending, cancelRequest, approveRequest, rejectRequest, getRejected } = useFriendRequests();

  const alreadyConnected = (aid: string) => contacts.some(u => (u as any).accountId === aid) || existingUsers.some(u => (u as any).accountId === aid);

  const handleSearch = async () => {
    const id = accountId.trim().toUpperCase();
    if (!id) { setResult(null); setSearched(false); return; }
    setSearched(true);
    // Self guard
    if (myAccountId && id === myAccountId.toUpperCase()) {
      const self = readSelfFromSettings();
      setResult({ name: (self?.name || '自分'), accountId: id, avatarUrl: self?.avatarUrl, isSelf: true });
      showToast({ message: 'これはあなたのIDです（自分自身は追加できません）', type: 'info' });
      return;
    }
    // Supabase lookup first
    const remote = await searchUserByAccountId(id);
    if (remote) {
      setResult({ name: (remote as any).name || 'ユーザー', accountId: id, avatarUrl: undefined });
      return;
    }
    // Fallbacks (local cache or self)
    const contactHit = contacts.find(u => (u as any).accountId && (u as any).accountId.toUpperCase() === id);
    if (contactHit) { setResult({ name: contactHit.name, accountId: id, avatarUrl: contactHit.avatarUrl }); return; }
    const dir = readDirectory();
    if (dir[id]) { setResult({ name: dir[id].name, accountId: id, avatarUrl: dir[id].avatarUrl }); return; }
    const self = readSelfFromSettings();
    if ((myAccountId && id === myAccountId.toUpperCase()) || (self && id === self.accountId)) { setResult({ name: (self?.name || '自分'), accountId: id, avatarUrl: self?.avatarUrl, isSelf: true }); return; }
    setResult(null);
    showToast({ message: '該当のアカウントIDは見つかりません', type: 'info' });
  };

  const addCounterpartsFromAccepted = async (selfId: string) => {
    try {
      const { supabase } = await import('../utils/supabase');
      const { data: accepted, error } = await supabase
        .from('friend_requests')
        .select('requester_id, receiver_id, relationship, status')
        .or(`requester_id.eq.${selfId},receiver_id.eq.${selfId}`)
        .eq('status', 'accepted');
      if (error) { console.log('[accepted/fetch][error]', error.message); return; }
      const ids = new Set<string>();
      (accepted || []).forEach((r: any) => ids.add(r.requester_id === selfId ? r.receiver_id : r.requester_id));
      for (const cid of Array.from(ids)) {
        if (existingUsers.some((u: any) => (u as any).accountId === cid)) continue;
        const { data: urow } = await supabase.from('users').select('account_id,name').eq('account_id', cid).maybeSingle();
        const name = (urow as any)?.name || 'ユーザー';
        const newUser: User = {
          id: `remote-${cid}`,
          name,
          avatarUrl: `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(cid)}`,
          status: Status.BUSY,
          community: '',
          relationScope: Scope.PUBLIC,
          availableFrom: undefined,
          lastLoginAt: new Date().toISOString(),
          ...( { accountId: cid } as any),
        } as any;
        console.log('[accepted/add]', cid, newUser);
        onAdded(newUser);
      }
    } catch (e: any) {
      console.log('[accepted/add][exception]', e?.message);
    }
  };

  const refreshLists = async () => {
    const self = readSelfFromSettings();
    if (!self?.accountId) return;
    try {
      const rcv = await getReceivedPending(self.accountId);
      setReceived(rcv);
      const snt = await getSentPending(self.accountId);
      setSent(snt);
      await addCounterpartsFromAccepted(self.accountId);
    } catch {}
  };

  const handleSend = async () => {
    if (!result) return;
    if (result.isSelf) { showToast({ message: '自分自身は追加できません' }); return; }
    if (alreadyConnected(result.accountId)) { showToast({ message: '既に追加済みのユーザーです' }); return; }
    try {
      const self = readSelfFromSettings();
      if (!self?.accountId) { showToast({ message: '自分のアカウントIDが未設定です' }); return; }
      const created = await sendRequest({ requesterId: self.accountId, receiverId: result.accountId });
      const dir = readDirectory();
      dir[result.accountId] = { name: result.name, avatarUrl: result.avatarUrl };
      writeDirectory(dir);
      showToast({ message: 'リクエストを送信しました', type: 'success' });
      setAccountId('');
      setResult(null);
      // 即座に反映
      setSent(prev => [created as any, ...prev]);
      refreshLists();
    } catch (e: any) {
      const msg = (e && e.message) ? String(e.message) : '送信に失敗しました';
      showToast({ message: msg });
    }
  };

  const [received, setReceived] = React.useState<any[]>([]);
  const [sent, setSent] = React.useState<any[]>([]);
  const [rejected, setRejected] = React.useState<any[]>([]);
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState({ r: 1, s: 1, j: 1 });
  const PAGE_SIZE = 20;
  React.useEffect(() => {
    (async () => {
      const self = readSelfFromSettings();
      if (!self?.accountId) return;
      try {
        const rcv = await getReceivedPending(self.accountId);
        setReceived(rcv);
        const snt = await getSentPending(self.accountId);
        setSent(snt);
        const rej = await getRejected(self.accountId);
        setRejected(rej);
      } catch {}
    })();
  }, [isOpen]);

  const handleApprove = (req: { fromAccountId: string; name: string; avatarUrl?: string }, chosen: Scope) => {
    const store = readRequests();
    store.received = store.received.filter(r => r.fromAccountId !== req.fromAccountId);
    writeRequests(store);
    const newUser: User = {
      id: `local-${req.fromAccountId}`,
      accountId: req.fromAccountId,
      name: req.name,
      avatarUrl: req.avatarUrl || `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(req.fromAccountId)}`,
      status: 0 as any,
      community: 'Added',
      relationScope: chosen,
      availableFrom: undefined,
      lastLoginAt: new Date().toISOString(),
    };
    const updated = [...readContacts(), newUser];
    writeContacts(updated);
    // update directory
    const dir = readDirectory();
    dir[req.fromAccountId] = { name: req.name, avatarUrl: req.avatarUrl };
    writeDirectory(dir);
    onAdded(newUser);
    showToast({ message: `${req.name}さんを追加しました`, type: 'success' });
  };

  const handleReject = (req: { fromAccountId: string }) => {
    const store = readRequests();
    store.received = store.received.filter(r => r.fromAccountId !== req.fromAccountId);
    writeRequests(store);
    showToast({ message: 'リクエストを削除しました' });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-md max-h-[90vh]">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 sticky top-0 bg-slate-900">
            <div className="flex gap-2">
              <button className={`px-3 py-1.5 rounded-lg text-sm ${tab==='search'?'bg-slate-800 text-white':'text-slate-300 hover:bg-slate-800'}`} onClick={() => setTab('search')}>ユーザー検索</button>
              <button className={`px-3 py-1.5 rounded-lg text-sm ${tab==='pending'?'bg-slate-800 text-white':'text-slate-300 hover:bg-slate-800'}`} onClick={() => setTab('pending')}>承認待ち</button>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white">閉じる</button>
          </div>

          {tab === 'search' && (
            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-slate-300 text-sm mb-2">アカウントIDを入力</label>
                <div className="flex gap-2">
                  <input value={accountId} onChange={(e)=>setAccountId(e.target.value)} placeholder="8桁ID"
                         className="flex-1 bg-slate-800 text-white border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"/>
                  <button onClick={handleSearch} className="px-4 rounded-xl bg-slate-800 border border-slate-700 text-white hover:bg-slate-700">検索</button>
                </div>
              </div>
              {result && (
                <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/50 flex items-center gap-3">
                  <img src={result.avatarUrl} className="w-10 h-10 rounded-full border border-slate-700"/>
                  <div className="flex-1">
                    <div className="text-white font-medium">{result.name}</div>
                    <div className="text-slate-400 text-xs">ID: {result.accountId}</div>
                  </div>
                  {!result.isSelf && (
                    <>
                      <select value={scope} onChange={(e)=>setScope(e.target.value as Scope)} className="bg-slate-800 text-white border border-slate-700 rounded-lg px-2 py-1 text-sm">
                        <option value={Scope.PUBLIC}>知人</option>
                        <option value={Scope.COMMUNITY}>友人</option>
                        <option value={Scope.PRIVATE}>近しい友人</option>
                      </select>
                      <button onClick={handleSend} className="ml-2 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold">リクエスト</button>
                    </>
                  )}
                  {result.isSelf && (
                    <span className="text-slate-400 text-sm">自分のIDです</span>
                  )}
                </div>
              )}
              {!result && searched && (
                <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/40 text-slate-300 text-sm">ユーザーが見つかりませんでした</div>
              )}
            </div>
          )}

          {tab === 'pending' && (
            <div className="p-5 space-y-4 overflow-y-auto">
              {/* 検索 */}
              <div className="flex items-center gap-2">
                <input
                  value={query}
                  onChange={(e)=>{ setQuery(e.target.value); setPage({ r:1,s:1,j:1 }); }}
                  placeholder="名前/IDを検索"
                  className="flex-1 bg-slate-800 text-white border border-slate-700 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* 受信 */}
              <div className="flex items-center justify-between">
                <div className="text-slate-400 text-sm">受信した申請</div>
                <span className="text-xs text-slate-400 bg-slate-800 border border-slate-700 rounded-md px-2 py-0.5">{received.length}</span>
              </div>
              {received.length === 0 && (<div className="text-slate-500 text-sm">承認待ちはありません</div>)}
              {received
                .filter((req:any)=> (req.requester_id||'').toLowerCase().includes(query.toLowerCase()))
                .slice(0, page.r*PAGE_SIZE)
                .map((req: any) => (
                <div key={req.id} className="p-3 rounded-xl border border-slate-800 bg-slate-900/50 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-white font-medium">申請者ID: {req.requester_id}</div>
                    <div className="text-slate-400 text-xs">宛先ID: {req.receiver_id}</div>
                  </div>
                  <select
                    value={pendingScopes[req.id] || Scope.PUBLIC}
                    onChange={(e)=> setPendingScopes(prev => ({ ...prev, [req.id]: e.target.value as Scope }))}
                    className="bg-slate-800 text-white border border-slate-700 rounded-lg px-2 py-1 text-sm"
                  >
                    <option value={Scope.PUBLIC}>知人</option>
                    <option value={Scope.COMMUNITY}>友人</option>
                    <option value={Scope.PRIVATE}>近しい友人</option>
                  </select>
                  <button onClick={async ()=>{
                    const rel = (pendingScopes[req.id] || 'acquaintance') as any;
                    await approveRequest(req.id, rel);
                    // 申請者をみんなの状況へ追加（承認者側）
                    await addCounterpartsFromAccepted(readSelfFromSettings()!.accountId);
                    showToast({ message: '承認しました', type: 'success' });
                    refreshLists();
                  }} className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold">承認</button>
                  <button onClick={()=>rejectRequest(req.id).then(()=>{ showToast({ message: '拒否しました' }); refreshLists(); })} className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm">拒否</button>
                </div>
              ))}
              {received.filter((req:any)=> (req.requester_id||'').toLowerCase().includes(query.toLowerCase())).length > page.r*PAGE_SIZE && (
                <button onClick={()=>setPage(p=>({...p,r:p.r+1}))} className="w-full py-2 text-sm rounded-lg bg-slate-800 border border-slate-700 text-slate-200">さらに表示</button>
              )}

              {/* 送信 */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-slate-400 text-sm">送信した申請</div>
                <span className="text-xs text-slate-400 bg-slate-800 border border-slate-700 rounded-md px-2 py-0.5">{sent.length}</span>
              </div>
              {sent.length === 0 && (<div className="text-slate-500 text-sm">申請中はありません</div>)}
              {sent
                .filter((req:any)=> (req.receiver_id||'').toLowerCase().includes(query.toLowerCase()))
                .slice(0, page.s*PAGE_SIZE)
                .map((req: any) => (
                <div key={req.id} className="p-3 rounded-xl border border-slate-800 bg-slate-900/50 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-white font-medium">宛先: {req.receiver_id}</div>
                    <div className="text-slate-400 text-xs">状態: {req.status}</div>
                  </div>
                  <button onClick={()=>cancelRequest(req.id).then(()=>{ showToast({ message: '申請を取り消しました' }); refreshLists(); })} className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm">取り消し</button>
                </div>
              ))}
              {sent.filter((req:any)=> (req.receiver_id||'').toLowerCase().includes(query.toLowerCase())).length > page.s*PAGE_SIZE && (
                <button onClick={()=>setPage(p=>({...p,s:p.s+1}))} className="w-full py-2 text-sm rounded-lg bg-slate-800 border border-slate-700 text-slate-200">さらに表示</button>
              )}

              {/* 拒否 */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-slate-400 text-sm">拒否した申請（受信者視点）</div>
                <span className="text-xs text-slate-400 bg-slate-800 border border-slate-700 rounded-md px-2 py-0.5">{rejected.length}</span>
              </div>
              {rejected.length === 0 && (<div className="text-slate-500 text-sm">拒否した申請はありません</div>)}
              {rejected
                .filter((req:any)=> (req.requester_id||'').toLowerCase().includes(query.toLowerCase()))
                .slice(0, page.j*PAGE_SIZE)
                .map((req: any) => (
                <div key={req.id} className="p-3 rounded-xl border border-slate-800 bg-slate-900/50 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-white font-medium">申請者ID: {req.requester_id}</div>
                    <div className="text-slate-400 text-xs">状態: {req.status}</div>
                  </div>
                  <button onClick={()=>approveRequest(req.id, (pendingScopes[req.id] || 'acquaintance') as any).then(()=>{ showToast({ message: '再承認しました', type: 'success' }); refreshLists(); })} className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold">許可する</button>
                </div>
              ))}
              {rejected.filter((req:any)=> (req.requester_id||'').toLowerCase().includes(query.toLowerCase())).length > page.j*PAGE_SIZE && (
                <button onClick={()=>setPage(p=>({...p,j:p.j+1}))} className="w-full py-2 text-sm rounded-lg bg-slate-800 border border-slate-700 text-slate-200">さらに表示</button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserAddModal;


