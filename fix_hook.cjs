const fs = require('fs');
const file = 'src/pages/ClientDetails.tsx';
let content = fs.readFileSync(file, 'utf8');

// Robust replacement for the hook insertion
if (!content.includes('const { drafts, setDraft, clearDraft } = useUpload()')) {
  content = content.replace(
    /const \{ settings, updateSettings \} = useSettings\(\);/,
    'const { settings, updateSettings } = useSettings();\n  const { drafts, setDraft, clearDraft } = useUpload();\n  const draft = drafts[id || \"\"] || { file: null, category: \"\", value: \"\", isOpen: false };\n  \n  const selectedFile = draft.file;\n  const selectedCategory = draft.category;\n  const orderValue = draft.value;\n  const isUploadModalOpen = draft.isOpen;\n\n  const setSelectedFile = (file) => setDraft(id || \"\", { file });\n  const setSelectedCategory = (category) => setDraft(id || \"\", { category });\n  const setOrderValue = (value) => setDraft(id || \"\", { value });\n  const setIsUploadModalOpen = (isOpen) => setDraft(id || \"\", { isOpen });'
  );
}

// Ensure setSelectedCategory call in loadClientData doesn't conflict
// Actually, setSelectedCategory is now a function, so it's fine.

fs.writeFileSync(file, content);
console.log('Fixed ClientDetails.tsx hook insertion');