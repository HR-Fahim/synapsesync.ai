import React from 'react';
import { LogOut, BrainCircuit, UserCircle, Crown } from 'lucide-react';
import { User, ViewState, SubscriptionTier } from '../types';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
  setView: (view: ViewState) => void;
  onOpenSubscription: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout, setView, onOpenSubscription }) => {
  
  const getBadgeColor = (tier: SubscriptionTier) => {
    switch (tier) {
      case 'PREMIUM': return 'bg-gradient-to-r from-amber-300 to-yellow-500 text-black border-amber-400 font-bold';
      case 'PRO': return 'bg-slate-800 text-blue-400 border-slate-600';
      default: return 'bg-slate-900 text-slate-400 border-slate-800';
    }
  };

  return (
    <nav className="bg-slate-950/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center cursor-pointer" onClick={() => user && setView(ViewState.DASHBOARD)}>
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur opacity-40 group-hover:opacity-75 transition duration-200"></div>
              <div className="relative bg-slate-900 p-2 rounded-lg mr-3 border border-white/10">
                <BrainCircuit className="text-blue-400 h-5 w-5" />
              </div>
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              SynapseSync.AI
            </span>
          </div>

          {user && (
            <div className="flex items-center gap-4">
              <button 
                onClick={onOpenSubscription}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border transition-transform hover:scale-105 ${getBadgeColor(user.tier)}`}
              >
                {user.tier === 'PREMIUM' && <Crown size={12} fill="currentColor" />}
                {user.tier}
              </button>

              <div className="hidden md:flex items-center gap-2 text-sm text-slate-400">
                <UserCircle className="h-5 w-5" />
                <span>{user.name}</span>
              </div>
              <button
                onClick={onLogout}
                className="p-2 text-slate-500 hover:text-red-400 hover:bg-white/5 rounded-full transition-all"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};