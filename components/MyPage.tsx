import React, { useState, useEffect } from 'react';
import { HourglassIcon } from './icons';

interface MyPageProps {
  initialTime: string;
  initialMessage: string;
  onSave: (time: string, message: string) => void;
}

const MyPage: React.FC<MyPageProps> = ({ initialTime, initialMessage, onSave }) => {
  const [time, setTime] = useState(initialTime || '19:00');
  const [message, setMessage] = useState(initialMessage || '');

  useEffect(() => {
    setTime(initialTime || '19:00');
    setMessage(initialMessage || '');
  }, [initialTime, initialMessage]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <h2 className="text-xl font-bold text-white mb-4">マイページ</h2>
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
            onClick={() => onSave(time, message)}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default MyPage;


