const fs = require('fs');
let content = fs.readFileSync('src/contexts/SettingsContext.tsx', 'utf8');

// Load avatar from localStorage
let target1 = "avatar_url: user?.user_metadata?.avatar_url || data.avatar_url,";
let replace1 = "avatar_url: localStorage.getItem(\vatar_\\) || user?.user_metadata?.avatar_url || data.avatar_url,";

content = content.replace(target1, replace1);

// Save avatar to localStorage
let target2 = "await supabase.auth.updateUser({\n        data: { avatar_url: newSettings.avatar_url }\n      });";
let replace2 = "localStorage.setItem(\vatar_\\, newSettings.avatar_url);\n      await supabase.auth.updateUser({\n        data: { avatar_url: newSettings.avatar_url }\n      });";

content = content.replace(target2, replace2);

fs.writeFileSync('src/contexts/SettingsContext.tsx', content);
console.log('Avatar localStorage persistence added');
