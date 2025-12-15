import React from 'react';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from './Button';

interface EmailVerificationProps {
  email: string;
  onBackToLogin: () => void;
}

export const EmailVerification: React.FC<EmailVerificationProps> = ({ email, onBackToLogin }) => {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden transition-colors">
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-100 dark:bg-blue-600/10 rounded-full blur-[100px] pointer-events-none opacity-50 dark:opacity-100"></div>
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-100 dark:bg-purple-600/10 rounded-full blur-[100px] pointer-events-none opacity-50 dark:opacity-100"></div>

      <div className="w-full max-w-md bg-white/80 dark:bg-slate-900/80 p-8 rounded-2xl border border-zinc-200 dark:border-white/10 shadow-2xl backdrop-blur-md text-center animate-in fade-in zoom-in duration-300">
        <div className="w-20 h-20 bg-blue-100 dark:bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-blue-500/40">
          <Mail size={40} className="text-blue-600 dark:text-blue-400" />
        </div>

        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">Verify your email</h2>
        
        <div className="bg-zinc-50 dark:bg-slate-950/50 rounded-lg p-4 border border-zinc-200 dark:border-white/5 mb-6">
          <p className="text-zinc-600 dark:text-slate-400 text-sm mb-2">
            We have sent you a verification email to:
          </p>
          <p className="text-zinc-900 dark:text-white font-medium break-all">
            {email}
          </p>
        </div>

        <p className="text-zinc-600 dark:text-slate-400 text-sm mb-8 leading-relaxed">
          Please check your inbox (and spam folder) and click the verification link to activate your account.
        </p>

        <div className="space-y-3">
          <Button 
            onClick={onBackToLogin}
            className="w-full py-3 text-base"
            size="lg"
          >
            I've Verified, Log In
          </Button>
          
          <button 
            onClick={onBackToLogin}
            className="flex items-center justify-center w-full text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white py-2 transition-colors"
          >
            <ArrowLeft size={16} className="mr-2" /> Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
};