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
  // Mapeamento de tamanhos para a marca
  const sizeClasses = {
    sm: "h-6",
    md: "h-10",
    lg: "h-14",
    xl: "h-20"
  };

  const iconSize = sizeClasses[size];

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* 
        Ícone 3D com Máscara de Luminância (Remove o fundo preto)
      */}
      <div 
        className={`${iconSize} aspect-square bg-emerald-600 relative shrink-0`}
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
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-400 to-emerald-600 opacity-90 shadow-lg shadow-emerald-500/20" />
      </div>

      {showText && (
        <span className="font-bold text-2xl tracking-tighter text-slate-900 dark:text-white">
          Represente<span className="text-emerald-500">-se!</span>
        </span>
      )}
    </div>
  );
};
