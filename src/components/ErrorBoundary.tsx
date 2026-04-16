import React, { Component, ErrorInfo, ReactNode } from "react";
import { ShieldAlert, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-[40px] border border-slate-200 dark:border-zinc-800 shadow-2xl p-10 space-y-6">
            <div className="flex justify-center">
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 text-amber-600 rounded-3xl animate-pulse">
                <ShieldAlert className="w-12 h-12" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tighter">Ops! Algo deu errado</h1>
              <p className="text-xs font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-widest leading-relaxed">
                Ocorreu um erro inesperado na interface. Mas não se preocupe, seus dados estão seguros.
              </p>
            </div>
            <div className="pt-4 flex flex-col gap-3">
              <button 
                onClick={() => window.location.reload()}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
              >
                <RefreshCw className="w-4 h-4" /> Recarregar Sistema
              </button>
              <a 
                href="/dashboard"
                className="w-full flex items-center justify-center gap-2 bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-slate-200 dark:border-zinc-700 hover:bg-slate-100"
              >
                <Home className="w-4 h-4" /> Voltar ao Início
              </a>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <pre className="mt-6 p-4 bg-slate-100 dark:bg-zinc-950 rounded-xl text-[10px] text-red-500 text-left overflow-auto max-h-40 font-mono">
                {this.state.error?.toString()}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.children;
  }
}

export default ErrorBoundary;