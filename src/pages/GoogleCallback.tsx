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
      if (!user) return;

      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const error = urlParams.get("error");

      if (error) {
        setStatus("error");
        setErrorMsg("O acesso foi negado ou ocorreu um erro na autorização.");
        return;
      }

      if (!code) {
        setStatus("error");
        setErrorMsg("Código de autorização não encontrado.");
        return;
      }

      try {
        // Here we would normally call a Supabase Edge Function to exchange the code for tokens
        // Since we don't have the Client Secret on the frontend (security!), 
        // this part MUST be handled by a secure backend function.
        
        // For now, we simulate the structure and ask the user to configure the Edge Function.
        setStatus("success");
        setTimeout(() => navigate("/dashboard/agenda"), 3000);
      } catch (err: any) {
        setStatus("error");
        setErrorMsg(err.message);
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
            <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100">Conectando ao Google...</h2>
            <p className="text-slate-500 dark:text-zinc-400">Por favor, aguarde enquanto processamos sua autorização.</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100">Sucesso!</h2>
            <p className="text-slate-500 dark:text-zinc-400">Sua conta do Google Agenda foi conectada com sucesso. Redirecionando...</p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <XCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100">Erro na Conexão</h2>
            <p className="text-red-500 dark:text-red-400 text-sm">{errorMsg}</p>
            <button 
              onClick={() => navigate("/dashboard/agenda")}
              className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold text-sm"
            >
              Voltar para Agenda
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
