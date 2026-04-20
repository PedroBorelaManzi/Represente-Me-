import React from 'react';
import { cn } from '../lib/utils';
import logoUrl from '../assets/logo.png';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  showText?: boolean; // Compatibilidade com LandingPage
  size?: 'sm' | 'md' | 'lg' | 'xl'; // Compatibilidade com LandingPage
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
    lg: 'h-20 w-20',
    xl: 'h-32 w-32'
  };

  const finalIconOnly = iconOnly || !showText;

  return (
    <div className={cn("flex items-center gap-3 group", className)}>
      <div className={cn("relative flex items-center justify-center overflow-hidden shrink-0", sizeMap[size])}>
        {/* Logo 3D Icon with aggressive isolation and enhancement */}
        <div 
          className="relative w-full h-full overflow-hidden rounded-xl"
          style={{
            maskImage: `url(${logoUrl})`,
            maskMode: "luminance",
            WebkitMaskImage: `url(${logoUrl})`,
            WebkitMaskMode: "luminance",
            maskSize: finalIconOnly ? "100% 160%" : "contain",
            WebkitMaskSize: finalIconOnly ? "100% 160%" : "contain",
            maskPosition: "top center",
            WebkitMaskPosition: "top center",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat"
          }}
        >
          <img 
            src={logoUrl}
            alt="Represente-se"
            className={cn(
              "w-full h-full object-cover transition-all duration-500",
              "filter contrast-[1.8] saturate-[2.2] brightness-[1.2]",
              "group-hover:scale-125"
            )}
            style={{
              objectPosition: "top center",
              transformOrigin: "top center"
            }}
          />
        </div>
      </div>
      
      {!finalIconOnly && (
        <span className={cn(
          "font-black tracking-tighter flex items-center leading-none select-none uppercase",
          size === 'lg' || size === 'xl' ? "text-3xl md:text-5xl" : "text-xl md:text-2xl"
        )}>
          <span className="text-slate-900 dark:text-white">Represente</span>
          <span className="text-emerald-600 dark:text-emerald-500 font-extrabold">-se!</span>
        </span>
      )}
    </div>
  );
};
