import React, { useState, useEffect } from 'react';
import { HourglassIcon } from './icons';
import { DefaultStatus } from '../types';

interface MyPageProps {
  initialTime: string;
  initialMessage: string;
  initialName?: string;
  initialAvatarUrl?: string;
  initialAvatarColor?: string;
  initialDefaultStatus?: DefaultStatus;
  onSave: (payload: {
    time: string;
    message: string;
    name: string;
    avatarUrl?: string;
    avatarColor?: string;
    defaultStatus: DefaultStatus;
  }) => void;
  onLogout?: () => void;
}

const MyPage: React.FC<MyPageProps> = ({ initialTime, initialMessage, initialName, initialAvatarUrl, initialAvatarColor, initialDefaultStatus = 'BUSY', onSave, onLogout }) => {
  const [time, setTime] = useState(initialTime || '19:00');
  const [message, setMessage] = useState(initialMessage || '');
  const [name, setName] = useState(initialName || '');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(initialAvatarUrl);
  const [avatarColor, setAvatarColor] = useState<string | undefined>(initialAvatarColor || '#64748b');
  const [defaultStatus, setDefaultStatus] = useState<DefaultStatus>(initialDefaultStatus);

  useEffect(() => {
    setTime(initialTime || '19:00');
    setMessage(initialMessage || '');
    setName(initialName || '');
    setAvatarUrl(initialAvatarUrl);
    setAvatarColor(initialAvatarColor || '#64748b');
    setDefaultStatus(initialDefaultStatus);
  }, [initialTime, initialMessage]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <h2 className="text-xl font-bold text-white mb-4">マイページ</h2>
      <div className="flex items-center gap-4 mb-5">
        <div
          className="w-14 h-14 rounded-full border border-slate-700 flex items-center justify-center text-slate-200 text-sm"
          style={{ backgroundColor: avatarUrl ? 'transparent' : avatarColor }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar" className="w-14 h-14 rounded-full object-cover" />
          ) : (
            'ICON'
          )}
        </div>
        <div className="flex-1">
          <label className="block text-slate-300 text-sm mb-2">名前</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-800 text-white border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="表示名"
          />
        </div>
      </div>

      <div className="mb-5">
        <label className="block text-slate-300 text-sm mb-2">プロフィール画像URL（または）アイコン色</label>
        <input
          type="url"
          value={avatarUrl || ''}
          onChange={(e) => setAvatarUrl(e.target.value || undefined)}
          className="w-full bg-slate-800 text-white border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-2"
          placeholder="https://..."
        />
        <input
          type="color"
          value={avatarColor}
          onChange={(e) => setAvatarColor(e.target.value)}
          className="w-16 h-10 bg-slate-800 border border-slate-700 rounded"
        />
      </div>
      <div className="space-y-5">
        <div>
          <label className="block text-slate-300 text-sm mb-2">何時からOK？（任意）</label>
          <div className="relative">
            <select
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full appearance-none bg-slate-800 text-white border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 pr-10"
            >
              {(() => {
                const opts: string[] = [];
                for (let h = 15; h <= 23; h++) {
                  opts.push(`${String(h).padStart(2, '0')}:00`);
                  opts.push(`${String(h).padStart(2, '0')}:30`);
                }
                opts.push('00:00');
                return opts;
              })().map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <HourglassIcon className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-slate-300 text-sm mb-2">通常ステータス</label>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 text-slate-200">
              <input type="radio" checked={defaultStatus === 'BUSY'} onChange={() => setDefaultStatus('BUSY')} />
              空いてないかな
            </label>
            <label className="flex items-center gap-2 text-slate-200">
              <input type="radio" checked={defaultStatus === 'FREE'} onChange={() => setDefaultStatus('FREE')} />
              空いてる
            </label>
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
          <button
            onClick={() => onSave({ time, message, name, avatarUrl, avatarColor, defaultStatus })}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold transition-colors"
          >
            保存
          </button>
        </div>

        {onLogout && (
          <div>
            <button
              onClick={onLogout}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold transition-colors"
            >
              ログアウト
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyPage;


