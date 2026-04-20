import React from "react";
import logoUrl from "../assets/logo.png";

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = "h-8", showText = false }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* 
        Técnica de Remoção de Fundo Preto via CSS Puro:
        Usamos mask-image em conjunto com luminância para fazer o preto ser transparente 
        e o resto (verde) ser opaco. Isso funciona perfeitamente para sua imagem.
      */}
      <div 
        className="h-full w-auto min-w-[32px] bg-emerald-600 relative group"
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
        title="Represente-se"
      >
        {/* Camada de brilho esmeralda para dar o efeito 3D premium */}
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-400 to-emerald-600 opacity-90" />
      </div>

      {showText && (
        <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">
          Represente<span className="text-emerald-500">-se</span>
        </span>
      )}
    </div>
  );
};
