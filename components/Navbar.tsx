import React from 'react';
import { LogOut, Layout, FileText, UserCircle } from 'lucide-react';
import { User, ViewState } from '../types';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
  setView: (view: ViewState) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout, setView }) => {
  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center cursor-pointer" onClick={() => user && setView(ViewState.DASHBOARD)}>
            <div className="bg-blue-600 p-2 rounded-lg mr-3">
              <FileText className="text-white h-5 w-5" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              SynapseSync.AI
            </span>
          </div>

          {user && (
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 text-sm text-slate-600">
                <UserCircle className="h-5 w-5" />
                <span>{user.name}</span>
              </div>
              <button
                onClick={onLogout}
                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
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