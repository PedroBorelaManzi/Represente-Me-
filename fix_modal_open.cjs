const fs = require('fs');
const file = 'src/pages/ClientDetails.tsx';
let content = fs.readFileSync(file, 'utf8');

// Clear value and file when opening the modal, but keep category
content = content.replace(
  /onClick=\{\(\) => setIsUploadModalOpen\(true\)\}/,
  'onClick={() => { setOrderValue(\"\"); setSelectedFile(null); setIsUploadModalOpen(true); }}'
);

fs.writeFileSync(file, content);
console.log('Fixed modal open logic in ClientDetails.tsx');