const fs = require('fs');
const file = 'src/pages/Pedidos.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add import
if (!content.includes('UploadContext')) {
  content = "import { useUpload } from '../contexts/UploadContext';\n" + content;
}

// Replace local state with context for manual order
content = content.replace(
  /const \[selectedClient, setSelectedClient\] = useState\(\"\"\);/,
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
  /const \[selectedFile, setSelectedFile\] = useState<File \| null>\(null\);/,
  ''
);
content = content.replace(
  /const \[isManualModalOpen, setIsManualModalOpen\] = useState\(false\);/,
  ''
);

// Add useUpload hook
if (!content.includes('const { drafts, setDraft, clearDraft } = useUpload()')) {
  content = content.replace(
    /const navigate = useNavigate\(\);/,
    'const navigate = useNavigate();\n  const { drafts, setDraft, clearDraft } = useUpload();\n  const manualDraft = drafts[\"manual_order\"] || { file: null, category: \"\", value: \"\", isOpen: false, clientId: \"\" };\n  \n  const selectedFile = manualDraft.file;\n  const selectedCategory = manualDraft.category;\n  const orderValue = manualDraft.value;\n  const isManualModalOpen = manualDraft.isOpen;\n  const selectedClient = (manualDraft as any).clientId || \"\";\n\n  const setSelectedFile = (file) => setDraft(\"manual_order\", { file });\n  const setSelectedCategory = (category) => setDraft(\"manual_order\", { category });\n  const setOrderValue = (value) => setDraft(\"manual_order\", { value });\n  const setIsManualModalOpen = (isOpen) => setDraft(\"manual_order\", { isOpen });\n  const setSelectedClient = (clientId) => setDraft(\"manual_order\", { clientId } as any);'
  );
}

// Clear draft on success
content = content.replace(
  /setIsManualModalOpen\(false\); loadData\(\);\s*toast\.success\(\"Pedido registrado com sucesso!\"\);/,
  'setIsManualModalOpen(false); loadData();\n      toast.success(\"Pedido registrado com sucesso!\");\n      clearDraft(\"manual_order\");'
);

fs.writeFileSync(file, content);
console.log('Fixed Pedidos.tsx with Context');