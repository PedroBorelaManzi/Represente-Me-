const fs = require('fs');
const file = 'src/pages/ClientDetails.tsx';
let content = fs.readFileSync(file, 'utf8');

// Deduplicate categories using a Map for case-insensitivity
const memoStart = content.indexOf('const allAvailableCategories = useMemo');
const memoEnd = content.indexOf('}, [settings.categories, files]);') + '}, [settings.categories, files]);'.length;

const newMemo = \const allAvailableCategories = useMemo(() => {
    const map = new Map();
    (settings.categories || []).forEach(c => {
      const trimmed = c.trim();
      if (trimmed) map.set(trimmed.toUpperCase(), trimmed);
    });
    files.forEach(f => {
      if (f.category) {
        const trimmed = f.category.trim();
        if (trimmed) map.set(trimmed.toUpperCase(), trimmed);
      }
    });
    return Array.from(map.values()).sort();
  }, [settings.categories, files]);\;

content = content.substring(0, memoStart) + newMemo + content.substring(memoEnd);

// Add clear button
content = content.replace(
  /<button onClick=\{\(\) => setIsUploadModalOpen\(false\)\} className=\"p-3 bg-slate-50 dark:bg-zinc-800 rounded-2xl text-slate-400 hover:text-red-500 transition-all\"><X className=\"w-5 h-5\"\/><\/button>/,
  '<div className=\"flex items-center gap-2\"><button onClick={() => { if(confirm(\"Limpar rascunho?\")) clearDraft(id || \"\"); }} className=\"p-3 bg-slate-50 dark:bg-zinc-800 rounded-2xl text-slate-400 hover:text-amber-500 transition-all text-[9px] font-black uppercase tracking-widest\">Limpar</button><button onClick={() => setIsUploadModalOpen(false)} className=\"p-3 bg-slate-50 dark:bg-zinc-800 rounded-2xl text-slate-400 hover:text-red-500 transition-all\"><X className=\"w-5 h-5\"/></button></div>'
);

fs.writeFileSync(file, content);
console.log('Fixed ClientDetails.tsx');