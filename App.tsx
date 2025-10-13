import React, { useState, useMemo } from 'react';

import Header from './components/Header';
import StatusSelector from './components/StatusSelector';
import UserCard from './components/UserCard';
import AvailabilityModal from './components/AvailabilityModal';
import StatusDetailModal from './components/StatusDetailModal';
import MyPage from './components/MyPage';
import MyPageModal from './components/MyPageModal';

import { MOCK_USERS } from './constants';
import { Status, Scope, User, AppSettings } from './types';

// AI機能は利用しないため削除

const App: React.FC = () => {
  const [userStatus, setUserStatus] = useState<Status>(Status.UNSET);
  // 単一リスト表示にするため、タブのスコープは廃止
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [statusFilter, setStatusFilter] = useState<Status | 'ALL'>(Status.FREE);
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [isStatusDetailModalOpen, setIsStatusDetailModalOpen] = useState(false);
  const [isMyPageOpen, setIsMyPageOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userMessage, setUserMessage] = useState<string>('');
  const [availableFrom, setAvailableFrom] = useState<string>('');
  const [shareScope, setShareScope] = useState<Scope | null>(null);
  const [shareRecipientIds, setShareRecipientIds] = useState<string[] | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  React.useEffect(() => {
    try {
      const s = localStorage.getItem('nighton_settings');
      if (s) setSettings(JSON.parse(s));
    } catch {}
  }, []);

  const handleSetFree = () => {
    setIsAvailabilityModalOpen(true);
  };

  const handleSetBusy = () => {
    setUserStatus(Status.BUSY);
    setUserMessage('');
    setAvailableFrom('');
  };

  const handleSaveAvailability = (time: string, message: string, scope: Scope, recipientUserIds: string[]) => {
    setUserStatus(Status.FREE);
    setAvailableFrom(time);
    setUserMessage(message);
    setShareScope(scope);
    setShareRecipientIds(recipientUserIds);
    setIsAvailabilityModalOpen(false);
  };

  const filteredUsers = useMemo(() => {
    const byStatus = users.filter(u => {
      if (statusFilter === 'ALL') return true;
      if (statusFilter === Status.FREE) return u.status === Status.FREE;
      // Treat UNSET as BUSY for filtering
      if (statusFilter === Status.BUSY) return u.status === Status.BUSY || u.status === Status.UNSET;
      return true;
    });

    const toMinutes = (t?: string) => {
      if (!t) return Number.POSITIVE_INFINITY;
      const m = /^([0-9]{2}):([0-9]{2})$/.exec(t);
      if (!m) return Number.POSITIVE_INFINITY;
      return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
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
  }, [users, statusFilter]);

  const handleUserCardClick = (user: User) => {
    setSelectedUser(user);
    setIsStatusDetailModalOpen(true);
  };

  const handleChangeRelationScope = (userId: string, newScope: Scope) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, relationScope: newScope } : u));
    setSelectedUser(prev => prev && prev.id === userId ? { ...prev, relationScope: newScope } as User : prev);
  };

  return (
    <div className="bg-[#0c0a1e] text-slate-200 min-h-screen font-sans">
      <Header onOpenMyPage={() => setIsMyPageOpen(true)} />
      <main className="max-w-md mx-auto p-4 pb-20">
        <StatusSelector
          userStatus={userStatus}
          onSetFree={handleSetFree}
          onSetBusy={handleSetBusy}
        />
        
        {userStatus === Status.FREE && (
          <div className="mb-4 p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-center">
            <p className="text-amber-400 font-semibold">あなたの今のステータス：</p>
            <p className="text-lg text-white mt-1">
              {availableFrom}からOK！ {userMessage}
            </p>
            {shareScope && (
              <p className="text-slate-400 text-sm mt-2">
                共有範囲: {shareScope === Scope.PRIVATE ? '近しい友人' : shareScope === Scope.COMMUNITY ? '友人' : '知人'}
              </p>
            )}
            {shareRecipientIds && shareRecipientIds.length > 0 && (
              <p className="text-slate-400 text-xs mt-1">
                共有相手: {users.filter(u => shareRecipientIds.includes(u.id)).map(u => u.name).join(', ')}
              </p>
            )}
          </div>
        )}

        <div className="space-y-3 mt-6">
          <h2 className="text-xl font-bold text-white px-2">みんなの状況</h2>
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
          {filteredUsers.length > 0 ? (
            filteredUsers.map(user => (
              <div key={user.id} onClick={() => handleUserCardClick(user)}>
                <UserCard user={user} onChangeRelationScope={handleChangeRelationScope} />
              </div>
            ))
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
      />

      <MyPageModal
        isOpen={isMyPageOpen}
        onClose={() => setIsMyPageOpen(false)}
        initialTime={(settings?.defaultTime || availableFrom) as string}
        initialMessage={userMessage}
        onSave={({ time, message, name, avatarUrl, avatarColor, defaultStatus }) => {
          setAvailableFrom(time);
          setUserMessage(message);
          const newSettings: AppSettings = {
            displayName: name,
            avatarUrl,
            avatarColor,
            defaultTime: time,
            defaultStatus,
          };
          setSettings(newSettings);
          try { localStorage.setItem('nighton_settings', JSON.stringify(newSettings)); } catch {}
          setIsMyPageOpen(false);
        }}
      />

      <StatusDetailModal
        isOpen={isStatusDetailModalOpen}
        onClose={() => setIsStatusDetailModalOpen(false)}
        user={selectedUser}
      />
    </div>
  );
};

export default App;
