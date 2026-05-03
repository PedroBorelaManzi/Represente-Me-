const fs = require('fs');
const file = 'src/pages/ClientDetails.tsx';
let content = fs.readFileSync(file, 'utf8');

// Remove the BOM and any weird characters at the start
content = content.replace(/^\uFEFF/, '');
content = content.replace(/^ï»¿/, '');

fs.writeFileSync(file, content, 'utf8');
console.log('Removed BOM from ClientDetails.tsx');