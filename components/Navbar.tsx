import React from 'react';
import { LogOut, UserCircle, Crown } from 'lucide-react';
import { User, ViewState, SubscriptionTier } from '../types';
import { Logo } from './Logo';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
  setView: (view: ViewState) => void;
  onOpenSubscription: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout, setView, onOpenSubscription }) => {
  
  const getBadgeColor = (tier: SubscriptionTier) => {
    switch (tier) {
      case 'PREMIUM': return 'bg-amber-100 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-500 dark:border-amber-500/20';
      case 'PRO': return 'bg-indigo-100 text-indigo-600 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20';
      default: return 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700';
    }
  };

  return (
    <nav className="bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-40 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14">
          <div className="flex items-center cursor-pointer gap-2" onClick={() => user && setView(ViewState.DASHBOARD)}>
            <div className="bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded border border-zinc-200 dark:border-zinc-800">
                <Logo className="w-5 h-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Synapse<span className="text-zinc-500 dark:text-zinc-500">Sync</span>
            </span>
          </div>

          {user && (
            <div className="flex items-center gap-4">
              <button 
                onClick={onOpenSubscription}
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-medium border uppercase tracking-wide transition-colors hover:bg-opacity-80 dark:hover:bg-opacity-20 ${getBadgeColor(user.tier)}`}
              >
                {user.tier === 'PREMIUM' && <Crown size={10} fill="currentColor" />}
                {user.tier} Plan
              </button>

              <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-1"></div>

              <div className="hidden md:flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                <UserCircle className="h-4 w-4 text-zinc-500 dark:text-zinc-500" />
                <span>{user.name}</span>
              </div>
              <button
                onClick={onLogout}
                className="text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-200 transition-colors"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};