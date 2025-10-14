import React from 'react';
import MyPage from './MyPage';
import { DefaultStatus } from '../types';

interface MyPageModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTime: string;
  initialMessage: string;
  onSave: (payload: { time: string; message: string; name: string; avatarUrl?: string; avatarColor?: string; defaultStatus: DefaultStatus }) => void;
}

const MyPageModal: React.FC<MyPageModalProps> = ({ isOpen, onClose, initialTime, initialMessage, onSave }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-md max-h-[90vh]">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 sticky top-0 bg-slate-900">
            <h3 className="text-white font-bold text-lg">マイページ</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-white">閉じる</button>
          </div>
          <div className="p-6 overflow-y-auto">
            <MyPage initialTime={initialTime} initialMessage={initialMessage} onSave={onSave} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyPageModal;


