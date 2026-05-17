const fs = require('fs');
const file = 'src/contexts/SettingsContext.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'if (data.theme) localStorage.setItem(\'theme\', data.theme);',
  '// Not overwriting localStorage theme with DB theme to respect device preference'
);

content = content.replace(
  'theme: (data.theme as \'light\' | \'dark\') || (localStorage.getItem(\'theme\') as \'light\' | \'dark\') || defaultSettings.theme,',
  'theme: (localStorage.getItem(\'theme\') as \'light\' | \'dark\') || (data.theme as \'light\' | \'dark\') || defaultSettings.theme,'
);

let effectString = '  useEffect(() => {\n' +
'    const root = document.documentElement;\n' +
'    if (settings.theme === \'dark\') {\n' +
'      root.classList.add(\'dark\');\n' +
'      root.style.colorScheme = \'dark\';\n' +
'    } else {\n' +
'      root.classList.remove(\'dark\');\n' +
'      root.style.colorScheme = \'light\';\n' +
'    }\n' +
'  }, [settings.theme]);';

let newEffectString = effectString + '\n\n' +
'  useEffect(() => {\n' +
'    const handleStorage = (e: StorageEvent) => {\n' +
'      if (e.key === \'theme\' && (e.newValue === \'light\' || e.newValue === \'dark\')) {\n' +
'        setSettings(prev => ({ ...prev, theme: e.newValue as \'light\' | \'dark\' }));\n' +
'      }\n' +
'    };\n' +
'    window.addEventListener(\'storage\', handleStorage);\n' +
'    return () => window.removeEventListener(\'storage\', handleStorage);\n' +
'  }, []);';

content = content.replace(effectString, newEffectString);

fs.writeFileSync(file, content);
console.log('SettingsContext.tsx updated');
