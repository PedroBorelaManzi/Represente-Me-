const fs = require('fs');
const file = 'src/pages/ClientDetails.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Fix deduplication to be even more robust (case-insensitive)
content = content.replace(
  /const allAvailableCategories = useMemo\(\(\) => \{[\s\S]*?\}, \[settings\.categories, files\]\);/,
  \const allAvailableCategories = useMemo(() => {
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
  }, [settings.categories, files]);\
);

// 2. Add a clear button to the modal header
content = content.replace(
  /<button onClick=\{\(\) => setIsUploadModalOpen\(false\)\} className=\"p-3 bg-slate-50 dark:bg-zinc-800 rounded-2xl text-slate-400 hover:text-red-500 transition-all\"><X className=\"w-5 h-5\"\/><\/button>/,
  \<div className=\"flex items-center gap-2\">
                  <button 
                    onClick={() => { 
                      if (confirm('Deseja limpar todos os campos deste rascunho?')) {
                        clearDraft(id || '');
                      }
                    }}
                    className=\"p-3 bg-slate-50 dark:bg-zinc-800 rounded-2xl text-slate-400 hover:text-amber-500 transition-all text-[9px] font-black uppercase tracking-widest flex items-center gap-2\"
                  >
                    Limpar
                  </button>
                  <button onClick={() => setIsUploadModalOpen(false)} className=\"p-3 bg-slate-50 dark:bg-zinc-800 rounded-2xl text-slate-400 hover:text-red-500 transition-all\"><X className=\"w-5 h-5\"/></button>
                </div>\
);

fs.writeFileSync(file, content);
console.log('Final fixes for duplicates and value reset in ClientDetails.tsx');