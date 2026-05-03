const fs = require('fs');
const file = 'src/pages/ClientDetails.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add import
if (!content.includes('UploadContext')) {
  content = "import { useUpload } from '../contexts/UploadContext';\n" + content;
}

// Replace local state with context
content = content.replace(
  /const \[selectedFile, setSelectedFile\] = useState<File \| null>\(null\);/,
  ''
);
content = content.replace(
  /const \[selectedCategory, setSelectedCategory\] = useState\(\"\"\);/,
  ''
);
content = content.replace(
  /const \[orderValue, setOrderValue\] = useState\(\"\"\);/,
  ''
);
content = content.replace(
  /const \[isUploadModalOpen, setIsUploadModalOpen\] = useState\(false\);/,
  ''
);

// Add useUpload hook
if (!content.includes('const draft = drafts')) {
  content = content.replace(
    /const \{ settings \} = useSettings\(\);/,
    'const { settings } = useSettings();\n  const { drafts, setDraft, clearDraft } = useUpload();\n  const draft = drafts[id || \"\"] || { file: null, category: \"\", value: \"\", isOpen: false };\n  \n  const selectedFile = draft.file;\n  const selectedCategory = draft.category;\n  const orderValue = draft.value;\n  const isUploadModalOpen = draft.isOpen;\n\n  const setSelectedFile = (file) => setDraft(id || \"\", { file });\n  const setSelectedCategory = (category) => setDraft(id || \"\", { category });\n  const setOrderValue = (value) => setDraft(id || \"\", { value });\n  const setIsUploadModalOpen = (isOpen) => setDraft(id || \"\", { isOpen });'
  );
}

// Fix submitUpload to use upsert and status: "concluido"
content = content.replace(
  /const \{ error: dbError \} = await supabase\.from\('orders'\)\.insert\(\[\{\s*user_id: user\.id,\s*client_id: id,\s*value: numericValue,\s*category: selectedCategory,\s*description: Pedido via Upload: \$\{selectedFile\.name\},\s*file_name: fileName,\s*file_path: filePath\s*\}\]\);/,
  'const { error: dbError } = await supabase.from(\"orders\").upsert([{ user_id: user.id, client_id: id, category: selectedCategory, value: numericValue, file_name: fileName, file_path: filePath, status: \"concluido\", description: \"Pedido via Upload: \" + selectedFile.name }], { onConflict: \"client_id,file_path\" });'
);

// Clear draft on success
content = content.replace(
  /toast\.success\(\"Arquivo enviado com sucesso!\"\);/,
  'toast.success(\"Arquivo enviado com sucesso!\");\n      clearDraft(id || \"\");'
);

fs.writeFileSync(file, content);
console.log('Fixed ClientDetails.tsx with Context and Upsert');