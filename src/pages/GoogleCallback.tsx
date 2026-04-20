import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Loader2, CheckCircle2, AlertCircle, Globe, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Processando sua conexão com o Google...");

  useEffect(() => {
    if (loading) return;

    async function handleCallback() {
      const code = searchParams.get("code");
      
      if (!code) {
        setStatus("error");
        setMessage("Código de autorização não encontrado. A autorização foi negada ou o link expirou.");
        return;
      }

      if (!user) {
        setStatus("error");
        setMessage("Sessão não identificada. Por favor, faça login no site novamente antes de conectar o Google.");
        return;
      }

      try {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
        const redirectUri = `${window.location.origin}/auth/callback/google`;

        if (!clientId || !clientSecret) {
          throw new Error("As chaves do Google (Client ID/Secret) não foram configuradas.");
        }

        const response = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
          }),
        });

        const tokens = await response.json();
        if (tokens.error) throw new Error(tokens.error_description || tokens.error);

        const { error: upsertError } = await supabase
          .from("user_google_tokens")
          .upsert({
            user_id: user.id,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token, 
            expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });

        if (upsertError) throw upsertError;

        setStatus("success");
        setMessage("Google Agenda sincronizado com o Ecossistema Represente-se.");
        
        setTimeout(() => {
          navigate("/dashboard/agenda");
        }, 2000);

      } catch (err: any) {
        console.error("Erro no callback do Google:", err);
        setStatus("error");
        setMessage(`Falha na conexão: ${err.message}`);
      }
    }

    handleCallback();
  }, [searchParams, user, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 p-8">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20 dark:opacity-5">
         <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-emerald-400 rounded-full blur-[160px]" />
         <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-400 rounded-full blur-[160px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="max-w-xl w-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl rounded-[56px] border border-white dark:border-zinc-800 shadow-[0_48px_96px_-24px_rgba(0,0,0,0.1)] p-16 text-center relative z-10"
      >
        <AnimatePresence mode="wait">
          {(status === "loading" || loading) && (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-10"
            >
              <div className="relative inline-block">
                 <div className="absolute inset-0 bg-emerald-500 rounded-full blur-2xl opacity-20 animate-pulse" />
                 <Loader2 className="w-20 h-20 text-emerald-600 animate-spin mx-auto relative z-10" />
              </div>
              <div>
                 <h2 className="text-3xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tighter mb-4">Sincronizando</h2>
                 <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{message}</p>
              </div>
            </motion.div>
          )}

          {status === "success" && !loading && (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-10"
            >
              <div className="w-24 h-24 bg-emerald-600 rounded-[32px] flex items-center justify-center mx-auto ">
                <CheckCircle2 className="w-12 h-12 text-white" />
              </div>
              <div>
                 <h2 className="text-3xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tighter mb-4 text-emerald-600">Integrado com Sucesso</h2>
                 <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{message}</p>
              </div>
              <div className="flex justify-center gap-2">
                 <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" />
                 <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce [animation-delay:-.3s]" />
                 <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce [animation-delay:-.5s]" />
              </div>
            </motion.div>
          )}

          {status === "error" && !loading && (
            <motion.div 
              key="error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-10"
            >
              <div className="relative inline-block">
                 <div className="absolute inset-0 bg-red-500 rounded-full blur-2xl opacity-20" />
                 <AlertCircle className="w-20 h-20 text-red-500 mx-auto relative z-10" />
              </div>
              <div>
                 <h2 className="text-3xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tighter mb-4">Conexão Interrompida</h2>
                 <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-relaxed">{message}</p>
              </div>
              <div className="flex flex-col gap-4 pt-6">
                <button 
                  onClick={() => navigate("/dashboard/agenda")}
                  className="w-full py-6 bg-emerald-600 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-[24px] hover:bg-emerald-700 transition-all shadow-2xl active:scale-95"
                >
                  Tentar Novamente
                </button>
                <button 
                  onClick={() => navigate("/")}
                  className="w-full py-6 bg-slate-50 dark:bg-zinc-800 text-slate-400 font-black uppercase tracking-[0.2em] text-[10px] rounded-[24px] hover:bg-slate-100 transition-all active:scale-95"
                >
                  Dashboard Principal
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-16 pt-8 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-center gap-8 opacity-40">
           <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-slate-400"><Globe className="w-3 h-3" /> Encrypted Connection</div>
           <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-slate-400"><ShieldCheck className="w-3 h-3" /> OAuth 2.0 Certified</div>
        </div>
      </motion.div>
    </div>
  );
}
