const fs = require('fs');
const path = 'C:\\Users\\Pedro\\.gemini\\antigravity\\brain\\Represente-Me!\\src\\pages\\ClientDetails.tsx';
let content = fs.readFileSync(path, 'utf8');

// The bug on line 430: onClick={() => { setOrderValue(""); setSelectedFile(null); setSelectedCategory(""); setIsUploadModalOpen(true); }}}
content = content.replace('setIsUploadModalOpen(true); }}}', 'setIsUploadModalOpen(true); }}');

fs.writeFileSync(path, content, 'utf8');