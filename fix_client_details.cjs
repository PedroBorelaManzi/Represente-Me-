const fs = require('fs');
const file = 'src/pages/ClientDetails.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /\/\/ Persistencia de estado do modal[\s\S]*?sessionStorage\.removeItem\(.upload_draft_\$\{id\}.\);\s*\}\s*\}, \[id, selectedCategory, orderValue, isUploadModalOpen\]\);/,
  '// Modal state no longer uses sessionStorage'
);

content = content.replace(
  /const \{ data: filesData \} = await supabase\.rpc\(\x22list_user_files\x22, \{ u_id: user\?\.id \}\);\s*if \(filesData\) \{\s*const clientFiles = filesData\.filter\(\(f: any\) => f\.client_id === id\);\s*setFiles\(clientFiles\);\s*\}/,
  'const { data: filesData } = await supabase.from(\x22orders\x22).select(\x22*\x22).eq(\x22client_id\x22, id).not(\x22file_name\x22, \x22is\x22, null).order(\x22created_at\x22, { ascending: false });\n      if (filesData) {\n        setFiles(filesData);\n      }'
);

content = content.replace(
  /const \{ error: storageError \} = await supabase\.storage\s*\.from\('client-documents'\)\s*\.remove\(\[filePath\]\);\s*if \(storageError\) throw storageError;\s*const \{ error: dbError \} = await supabase\s*\.from\('client_files'\)\s*\.delete\(\)\s*\.eq\('id', fileId\);/,
  'let storageError = null;\n      if (filePath) {\n        const res = await supabase.storage.from(\x22client_vault\x22).remove([filePath]);\n        storageError = res.error;\n      }\n      if (storageError) throw storageError;\n\n      const { error: dbError } = await supabase.from(\x22orders\x22).delete().eq(\x22id\x22, fileId);'
);

content = content.replace(
  /const \{ data, error \} = await supabase\.storage\s*\.from\('client-documents'\)\s*\.download\(filePath\);/,
  'const { data, error } = await supabase.storage.from(\x22client_vault\x22).download(filePath);'
);

content = content.replace(
  /const \{ error: uploadError \} = await supabase\.storage\s*\.from\('client-documents'\)\s*\.upload\(filePath, selectedFile\);/,
  'const { error: uploadError } = await supabase.storage.from(\x22client_vault\x22).upload(filePath, selectedFile);'
);

content = content.replace(
  /const \{ error: dbError \} = await supabase\s*\.from\('client_files'\)\s*\.insert\(\[\{[\s\S]*?\}\]\);\s*if \(dbError\) throw dbError;\s*\/\/ Se tem valor, e um pedido! Insere em orders e reseta o alerta do cliente\s*if \(numericValue > 0\) \{\s*await supabase\.from\('orders'\)\.insert\(\[\{\s*user_id: user\.id,\s*client_id: id,\s*value: numericValue,\s*category: selectedCategory,\s*description: .Pedido via Upload: \$\{selectedFile\.name\}.\s*\}\]\);\s*\}/,
  'const { error: dbError } = await supabase.from(\x22orders\x22).insert([{\n        user_id: user.id,\n        client_id: id,\n        value: numericValue,\n        category: selectedCategory,\n        description: \x22Pedido via Upload: \x22 + selectedFile.name,\n        file_name: fileName,\n        file_path: filePath\n      }]);\n\n      if (dbError) throw dbError;'
);

fs.writeFileSync(file, content);
console.log('Fixed ClientDetails.tsx');