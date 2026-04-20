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
  size = "lg" 
}) => {
  const sizeClasses = {
    sm: "h-14",
    md: "h-20",
    lg: "h-32",
    xl: "h-48"
  };

  const iconSize = sizeClasses[size];

  return (
    <div className={`flex items-center gap-8 ${className}`}>
      {/* 
        Ícone 3D com Brilho Neon Emerald e Máscara de Transparência
      */}
      <div 
        className={`${iconSize} aspect-square bg-emerald-600 relative shrink-0 drop-shadow-[0_0_25px_rgba(16,185,129,0.5)]`}
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
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-400 to-emerald-600 opacity-95" />
      </div>

      {showText && (
        <h1 className="font-black text-6xl md:text-7xl tracking-tighter flex items-center leading-none">
          <span className="text-slate-900 border-none">Represente</span>
          <span className="text-emerald-500 font-black">-se!</span>
        </h1>
      )}
    </div>
  );
};
