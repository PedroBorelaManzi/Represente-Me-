import React from "react";

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = "h-8", showText = true }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* O "R" com a Flecha Estilizada */}
      <svg 
        viewBox="0 0 100 100" 
        className="h-full w-auto drop-shadow-[0_0_15px_rgba(16,185,129,0.2)]"
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="100" height="100" rx="24" fill="currentColor" className="text-emerald-600" />
        <path 
          d="M35 70V30H55C63.2843 30 70 36.7157 70 45C70 53.2843 63.2843 60 55 60H35M35 60L55 80" 
          stroke="white" 
          strokeWidth="10" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        <path 
          d="M65 35L75 25M75 25V35M75 25H65" 
          stroke="white" 
          strokeWidth="6" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
      </svg>
      {showText && (
        <span className="font-black text-2xl tracking-tighter text-slate-900 dark:text-zinc-100">
          Represente<span className="text-emerald-600">-se</span>
        </span>
      )}
    </div>
  );
};
