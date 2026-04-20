import React from "react";
import logoUrl from "../assets/logo.png";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}

export const Logo: React.FC<LogoProps> = ({ 
  className = "", 
  showText = false,
  size = "md" 
}) => {
  const sizeClasses = {
    sm: "h-8",
    md: "h-11", // Perfeito para a Navbar (44px)
    lg: "h-20",
    xl: "h-32"
  };

  const iconSize = sizeClasses[size];

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* 
        Ícone com Nitidez Máxima e Cores Vibrantes
      */}
      <div 
        className={`${iconSize} aspect-square bg-emerald-500 relative shrink-0 drop-shadow-[0_0_15px_rgba(16,185,129,0.4)] brightness-110 contrast-125 saturate-150`}
        style={{
          maskImage: `url(${logoUrl})`,
          WebkitMaskImage: `url(${logoUrl})`,
          maskSize: 'contain',
          WebkitMaskSize: 'contain',
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
          maskMode: 'luminance',
          WebkitMaskMode: 'luminance'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-400 via-emerald-500 to-emerald-300 opacity-100" />
      </div>

      {showText && (
        <span className="font-black text-2xl md:text-3xl tracking-tighter flex items-center leading-none select-none">
          <span className="text-slate-900">Represente</span>
          <span className="text-emerald-500 font-extrabold">-se!</span>
        </span>
      )}
    </div>
  );
};
