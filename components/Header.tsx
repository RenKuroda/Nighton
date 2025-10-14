
import React from 'react';
import { MenuDotsIcon } from './icons';

interface HeaderProps {
  onOpenMenu?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenMenu }) => {
  return (
    <header className="py-4 px-6 sticky top-0 bg-[#0c0a1e]/80 backdrop-blur-sm z-10">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <div className="flex-1"></div>
        <h1 className="text-3xl font-bold text-white font-poppins text-center flex-1" style={{ textShadow: '0 0 8px #a78bfa, 0 0 12px #a78bfa' }}>
          Nighton
        </h1>
        <div className="flex-1 flex justify-end">
          <button onClick={onOpenMenu} className="p-2 text-slate-300 hover:text-white">
            <MenuDotsIcon className="w-6 h-6" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
