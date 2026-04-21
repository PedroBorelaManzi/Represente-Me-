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

  // Mask logic to remove black background using luminance
  // This ensures the logo stays sharp and transparent
  const maskStyle: React.CSSProperties = {
    maskImage: `url(${logoUrl})`,
    WebkitMaskImage: `url(${logoUrl})`,
    maskMode: "luminance",
    WebkitMaskMode: "luminance",
    maskSize: "contain",
    WebkitMaskSize: "contain",
    maskPosition: "center",
    WebkitMaskPosition: "center",
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat"
  };

  return (
    <div className={cn("flex items-center gap-3 group shrink-0", className)}>
      <div className={cn("relative flex items-center justify-center shrink-0", sizeMap[size])}>
        {/* Container with Mask */}
        <div 
          className="absolute inset-0 transition-transform duration-500 group-hover:scale-110"
          style={maskStyle}
        >
          {/* We render the image itself inside the masked container to keep its colors */}
          <img 
            src={logoUrl}
            alt="Represente-se"
            className="w-full h-full object-contain"
          />
        </div>
      </div>
      
      {!finalIconOnly && (
        <span className={cn(
          "font-black tracking-tighter flex items-center leading-none select-none uppercase whitespace-nowrap",
          size === 'lg' || size === 'xl' ? "text-3xl md:text-5xl" : "text-xl md:text-2xl"
        )}>
          <span className="text-slate-900 dark:text-white">Represente</span>
          <span className="text-emerald-600 dark:text-emerald-500 font-extrabold">-se!</span>
        </span>
      )}
    </div>
  );
};
