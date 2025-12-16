import React from 'react';

interface LogoProps {
  className?: string;
  classNamePath?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = "w-6 h-6" }) => {
  const gradientId = "logo_gradient_fill";

  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22d3ee" /> {/* Cyan-400 */}
          <stop offset="50%" stopColor="#3b82f6" /> {/* Blue-500 */}
          <stop offset="100%" stopColor="#a855f7" /> {/* Purple-500 */}
        </linearGradient>
      </defs>
      
      {/* Black Background Container (Rounded Rect) */}
      <rect width="24" height="24" rx="5" fill="#09090b" />
      
      {/* 
        The "S" Shape 
        Constructed as a geometric path with rounded turns, rotated -45deg to create the diamond orientation.
        It simulates the folded ribbon/infinity loop look.
      */}
      <g transform="rotate(-45 12 12)">
         <path 
            d="M 15 7 A 3 3 0 0 0 9 7 L 9 12 L 15 12 A 3 3 0 0 1 15 17 L 9 17"
            stroke={`url(#${gradientId})`}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
         />
      </g>
    </svg>
  );
};