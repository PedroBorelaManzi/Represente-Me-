const fs = require('fs');
const file = 'src/pages/ClientDetails.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix the "Anexar Novo" button to NOT clear values automatically
content = content.replace(
  /onClick=\{\(\) => \{ setOrderValue\(\"\"\); setSelectedFile\(null\); setSelectedCategory\(\"\"\); setIsUploadModalOpen\(true\); \}\}/,
  'onClick={() => setIsUploadModalOpen(true)}'
);

fs.writeFileSync(file, content);
console.log('Fixed ClientDetails.tsx button click');