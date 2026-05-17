const fs = require('fs');
let content = fs.readFileSync('src/pages/Empresas.tsx', 'utf8');

// The string in the file has multiple spaces
let target1 = 'selectedCategory === "all" \n                  ? "bg-emerald-600 border-emerald-600 text-white shadow-[0_20px_40px_rgba(16,185,129,0.3)]"';
let replacement1 = 'selectedCategory === "all" \n                  ? "bg-emerald-600 dark:bg-zinc-900 border-emerald-600 dark:border-emerald-500/50 text-white shadow-[0_20px_40px_rgba(16,185,129,0.3)] dark:shadow-[0_0_20px_rgba(16,185,129,0.3)]"';

let target2 = 'selectedCategory === cat\n                      ? "bg-emerald-600 border-emerald-600 text-white shadow-xl scale-[1.02]"';
let replacement2 = 'selectedCategory === cat\n                      ? "bg-emerald-600 dark:bg-zinc-900 border-emerald-600 dark:border-emerald-500/50 text-white shadow-xl dark:shadow-[0_0_15px_rgba(16,185,129,0.3)] scale-[1.02]"';

content = content.replace(target1, replacement1);
content = content.replace(target2, replacement2);

fs.writeFileSync('src/pages/Empresas.tsx', content);
console.log('Empresas.tsx styles updated successfully');
