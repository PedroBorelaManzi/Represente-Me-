const fs = require('fs');
const file = 'src/contexts/AuthContext.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'localStorage.removeItem(\\'theme\\');',
  '// Removed: localStorage.removeItem(\\'theme\\'); so the device remembers dark mode preference on login screen'
);

fs.writeFileSync(file, content);
console.log('Updated AuthContext.tsx');
