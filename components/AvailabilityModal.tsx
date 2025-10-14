import React, { useEffect, useMemo, useState } from 'react';
import { HourglassIcon, XCircleIcon } from './icons';
import { Scope, User } from '../types';

interface AvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (time: string, message: string, scope: Scope, recipientUserIds: string[]) => void;
  users: User[];
}

const AvailabilityModal: React.FC<AvailabilityModalProps> = ({ isOpen, onClose, onSave, users }) => {
  const [time, setTime] = useState('19:00');
  const [message, setMessage] = useState('');
  const [selectedScope, setSelectedScope] = useState<Scope>(Scope.COMMUNITY);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setTime('19:00');
      setMessage('');
      setSelectedScope(Scope.COMMUNITY);
      setSelectedUserIds(users.map(u => u.id));
    }
  }, [isOpen, users]);

  const timeOptions = useMemo(() => {
    const options: string[] = [];
    for (let h = 15; h <= 23; h++) {
      options.push(`${String(h).padStart(2, '0')}:00`);
      options.push(`${String(h).padStart(2, '0')}:30`);
    }
    options.push('00:00');
    return options;
  }, []);

  const handleSave = () => {
    const normalizedTime = time || '19:00';
    onSave(normalizedTime, message.trim(), selectedScope, selectedUserIds);
  };

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 overscroll-contain" style={{ overscrollBehavior: 'contain' }}>
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 sticky top-0 bg-slate-900">
          <h3 className="text-white font-bold text-lg">空いてる時間を共有</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <XCircleIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-5 space-y-6 overflow-y-auto">
          <div>
            <label className="block text-slate-300 text-sm mb-2">何時からOK？（任意）</label>
            <div className="relative">
              <select
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full appearance-none bg-slate-800 text-white border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 pr-10"
              >
                {timeOptions.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <HourglassIcon className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 text-sm mb-2">ひとことメッセージ（任意）</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="例: 近くにいれば一杯どう？🍻"
              className="w-full bg-slate-800 text-white border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 text-sm mb-2">共有範囲（必須）</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: Scope.PRIVATE, label: '近しい友人' },
                { value: Scope.COMMUNITY, label: '友人' },
                { value: Scope.PUBLIC, label: '知人' },
              ].map(opt => (
                <label key={opt.value} className={`cursor-pointer select-none text-center py-2 rounded-lg border ${selectedScope === opt.value ? 'border-purple-500 bg-purple-500/10 text-white' : 'border-slate-700 text-slate-300 hover:border-slate-600'}`}>
                  <input
                    type="radio"
                    name="share-scope"
                    value={opt.value}
                    checked={selectedScope === opt.value}
                    onChange={() => setSelectedScope(opt.value)}
                    className="hidden"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-slate-300 text-sm mb-2">共有する相手（チェックで選択）</label>
            <div className="max-h-56 overflow-auto space-y-2 pr-1">
              {users
                .filter(u => {
                  // 知人(PUBLIC) => PUBLIC/COMMUNITY/PRIVATE すべて表示
                  // 友人(COMMUNITY) => COMMUNITY/PRIVATE を表示
                  // 近しい友人(PRIVATE) => PRIVATE のみ表示
                  if (selectedScope === Scope.PUBLIC) return true;
                  if (selectedScope === Scope.COMMUNITY) return u.relationScope === Scope.COMMUNITY || u.relationScope === Scope.PRIVATE;
                  return u.relationScope === Scope.PRIVATE;
                })
                .map(u => (
                <label key={u.id} className="flex items-center gap-3 p-2 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/40">
                  <input
                    type="checkbox"
                    checked={selectedUserIds.includes(u.id)}
                    onChange={(e) => {
                      setSelectedUserIds(prev => e.target.checked ? Array.from(new Set([...prev, u.id])) : prev.filter(id => id !== u.id));
                    }}
                    className="accent-purple-500"
                  />
                  <img src={u.avatarUrl} alt={u.name} className="w-8 h-8 rounded-full border border-slate-700" />
                  <span className="text-white text-sm font-medium truncate">{u.name}</span>
                  <span className="ml-auto text-slate-400 text-xs truncate">{u.community}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={handleSave}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold transition-colors"
          >
            共有する
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvailabilityModal;
