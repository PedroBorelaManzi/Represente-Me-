const fs = require('fs');
const file = 'src/pages/Pedidos.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Deduplicate categories
content = content.replace(
  /\{\(settings\.categories\|\|\[\]\)\.map\(\(c: string\)=>\(<option key=\{c\} value=\{c\}>\{c\}<\/option>\)\)\}/,
  '{Array.from(new Set(settings.categories || [])).map((c: string)=>(<option key={c} value={c}>{c}</option>))}'
);

// 2. Add Client select
const clientSelect = '                    <div className=\"space-y-3 md:space-y-4\">\n                       <label className=\"text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest px-2\">Cliente (Destino)</label>\n                       <select \n                         value={selectedClient} \n                         onChange={e=>setSelectedClient(e.target.value)} \n                         required \n                         className=\"w-full p-4 md:p-6 bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-[20px] md:rounded-[28px] text-[8px] md:text-[10px] font-black uppercase tracking-widest outline-none\"\n                       >\n                          <option value=\"\">SELECIONAR CLIENTE</option>\n                          {Array.from(new Map(clients.map(c => [c.id, c])).values()).map((c: any)=>(<option key={c.id} value={c.id}>{c.name}</option>))}\n                       </select>\n                    </div>';

content = content.replace(
  /<div className=\"grid grid-cols-2 gap-4 md:gap-6\">/,
  clientSelect + '\n                    <div className=\"grid grid-cols-2 gap-4 md:gap-6\">'
);

fs.writeFileSync(file, content);
console.log('Fixed Pedidos.tsx');