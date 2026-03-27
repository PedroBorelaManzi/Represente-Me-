import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Processando sua conexão com o Google...");

  useEffect(() => {
    async function handleCallback() {
      const code = searchParams.get("code");
      
      if (!code || !user) {
        setStatus("error");
        setMessage("Código de autorização não encontrado ou usuário não autenticado.");
        return;
      }

      try {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
        const redirectUri = `${window.location.origin}/auth/callback/google`;

        if (!clientId || !clientSecret) {
          throw new Error("Variáveis de ambiente do Google não configuradas.");
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
            refresh_token: tokens.refresh_token, // Este virá se prompt=consent foi usado
            expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });

        if (upsertError) throw upsertError;

        setStatus("success");
        setMessage("Conexão realizada com sucesso! Redirecionando...");
        
        setTimeout(() => {
          navigate("/agenda");
        }, 2000);

      } catch (err: any) {
        console.error("Erro no callback do Google:", err);
        setStatus("error");
        setMessage(`Erro ao conectar: ${err.message}`);
      }
    }

    handleCallback();
  }, [searchParams, user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 p-4">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-3xl shadow-xl p-8 text-center border border-slate-200 dark:border-zinc-800">
        {status === "loading" && (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100 italic">Conectando...</h2>
            <p className="text-slate-500 dark:text-zinc-400">{message}</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100">Tudo pronto!</h2>
            <p className="text-slate-500 dark:text-zinc-400">{message}</p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100">Ops! Algo deu errado</h2>
            <p className="text-slate-500 dark:text-zinc-400">{message}</p>
            <button 
              onClick={() => navigate("/agenda")}
              className="mt-4 px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Voltar para Agenda
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
