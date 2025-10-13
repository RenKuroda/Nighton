
import React from 'react';
import { Scope } from '../types';
import { SCOPE_LABELS } from '../constants';
import { LockIcon, UsersIcon, GlobeIcon } from './icons';

interface ScopeTabsProps {
  currentScope: Scope;
  setScope: (scope: Scope) => void;
}

const scopeOptions = [
  { scope: Scope.PRIVATE, Icon: LockIcon },
  { scope: Scope.COMMUNITY, Icon: UsersIcon },
  { scope: Scope.PUBLIC, Icon: GlobeIcon },
];

const ScopeTabs: React.FC<ScopeTabsProps> = ({ currentScope, setScope }) => {
  const activeIndex = scopeOptions.findIndex(opt => opt.scope === currentScope);

  return (
    <div className="px-4 mb-4">
      <div className="relative flex justify-between bg-slate-800 p-1 rounded-xl">
        <div
          className="absolute top-1 h-[calc(100%-0.5rem)] bg-purple-600 rounded-lg transition-all duration-300 ease-in-out"
          style={{
            width: `calc(33.33% - 0.5rem)`,
            left: `calc(${activeIndex * 33.33}% + 0.25rem)`,
            boxShadow: '0 0 15px rgba(168, 85, 247, 0.6)',
          }}
        />
        {scopeOptions.map(({ scope, Icon }) => (
          <button
            key={scope}
            onClick={() => setScope(scope)}
            className={`relative z-10 w-1/3 flex items-center justify-center gap-2 py-2.5 rounded-lg transition-colors duration-300 ${
              currentScope === scope ? 'text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-sm font-semibold">{SCOPE_LABELS[scope]}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ScopeTabs;
