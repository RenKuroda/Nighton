import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import MyPage from './MyPage';
import { DefaultStatus, Scope } from '../types';

interface MyPageModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTime: string;
  initialMessage: string;
  initialDefaultStatus?: DefaultStatus;
  initialName?: string;
  initialAvatarUrl?: string;
  initialShareScope?: Scope;
  accountId?: string;
  onSave: (payload: { time: string; message: string; name: string; avatarUrl?: string; avatarColor?: string; defaultStatus: DefaultStatus; shareScope?: any; accountId?: string }) => void;
}

const MyPageModal: React.FC<MyPageModalProps> = ({ isOpen, onClose, initialTime, initialMessage, initialDefaultStatus = 'BUSY', initialName, initialAvatarUrl, initialShareScope, accountId, onSave }) => {
  if (!isOpen) return null;
  const { isAuthenticated, loginWithRedirect, logout, user } = useAuth0();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-md max-h-[90vh]">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 sticky top-0 bg-slate-900">
            <h3 className="text-white font-bold text-lg">マイページ</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-white">閉じる</button>
          </div>
          <div className="p-6 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              {isAuthenticated ? (
                <>
                  <div className="text-slate-300 text-sm truncate">{initialName || user?.name || user?.email}</div>
                  <button
                    onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm border border-slate-700"
                  >ログアウト</button>
                </>
              ) : (
                <button
                  onClick={() => loginWithRedirect()}
                  className="ml-auto px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold"
                >ログイン</button>
              )}
            </div>
            <MyPage initialTime={initialTime} initialName={initialName || (user?.name as string) || ''} initialAvatarUrl={initialAvatarUrl} initialDefaultStatus={initialDefaultStatus} initialShareScope={initialShareScope} accountId={accountId} onSave={onSave} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyPageModal;


