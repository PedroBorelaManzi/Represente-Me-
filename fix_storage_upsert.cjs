const fs = require('fs');
const file = 'src/pages/ClientDetails.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add upsert: true to storage upload
content = content.replace(
  /await supabase\.storage\.from\(\"client_vault\"\)\.upload\(filePath, selectedFile\);/,
  'await supabase.storage.from(\"client_vault\").upload(filePath, selectedFile, { upsert: true });'
);

fs.writeFileSync(file, content);
console.log('Added upsert: true to storage upload in ClientDetails.tsx');