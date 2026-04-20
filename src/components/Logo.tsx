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
    md: 'h-10 w-10', // Ajustado para alinhar perfeitamente com o texto do cabeçalho
    lg: 'h-24 w-24',
    xl: 'h-40 w-40'
  };

  const finalIconOnly = iconOnly || !showText;

  return (
    <div className={cn("flex items-center gap-3 group shrink-0", className)}>
      <div className={cn("relative flex items-center justify-center overflow-hidden shrink-0", sizeMap[size])}>
        {/* Logo 3D Icon with high-precision cropping to isolate the 'R' */}
        <div 
          className="relative w-full h-full overflow-hidden"
          style={{
            maskImage: `url(${logoUrl})`,
            maskMode: "luminance",
            WebkitMaskImage: `url(${logoUrl})`,
            WebkitMaskMode: "luminance",
            // We use a larger vertical scale to "crop" the sub-text from the image assets
            maskSize: "100% 170%",
            WebkitMaskSize: "100% 170%",
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
              "filter contrast-[1.4] saturate-[1.8] brightness-[1.1]",
              "group-hover:scale-110"
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
