import React from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { ShieldAlert, CreditCard, ExternalLink, Mail } from 'lucide-react';
import { Logo } from './Logo';

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { settings, loading } = useSettings();

  // Se estiver carregando, não bloqueia ainda para evitar flashes
  if (loading) return <>{children}</>;

  // Se o status for 'past_due' ou 'inactive', mostramos a tela de bloqueio
  const isBlocked = settings.subscription_status === 'past_due' || settings.subscription_status === 'inactive';

  if (isBlocked) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20 dark:opacity-10">
          <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-400 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-400 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-md w-full space-y-8 relative z-10">
          <Logo size="lg" />
          
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 p-8 rounded-[40px] space-y-6 shadow-2xl shadow-red-500/10">
            <div className="w-20 h-20 bg-red-500 text-white rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-red-500/30">
              <ShieldAlert className="w-10 h-10" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Acesso Suspenso</h1>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] leading-relaxed">
                Identificamos uma pendência no seu pagamento recorrente. Seus dados estão salvos e seguros, mas o acesso ao painel foi temporariamente bloqueado.
              </p>
            </div>

            <div className="space-y-3">
              <button 
                onClick={() => window.open('https://www.asaas.com/minhas-cobrancas', '_blank')}
                className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
              >
                <CreditCard className="w-4 h-4" />
                Regularizar Agora
                <ExternalLink className="w-3.5 h-3.5 opacity-50" />
              </button>
              
              <button 
                className="w-full bg-transparent text-slate-400 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:text-slate-600 transition-colors"
                onClick={() => window.location.href = 'mailto:suporte@representeme.com'}
              >
                <Mail className="w-3.5 h-3.5" />
                Falar com Suporte
              </button>
            </div>
          </div>

          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            Assim que o pagamento for identificado, seu acesso será liberado automaticamente.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
