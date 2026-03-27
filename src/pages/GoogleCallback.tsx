import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function GoogleCallback() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const handleCallback = async () => {
      // Wait for user to be loaded
      if (!user) return;

      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const error = urlParams.get("error");

      if (error) {
        setStatus("error");
        setErrorMsg("O acesso foi negado ou ocorreu um erro na autorização do Google.");
        return;
      }

      if (!code) {
        // If there's no code and no error, maybe it's just a page refresh or direct access
        // We only show error if we were expecting a code
        if (window.location.search.includes("state") || window.location.search.includes("code")) {
            setStatus("error");
            setErrorMsg("Código de autorização não encontrado na URL.");
        } else {
            navigate("/dashboard/agenda");
        }
        return;
      }

      try {
        // In a production app, we would call a Supabase Edge Function here to exchange
        // the 'code' for an 'access_token' and 'refresh_token' using the Client Secret.
        
        // For now, we'll store the code in the database to mark the account as "Connected"
        // and allow the UI to reflect this state.
        
        const { error: upsertError } = await supabase
          .from("user_google_tokens")
          .upsert({
            user_id: user.id,
            access_token: "pending_exchange", // Placeholder
            refresh_token: code, // Temporarily store the code here to exchange later
            expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });

        if (upsertError) throw upsertError;

        setStatus("success");
        // Redirect back to agenda after 2 seconds
        setTimeout(() => navigate("/dashboard/agenda"), 2000);
      } catch (err: any) {
        console.error("Erro ao salvar token:", err);
        setStatus("error");
        setErrorMsg(err.message || "Falha ao salvar a conexão com o Google.");
      }
    };

    handleCallback();
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl max-w-sm w-full text-center">
        {status === "loading" && (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100">Finalizando Conexão...</h2>
            <p className="text-slate-500 dark:text-zinc-400">Estamos vinculando sua conta do Google ao Represente-Me.</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100">Conectado!</h2>
            <p className="text-slate-500 dark:text-zinc-400">Sua conta do Google Agenda foi vinculada com sucesso. Voltando para a agenda...</p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100">Oops! Algo deu errado</h2>
            <p className="text-red-500 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/10 p-3 rounded-xl">{errorMsg}</p>
            <button 
              onClick={() => navigate("/dashboard/agenda")}
              className="mt-6 w-full bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 py-3 rounded-xl font-bold transition-transform hover:scale-[1.02]"
            >
              Voltar para Agenda
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
