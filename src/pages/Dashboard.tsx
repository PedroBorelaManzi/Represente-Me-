import React from "react";

export default function Dashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Configurações em andamento...</p>
      </div>
      
      <div className="rounded-xl border-2 border-dashed border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 p-12 text-center text-slate-400 dark:text-zinc-500">
        <p className="text-sm font-medium">Esta tela está vazia por enquanto e receberá novos recursos em breve.</p>
      </div>
    </div>
  );
}
