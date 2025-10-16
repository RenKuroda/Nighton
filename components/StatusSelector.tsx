import React from 'react';
import { Status, Scope } from '../types';
import { SCOPE_LABELS } from '../constants';
import { HourglassIcon } from './icons';

interface StatusSelectorProps {
  userStatus: Status;
  onSetFree: () => void;
  onSetBusy: () => void;
  availableFrom?: string;
  shareScope?: Scope | null;
}

const StatusSelector: React.FC<StatusSelectorProps> = ({ userStatus, onSetFree, onSetBusy, availableFrom, shareScope }) => {
  const isFree = userStatus === Status.FREE;
  const isBusy = userStatus === Status.BUSY;
  const displayTime = availableFrom ? String(availableFrom).slice(0, 5) : '';

  return (
    <div className="px-4 py-6 mb-4 bg-slate-900/50 border border-slate-800 rounded-xl">
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold text-white">今夜、空いてますか？</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 whitespace-nowrap">
        <button
          onClick={onSetBusy}
          className={`font-bold py-3.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors duration-300 transform hover:scale-105
            ${isBusy
              ? 'bg-slate-700 text-white ring-2 ring-slate-500'
              : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'
            }`
          }
        >
          <span role="img" aria-label="new moon" className="text-lg">🌑</span>
          <span>空いてないかな</span>
        </button>
        <button
          onClick={onSetFree}
          className={`font-bold py-3.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 transform hover:scale-105
            ${isFree
              ? 'bg-[#4a321e] text-white'
              : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'
            }`
          }
          style={isFree ? { boxShadow: '0 0 15px 2px rgba(245, 158, 11, 0.7)' } : {}}
        >
          <span role="img" aria-label="full moon" className="text-lg">🌕</span>
          <span>空いてる</span>
        </button>
      </div>
      {isFree && (availableFrom || shareScope) && (
        <div className="mt-4 flex items-center justify-center gap-3">
          {availableFrom && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700">
              <HourglassIcon className="w-4 h-4 text-amber-300" />
              <span className="text-slate-300 text-xs">開始</span>
              <span className="text-white text-sm font-semibold">{displayTime}〜</span>
            </div>
          )}
          {shareScope && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700">
              <span className="text-slate-300 text-xs">共有範囲</span>
              <span className="text-white text-sm font-semibold">{SCOPE_LABELS[shareScope]}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StatusSelector;