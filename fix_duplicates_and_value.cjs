const fs = require('fs');
const file = 'src/pages/ClientDetails.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove the category reset in loadClientData
content = content.replace(
  /setSelectedCategory\(settings\.categories\?\.\[0\] \|\| \"\"\);/,
  '// setSelectedCategory removed to preserve draft'
);

// 2. Fix deduplication to be case-insensitive and trimmed
content = content.replace(
  /const set = new Set\(settings\.categories \|\| \[\]\);\s*files\.forEach\(f => \{ if\(f\.category\) set\.add\(f\.category\); \}\);/,
  'const set = new Set();\n    (settings.categories || []).forEach(c => set.add(c.trim().toUpperCase()));\n    files.forEach(f => { if(f.category) set.add(f.category.trim().toUpperCase()); });'
);

// 3. Update the select rendering to use the normalized categories
// Actually, let's just make sure the display is nice.
content = content.replace(
  /\{Array\.from\(new Set\(allAvailableCategories\)\)\.map\(\(c: string\)=>\(<option key=\{c\} value=\{c\}>\{c\}<\/option>\)\)\}/,
  '{allAvailableCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}'
);

// 4. Ensure value is cleared when a NEW file is selected (before analysis)
content = content.replace(
  /const handleFileChange = async \(file: File \| null\) => \{\s*setSelectedFile\(file\);/,
  'const handleFileChange = async (file: File | null) => {\n    setSelectedFile(file);\n    setOrderValue(\"\"); // Clear value when file changes'
);

fs.writeFileSync(file, content);
console.log('Fixed duplicates and state persistence in ClientDetails.tsx');