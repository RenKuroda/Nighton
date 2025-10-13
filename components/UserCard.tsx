import React from 'react';
import { User, Scope, Status } from '../types';
import { SCOPE_LABELS } from '../constants';
import { ClockIcon, ChatIcon } from './icons';

interface UserCardProps {
  user: User;
  onChangeRelationScope?: (userId: string, newScope: Scope) => void;
}

const UserCard: React.FC<UserCardProps> = ({ user, onChangeRelationScope }) => {
  const isBusyLike = user.status === Status.BUSY || user.status === Status.UNSET;
  const statusBadgeClasses =
    user.status === Status.FREE
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
      : isBusyLike
      ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
      : 'bg-slate-500/15 text-slate-300 border-slate-500/30';

  const loginLabel = (() => {
    if (!user.lastLoginAt) return 'older';
    const last = new Date(user.lastLoginAt);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return last.getTime() >= startOfToday ? 'today' : 'older';
  })();

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-center gap-4 transition-transform duration-300 hover:bg-slate-800/50 cursor-pointer hover:border-slate-700">
      <div className="relative flex-shrink-0">
        <img
          src={user.avatarUrl}
          alt={user.name}
          className="w-14 h-14 rounded-full border-2 border-slate-700"
        />
        {!!user.message && (
          <span className="absolute -top-1 -right-1 bg-slate-900 border border-slate-700 rounded-full p-0.5 shadow-md">
            <ChatIcon className="w-3.5 h-3.5 text-slate-300" />
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-nowrap">
          <p className="text-white font-semibold text-lg whitespace-nowrap overflow-hidden text-ellipsis">{user.name}</p>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className={`text-[11px] px-2 py-0.5 rounded-full border ${statusBadgeClasses} shrink-0`}>{user.status === Status.FREE ? '空いてる' : '空いてないかな'}</span>
          {onChangeRelationScope && (
            <select
              onClick={(e) => e.stopPropagation()}
              value={user.relationScope}
              onChange={(e) => onChangeRelationScope(user.id, e.target.value as Scope)}
              className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs px-2 py-1 focus:outline-none"
              title="関係を変更"
            >
              <option value={Scope.PRIVATE}>{SCOPE_LABELS[Scope.PRIVATE]}</option>
              <option value={Scope.COMMUNITY}>{SCOPE_LABELS[Scope.COMMUNITY]}</option>
              <option value={Scope.PUBLIC}>{SCOPE_LABELS[Scope.PUBLIC]}</option>
            </select>
          )}
        </div>
        {/* community and message are hidden per design */}
      </div>
      <div className="flex items-center gap-3 flex-shrink-0 ml-2">
        <div className="flex flex-col items-end">
          {user.availableFrom && (
            <div className="flex flex-col items-center text-amber-400">
              <ClockIcon className="w-5 h-5 mb-0.5" />
              <span className="text-lg font-bold">{user.availableFrom}~</span>
            </div>
          )}
          <span className="text-[11px] text-slate-400 mt-1">
            最終ログイン: <span className={loginLabel === 'today' ? 'text-emerald-300' : 'text-slate-400'}>{loginLabel}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default UserCard;
