import React, { useState } from 'react';
import { Smartphone, Building2, Key } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { offlineCache } from '../../lib/offlineCache';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export const SettingsMobile = React.memo(function SettingsMobile() {
  const { user } = useAuth();
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(() => localStorage.getItem("rm_biometric_enabled") === "true");

  return (
    <div className="space-y-8">
      <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Recursos do Aplicativo</h2>
      
      <div className="space-y-6">
        {/* Biometric Toggle */}
        <div className="p-4 md:p-6 rounded-2xl md:rounded-[32px] bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm text-purple-500">
                <Key className="w-6 h-6" />
              </div>
              <div className="text-left">
                <p className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Acesso Biométrico (Digital/Face ID)</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Desbloqueie o aplicativo sem digitar senha</p>
              </div>
            </div>
            
            <button 
              onClick={async () => {
                try {
                  const enabled = localStorage.getItem("rm_biometric_enabled") === "true";
                  if (!enabled) {
                    const pass = prompt("Para ativar a biometria, por favor digite sua senha atual para confirmação:");
                    if (!pass) return;
                    
                    const result = await NativeBiometric.isAvailable();
                    if (result.isAvailable) {
                      await NativeBiometric.setCredentials({
                        username: user?.email || "",
                        password: pass,
                        server: "representeme.app"
                      });
                      localStorage.setItem("rm_biometric_enabled", "true");
                      setIsBiometricEnabled(true);
                      toast.success("Desbloqueio biométrico ativado!");
                    } else {
                      toast.error("Biometria não disponível neste aparelho.");
                    }
                  } else {
                    localStorage.removeItem("rm_biometric_enabled");
                    await NativeBiometric.deleteCredentials({
                      server: "representeme.app"
                    });
                    setIsBiometricEnabled(false);
                    toast.success("Desbloqueio biométrico desativado.");
                  }
                } catch (e) {
                  toast.error("Dispositivo não suporta biometria ou cancelado.");
                }
              }}
              className={cn(
                "w-14 h-7 rounded-full p-1 transition-colors duration-300 relative",
                isBiometricEnabled ? "bg-emerald-500" : "bg-slate-300"
              )}
            >
              <motion.div 
                animate={{ x: isBiometricEnabled ? 28 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="w-5 h-5 rounded-full bg-white shadow-lg" 
              />
            </button>
          </div>
        </div>

        {/* Cache Management */}
        <div className="p-4 md:p-6 rounded-2xl md:rounded-[32px] bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm text-emerald-500">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="text-left">
                <p className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Gerenciamento de Dados Offline</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Verifique ou limpe as informações salvas no celular</p>
              </div>
            </div>
            
            <button 
              onClick={() => {
                offlineCache.clear();
                toast.success("Cache offline removido com sucesso!");
              }}
              className="px-6 py-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
            >
              Limpar Cache
            </button>
          </div>
          
          <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs font-bold text-slate-500">
            <span className="uppercase text-[9px] tracking-wider text-slate-400">Status da Sincronização</span>
            <span className="uppercase text-emerald-600">Dados Protegidos Localmente</span>
          </div>
        </div>

      </div>
    </div>
  );
});
