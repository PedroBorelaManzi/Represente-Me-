const fs = require('fs');
const file = 'src/pages/ClientDetails.tsx';
let buffer = fs.readFileSync(file);

// Check for BOM (0xEF, 0xBB, 0xBF)
if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    buffer = buffer.slice(3);
}

// Convert to string and manually clean up any residual 'ï»¿' strings
let content = buffer.toString('utf8');
content = content.replace(/ï»¿/g, '');

fs.writeFileSync(file, content, 'utf8');
console.log('Aggressively removed BOM and weird chars');