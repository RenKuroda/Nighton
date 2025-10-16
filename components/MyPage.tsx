import React, { useState, useEffect, useRef } from 'react';
import { HourglassIcon } from './icons';
import { DefaultStatus, Scope } from '../types';
import { SCOPE_LABELS } from '../constants';

interface MyPageProps {
  initialTime: string;
  initialName?: string;
  initialAvatarUrl?: string;
  initialDefaultStatus?: DefaultStatus;
  initialShareScope?: Scope;
  accountId?: string;
  onSave: (payload: {
    time: string;
    name: string;
    avatarUrl?: string;
    avatarColor?: string;
    defaultStatus: DefaultStatus;
    shareScope?: Scope;
    accountId?: string;
  }) => void;
  onLogout?: () => void;
}

const MyPage: React.FC<MyPageProps> = ({ initialTime, initialName, initialAvatarUrl, initialDefaultStatus = 'BUSY', initialShareScope, accountId, onSave, onLogout }) => {
  const [time, setTime] = useState(initialTime || '19:00');
  const [name, setName] = useState(initialName || '');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(initialAvatarUrl);
  const [defaultStatus, setDefaultStatus] = useState<DefaultStatus>(initialDefaultStatus);
  const [shareScope, setShareScope] = useState<Scope>(initialShareScope || Scope.PUBLIC);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [nameError, setNameError] = useState<string>('');

  useEffect(() => {
    setTime(initialTime || '19:00');
    setName(initialName || '');
    setAvatarUrl(initialAvatarUrl);
    setDefaultStatus(initialDefaultStatus);
    setShareScope(initialShareScope || Scope.PUBLIC);
  }, [initialTime, initialName, initialAvatarUrl, initialDefaultStatus, initialShareScope]);

  const handlePickFile = () => fileInputRef.current?.click();
  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setAvatarUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <h2 className="text-xl font-bold text-white mb-4">マイページ</h2>

      <div className="flex flex-col items-start gap-3 mb-5">
        <button
          type="button"
          onClick={handlePickFile}
          className="relative w-16 h-16 rounded-full border border-slate-700 flex items-center justify-center text-slate-200 text-[10px] bg-slate-700/40 overflow-hidden"
          title="画像をアップロード"
        >
          {avatarUrl ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <img src={avatarUrl} className="w-full h-full object-cover" />
          ) : (
            <span>画像を選択</span>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </button>

        <div className="w-full">
          <div className="text-slate-400 text-xs mb-2">アカウントID</div>
          <div className="mb-4 px-3 py-2 rounded-lg bg-slate-800/70 text-slate-200 border border-slate-700 select-all text-sm">{accountId || '生成中...'}</div>
          <label className="block text-slate-300 text-sm mb-2">名前</label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); if (e.target.value.trim()) setNameError(''); }}
            onBlur={() => { if (!name.trim()) setNameError('名前は必須です'); }}
            className={`w-full bg-slate-800 text-white border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 ${nameError ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700 focus:ring-purple-500'}`}
            placeholder="表示名"
          />
          {nameError && <p className="text-rose-400 text-xs mt-1">{nameError}</p>}
        </div>
      </div>

      <div className="space-y-5">
        {/* 1) 通常ステータス */}
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

        {/* 2) 何時からをベースにする？ */}
        <div>
          <label className={`block text-sm mb-2 ${defaultStatus === 'BUSY' ? 'text-slate-500' : 'text-slate-300'}`}>何時からをベースにする？</label>
          <div className="relative">
            <select
              value={time}
              onChange={(e) => setTime(e.target.value)}
              disabled={defaultStatus === 'BUSY'}
              className={`w-full appearance-none ${defaultStatus === 'BUSY' ? 'bg-slate-800/60 text-slate-500 cursor-not-allowed' : 'bg-slate-800 text-white'} border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 pr-10`}
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
            <HourglassIcon className={`w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${defaultStatus === 'BUSY' ? 'text-slate-600' : 'text-slate-400'}`} />
          </div>
        </div>

        {/* 3) 共有範囲 */}
        <div>
          <label className={`block text-sm mb-2 ${defaultStatus === 'BUSY' ? 'text-slate-500' : 'text-slate-300'}`}>共有範囲</label>
          <select
            value={shareScope}
            onChange={(e)=> setShareScope(e.target.value as Scope)}
            disabled={defaultStatus === 'BUSY'}
            className={`w-full ${defaultStatus === 'BUSY' ? 'bg-slate-800/60 text-slate-500 cursor-not-allowed' : 'bg-slate-800 text-white'} border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500`}
          >
            <option value={Scope.PUBLIC}>{SCOPE_LABELS[Scope.PUBLIC]}</option>
            <option value={Scope.COMMUNITY}>{SCOPE_LABELS[Scope.COMMUNITY]}</option>
            <option value={Scope.PRIVATE}>{SCOPE_LABELS[Scope.PRIVATE]}</option>
          </select>
        </div>

        <div>
          <button
            onClick={() => {
              if (!name.trim()) { setNameError('名前は必須です'); return; }
              // FREE の場合は time/共有範囲が必須
              if (defaultStatus === 'FREE' && (!time || !shareScope)) return;
              onSave({ time, name: name.trim(), avatarUrl, defaultStatus, shareScope, accountId });
            }}
            disabled={!name.trim()}
            className={`w-full py-3 rounded-xl font-bold transition-colors ${!name.trim() ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-400 text-black'}`}
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


