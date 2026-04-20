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
        Ajuste técnico: Usamos mask-image para tratar o preto da imagem como canal alpha. 
        Isso garante que onde for preto na sua imagem original, ficará transparente no site.
      */}
      <div 
        className="h-full aspect-square bg-emerald-600"
        style={{
          maskImage: `url(${logoUrl})`,
          WebkitMaskImage: `url(${logoUrl})`,
          maskSize: 'contain',
          WebkitMaskSize: 'contain',
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
        }}
      />
      {/* Fallback para garantir visibilidade da tipografia se ela estiver no png */}
      <img 
        src={logoUrl} 
        alt="Represente-se" 
        className="h-full w-auto mix-blend-screen brightness-125 saturate-150" 
      />
    </div>
  );
};
