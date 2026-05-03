const fs = require('fs');
const file = 'src/pages/ClientDetails.tsx';
let content = fs.readFileSync(file, 'utf8');

// Unescape literalized quotes in JSX
content = content.replace(/\\\"/g, '\"');

fs.writeFileSync(file, content, 'utf8');
console.log('Unescaped quotes in ClientDetails.tsx');