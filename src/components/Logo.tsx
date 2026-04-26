import React from 'react';
import { cn } from '../lib/utils';
import logoUrl from '../assets/logo.png';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Logo: React.FC<LogoProps> = ({ 
  className, 
  iconOnly = false, 
  showText = true, 
  size = 'md' 
}) => {
  const sizeMap = {
    sm: 'h-8 w-8',
    md: 'h-11 w-11',
    lg: 'h-24 w-24',
    xl: 'h-40 w-40'
  };

  const finalIconOnly = iconOnly || !showText;

  return (
    <div className={cn("flex items-center gap-3 group shrink-0", className)}>
      <div className={cn("relative flex items-center justify-center shrink-0 overflow-hidden", sizeMap[size])}>
        {/* 
          Emerald 3D Logo on Pure White Background with Multiply blend mode.
          This technique makes the white background 100% transparent on light-colored pages.
        */}
        <img 
          src={logoUrl}
          alt="Represente-se"
          className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110 mix-blend-multiply dark:mix-blend-normal dark:brightness-[2.2] dark:contrast-[1.5] dark:drop-shadow-[0_0_20px_rgba(16,185,129,0.7)]"
        />
      </div>
      
      {!finalIconOnly && (
        <span className={cn(
          "font-black tracking-tighter flex items-center leading-none select-none uppercase whitespace-nowrap",
          size === 'lg' || size === 'xl' ? "text-xl md:text-5xl" : "text-lg md:text-2xl"
        )}>
          <span className="text-slate-900 dark:text-white">Represente</span>
          <span className="text-emerald-600 dark:text-emerald-500 font-extrabold">-se!</span>
        </span>
      )}
    </div>
  );
};



