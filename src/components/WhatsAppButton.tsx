import React, { useState } from 'react';
import { cn } from '../lib/utils';

interface WhatsAppButtonProps {
  /** Número de telefone opcional (ex: "+55 (11) 99999-9999" ou apenas "11999999999") */
  phoneNumber?: string;
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
    const cleanedNumber = phoneNumber ? formatPhoneNumber(phoneNumber) : '';
    const encodedText = encodeURIComponent(message);

    const userAgent = typeof window !== 'undefined' 
      ? (navigator.userAgent || navigator.vendor || (window as any).opera)
      : '';
      
    const isMobile = typeof window !== 'undefined' 
      ? (/android|iphone|ipad|ipod|iemobile|opera mini/i.test(userAgent.toLowerCase()) ||
         (navigator.maxTouchPoints && navigator.maxTouchPoints > 2))
      : false;

    // Se não houver número, redireciona de forma limpa usando Universal Links oficiais sem erros
    if (!cleanedNumber) {
      if (isMobile) {
        return 'https://whatsapp.com/dl'; // Link universal oficial da Apple Associated Domains. Abre o app direto sem perguntar se clicado nativamente!
      } else {
        return 'https://web.whatsapp.com/'; // Abre a home do WhatsApp Web no Desktop
      }
    }

    const textQuery = encodedText ? `?text=${encodedText}` : '';
    const textQueryWeb = encodedText ? `&text=${encodedText}` : '';

    if (isMobile) {
      return `https://wa.me/${cleanedNumber}${textQuery}`;
    } else {
      return `https://web.whatsapp.com/send?phone=${cleanedNumber}${textQueryWeb}`;
    }
  };

  const WhatsAppIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-5 h-5 transition-all duration-300 group-hover:scale-110"
    >
      <path d="M12.012 2c-5.506 0-9.988 4.482-9.988 9.988 0 1.761.46 3.473 1.336 4.988L2 22l5.176-1.357c1.47.801 3.13 1.22 4.825 1.22 5.506 0 9.988-4.482 9.988-9.988C22 6.482 17.518 2 12.012 2zm0 18.294c-1.49 0-2.951-.4-4.225-1.157l-.303-.18-3.144.825.84-3.064-.197-.314c-.832-1.326-1.272-2.868-1.272-4.457 0-4.57 3.72-8.29 8.29-8.29 4.57 0 8.29 3.72 8.29 8.29 0 4.57-3.72 8.29-8.29 8.29zm4.536-6.198c-.248-.124-1.468-.724-1.696-.807-.228-.083-.393-.124-.559.124-.166.248-.641.807-.786.973-.145.166-.29.186-.539.062-.248-.124-1.048-.386-1.996-1.232-.738-.659-1.236-1.472-1.38-1.72-.145-.248-.015-.382.11-.506.112-.112.248-.29.373-.434.124-.145.166-.248.248-.414.083-.166.041-.31-.021-.434-.062-.124-.559-1.346-.766-1.843-.201-.484-.406-.418-.559-.426-.145-.008-.31-.01-.476-.01-.166 0-.435.062-.662.31-.228.248-.869.849-.869 2.071 0 1.221.89 2.401.99 2.536.1.135 1.752 2.674 4.246 3.75.593.256 1.058.409 1.418.524.597.19 1.14.163 1.57.099.479-.071 1.468-.6 1.674-1.18.207-.58.207-1.077.145-1.18-.062-.103-.228-.145-.476-.269z"/>
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
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "group flex items-center gap-4 transition-all duration-300 relative overflow-hidden",
          variant === 'sidebar' && 
            "px-4 py-3.5 rounded-2xl text-slate-500 dark:text-zinc-400 hover:text-emerald-600 hover:bg-slate-50 dark:hover:bg-zinc-800/30 active:scale-[0.98]",
          variant === 'button' && 
            "px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold text-[14px] shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/25 hover:from-emerald-600 hover:to-green-700 active:scale-[0.97] justify-center w-full",
          variant === 'outline' && 
            "px-6 py-3 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-transparent text-slate-600 dark:text-zinc-300 font-semibold text-[14px] hover:bg-slate-50 dark:hover:bg-zinc-800/30 hover:border-emerald-500 dark:hover:border-emerald-500/50 hover:text-emerald-600 active:scale-[0.97] justify-center w-full",
          className
        )}
      >
        <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />
        <WhatsAppIcon />
        <span className={cn(
          "transition-colors duration-300",
          variant === 'sidebar' ? "text-[13px] font-bold uppercase tracking-tight" : "text-[14px]"
        )}>
          {label}
        </span>
      </a>
      {showTooltip && (
        <div className="absolute left-1/2 -translate-x-1/2 -top-10 z-[110] px-3 py-1.5 bg-slate-950/80 dark:bg-zinc-900/90 text-white text-[11px] font-medium rounded-xl whitespace-nowrap shadow-xl backdrop-blur-md border border-white/10 animate-in fade-in slide-in-from-bottom-2 duration-200 pointer-events-none">
          Abrir WhatsApp
        </div>
      )}
    </div>
  );
};
