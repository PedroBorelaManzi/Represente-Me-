const fs = require('fs');
let content = fs.readFileSync('src/contexts/SettingsContext.tsx', 'utf8');

let regex = /useEffect\(\(\) => \{\s*const root = document\.documentElement;\s*if \(settings\.theme === 'dark'\) \{\s*root\.classList\.add\('dark'\);\s*root\.style\.colorScheme = 'dark';\s*\} else \{\s*root\.classList\.remove\('dark'\);\s*root\.style\.colorScheme = 'light';\s*\}\s*\}, \[settings\.theme\]\);/g;

let newEffect = "  useEffect(() => {\n    const root = document.documentElement;\n    if (settings.theme === 'dark' && isDashboard) {\n      root.classList.add('dark');\n      root.style.colorScheme = 'dark';\n    } else {\n      root.classList.remove('dark');\n      root.style.colorScheme = 'light';\n    }\n  }, [settings.theme, isDashboard]);";

if (regex.test(content)) {
  content = content.replace(regex, newEffect);
  fs.writeFileSync('src/contexts/SettingsContext.tsx', content);
  console.log('Fixed useEffect for isDashboard');
} else {
  console.log('Regex failed');
}
