import React from 'react';

interface Props {
  onSuccess: () => void;
}

const AdminLogin: React.FC<Props> = ({ onSuccess }) => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');

  const handleSubmit: React.FormEventHandler = (e) => {
    e.preventDefault();
    if (email === 'ezxtjzx512@gmail.com' && password === 'Nighton20251015') {
      try { localStorage.setItem('nighton_admin_authed', '1'); } catch {}
      onSuccess();
    } else {
      setError('認証に失敗しました');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0c0a1e' }}>
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h1 className="text-white text-xl font-bold mb-4">Nighton Admin</h1>
        <div className="mb-3">
          <label className="block text-slate-300 text-sm mb-1">メールアドレス</label>
          <input value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-2" placeholder="admin@example.com"/>
        </div>
        <div className="mb-4">
          <label className="block text-slate-300 text-sm mb-1">パスワード</label>
          <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-2" placeholder="********"/>
        </div>
        {error && <div className="text-rose-400 text-sm mb-3">{error}</div>}
        <button type="submit" className="w-full py-2 rounded-lg font-semibold text-black" style={{ background: '#f59e0b' }}>ログイン</button>
      </form>
    </div>
  );
};

export default AdminLogin;


