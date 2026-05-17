const fs = require('fs');
let content = fs.readFileSync('src/pages/Empresas.tsx', 'utf8');

const regex1 = /selectedCategory === "all" \s*\?\s*"([^"]+)"\s*:\s*"([^"]+)"/;
let match1 = content.match(regex1);
if (match1) {
    let classes = match1[1];
    classes = classes.replace('dark:bg-zinc-800', 'dark:bg-zinc-900');
    classes += ' dark:border-emerald-500/50 dark:shadow-[0_0_20px_rgba(16,185,129,0.3)]';
    
    let replacement = 'selectedCategory === "all" \n                  ? "' + classes + '" \n                  : "' + match1[2] + '"';
    content = content.replace(match1[0], replacement);
    console.log('Fixed ALL button');
} else {
    console.log('Regex 1 failed');
}

const regex2 = /selectedCategory === cat\s*\?\s*"([^"]+)"\s*:\s*"([^"]+)"/;
let match2 = content.match(regex2);
if (match2) {
    let classes = match2[1];
    classes = classes.replace('dark:bg-zinc-800', 'dark:bg-zinc-900');
    classes += ' dark:border-emerald-500/50 dark:shadow-[0_0_15px_rgba(16,185,129,0.3)]';
    
    let replacement = 'selectedCategory === cat\n                      ? "' + classes + '" \n                      : "' + match2[2] + '"';
    content = content.replace(match2[0], replacement);
    console.log('Fixed CAT button');
} else {
    console.log('Regex 2 failed');
}

fs.writeFileSync('src/pages/Empresas.tsx', content);
