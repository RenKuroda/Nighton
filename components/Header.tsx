
import React, { useEffect, useState } from 'react';
import { MenuDotsIcon } from './icons';

interface HeaderProps {
  onOpenMyPage?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenMyPage }) => {
  const [open, setOpen] = useState(false);
  // block body scroll & esc close
  useEffect(() => {
    const prev = document.body.style.overflow;
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = prev || '';
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open]);
  return (
    <header className="py-4 px-6 sticky top-0 bg-[#0c0a1e]/80 backdrop-blur-sm z-10">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <div className="flex-1"></div>
        <h1 className="text-3xl font-bold text-white font-poppins text-center flex-1" style={{ textShadow: '0 0 8px #a78bfa, 0 0 12px #a78bfa' }}>
          Nighton
        </h1>
        <div className="flex-1 flex justify-end">
          <button onClick={() => setOpen(v => !v)} className="p-2 text-slate-300 hover:text-white">
            <MenuDotsIcon className="w-6 h-6" />
          </button>
        </div>
      </div>
      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/80 backdrop-blur-sm transition-opacity ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        aria-hidden={!open}
      />
      {/* Slide-in Drawer */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-[85%] max-w-sm bg-[#0c0a1e] shadow-2xl border-l border-slate-800 transform transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog" aria-modal="true" aria-label="メニュー"
      >
        <div className="p-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-[#0c0a1e]">
          <span className="text-white font-semibold">メニュー</span>
          <button onClick={() => setOpen(false)} className="p-1 text-slate-400 hover:text-white">閉じる</button>
        </div>
        <nav className="p-2">
          <button
            onClick={() => { setOpen(false); onOpenMyPage && onOpenMyPage(); }}
            className="block w-full text-left px-3 py-3 text-white rounded-lg hover:bg-slate-800 whitespace-nowrap"
          >マイページ</button>
        </nav>
      </aside>
    </header>
  );
};

export default Header;
