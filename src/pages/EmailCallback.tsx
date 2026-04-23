import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Loader2, CheckCircle2, AlertCircle, Globe, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function EmailCallback() {
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Processando conexão de E-mail...");

  function parseJwt (token: string) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  }

  useEffect(() => {
    if (loading) return;

    async function handleCallback() {
      const code = searchParams.get("code");
      const providerState = searchParams.get("state") || "google";
      
      if (!code) {
        setStatus("error");
        setMessage("Código de autorização não encontrado. A autorização foi negada ou o link expirou.");
        return;
      }

      if (!user) {
        setStatus("error");
        setMessage("Sessão não identificada. Por favor, faça login no site novamente.");
        return;
      }

      try {
        let endpoint = "";
        let bodyRequest = new URLSearchParams();
        const redirectUri = `${window.location.origin}/auth/callback/email`;

        if (providerState === 'google') {
           const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
           const secret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
           if(!clientId || !secret) throw new Error("As chaves do Google (Client ID/Secret) não foram configuradas.");
           
           endpoint = "https://oauth2.googleapis.com/token";
           bodyRequest.append("client_id", clientId);
           bodyRequest.append("client_secret", secret);
           bodyRequest.append("code", code);
           bodyRequest.append("redirect_uri", redirectUri);
           bodyRequest.append("grant_type", "authorization_code");
        } else {
           const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID;
           const secret = import.meta.env.VITE_MICROSOFT_CLIENT_SECRET;
           if(!clientId) throw new Error("Chaves da Microsoft ausentes.");

           endpoint = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
           bodyRequest.append("client_id", clientId);
           if(secret) bodyRequest.append("client_secret", secret);
           bodyRequest.append("code", code);
           bodyRequest.append("redirect_uri", redirectUri);
           bodyRequest.append("grant_type", "authorization_code");
        }

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: bodyRequest,
        });

        const tokens = await response.json();
        if (tokens.error) throw new Error(tokens.error_description || tokens.error);

        let emailAddress = "Contectado";
        if (tokens.id_token) {
           try {
             emailAddress = parseJwt(tokens.id_token).email || emailAddress;
           } catch { }
        }

        const { error: upsertError } = await supabase
          .from("user_email_tokens")
          .upsert({
            user_id: user.id,
            provider: providerState,
            email_address: emailAddress,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token, 
            expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id, email_address" });

        if (upsertError) throw upsertError;

        setStatus("success");
        setMessage(`${providerState === 'google' ? 'Gmail' : 'Outlook'} sincronizado com o Ecossistema Represente-se.`);
        
        setTimeout(() => {
          navigate("/dashboard/email");
        }, 2000);

      } catch (err: any) {
        console.error("Erro no callback do Email:", err);
        setStatus("error");
        setMessage(`Falha na conexão: ${err.message}`);
      }
    }

    handleCallback();
  }, [searchParams, user, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 p-8">
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
                  onClick={() => navigate("/dashboard/email")}
                  className="w-full py-6 bg-emerald-600 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-[24px] hover:bg-emerald-700 transition-all shadow-2xl active:scale-95"
                >
                  Tentar Novamente
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-16 pt-8 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-center gap-8 opacity-40">
           <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-slate-400"><Globe className="w-3 h-3" /> Encrypted Connection</div>
           <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-slate-400"><ShieldCheck className="w-3 h-3" /> OAuth 2.0</div>
        </div>
      </motion.div>
    </div>
  );
}
