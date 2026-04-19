import React from "react";
import logoUrl from "../assets/logo.png";

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = "h-8", showText = false }) => {
  // O showText fica off por padrão pois a logo do usuário já contém "Represente-se" na imagem
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img src={logoUrl} alt="Represente-se" className="h-full w-auto drop-shadow-md" />
      {showText && (
        <span className="font-black text-2xl tracking-tighter text-slate-900 dark:text-zinc-100">
          Represente<span className="text-emerald-600">-se</span>
        </span>
      )}
    </div>
  );
};
