import React, { useState } from 'react';
import { cn } from '../lib/utils';

interface WhatsAppButtonProps {
  /** Número de telefone (ex: "+55 (11) 99999-9999" ou apenas "11999999999") */
  phoneNumber: string;
  /** Mensagem pré-definida opcional (URI-encoded automaticamente pelo componente) */
  message?: string;
  /** Label do botão (padrão: "WhatsApp") */
  label?: string;
  /** Classes Tailwind extras para customização de estilo */
  className?: string;
  /** Variante visual para se adaptar a diferentes locais da interface:
   * 'sidebar': estilo de item de menu lateral (igual ao item de E-mail)
   * 'button': estilo de botão de ação padrão (preenchido/premium)
   * 'outline': estilo de botão com bordas vazadas
   */
  variant?: 'sidebar' | 'button' | 'outline';
}

export const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({
  phoneNumber,
  message = '',
  label = 'WhatsApp',
  className,
  variant = 'button',
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Limpeza e Formatação Segura do Número (Padrão Internacional)
  const formatPhoneNumber = (num: string): string => {
    let cleaned = num.replace(/\D/g, '');
    if (cleaned.length >= 10 && !cleaned.startsWith('55') && cleaned.length <= 11) {
      cleaned = '55' + cleaned;
    }
    return cleaned;
  };

  // Detecção Inteligente de Dispositivo (User Agent + Capabilities)
  const getDeviceRedirectUrl = (): string => {
    const cleanedNumber = formatPhoneNumber(phoneNumber);
    const encodedText = encodeURIComponent(message);
    const textQuery = encodedText ? `?text=${encodedText}` : '';
    const textQueryWeb = encodedText ? `&text=${encodedText}` : '';

    if (typeof window === 'undefined') {
      return `https://wa.me/${cleanedNumber}${textQuery}`;
    }

    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isMobile = /android|iphone|ipad|ipod|iemobile|opera mini/i.test(userAgent.toLowerCase()) ||
                     (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);

    if (isMobile) {
      return `https://wa.me/${cleanedNumber}${textQuery}`;
    } else {
      return `https://web.whatsapp.com/send?phone=${cleanedNumber}${textQueryWeb}`;
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const targetUrl = getDeviceRedirectUrl();
    setTimeout(() => {
      setIsLoading(false);
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }, 450);
  };

  const WhatsAppIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        "w-5 h-5 transition-transform duration-300 group-hover:scale-110",
        isLoading && "animate-ping text-emerald-400"
      )}
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1Z" fill="currentColor" opacity="0.1" />
      <path d="M14 15a.5.5 0 0 0 1 0v-1a.5.5 0 0 0-1 0v1Z" fill="currentColor" opacity="0.1" />
      <path d="M9 10c.5 1.5 1.5 2.5 3 3" />
    </svg>
  );

  return (
    <div 
      className="relative inline-block w-full"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <a
        href={getDeviceRedirectUrl()}
        onClick={handleClick}
        className={cn(
          "group flex items-center gap-4 transition-all duration-300 relative overflow-hidden",
          variant === 'sidebar' && 
            "px-4 py-3.5 rounded-2xl text-slate-500 dark:text-zinc-400 hover:text-emerald-600 hover:bg-slate-50 dark:hover:bg-zinc-800/30 active:scale-[0.98]",
          variant === 'button' && 
            "px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold text-[14px] shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/25 hover:from-emerald-600 hover:to-green-700 active:scale-[0.97] justify-center w-full",
          variant === 'outline' && 
            "px-6 py-3 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-transparent text-slate-600 dark:text-zinc-300 font-semibold text-[14px] hover:bg-slate-50 dark:hover:bg-zinc-800/30 hover:border-emerald-500 dark:hover:border-emerald-500/50 hover:text-emerald-600 active:scale-[0.97] justify-center w-full",
          isLoading && "pointer-events-none opacity-85",
          className
        )}
      >
        <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
        ) : (
          <WhatsAppIcon />
        )}
        <span className={cn(
          "transition-colors duration-300",
          variant === 'sidebar' ? "text-[13px] font-bold uppercase tracking-tight" : "text-[14px]"
        )}>
          {isLoading ? "Conectando..." : label}
        </span>
      </a>
      {showTooltip && !isLoading && (
        <div className="absolute left-1/2 -translate-x-1/2 -top-10 z-[110] px-3 py-1.5 bg-slate-950/80 dark:bg-zinc-900/90 text-white text-[11px] font-medium rounded-xl whitespace-nowrap shadow-xl backdrop-blur-md border border-white/10 animate-in fade-in slide-in-from-bottom-2 duration-200 pointer-events-none">
          Abrir conversa no WhatsApp
        </div>
      )}
    </div>
  );
};
