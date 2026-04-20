import React from "react";
import logoUrl from "../assets/logo.png";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  iconOnly?: boolean; // Nova prop para esconder o texto interno da imagem
}

export const Logo: React.FC<LogoProps> = ({ 
  className = "", 
  showText = false,
  size = "md",
  iconOnly = false
}) => {
  const sizeClasses = {
    sm: "h-8",
    md: "h-11",
    lg: "h-20",
    xl: "h-32"
  };

  const iconSize = sizeClasses[size];

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* 
        Ícone com Corte Estratégico
        Se iconOnly for true, cortamos a parte inferior (onde fica o texto da imagem)
      */}
      <div 
        className={`${iconSize} aspect-square relative shrink-0 overflow-hidden group`}
        style={{
          maskImage: `url(${logoUrl})`,
          WebkitMaskImage: `url(${logoUrl})`,
          maskMode: 'luminance',
          WebkitMaskMode: 'luminance',
          maskSize: iconOnly ? '100% 160%' : 'contain', // Ajuste para esconder o texto
          WebkitMaskSize: iconOnly ? '100% 160%' : 'contain',
          maskPosition: 'top center',
          WebkitMaskPosition: 'top center',
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat'
        }}
      >
        <img 
          src={logoUrl}
          alt="Logo Icon"
          className={`w-full h-full object-cover contrast-150 saturate-[1.8] brightness-125`}
          style={{
            objectPosition: iconOnly ? 'top center' : 'center',
            transform: iconOnly ? 'scale(1.4)' : 'none', // Foca no "R"
            transformOrigin: 'top center'
          }}
        />
        
        {/* Camada de Brilho Extra para "Vibrar" a cor */}
        <div className="absolute inset-0 bg-emerald-500/10 mix-blend-overlay pointer-events-none" />
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
