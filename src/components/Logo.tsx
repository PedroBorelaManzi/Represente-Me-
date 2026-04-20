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
        Utilizando CSS puro para ignorar pixels pretos e preservar apenas brilhos/cores! 
        Isso torna o fundo "preto" em fundo "transparente", e mescla o logo com 
        os temas escuros perfeitamente.
      */}
      <img 
        src={logoUrl} 
        alt="Represente-se" 
        className="h-full w-auto mix-blend-screen drop-shadow-emerald filter brightness-110 saturate-150" 
      />
    </div>
  );
};
