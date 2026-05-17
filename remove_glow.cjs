const fs = require('fs');
const file = 'src/pages/Empresas.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '<div className="absolute top-0 right-0 w-32 md:w-40 h-32 md:h-40 bg-emerald-600/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />',
  ''
);

fs.writeFileSync(file, content);
console.log('Removed glow from Empresas.tsx');
