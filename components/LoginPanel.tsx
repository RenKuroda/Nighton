import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';

const LoginPanel: React.FC = () => {
  const { loginWithRedirect } = useAuth0();

  const common = 'w-full py-3.5 rounded-xl font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-0';

  return (
    <div className="space-y-3">
      <button
        onClick={() => loginWithRedirect({ connection: 'line', ui_locales: 'ja', appState: { returnTo: '/' } })}
        className={`${common} bg-[#06C755] text-white shadow-[0_0_20px_rgba(6,199,85,0.45)] hover:brightness-110`}
      >
        LINEで続ける
      </button>

      <button
        onClick={() => loginWithRedirect({ connection: 'google-oauth2', ui_locales: 'ja', appState: { returnTo: '/' } })}
        className={`${common} bg-white text-[#1f2937] border border-slate-300 hover:bg-slate-50`}
      >
        Googleで続ける
      </button>

      <button
        onClick={() => loginWithRedirect({ screen_hint: 'login', ui_locales: 'ja', appState: { returnTo: '/' } })}
        className={`${common} bg-gradient-to-r from-amber-500 to-amber-400 text-black shadow-[0_0_18px_rgba(245,158,11,0.5)] hover:from-amber-400 hover:to-amber-300`}
      >
        メールでログイン
      </button>
    </div>
  );
};

export default LoginPanel;


