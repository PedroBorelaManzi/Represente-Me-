const fs = require('fs');
const file = 'src/pages/ClientDetails.tsx';
let content = fs.readFileSync(file, 'utf8');

// Deduplicate categories in the select dropdown
content = content.replace(
  /\{allAvailableCategories\.map\(\(c: string\)=>\(<option key=\{c\} value=\{c\}>\{c\}<\/option>\)\)\}/,
  '{Array.from(new Set(allAvailableCategories)).map((c: string)=>(<option key={c} value={c}>{c}</option>))}'
);

fs.writeFileSync(file, content);
console.log('Fixed duplicate categories in ClientDetails.tsx');