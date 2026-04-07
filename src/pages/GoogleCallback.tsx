import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Processando sua conexão com o Google...");

  useEffect(() => {
    // Importante: Aguarda o carregamento da sessão do Supabase
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
          throw new Error("As chaves do Google (Client ID/Secret) não foram configuradas no servidor (Vercel). Verifique as Environment Variables.");
        }

        // Trocar o código pelos tokens usando a API do Google
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

        if (tokens.error) {
          throw new Error(tokens.error_description || tokens.error);
        }

        // Salvar os tokens no Supabase
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
        setMessage("Google Agenda conectado com sucesso! Sincronizando eventos...");
        
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 p-4">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-3xl shadow-xl p-8 text-center border border-slate-200 dark:border-zinc-800">
        {(status === "loading" || loading) && (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100 italic">Validando Sessão...</h2>
            <p className="text-slate-500 dark:text-zinc-400">{message}</p>
          </div>
        )}

        {status === "success" && !loading && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100">Pronto!</h2>
            <p className="text-slate-500 dark:text-zinc-400">{message}</p>
          </div>
        )}

        {status === "error" && !loading && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100">Erro na Conexão</h2>
            <p className="text-slate-500 dark:text-zinc-400 text-sm leading-relaxed">{message}</p>
            <div className="pt-4 space-y-2">
              <button 
                onClick={() => navigate("/dashboard/agenda")}
                className="w-full px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
              >
                Tentar Novamente
              </button>
              <button 
                onClick={() => navigate("/")}
                className="w-full px-6 py-3 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-zinc-700 transition-all"
              >
                Voltar ao Início
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

