const fs = require('fs');
let content = fs.readFileSync('src/contexts/SettingsContext.tsx', 'utf8');

content = content.replace(
  'import { supabase } from "../lib/supabase";',
  'import { supabase } from "../lib/supabase";\nimport { useLocation } from "react-router-dom";'
);

content = content.replace(
  'const { user } = useAuth();',
  'const { user } = useAuth();\n  const location = useLocation();\n  const isDashboard = location.pathname.startsWith("/dashboard");'
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

let newEffectString = '  useEffect(() => {\n' +
'    const root = document.documentElement;\n' +
'    if (settings.theme === \'dark\' && isDashboard) {\n' +
'      root.classList.add(\'dark\');\n' +
'      root.style.colorScheme = \'dark\';\n' +
'    } else {\n' +
'      root.classList.remove(\'dark\');\n' +
'      root.style.colorScheme = \'light\';\n' +
'    }\n' +
'  }, [settings.theme, isDashboard]);';

content = content.replace(effectString, newEffectString);

fs.writeFileSync('src/contexts/SettingsContext.tsx', content);
console.log('SettingsContext.tsx updated');
