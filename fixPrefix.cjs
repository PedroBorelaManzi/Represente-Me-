const fs = require('fs');
const path = 'C:\\Users\\Pedro\\.gemini\\antigravity\\brain\\Represente-Me!\\src\\pages\\ClientDetails.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace('isUploadModalOpen(false);', 'setIsUploadModalOpen(false);');
content = content.replace('selectedFile(null);', 'setSelectedFile(null);');
content = content.replace('orderValue("");', 'setOrderValue("");');
content = content.replace('isUploading(false);', 'setIsUploading(false);');

fs.writeFileSync(path, content, 'utf8');