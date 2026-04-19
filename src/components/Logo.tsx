import React from "react";

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = "h-8", showText = true }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* O Novo "R" Estilizado Moderno Premium */}
      <svg
        viewBox="0 0 100 100"
        className="h-full w-auto drop-shadow-[0_0_15px_rgba(16,185,129,0.2)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Usamos o stroke esmeralda para os traços, sem o fundo fechado */}
         <path
            d="M30 65 L30 35 C30 25 45 25 55 25 C65 25 75 35 65 45 C55 55 45 45 30 45"
            stroke="currentColor"
            className="text-emerald-600"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M45 45 L65 70"
            stroke="currentColor"
            className="text-emerald-500"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
      </svg>
      {showText && (
        <span className="font-black text-2xl tracking-tighter text-slate-900 dark:text-zinc-100">
          Represente<span className="text-emerald-600">-se</span>
        </span>
      )}
    </div>
  );
};
