const fs = require('fs');
const file = 'src/pages/Pedidos.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Deduplicate categories in the select dropdown
content = content.replace(
  /\{\(settings\.categories\|\|\[\]\)\.map\(\(c: string\)=>\(<option key=\{c\} value=\{c\}>\{c\}<\/option>\)\)\}/,
  '{Array.from(new Set(settings.categories || [])).map((c: string)=>(<option key={c} value={c}>{c}</option>))}'
);

// 2. Add the Client select field back to the Manual Order Modal
const clientSelect = \
                    <div className=\"space-y-3 md:space-y-4\">
                       <label className=\"text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest px-2\">Cliente (Destino)</label>
                       <select 
                         value={selectedClient} 
                         onChange={e=>setSelectedClient(e.target.value)} 
                         required 
                         className=\"w-full p-4 md:p-6 bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-[20px] md:rounded-[28px] text-[8px] md:text-[10px] font-black uppercase tracking-widest outline-none\"
                       >
                          <option value=\"\">SELECIONAR CLIENTE</option>
                          {Array.from(new Map(clients.map(c => [c.id, c])).values()).map((c: any)=>(<option key={c.id} value={c.id}>{c.name}</option>))}
                       </select>
                    </div>
\;

// Insert before the grid of category/value
content = content.replace(
  /<div className=\"grid grid-cols-2 gap-4 md:gap-6\">/,
  clientSelect + '\n                    <div className=\"grid grid-cols-2 gap-4 md:gap-6\">'
);

fs.writeFileSync(file, content);
console.log('Fixed duplicate categories and added client select to Pedidos.tsx');