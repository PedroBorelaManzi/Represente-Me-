const fs = require('fs');
const file = 'src/pages/Empresas.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'hover:border-emerald-300 hover:shadow-xl',
  'hover:border-slate-200 dark:hover:border-zinc-700 hover:shadow-xl'
);

fs.writeFileSync(file, content);
console.log('Updated Empresas.tsx');
