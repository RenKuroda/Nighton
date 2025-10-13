import React, { useMemo, useState } from 'react';
import { User } from '../types';
import { XCircleIcon, ClockIcon, ChatIcon } from './icons';

interface StatusDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

const StatusDetailModal: React.FC<StatusDetailModalProps> = ({ isOpen, onClose, user }) => {
  if (!isOpen || !user) return null;

  const [expanded, setExpanded] = useState(false);
  const message = useMemo(() => (user.message || '').trim(), [user.message]);
  const isLong = message.length > 60;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
    } catch (_) {
      // noop
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <h3 className="text-white font-bold text-lg">詳細</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <XCircleIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-5 flex items-start gap-4">
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="w-16 h-16 rounded-full border-2 border-slate-700 flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-xl truncate">{user.name}</p>
            <p className="text-slate-400 text-sm truncate">{user.community}</p>
            <div className="mt-3">
              {message ? (
                <div className="relative p-3 bg-slate-800/60 border border-slate-700 rounded-xl">
                  <div className="flex items-start gap-2 text-slate-200">
                    <ChatIcon className="w-5 h-5 mt-0.5 text-slate-400" />
                    <p className={`text-sm leading-relaxed ${!expanded && isLong ? 'max-h-14 overflow-hidden' : ''}`}>{message}</p>
                  </div>
                  <div className="mt-2 flex items-center gap-2 justify-end">
                    {isLong && (
                      <button onClick={() => setExpanded(v => !v)} className="text-xs text-slate-300 hover:text-white px-2 py-1 border border-slate-600 rounded">
                        {expanded ? '閉じる' : 'もっと見る'}
                      </button>
                    )}
                    <button onClick={handleCopy} className="text-xs text-slate-300 hover:text-white px-2 py-1 border border-slate-600 rounded">
                      コピー
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-800/40 border border-slate-700 rounded-xl text-slate-400 text-sm flex items-center gap-2">
                  <ChatIcon className="w-5 h-5" />
                  <span>ひとこと未設定</span>
                </div>
              )}
            </div>
            {user.availableFrom && (
              <div className="mt-3 inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-300">
                <ClockIcon className="w-4 h-4" />
                <span className="text-sm font-semibold">{user.availableFrom}〜</span>
              </div>
            )}
          </div>
        </div>

        <div className="px-5 pb-5 space-y-3">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusDetailModal;