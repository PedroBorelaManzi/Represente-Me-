const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  // Remove status: "concluido" from upsert/insert objects
  content = content.replace(/status:\s*\"concluido\",?\s*/g, '');
  // Clean up potential double commas or trailing commas in objects
  content = content.replace(/,\s*}/g, ' }');
  content = content.replace(/{\s*,/g, '{ ');
  fs.writeFileSync(filePath, content);
}

fixFile('src/pages/ClientDetails.tsx');
fixFile('src/pages/Pedidos.tsx');
console.log('Removed status column from orders insertion');