import React from 'react';
import { Check, X, Zap } from 'lucide-react';
import { Button } from './Button';
import { SubscriptionTier } from '../types';

interface SubscriptionModalProps {
  currentTier: SubscriptionTier;
  onSelectTier: (tier: SubscriptionTier) => void;
  onClose: () => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ currentTier, onSelectTier, onClose }) => {
  const plans = [
    {
      id: 'FREE' as SubscriptionTier,
      name: 'Free',
      price: '$0',
      features: [
        'Max 5 files upload',
        'Auto-update every 14 days',
        '5 Manual edits / week',
        'Basic AI Chat'
      ],
      limitations: [
        'No Loop customization',
        'Limited storage'
      ]
    },
    {
      id: 'PRO' as SubscriptionTier,
      name: 'Pro',
      price: '$19/mo',
      features: [
        'Max 25 files upload',
        'Auto-update: 14 or 30 days',
        '15 Manual edits / week',
        'Priority AI Processing'
      ],
      limitations: []
    },
    {
      id: 'PREMIUM' as SubscriptionTier,
      name: 'Premium',
      price: '$49/mo',
      features: [
        'Max 50 files upload',
        'Auto-update: 7, 14, or 30 days',
        'Unlimited manual edits',
        'Advanced AI Analysis'
      ],
      limitations: []
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 rounded-2xl shadow-2xl border border-white/10 w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-slate-950/50">
          <div>
            <h2 className="text-2xl font-bold text-white">Upgrade your Plan</h2>
            <p className="text-slate-400">Choose the perfect plan for your document management needs</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-slate-950">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan) => {
              const isCurrent = currentTier === plan.id;
              const isPremium = plan.id === 'PREMIUM';
              
              return (
                <div 
                  key={plan.id}
                  className={`relative bg-slate-900 rounded-2xl p-8 flex flex-col ${
                    isCurrent 
                      ? 'ring-2 ring-blue-600 shadow-lg shadow-blue-900/20' 
                      : isPremium 
                        ? 'border border-purple-500/30 shadow-md hover:shadow-xl hover:shadow-purple-900/20 transition-all' 
                        : 'border border-slate-800 shadow-sm hover:border-slate-700 transition-all'
                  }`}
                >
                  {isPremium && (
                    <div className="absolute top-0 right-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl flex items-center gap-1 shadow-lg">
                      <Zap size={12} fill="currentColor" /> BEST VALUE
                    </div>
                  )}
                  
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-3xl font-bold text-white">{plan.price}</span>
                      <span className="text-slate-500">/month</span>
                    </div>
                  </div>

                  <ul className="space-y-4 mb-8 flex-1">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm text-slate-300">
                        <Check size={18} className="text-green-500 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                    {plan.limitations.map((limitation, idx) => (
                      <li key={`lim-${idx}`} className="flex items-start gap-3 text-sm text-slate-600">
                        <X size={18} className="text-slate-700 shrink-0 mt-0.5" />
                        <span>{limitation}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={isCurrent ? 'outline' : isPremium ? 'primary' : 'primary'}
                    className={`w-full ${isPremium && !isCurrent ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 border-none text-white' : ''}`}
                    onClick={() => {
                      if (!isCurrent) onSelectTier(plan.id);
                      onClose();
                    }}
                    disabled={isCurrent}
                  >
                    {isCurrent ? 'Current Plan' : 'Select Plan'}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};