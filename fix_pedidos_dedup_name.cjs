const fs = require('fs');
const file = 'src/pages/Pedidos.tsx';
let content = fs.readFileSync(file, 'utf8');

// Deduplicate by NAME instead of ID for the UI
content = content.replace(
  /Array\.from\(new Map\(clients\.map\(c => \[c\.id, c\]\)\)\.values\(\)\)/,
  'Array.from(new Map(clients.map(c => [c.name?.trim().toLowerCase(), c])).values())'
);

fs.writeFileSync(file, content);
console.log('Deduplicated clients by name in Pedidos.tsx');