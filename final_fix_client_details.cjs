const fs = require('fs');
const file = 'src/pages/ClientDetails.tsx';
let content = fs.readFileSync(file, 'utf8');

// Use Upsert and Status: "concluido"
content = content.replace(
  /const \{ error: dbError \} = await supabase\.from\("orders"\)\.insert\(\[\{\s*user_id: user\.id,\s*client_id: id,\s*value: numericValue,\s*category: selectedCategory,\s*file_name: fileName,\s*file_path: filePath\s*\}\]\);/,
  'const { error: dbError } = await supabase.from(\"orders\").upsert([{ user_id: user.id, client_id: id, category: selectedCategory, value: numericValue, file_name: fileName, file_path: filePath, status: \"concluido\" }], { onConflict: \"client_id,file_path\" });'
);

// Success handler cleanup
content = content.replace(
  /toast\.success\(\"Arquivo anexado com sucesso!\"\);\s*setIsUploadModalOpen\(false\);\s*setSelectedFile\(null\);\s*setOrderValue\(\"\"\);/,
  'toast.success(\"Arquivo anexado com sucesso!\");\n      setIsUploadModalOpen(false);\n      clearDraft(id || \"\");'
);

fs.writeFileSync(file, content);
console.log('Final fix applied to ClientDetails.tsx');