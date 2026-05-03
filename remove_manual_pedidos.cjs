const fs = require('fs');
const file = 'src/pages/Pedidos.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove the "Novo Registro" button from the main header
content = content.replace(
  /<button\s+onClick=\{\(\) => setIsManualModalOpen\(true\)\}[\s\S]*?<\/button>/,
  ''
);

// 2. Remove the Client select field I just added (if any remains or was added)
// Actually, I'll just revert the change that added the client select field.
// I'll search for the block I added.
const clientSelectBlock = /<div className=\"space-y-3 md:space-y-4\">\s*<label className=\"text-\[8px\] md:text-\[9px\] font-black text-slate-400 uppercase tracking-widest px-2\">Cliente \(Destino\)<\/label>[\s\S]*?<\/select>\s*<\/div>/;
content = content.replace(clientSelectBlock, '');

fs.writeFileSync(file, content);
console.log('Removed manual order button and client select from Pedidos.tsx');