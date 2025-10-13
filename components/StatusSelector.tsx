import React from 'react';
import { Status } from '../types';

interface StatusSelectorProps {
  userStatus: Status;
  onSetFree: () => void;
  onSetBusy: () => void;
}

const StatusSelector: React.FC<StatusSelectorProps> = ({ userStatus, onSetFree, onSetBusy }) => {
  const isFree = userStatus === Status.FREE;
  const isBusy = userStatus === Status.BUSY;

  return (
    <div className="px-4 py-6 mb-4 bg-slate-900/50 border border-slate-800 rounded-xl">
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold text-white">今夜、空いてますか？</h2>
        <p className="text-slate-400 text-sm">ワンタップで状況を共有しよう</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
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
    </div>
  );
};

export default StatusSelector;