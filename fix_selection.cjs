const fs = require('fs');
let content = fs.readFileSync('src/pages/Empresas.tsx', 'utf8');

let target1 = 'selectedCategory === "all" \n                  ? "bg-slate-900 dark:bg-zinc-800 border-slate-900 text-white shadow-[0_20px_40px_rgba(0,0,0,0.1)]"\n                  : "bg-white dark:bg-zinc-900 border-slate-100 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 hover:border-emerald-200 shadow-sm"';
let replace1 = 'selectedCategory === "all"\n                  ? "bg-slate-900 dark:bg-zinc-900 border-slate-900 dark:border-emerald-500/50 text-white shadow-[0_20px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_0_20px_rgba(16,185,129,0.3)]"\n                  : "bg-white dark:bg-zinc-900 border-slate-100 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 hover:border-emerald-200 shadow-sm"';

let target2 = 'selectedCategory === cat\n                      ? "bg-slate-900 dark:bg-zinc-800 border-slate-900 text-white shadow-xl scale-[1.02]"\n                      : "bg-white dark:bg-zinc-900 border-slate-100 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 hover:border-emerald-200"';
let replace2 = 'selectedCategory === cat\n                      ? "bg-slate-900 dark:bg-zinc-900 border-slate-900 dark:border-emerald-500/50 text-white shadow-xl scale-[1.02] dark:shadow-[0_0_15px_rgba(16,185,129,0.3)]"\n                      : "bg-white dark:bg-zinc-900 border-slate-100 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 hover:border-emerald-200"';

if (!content.includes(target1)) console.error("Target 1 not found!");
if (!content.includes(target2)) console.error("Target 2 not found!");

content = content.replace(target1, replace1);
content = content.replace(target2, replace2);

fs.writeFileSync('src/pages/Empresas.tsx', content);
console.log('Fixed selection styles');
