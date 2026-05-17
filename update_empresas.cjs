const fs = require('fs');
const file = 'src/pages/Empresas.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'selectedCategory === \"all\" \\n                  ? \"bg-slate-900 dark:bg-zinc-800 border-slate-900 text-white shadow-[0_20px_40px_rgba(0,0,0,0.1)]\"',
  'selectedCategory === \"all\" \\n                  ? \"bg-emerald-600 border-emerald-600 text-white shadow-[0_20px_40px_rgba(16,185,129,0.3)]\"'
);

content = content.replace(
  '<h4 className=\"text-[9px] sm:text-[11px] lg:text-[12px] font-black uppercase tracking-widest text-emerald-500\">Visão Consolidada</h4>',
  '<h4 className={cn(\"text-[9px] sm:text-[11px] lg:text-[12px] font-black uppercase tracking-widest\", selectedCategory === \"all\" ? \"text-emerald-100\" : \"text-emerald-500\")}>Visão Consolidada</h4>'
);

content = content.replace(
  'selectedCategory === cat\\n                      ? \"bg-slate-900 dark:bg-zinc-800 border-slate-900 text-white shadow-xl scale-[1.02]\"',
  'selectedCategory === cat\\n                      ? \"bg-emerald-600 border-emerald-600 text-white shadow-xl scale-[1.02]\"'
);

fs.writeFileSync(file, content);
console.log('File updated successfully.');
