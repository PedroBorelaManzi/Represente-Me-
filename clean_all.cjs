const fs = require("fs");
const files = [
  "package.json",
  "vite.config.ts",
  "src/components/Layout.tsx",
  "src/pages/Login.tsx",
  "src/pages/Landing.tsx",
  "src/vite-env.d.ts"
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, "utf8");
    // Remove BOM if present (U+FEFF)
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
    }
    fs.writeFileSync(file, content, "utf8");
    console.log(`Cleaned BOM from ${file}`);
  }
});
