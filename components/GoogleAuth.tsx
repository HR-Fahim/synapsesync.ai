import React, { useState } from 'react';
import { Button } from './Button';

interface GoogleAuthProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const GoogleAuth: React.FC<GoogleAuthProps> = ({ onSuccess, onCancel }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = () => {
    setIsLoading(true);
    // Simulate network delay
    setTimeout(() => {
      setIsLoading(false);
      onSuccess();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md p-8 border border-zinc-200 dark:border-white/10 rounded-xl shadow-2xl bg-white dark:bg-slate-900 text-center transition-colors">
        <div className="flex justify-center mb-6">
          {/* Simple Google Logo approximation */}
          <svg className="w-12 h-12" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
        </div>
        
        <h2 className="text-2xl font-medium text-zinc-900 dark:text-white mb-2">Sign in with Google</h2>
        <p className="text-zinc-600 dark:text-slate-400 mb-8">Choose an account to continue to <span className="font-semibold text-zinc-700 dark:text-slate-200">SynapseSync</span></p>

        <div 
          onClick={handleSignIn}
          className="group border border-zinc-200 dark:border-slate-700 bg-zinc-50 dark:bg-slate-800/50 rounded-lg p-3 flex items-center gap-4 cursor-pointer hover:bg-zinc-100 dark:hover:bg-slate-800 hover:border-blue-400 dark:hover:border-blue-500/50 transition-all text-left mb-6"
        >
          <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-purple-500/30 dark:shadow-purple-900/50">
            D
          </div>
          <div>
            <p className="font-medium text-zinc-900 dark:text-slate-200 text-sm">Demo User</p>
            <p className="text-zinc-600 dark:text-slate-500 text-xs">demo.user@example.com</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button 
            onClick={handleSignIn}
            isLoading={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white"
          >
            Continue
          </Button>
          <button 
            onClick={onCancel}
            className="text-sm text-zinc-500 hover:text-zinc-800 dark:text-slate-500 dark:hover:text-slate-300 font-medium"
          >
            Cancel
          </button>
        </div>
        
        <div className="mt-8 text-xs text-zinc-400 dark:text-slate-600">
          To continue, Google will share your name, email address, and language preference with SynapseSync.
        </div>
      </div>
    </div>
  );
};