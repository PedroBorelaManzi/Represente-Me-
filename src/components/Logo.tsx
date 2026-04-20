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
    md: 'h-11 w-11', // Tamanho calibrado para o cabeçalho
    lg: 'h-24 w-24',
    xl: 'h-40 w-40'
  };

  const finalIconOnly = iconOnly || !showText;

  // Mask sync logic to ensure background removal matches the image transform
  const maskStyle: React.CSSProperties = {
    maskImage: `url(${logoUrl})`,
    maskMode: "luminance",
    WebkitMaskImage: `url(${logoUrl})`,
    WebkitMaskMode: "luminance",
    maskSize: "140% auto", // Zoom para focar no R e esconder o texto
    WebkitMaskSize: "140% auto",
    maskPosition: "top center",
    WebkitMaskPosition: "top center",
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat"
  };

  return (
    <div className={cn("flex items-center gap-3 group shrink-0", className)}>
      <div className={cn("relative flex items-center justify-center overflow-hidden shrink-0 rounded-xl", sizeMap[size])}>
        {/* The 'R' Icon - Preserving original aspect ratio using auto-height and top-crop */}
        <div 
          className="absolute inset-0 transition-transform duration-500 group-hover:scale-110"
          style={maskStyle}
        >
          <img 
            src={logoUrl}
            alt="Represente-se"
            className={cn(
              "w-full h-auto object-contain transition-all duration-500",
              "filter contrast-[1.3] saturate-[1.6] brightness-[1.1]",
            )}
            style={{
              width: '140%', // Combina com o maskSize para manter fidelidade
              maxWidth: 'none',
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)'
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
