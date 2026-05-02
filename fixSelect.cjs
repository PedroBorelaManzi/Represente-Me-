const fs = require('fs');

const path = 'C:\\Users\\Pedro\\.gemini\\antigravity\\brain\\Represente-Me!\\src\\pages\\ClientDetails.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Zera a categoria ao abrir o modal
content = content.replace(
  /onClick=\{[^\}]*setIsUploadModalOpen\(true\)[^\}]*\}/g,
  'onClick={() => { setOrderValue(""); setSelectedFile(null); setSelectedCategory(""); setIsUploadModalOpen(true); }}'
);

// 2. Adiciona a opção "Selecionar empresa" na caixa de seleção e trava se nao escolher
const selectRegex = /<select[\s\S]*?value=\{selectedCategory\}[\s\S]*?>[\s\S]*?\{allAvailableCategories\.map/g;
if (content.match(selectRegex)) {
  content = content.replace(
    selectRegex,
    (match) => match.replace(
      '{allAvailableCategories.map',
      '<option value="" disabled>SELECIONAR EMPRESA</option>\n                        {allAvailableCategories.map'
    )
  );
}

// 3. Trava o envio se a categoria estiver vazia
const submitRegex = /const submitUpload = async \(\) => \{\s+if \(!selectedFile \|\| !user \|\| !id\) return;/;
if (content.match(submitRegex)) {
  content = content.replace(
    submitRegex,
    'const submitUpload = async () => {\n    if (!selectedFile || !user || !id) return;\n    if (!selectedCategory) {\n      toast.error("Por favor, selecione uma empresa.");\n      return;\n    }'
  );
}

fs.writeFileSync(path, content, 'utf8');
console.log('Select category fixed');