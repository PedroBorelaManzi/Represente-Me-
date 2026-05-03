const fs = require('fs');
const file = 'src/pages/ClientDetails.tsx';
let content = fs.readFileSync(file, 'utf8');

// Match Pedidos.tsx exactly
content = content.replace(
  /description: \"Pedido via Upload: \" \+ selectedFile\.name/g,
  ''
);

// Clean up comma if needed
content = content.replace(/status: \"concluido\",\s*}/g, 'status: \"concluido\" }');
content = content.replace(/,\s*,/g, ',');

fs.writeFileSync(file, content);
console.log('Cleaned up ClientDetails.tsx insert');