const fs = require('fs');

let content = fs.readFileSync('Landing_github.tsx', 'utf8');
content = content.replace('</nav>', '</section>');
// Also fix the likely broken Logo import or just comment it out if not needed
// In the other Landing version, it uses the local logo asset.
fs.writeFileSync('Landing_github.tsx', content);
console.log('Fixed Landing_github.tsx');
