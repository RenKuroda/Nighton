import React, { useState, useMemo, useRef } from 'react';

import Header from './components/Header';
import StatusSelector from './components/StatusSelector';
import UserCard from './components/UserCard';
import AvailabilityModal from './components/AvailabilityModal';
import StatusDetailModal from './components/StatusDetailModal';
import MyPageModal from './components/MyPageModal';
import UserAddModal from './components/UserAddModal';
import { useAuth0 } from '@auth0/auth0-react';
import { useToast } from './components/ToastProvider';
import { syncUserToServer, AdminUserPayload, upsertLocalAdminUser } from './utils/adminSync';

import { MOCK_USERS } from './constants';
import { Status, Scope, User, AppSettings } from './types';

// AI機能は利用しないため削除

const App: React.FC = () => {
  const { isAuthenticated, isLoading, loginWithRedirect, logout, user } = useAuth0();
  const { showToast } = useToast();
  const [isInitializing, setIsInitializing] = useState(true);
  const [userStatus, setUserStatus] = useState<Status | undefined>(undefined);
  // 単一リスト表示にするため、タブのスコープは廃止
  // Users state with ref + guarded setter to avoid unnecessary re-renders
  const [users, _setUsers] = useState<User[]>(MOCK_USERS);
  const usersRef = useRef<User[]>(MOCK_USERS);
  const setUsers = React.useCallback((updater: any) => {
    _setUsers((prev: User[]) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (next === prev) return prev;
      usersRef.current = next as User[];
      return next;
    });
  }, []);
  const [statusFilter, setStatusFilter] = useState<Status | 'ALL'>(Status.FREE);
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isStatusDetailModalOpen, setIsStatusDetailModalOpen] = useState(false);
  const [isMyPageOpen, setIsMyPageOpen] = useState(false);
  const [isUserAddOpen, setIsUserAddOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userMessage, setUserMessage] = useState<string>('');
  const [availableFrom, setAvailableFrom] = useState<string>('');
  const [shareScope, setShareScope] = useState<Scope | null>(null);
  const [shareRecipientIds, setShareRecipientIds] = useState<string[] | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  // Accepted friend account ids (stable source for presence polling)
  const [friendAccountIds, setFriendAccountIds] = useState<string[]>([]);
  // Keep last non-empty aids to avoid oscillation
  const lastAidsRef = useRef<string[]>([]);
  const lastPollAtRef = useRef<number>(0);
  const lastRealtimeAtRef = useRef<number>(0);
  // User-level coalescing: suppress duplicate/near-duplicate updates per account
  const lastAppliedAtByAidRef = useRef<Map<string, number>>(new Map());
  const lastSnapshotByAidRef = useRef<Map<string, string>>(new Map());

  // Scope normalization util (Japanese label ⇔ enum key)
  const normalizeScope = React.useCallback((raw: string | undefined | null): 'PUBLIC' | 'COMMUNITY' | 'PRIVATE' | '' => {
    if (!raw) return '';
    const s = String(raw).trim();
    if (s === '知人' || s.toUpperCase() === 'PUBLIC') return 'PUBLIC';
    if (s === '友人' || s.toUpperCase() === 'COMMUNITY') return 'COMMUNITY';
    if (s === '近しい友人' || s.toUpperCase() === 'PRIVATE') return 'PRIVATE';
    return '';
  }, []);

  const shouldApply = (aid: string, r: any, derived: { status: Status; timeHHMM: string; scope?: string | null; visibleTo: string[] }) => {
    try {
      const selfId = (() => {
        try { return (settings?.accountId || JSON.parse(localStorage.getItem('nighton_settings') || '{}').accountId) as string | undefined; } catch { return settings?.accountId as string | undefined; }
      })();
      if (selfId && String(aid).toUpperCase() === String(selfId).toUpperCase()) {
        try { console.log(`[coalesce][${aid}][skip self]`); } catch {}
        return false; // 自分はapplyしない
      }
      const ts = r?.updated_at ? new Date(r.updated_at).getTime() : 0;
      const snap = JSON.stringify({ s: derived.status, t: derived.timeHHMM || '', sc: derived.scope || null, v: (derived.visibleTo || []).map(x => String(x).toUpperCase()) });
      const lastTs = lastAppliedAtByAidRef.current.get(aid) || 0;
      const lastSnap = lastSnapshotByAidRef.current.get(aid) || '';
      // Strict: reject strictly older timestamps to prevent stale overwrite
      if (ts && lastTs && ts < lastTs) {
        try { console.log(`[coalesce][${aid}][skip] ts older`, { ts, lastTs, delta: ts - lastTs }); } catch {}
        return false;
      }
      if (snap === lastSnap) {
        try { console.log(`[coalesce][${aid}][skip] same snapshot`, snap); } catch {}
        return false;
      }
      lastAppliedAtByAidRef.current.set(aid, ts || Date.now());
      lastSnapshotByAidRef.current.set(aid, snap);
      try { console.log(`[coalesce][${aid}][apply]`, { ts, snap }); } catch {}
      return true;
    } catch {
      return true;
    }
  };
  // Realtime channels (persist across renders to avoid reconnect churn in StrictMode)
  const usersChangesChannelRef = useRef<any>(null);
  const friendsPresenceChannelRef = useRef<any>(null);
  const acceptedIdsRef = useRef<Set<string>>(new Set());

  // Keep last non-empty friend ids immediately on state change
  React.useEffect(() => {
    if (Array.isArray(friendAccountIds) && friendAccountIds.length > 0) {
      lastAidsRef.current = friendAccountIds.filter(Boolean).map(String);
    }
  }, [friendAccountIds]);

  // 未ログイン時はUniversal Loginへ自動リダイレクト
  React.useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      loginWithRedirect({ appState: { returnTo: '/' } });
    }
  }, [isAuthenticated, isLoading, loginWithRedirect]);

  React.useEffect(() => {
    try {
      const s = localStorage.getItem('nighton_settings');
      if (s) setSettings(JSON.parse(s));
    } catch {}
  }, []);

  // ログイン直後に初期設定（マイページ）を開く：名前が未設定の場合のみ
  React.useEffect(() => {
    if (!isAuthenticated) return;
    const s = (() => {
      try { return localStorage.getItem('nighton_settings'); } catch { return null; }
    })();
    const displayName = s ? (() => { try { return (JSON.parse(s) as AppSettings).displayName; } catch { return undefined; } })() : undefined;
    if (!displayName) setIsMyPageOpen(true);
  }, [isAuthenticated]);

  // Keep local directory up-to-date for accountId lookups (used by UserAddModal search)
  React.useEffect(() => {
    if (!settings?.accountId) return;
    try {
      const raw = localStorage.getItem('nighton_directory');
      const dir = raw ? JSON.parse(raw) as Record<string, { name: string; avatarUrl?: string }> : {};
      const key = String(settings.accountId).toUpperCase();
      dir[key] = { name: settings.displayName || '自分', avatarUrl: settings.avatarUrl };
      localStorage.setItem('nighton_directory', JSON.stringify(dir));
    } catch {}
  }, [settings?.accountId, settings?.displayName, settings?.avatarUrl]);

  // Accepted friends → add to main list (works even whenモーダルを開いていない時)
  React.useEffect(() => {
    if (!settings?.accountId) return;
    (async () => {
      try {
        const { supabase } = await import('./utils/supabase');
        const selfId = settings.accountId;
        const { data, error } = await supabase
          .from('friend_requests')
          .select('requester_id,receiver_id,status')
          .or(`requester_id.eq.${selfId},receiver_id.eq.${selfId}`)
          .eq('status', 'accepted');
        if (error) return;
        const ids = new Set<string>();
        (data || []).forEach((r: any) => ids.add(r.requester_id === selfId ? r.receiver_id : r.requester_id));
        const addIds = Array.from(ids).filter(cid => !users.some(u => (u as any).accountId === cid));
        // keep stable list for polling
        setFriendAccountIds(Array.from(ids));
        if (addIds.length === 0) return;
        const validAddIds = Array.isArray(addIds) ? addIds.filter(Boolean).map(String) : [String(addIds as any)];
        if (!validAddIds || validAddIds.length === 0) return;
        try { console.log('[fetch][accepted.addIds]', validAddIds); } catch {}
        const { data: userRows, error: errAdd } = await supabase
          .from('users')
          .select('account_id,name,avatar_url,available_from,updated_at')
          .in('account_id', validAddIds);
        if (errAdd) { try { console.warn('[fetch][add][error]', errAdd); } catch {} }
        const map = new Map<string, string>();
        (userRows || []).forEach((r: any) => map.set(r.account_id, r.name));
        // local directory fallback for name/avatar
        let dir: Record<string, { name: string; avatarUrl?: string }> = {} as any;
        try { dir = JSON.parse(localStorage.getItem('nighton_directory') || '{}'); } catch {}
        setUsers(prev => {
          const localRelations: Record<string, { relationScope?: Scope }> = (() => {
            try { return JSON.parse(localStorage.getItem('nighton_relations') || '{}'); } catch { return {}; }
          })();
          const newOnes: User[] = addIds.map(cid => ({
            id: `remote-${cid}`,
            name: (dir[cid]?.name) || map.get(cid) || 'ユーザー',
            avatarUrl: ((userRows || []).find((r:any)=>r.account_id===cid)?.avatar_url) || dir[cid]?.avatarUrl || `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(cid)}`,
            status: Status.BUSY,
            community: '',
            relationScope: (localRelations[cid]?.relationScope as Scope) || Scope.PUBLIC,
            availableFrom: ((): any => {
              const t = ((userRows || []).find((r:any)=>r.account_id===cid)?.available_from || undefined) as any;
              return (typeof t === 'string' && /^\d{2}:\d{2}:\d{2}$/.test(t)) ? t.slice(0,5) : t;
            })(),
            ...( { presenceUpdatedAt: ((userRows || []).find((r:any)=>r.account_id===cid)?.updated_at) } as any),
            lastLoginAt: new Date().toISOString(),
            ...( { accountId: cid } as any),
          } as any));
          return [...prev, ...newOnes];
        });
      } catch {}
    })();
  // users も依存に入れることで重複追加を避けつつ不足分だけ補完
  }, [settings?.accountId, users.length]);

  // Step 1: Local admin upsert on login
  React.useEffect(() => {
    if (!isAuthenticated || !settings?.accountId) return;
    const email = (user && (user.email as string)) || '';
    const provider: 'LINE' | 'Google' | 'Email' = email.includes('@') && (user as any)?.sub?.startsWith('google-oauth2')
      ? 'Google'
      : ((user as any)?.sub?.startsWith('auth0') ? 'Email' : 'LINE');
    const payload: AdminUserPayload = {
      accountId: settings.accountId,
      name: settings.displayName || (user?.name as string) || 'Unknown',
      email,
      provider,
      lineId: provider === 'LINE' ? (((user as any)?.nickname as string) || '') : undefined,
      lastLogin: new Date().toISOString(),
    };
    upsertLocalAdminUser(payload);
    // Step 2: Cloud sync placeholder
    syncUserToServer(payload);
  }, [isAuthenticated, settings?.accountId]);

  // 乱数で一度だけアカウントIDを発行して保存
  React.useEffect(() => {
    if (!isAuthenticated) return;
    try {
      const raw = localStorage.getItem('nighton_settings');
      const parsed: AppSettings | null = raw ? JSON.parse(raw) : null;
      if (parsed && parsed.accountId) return; // already exists
      const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
      const updated: AppSettings = {
        displayName: parsed?.displayName || '',
        avatarUrl: parsed?.avatarUrl,
        avatarColor: parsed?.avatarColor,
        defaultTime: parsed?.defaultTime || '19:00',
        defaultStatus: parsed?.defaultStatus || 'BUSY',
        accountId: rand,
      };
      localStorage.setItem('nighton_settings', JSON.stringify(updated));
      setSettings(updated);
    } catch {}
  }, [isAuthenticated]);

  // Apply default status from settings once on load
  const appliedDefaultRef = useRef(false);
  React.useEffect(() => {
    if (appliedDefaultRef.current) return;
    if (!settings) return;
    // 初期値は描画抑制のため設定しない（サーバ取得後に確定）
    appliedDefaultRef.current = true;
  }, [settings]);

  // Init presence with priority:
  // 1) if users.updated_at is today -> use users (keep today's shared state)
  // 2) else use nighton_settings defaults and write them to users for the new day
  React.useEffect(() => {
    (async () => {
      if (!isAuthenticated || !settings?.accountId) return;
      try {
        const { supabase, readNightonDefaults } = await import('./utils/supabase');
        // Read users and defaults, and apply users first
        const { data: userRow } = await supabase
          .from('users')
          .select('status,available_from,updated_at,share_scope,visible_to')
          .eq('account_id', settings.accountId)
          .maybeSingle();
        const defaults = await readNightonDefaults(settings.accountId);
        if (userRow) {
          setUserStatus((userRow.status as any) === 'FREE' ? Status.FREE : Status.BUSY);
          setAvailableFrom((userRow.available_from as any) || '');
          setShareScope((userRow.share_scope as any) || null);
        } else {
          const fallbackStatus = (defaults?.default_status as any) || 'BUSY';
          setUserStatus(fallbackStatus === 'FREE' ? Status.FREE : Status.BUSY);
          setAvailableFrom((defaults?.default_available_from as any) || '19:00');
          setShareScope((defaults?.default_share_scope as any) || null);
        }
        // Only if 24h passed, reapply defaults to users
        const updatedAt = userRow?.updated_at ? new Date(userRow.updated_at as any) : null;
        const diffHours = updatedAt ? (Date.now() - updatedAt.getTime()) / 3600000 : Infinity;
        if (diffHours <= 24 || !defaults) return;
        const updated: AppSettings = {
          displayName: settings.displayName,
          avatarUrl: settings.avatarUrl,
          avatarColor: settings.avatarColor,
          defaultTime: (defaults.default_available_from as any) || '19:00',
          defaultStatus: (defaults.default_status as any) || 'BUSY',
          accountId: settings.accountId,
        };
        setSettings(updated);
        try { localStorage.setItem('nighton_settings', JSON.stringify(updated)); } catch {}
        // Write defaults to users for the new day (create or update)
        await supabase
          .from('users')
          .upsert({
            account_id: settings.accountId,
            name: settings.displayName || null,
            avatar_url: settings.avatarUrl || null,
            status: (defaults.default_status as any) || 'BUSY',
            available_from: (defaults.default_available_from as any) || '19:00',
            share_scope: (defaults.default_share_scope as any) || null,
            visible_to: (defaults.shared_with as any) || null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'account_id' });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[init defaults error]', err);
      } finally { setIsInitializing(false); }
    })();
  }, [settings?.accountId, isAuthenticated]);

  // Daily re-apply of defaults (nighton_settings → users) when day changes
  React.useEffect(() => {
    (async () => {
      if (!settings?.accountId) return;
      const key = `nighton_last_applied_${settings.accountId}`;
      const today = new Date().toISOString().slice(0, 10);
      const last = (() => { try { return localStorage.getItem(key) || ''; } catch { return ''; } })();
      if (last === today) return;
      try {
        const { supabase, readNightonDefaults } = await import('./utils/supabase');
        const defaults = await readNightonDefaults(settings.accountId);
        // 直近24時間以内に users が更新されていれば何もしない（当日の共有を保持）
        const { data: urow } = await supabase
          .from('users')
          .select('updated_at')
          .eq('account_id', settings.accountId)
          .maybeSingle();
        const updatedAt = urow?.updated_at ? new Date(urow.updated_at as any) : null;
        const diffHours = updatedAt ? (Date.now() - updatedAt.getTime()) / 3600000 : Infinity;
        if (diffHours <= 24) return;
        const defaultStatus = defaults?.default_status || 'BUSY';
        const defaultTime = defaults?.default_available_from || '19:00';
        await supabase
          .from('users')
          .update({
            status: defaultStatus,
            available_from: defaultTime,
            share_scope: (defaults?.default_share_scope as any) || null,
            visible_to: (defaults?.shared_with as any) || null,
            updated_at: new Date().toISOString(),
          })
          .eq('account_id', settings.accountId);
        try { localStorage.setItem(key, today); } catch {}
      } catch {}
    })();
  }, [settings?.accountId]);

  const handleSetFree = () => {
    setIsAvailabilityModalOpen(true);
  };

  const handleSetBusy = () => {
    setUserStatus(Status.BUSY);
    setUserMessage('');
    setAvailableFrom('');
    // propagate BUSY to Supabase presence so他端末に同期
    (async () => {
      try {
        const { supabase } = await import('./utils/supabase');
        if (!settings?.accountId) return;
        await supabase
          .from('users')
          .upsert({
            account_id: settings.accountId,
            name: settings.displayName || null,
            avatar_url: settings.avatarUrl || null,
            status: 'BUSY',
            available_from: null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'account_id' });
      } catch {}
    })();
  };

  const handleSaveAvailability = (time: string, message: string, scope: Scope, recipientUserIds: string[]) => {
    setUserStatus(Status.FREE);
    setAvailableFrom(time);
    setUserMessage(message);
    setShareScope(scope);
    setShareRecipientIds(recipientUserIds);
    setIsAvailabilityModalOpen(false);
    // propagate presence to Supabase so other clients can read it
    (async () => {
      try {
        const { supabase, upsertNightonDefaults } = await import('./utils/supabase');
        if (!settings?.accountId) return;
        // Enforce scope on recipients: visible_to can only narrow within scope, not widen
        const relationsMap: Record<string, { relationScope?: Scope }> = (() => {
          try { return JSON.parse(localStorage.getItem('nighton_relations') || '{}'); } catch { return {}; }
        })();
        const getRelationOf = (aid: string): Scope => {
          const upper = String(aid).toUpperCase();
          const u = usersRef.current.find(x => (x as any).accountId === upper);
          return (relationsMap[upper]?.relationScope as Scope) || (u?.relationScope || Scope.PUBLIC);
        };
        const isAllowedForScope = (aid: string): boolean => {
          const rel = getRelationOf(aid);
          if (scope === Scope.PUBLIC) return true;
          if (scope === Scope.COMMUNITY) return rel === Scope.COMMUNITY || rel === Scope.PRIVATE;
          return rel === Scope.PRIVATE; // PRIVATE
        };
        const prunedRecipients = (recipientUserIds || [])
          .map(id => String(id).toUpperCase())
          .filter(isAllowedForScope);
        await supabase
          .from('users')
          .upsert({
            account_id: settings.accountId,
            name: settings.displayName || null,
            avatar_url: settings.avatarUrl || null,
            status: 'FREE',
            available_from: time,
            share_scope: scope,
            visible_to: prunedRecipients,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'account_id' });
        // Keep nighton_settings defaults as-is; only sync shared_with list to remember recipients
        await upsertNightonDefaults(
          settings.accountId,
          settings.defaultStatus || 'BUSY',
          (settings?.defaultTime as any) || null,
          (settings?.defaultShareScope as any) || null,
          prunedRecipients
        );
      } catch {}
    })();
  };

  const filteredUsers = useMemo(() => {
    const selfUser: User | null = userStatus === Status.FREE ? {
      id: 'self',
      name: (settings?.displayName || (user?.name as string) || 'You') as string,
      avatarUrl: (settings?.avatarUrl || (user as any)?.picture || 'https://picsum.photos/seed/self/100') as string,
      status: userStatus,
      community: '自分',
      relationScope: Scope.PRIVATE,
      message: userMessage || undefined,
      availableFrom: availableFrom || settings?.defaultTime,
      lastLoginAt: new Date().toISOString(),
    } : null;

    const sourceUsers = selfUser ? [selfUser, ...users] : users;

    const byStatus = sourceUsers.filter(u => {
      if (statusFilter === 'ALL') return true;
      if (statusFilter === Status.FREE) {
        // 厳格にFREEのみ表示（混乱を避ける）
        return u.status === Status.FREE;
      }
      // Treat UNSET as BUSY for filtering
      if (statusFilter === Status.BUSY) return u.status === Status.BUSY || u.status === Status.UNSET;
      return true;
    });

    try {
      console.log('[filter][before]', sourceUsers.map((x: any) => ({ aid: (x as any).accountId, name: x.name, status: x.status })));
      console.log('[filter][after]', byStatus.map((x: any) => ({ aid: (x as any).accountId, name: x.name, status: x.status })));
    } catch {}

    const toMinutes = (t?: string) => {
      if (!t) return Number.POSITIVE_INFINITY;
      const parts = t.split(':');
      if (parts.length < 2) return Number.POSITIVE_INFINITY;
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (Number.isNaN(h) || Number.isNaN(m)) return Number.POSITIVE_INFINITY;
      return h * 60 + m;
    };

    const toHHMM = (t?: string | null): string => {
      if (!t) return '';
      const s = String(t);
      const [hh, mm] = s.split(':');
      if (!hh || !mm) return s;
      return `${hh.padStart(2, '0')}:${mm.padStart(2, '0')}`;
    };

    const closenessOrder: Record<Scope, number> = { [Scope.PRIVATE]: 0, [Scope.COMMUNITY]: 1, [Scope.PUBLIC]: 2 };

    return byStatus.slice().sort((a, b) => {
      // すべて表示のときは「空いてる」を上位に
      if (statusFilter === 'ALL') {
        const pa = a.status === Status.FREE ? 0 : 1;
        const pb = b.status === Status.FREE ? 0 : 1;
        if (pa !== pb) return pa - pb;
      }

      // 時間の早い順（時間なしは後ろ）
      const ta = toMinutes(a.availableFrom);
      const tb = toMinutes(b.availableFrom);
      if (ta !== tb) return ta - tb;

      // 近しい→友人→知人の順で安定化
      return closenessOrder[a.relationScope] - closenessOrder[b.relationScope];
    });
  }, [users, statusFilter, userStatus, userMessage, availableFrom, settings, user]);

  // Stable dependency key for accountIds to avoid effect thrash
  const usersAccountIdsKey = useMemo(() => {
    try {
      return friendAccountIds
        .filter(Boolean)
        .map(String)
        .sort()
        .join(',');
    } catch {
      return '';
    }
  }, [friendAccountIds]);

  // Periodically pull others' presence (status/available_from) from Supabase
  React.useEffect(() => {
    let timer: any;
    const tick = async () => {
      try {
        const { supabase } = await import('./utils/supabase');
        const rawIds = friendAccountIds;
        const aids = Array.isArray(rawIds) ? rawIds.filter(Boolean).map(String) : [String(rawIds as any)];
        const useAids = (aids && aids.length > 0) ? aids : (lastAidsRef.current || []);
        try { console.log('[poll][aids]', useAids); } catch {}
        if (!useAids || useAids.length === 0 || (useAids.length === 1 && !useAids[0])) {
          try { console.log('[poll][skip] no aids'); } catch {}
          timer = setTimeout(tick, 5000);
          return;
        }
        // persist last non-empty aids
        if (useAids && useAids.length > 0) lastAidsRef.current = useAids;
        // small debounce to allow realtime to batch updates (reduces flicker)
        await new Promise(res => setTimeout(res, 120));
        let data: any[] | null = null;
        let errPoll: any = null;
        if (useAids.length === 1) {
          const single = useAids[0];
          const resp = await supabase
            .from('users')
            .select('account_id,status,available_from,name,avatar_url,updated_at,share_scope,visible_to')
            .eq('account_id', single);
          data = resp.data as any;
          errPoll = resp.error;
        } else {
          const resp = await supabase
            .from('users')
            .select('account_id,status,available_from,name,avatar_url,updated_at,share_scope,visible_to')
            .in('account_id', useAids);
          data = resp.data as any;
          errPoll = resp.error;
        }
        if (errPoll) { try { console.warn('[poll][error]', errPoll); } catch {} }
        if (!data) return;
        const map = new Map<string, any>();
        data.forEach((r: any) => map.set(r.account_id, r));
        // local directory for fallback names/avatars
        let dir: Record<string, { name: string; avatarUrl?: string }> = {} as any;
        try { dir = JSON.parse(localStorage.getItem('nighton_directory') || '{}'); } catch {}
        setUsers(prev => {
          let changed = false;
          const selfId = (() => {
            try {
              const sid = settings?.accountId || (JSON.parse(localStorage.getItem('nighton_settings') || '{}').accountId);
              return sid ? String(sid).toUpperCase() : '';
            } catch { return settings?.accountId ? String(settings.accountId).toUpperCase() : ''; }
          })();
          const nextArr = prev.map(u => {
          const aid = (u as any).accountId as string | undefined;
          if (!aid) return u;
          if (selfId && String(aid).toUpperCase() === selfId) return u; // 自分はpollで更新しない
          // compare in uppercase for robustness
          const hasRow = Array.from(map.keys()).some((k: any) => String(k).toUpperCase() === String(aid).toUpperCase());
          if (!hasRow) return u;
          const r = map.get(aid) || map.get(Array.from(map.keys()).find((k: any) => String(k).toUpperCase() === String(aid).toUpperCase()) as any);
          // guard: ignore stale updates
          const prevTs = (u as any).presenceUpdatedAt ? new Date((u as any).presenceUpdatedAt).getTime() : 0;
          const newTs = r.updated_at ? new Date(r.updated_at).getTime() : 0;
          if (newTs && prevTs && newTs < prevTs) return u;
          const patchedName = u.name === 'ユーザー' ? (r.name || dir[aid]?.name || u.name) : u.name;
          const patchedAvatar = u.avatarUrl?.includes('dicebear') ? (r.avatar_url || dir[aid]?.avatarUrl || u.avatarUrl) : u.avatarUrl;
          // Enforce visibility: if share_scope is PRIVATE, only friends with relationScope PRIVATE should see FREE status/time
          const incomingScopeRaw = (r.share_scope as string | undefined);
          const incomingScope = normalizeScope(incomingScopeRaw);
          const list = (r.visible_to as string[] | undefined) || [];
          // explicit whitelist wins (viewer accountId is in sender's visible_to)
          const viewerId = (() => {
            try {
              const sid = settings?.accountId || (JSON.parse(localStorage.getItem('nighton_settings') || '{}').accountId);
              return sid ? String(sid).toUpperCase() : '';
            } catch { return settings?.accountId ? String(settings.accountId).toUpperCase() : ''; }
          })();
          const isExplicitAllowed = !!viewerId && list.map((x: any) => String(x).toUpperCase()).includes(viewerId);
          const viewerRelation = (() => {
            try {
              const relRaw = localStorage.getItem('nighton_relations');
              const rel = relRaw ? JSON.parse(relRaw) : {};
              const rc = rel[aid]?.relationScope as Scope | undefined;
              // Prefer UI state over localStorage (avoid stale local cache)
              const pref = u.relationScope || rc;
              if (pref && rc && pref !== rc) {
                // sync back to storage to prevent flip-flop
                rel[aid] = { relationScope: pref };
                localStorage.setItem('nighton_relations', JSON.stringify(rel));
              }
              return pref as Scope;
            } catch { return u.relationScope; }
          })();
          try {
            console.log('[vis][poll]', {
              aid,
              senderScope: incomingScope,
              viewerRelation,
              includes: list.map((x: any) => String(x).toUpperCase()).includes(viewerId),
              viewerId,
              rStatus: r.status,
              rTime: r.available_from,
              rUpdatedAt: r.updated_at,
            });
          } catch {}
          const isVisibleByScope = !incomingScope || incomingScope === 'PUBLIC' || (incomingScope === 'COMMUNITY' && (viewerRelation === Scope.COMMUNITY || viewerRelation === Scope.PRIVATE)) || (incomingScope === 'PRIVATE' && viewerRelation === Scope.PRIVATE);
          const recipientGate = (incomingScope === 'PRIVATE')
            ? (viewerRelation === Scope.PRIVATE) // PRIVATEは近しい友人のみ可視（visible_toは無視）
            : ((Array.isArray(list) && list.length > 0) ? isExplicitAllowed : true);
          const isVisible = isVisibleByScope && recipientGate;
          const nextStatus = isVisible ? (r.status === 'FREE' ? Status.FREE : Status.BUSY) : Status.BUSY;
          const nextAvailableStr = isVisible && nextStatus === Status.FREE
            ? ((typeof r.available_from === 'string' && /^\d{2}:\d{2}:\d{2}$/.test(r.available_from)) ? r.available_from.slice(0,5) : (r.available_from || ''))
            : '';
          const prevAvailableStr = (u.availableFrom || '');
          const derived = { status: nextStatus, timeHHMM: nextAvailableStr, scope: incomingScope || null, visibleTo: (r.visible_to || []).map((x: any) => String(x).toUpperCase()) };
          const should = shouldApply(aid, r, derived);
          if (!should) {
            if (u.status !== nextStatus || prevAvailableStr !== nextAvailableStr) {
              try { console.log('[coalesce][override][poll]', aid, { from: { s: u.status, t: prevAvailableStr }, to: { s: nextStatus, t: nextAvailableStr } }); } catch {}
            } else {
              return u;
            }
          }
            // Avoid unnecessary rerenders if nothing changed
          const tsDiff = (newTs && prevTs) ? Math.abs(newTs - prevTs) : 0;
          if (
            u.status === nextStatus &&
            prevAvailableStr === nextAvailableStr &&
            u.name === patchedName &&
            u.avatarUrl === patchedAvatar &&
            tsDiff < 1500
          ) {
              return u;
            }
            changed = true;
            return {
              ...u,
              name: patchedName,
              avatarUrl: patchedAvatar,
              status: nextStatus,
              availableFrom: nextAvailableStr,
              relationScope: u.relationScope, // keep local relation (手動設定を優先)
              ...( { presenceUpdatedAt: r.updated_at } as any),
              ...( { accountId: aid } as any),
            } as User;
          });
          try {
            console.log('[ui][poll after setUsers]', nextArr.map((x: any) => ({ aid: (x as any).accountId, name: x.name, status: x.status, from: x.availableFrom })));
          } catch {}
          return changed ? nextArr.slice() : prev;
        });
        lastPollAtRef.current = Date.now();
      } catch {}
      timer = setTimeout(tick, 5000);
    };
    // initial kick
    tick();
    // fetch immediately when tab becomes visible
    const onVisible = () => {
      try {
        if (document.visibilityState === 'visible') {
          tick();
        }
      } catch {}
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => clearTimeout(timer);
  }, [usersAccountIdsKey]);

  // Realtime: listen users updates for accepted friends and reflect immediately
  React.useEffect(() => {
    if (!settings?.accountId) return;
    (async () => {
      try {
        const { supabase } = await import('./utils/supabase');
        const selfId = settings.accountId;
        const { data, error } = await supabase
          .from('friend_requests')
          .select('requester_id,receiver_id,status')
          .or(`requester_id.eq.${selfId},receiver_id.eq.${selfId}`)
          .eq('status', 'accepted');
        if (error) return;
        const ids = new Set<string>();
        (data || []).forEach((r: any) => ids.add(r.requester_id === selfId ? r.receiver_id : r.requester_id));
        // update filter ref (handler will read current set)
        acceptedIdsRef.current = ids;
        if (friendsPresenceChannelRef.current) return; // already subscribed
        // Subscribe globally (no row filter) and filter in handler for robustness across reconnects
        friendsPresenceChannelRef.current = supabase.channel('presence-friends');
        try { console.log('[realtime][init] ids', Array.from(acceptedIdsRef.current)); } catch {}
        const handler = (payload: any) => {
          try { console.log('[realtime][raw payload]', JSON.stringify(payload)); } catch {}
          const r = payload.new || {};
          const aidNew = r.account_id as string | undefined;
          try { console.log('[realtime][users.update] aid', aidNew, r); } catch {}
          if (!aidNew) return;
          // Previously muted realtime immediately after polling to avoid flicker.
          // Coalescing now handles duplicates, so do not early-return here.
          setUsers(prev => {
            const before = prev.find((u: any) => (u as any).accountId === aidNew);
            try { console.log('[realtime][before]', before); } catch {}
            const next = prev.map(u => {
              const aid = (u as any).accountId as string | undefined;
              if (aid !== aidNew) return u;
              const prevTs = (u as any).presenceUpdatedAt ? new Date((u as any).presenceUpdatedAt).getTime() : 0;
              const newTs = r.updated_at ? new Date(r.updated_at).getTime() : 0;
              if (newTs && (lastAppliedAtByAidRef.current.get(aidNew || '') || 0) && newTs < (lastAppliedAtByAidRef.current.get(aidNew || '') as number)) {
                try { console.log('[realtime][skip stale]', aidNew, r.updated_at); } catch {}
                return u;
              }
              if (newTs && prevTs && newTs < prevTs) return u;
              const incomingScopeRaw2 = (r.share_scope as string | undefined) || '';
              const incomingScope2 = normalizeScope(incomingScopeRaw2);
              const list2 = (r.visible_to as string[] | undefined) || [];
              const viewerId2 = (() => {
                try {
                  const sid = settings?.accountId || (JSON.parse(localStorage.getItem('nighton_settings') || '{}').accountId);
                  return sid ? String(sid).toUpperCase() : '';
                } catch { return settings?.accountId ? String(settings.accountId).toUpperCase() : ''; }
              })();
              const isExplicitAllowed2 = !!viewerId2 && list2.map((x: any) => String(x).toUpperCase()).includes(viewerId2);
              const viewerRelation2 = (() => {
                try {
                  const relRaw = localStorage.getItem('nighton_relations');
                  const rel = relRaw ? JSON.parse(relRaw) : {};
                  const rc = rel[aid]?.relationScope as Scope | undefined;
                  const pref = u.relationScope || rc;
                  if (pref && rc && pref !== rc) {
                    rel[aid] = { relationScope: pref };
                    localStorage.setItem('nighton_relations', JSON.stringify(rel));
                  }
                  return pref as Scope;
                } catch { return u.relationScope; }
              })();
              const isVisibleByScope2 = !incomingScope2 || incomingScope2 === 'PUBLIC' || (incomingScope2 === 'COMMUNITY' && (viewerRelation2 === Scope.COMMUNITY || viewerRelation2 === Scope.PRIVATE)) || (incomingScope2 === 'PRIVATE' && viewerRelation2 === Scope.PRIVATE);
              const recipientGate2 = (incomingScope2 === 'PRIVATE')
                ? (viewerRelation2 === Scope.PRIVATE)
                : ((Array.isArray(list2) && list2.length > 0) ? isExplicitAllowed2 : true);
              const isVisible2 = isVisibleByScope2 && recipientGate2;
              try {
                console.log('[vis][rt]', {
                  aid: aidNew,
                  senderScope: incomingScope2,
                  viewerRelation: viewerRelation2,
                  includes: list2.map((x: any) => String(x).toUpperCase()).includes(viewerId2),
                  viewerId: viewerId2,
                  rStatus: r.status,
                  rTime: r.available_from,
              rUpdatedAt: r.updated_at,
              listLen: Array.isArray(list2) ? list2.length : 0,
                });
              } catch {}
              const nextStatus = isVisible2 ? ((typeof r.status === 'string') ? (r.status === 'FREE' ? Status.FREE : Status.BUSY) : u.status) : Status.BUSY;
              let nextAvailable = isVisible2 ? ((r.hasOwnProperty('available_from')) ? (r.available_from as any) : (u.availableFrom as any)) : undefined;
              if (typeof nextAvailable === 'string' && /^\d{2}:\d{2}:\d{2}$/.test(nextAvailable)) nextAvailable = nextAvailable.slice(0,5);
              const prevAvailStr = (u.availableFrom || '');
              const nextAvailStr = (nextStatus === Status.FREE) ? (nextAvailable || '') : '';
              try { console.log('[merge][rt]', aidNew, u.status, '→', nextStatus, '|', prevAvailStr, '→', nextAvailStr); } catch {}
              try {
                console.log('[realtime][pre-check]', {
                  aid: aidNew,
                  rStatus: r.status,
                  rScope: r.share_scope,
                  lastApplied: lastAppliedAtByAidRef.current.get(aidNew || ''),
                  rUpdatedAt: r.updated_at,
                });
              } catch {}
              const derived2 = { status: nextStatus, timeHHMM: nextAvailStr, scope: incomingScope2 || null, visibleTo: (r.visible_to || []).map((x: any) => String(x).toUpperCase()) };
              const should2 = shouldApply(aidNew || '', r, derived2);
              if (!should2) {
                if (u.status !== nextStatus || prevAvailStr !== nextAvailStr) {
                  try { console.log('[coalesce][override][rt]', aidNew, { from: { s: u.status, t: prevAvailStr }, to: { s: nextStatus, t: nextAvailStr } }); } catch {}
                } else {
                  try { console.log('[realtime][skip]', { aid: aidNew, reason: 'shouldApply=false', lastApplied: lastAppliedAtByAidRef.current.get(aidNew || ''), rUpdatedAt: r.updated_at }); } catch {}
                  return u;
                }
              }
              const tsDiff = (newTs && prevTs) ? Math.abs(newTs - prevTs) : 0;
              if (u.status === nextStatus && prevAvailStr === nextAvailStr && tsDiff < 1500) {
                try { console.log('[merge][rt][skip same]', aidNew, { status: u.status, avail: prevAvailStr, tsDiff }); } catch {}
                return u;
              }
              const merged: User = {
                id: u.id,
                name: r.name || u.name,
                avatarUrl: r.avatar_url || u.avatarUrl,
                status: nextStatus,
                community: u.community,
                relationScope: u.relationScope,
                message: u.message,
                availableFrom: nextAvailStr,
                lastLoginAt: u.lastLoginAt,
                ...( { accountId: r.account_id || aid } as any),
              } as any;
              return merged;
            });
            const after = next.find((u: any) => (u as any).accountId === aidNew);
            try { console.log('[realtime][after]', after); } catch {}
            try { console.log('[ui][rt after update]', next.map((x: any) => ({ aid: (x as any).accountId, name: x.name, status: x.status, from: x.availableFrom }))); } catch {}
            lastRealtimeAtRef.current = Date.now();
            return next.slice();
          });
        };
        // テーブル全体を購読して、ハンドラ内で account_id をフィルタ
        friendsPresenceChannelRef.current
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users' }, handler)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'users' }, handler)
          .subscribe((status: any) => { try { console.log('[realtime][status]', status); } catch {} });
      } catch {}
    })();
  }, [settings?.accountId]);

  // Global realtime subscription for users UPDATE → immediate UI reflection
  React.useEffect(() => {
    if (usersChangesChannelRef.current) return; // subscribe once
    (async () => {
      try {
        const { supabase } = await import('./utils/supabase');
        usersChangesChannelRef.current = supabase
          .channel('users_changes')
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'users' },
            (payload: any) => {
               const r = payload?.new;
              if (!r?.account_id) return;
              try { console.log('[realtime][update]', r); } catch {}
              setUsers(prev => prev.map(u => {
                const aid = (u as any).accountId as string | undefined;
                if (aid !== r.account_id) return u;
                const prevTs = (u as any).presenceUpdatedAt ? new Date((u as any).presenceUpdatedAt).getTime() : 0;
                const newTs = r.updated_at ? new Date(r.updated_at).getTime() : 0;
                if (newTs && prevTs && newTs < prevTs) return u;
                 // mute immediately after polling to avoid race flicker
                 if (Date.now() - lastPollAtRef.current < 500) return u;
                const keepStatus = u.status;
                const nextStatus = (typeof r.status === 'string') ? (r.status === 'FREE' ? Status.FREE : Status.BUSY) : keepStatus;
                let nextAvailable = r.hasOwnProperty('available_from') ? (r.available_from as any) : (u.availableFrom as any);
                if (typeof nextAvailable === 'string' && /^\d{2}:\d{2}:\d{2}$/.test(nextAvailable)) nextAvailable = nextAvailable.slice(0,5);
              const nextAvailStr = (nextStatus === Status.FREE) ? (nextAvailable || '') : '';
                const prevAvailStr = (u.availableFrom || '');
              const derived = { status: nextStatus, timeHHMM: nextAvailStr, scope: (r.share_scope as any) || null, visibleTo: (r.visible_to || []).map((x: any) => String(x).toUpperCase()) };
              if (!shouldApply(aid, r, derived)) return u;
                const tsDiff = (newTs && prevTs) ? Math.abs(newTs - prevTs) : 0;
              if (u.status === nextStatus && prevAvailStr === nextAvailStr && tsDiff < 1500) return u;
                lastRealtimeAtRef.current = Date.now();
                return {
                  ...u,
                  name: r.name || u.name,
                  avatarUrl: r.avatar_url || u.avatarUrl,
                   status: nextStatus,
                   availableFrom: nextAvailStr,
                   relationScope: u.relationScope, // keep local relation (手動設定を優先)
                  ...( { presenceUpdatedAt: r.updated_at } as any),
                } as User;
              }));
            }
          )
          .subscribe();
      } catch {}
    })();
  }, []);

  const handleUserCardClick = (user: User) => {
    setSelectedUser(user);
    setIsStatusDetailModalOpen(true);
  };

  const handleChangeRelationScope = React.useCallback((userId: string, newScope: Scope) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, relationScope: newScope } : u));
    setSelectedUser(prev => prev && prev.id === userId ? { ...prev, relationScope: newScope } as User : prev);
    try {
      const mapRaw = localStorage.getItem('nighton_relations');
      const map = mapRaw ? JSON.parse(mapRaw) as Record<string, { relationScope?: Scope }> : {};
      const target = usersRef.current.find(u => u.id === userId);
      const aid = (target as any)?.accountId as string | undefined;
      if (aid) {
        map[aid] = { relationScope: newScope };
        localStorage.setItem('nighton_relations', JSON.stringify(map));
      }
    } catch {}
  }, []);

  return (
    <div className="bg-[#0c0a1e] text-slate-200 min-h-screen font-sans">
      <Header onOpenMenu={() => setIsMenuOpen(true)} />
      {/* Backdrop for global menu */}
      <div
        onClick={() => setIsMenuOpen(false)}
        className={`fixed inset-0 z-40 transition-opacity backdrop-blur-sm ${isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ backgroundColor: 'rgba(140, 144, 150, 0.55)' }}
        aria-hidden={!isMenuOpen}
      />
      {/* Slide-in drawer */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-1/2 max-w-sm bg-[#0c0a1e] shadow-2xl border-l border-slate-800 transform transition-transform duration-300 ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog" aria-modal="true" aria-label="メニュー"
      >
        <div className="p-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-[#0c0a1e]">
          <span className="text-white font-semibold">メニュー</span>
          <button onClick={() => setIsMenuOpen(false)} className="p-1 text-slate-400 hover:text-white">閉じる</button>
        </div>
        <nav className="p-2">
          <button
            onClick={() => { setIsMenuOpen(false); setIsMyPageOpen(true); }}
            className="block w-full text-left px-3 py-3 text-white rounded-lg hover:bg-slate-800 whitespace-nowrap"
          >マイページ</button>
          <div className="mt-1" />
          {isAuthenticated && (
            <button
              onClick={() => { setIsMenuOpen(false); logout({ logoutParams: { returnTo: window.location.origin } }); }}
              className="block w-full text-left px-3 py-3 text-white rounded-lg hover:bg-slate-800 whitespace-nowrap"
            >ログアウト</button>
          )}
        </nav>
      </aside>

      <main className="max-w-md mx-auto p-4 pb-20 relative z-0">
        {isInitializing ? (
          <div className="px-4 py-6 mb-4 bg-slate-900/50 border border-slate-800 rounded-xl text-center text-slate-400">読み込み中...</div>
        ) : (
        <StatusSelector
            userStatus={userStatus as Status}
          onSetFree={handleSetFree}
          onSetBusy={handleSetBusy}
            availableFrom={availableFrom || undefined}
            shareScope={shareScope || undefined}
          />
        )}

        <div className="space-y-3 mt-6">
          <div className="px-2 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">みんなの状況</h2>
            <button
              onClick={() => setIsUserAddOpen(true)}
              className="px-3 py-1.5 rounded-lg text-sm border bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
            >ユーザーを追加</button>
          </div>
          {/* ステータスフィルター（見出しの下） */}
          <div className="px-2">
            <div className="flex gap-2">
              {( [Status.FREE, Status.BUSY, 'ALL'] as const ).map(k => (
                <button
                  key={k}
                  onClick={() => setStatusFilter(k)}
                  className={`px-3 py-1.5 rounded-lg text-sm border ${statusFilter === k ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}
                >
                  {k === 'ALL' ? 'すべて' : k === Status.FREE ? '空いてる' : '空いてないかな'}
                </button>
              ))}
            </div>
          </div>
          {/* ログインUIは表示しない（未ログイン時は自動でAuth0へ遷移） */}
          {filteredUsers.length > 0 ? (
            React.useMemo(() => (
              filteredUsers
                .filter(u => (u as any).accountId !== (settings?.accountId || ''))
                .map(user => (
              <div key={(user as any).accountId || user.id} onClick={() => handleUserCardClick(user)}>
                    <UserCard user={user} onChangeRelationScope={handleChangeRelationScope} />
              </div>
            ))
            ), [filteredUsers, settings?.accountId])
          ) : (
            <div className="text-center py-10 text-slate-500">
              <p>誰もいません...</p>
            </div>
          )}
        </div>
      </main>

      <AvailabilityModal
        isOpen={isAvailabilityModalOpen}
        onClose={() => setIsAvailabilityModalOpen(false)}
        onSave={handleSaveAvailability}
        users={users}
        defaultTime={(availableFrom || settings?.defaultTime || '19:00') as string}
        defaultShareScope={(settings?.defaultShareScope as any) || null}
      />

      <MyPageModal
        isOpen={isMyPageOpen}
        onClose={() => setIsMyPageOpen(false)}
        initialTime={(settings?.defaultTime || '19:00') as string}
        initialMessage={userMessage}
        initialDefaultStatus={(settings?.defaultStatus || (userStatus === Status.FREE ? 'FREE' : 'BUSY')) as any}
        initialName={settings?.displayName}
        initialAvatarUrl={settings?.avatarUrl}
        initialShareScope={(settings?.defaultShareScope as any)}
        accountId={settings?.accountId}
        onSave={({ time, message, name, avatarUrl, avatarColor, defaultStatus, shareScope, accountId }) => {
          // 初期設定の保存。今日の状態（users）には反映しない
          setUserMessage(message);
          const newSettings: AppSettings = {
            displayName: name,
            avatarUrl,
            avatarColor,
            defaultTime: time,
            defaultStatus,
            defaultShareScope: shareScope as any,
            accountId: accountId || settings?.accountId,
          };
          setSettings(newSettings);
          try { localStorage.setItem('nighton_settings', JSON.stringify(newSettings)); } catch {}
          setIsMyPageOpen(false);
          // Local admin upsert on profile save
          try {
            const email = (user && (user.email as string)) || '';
            const provider: 'LINE' | 'Google' | 'Email' = email.includes('@') && (user as any)?.sub?.startsWith('google-oauth2')
              ? 'Google'
              : ((user as any)?.sub?.startsWith('auth0') ? 'Email' : 'LINE');
            const payload: AdminUserPayload = {
              accountId: newSettings.accountId!,
              name: newSettings.displayName,
              email,
              provider,
              lineId: provider === 'LINE' ? (((user as any)?.nickname as string) || '') : undefined,
              lastLogin: new Date().toISOString(),
            };
            upsertLocalAdminUser(payload);
            syncUserToServer(payload);
            // ユーザープロフィールもSupabaseのusersへ反映（name / avatar_url）
            try {
              (async () => {
                try {
                  const { supabase, upsertNightonDefaults } = await import('./utils/supabase');
                  // name/avatar は既存行を update のみ（競合409を避ける）
                  await supabase
                    .from('users')
                    .update({
                      name: newSettings.displayName,
                      avatar_url: newSettings.avatarUrl || null,
                      updated_at: new Date().toISOString(),
                    })
                    .eq('account_id', newSettings.accountId!);
                  // デフォルトは nighton_settings に保存（users は更新しない）
                  await upsertNightonDefaults(newSettings.accountId!, newSettings.defaultStatus, newSettings.defaultTime || null);
                } catch {}
              })();
            } catch {}
            try { showToast({ message: 'プロフィールを更新しました（管理画面にも反映済み）' }); } catch {}
          } catch {}
        }}
      />

      <StatusDetailModal
        isOpen={isStatusDetailModalOpen}
        onClose={() => setIsStatusDetailModalOpen(false)}
        user={selectedUser}
      />

      <UserAddModal
        isOpen={isUserAddOpen}
        onClose={() => setIsUserAddOpen(false)}
        myAccountId={settings?.accountId}
        existingUsers={users}
        onAdded={(u)=> setUsers(prev => {
          const aid = (u as any).accountId as string | undefined;
          if (aid && prev.some(p => (p as any).accountId === aid)) return prev;
          if (prev.some(p => p.id === u.id)) return prev;
          return [u, ...prev];
        })}
      />
    </div>
  );
};

export default App;
