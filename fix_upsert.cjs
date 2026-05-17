const fs = require('fs');
const file = 'src/contexts/SettingsContext.tsx';
let content = fs.readFileSync(file, 'utf8');

let regex = /const \{ error \} = await supabase\s*\.from\("user_settings"\)\s*\.upsert\(\{\s*user_id: user\.id,\s*\.\.\.updated,\s*updated_at: new Date\(\)\.toISOString\(\),\s*\}, \{ onConflict: 'user_id' \}\);/m;

let replacement = "if (newSettings.avatar_url !== undefined) {\n      await supabase.auth.updateUser({\n        data: { avatar_url: newSettings.avatar_url }\n      });\n    }\n\n    const { avatar_url, ...dbSettings } = updated;\n\n    const { error } = await supabase\n      .from(\"user_settings\")\n      .upsert({\n        user_id: user.id,\n        ...dbSettings,\n        updated_at: new Date().toISOString(),\n      }, { onConflict: 'user_id' });";

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(file, content);
  console.log('Successfully fixed upsert and avatar_url!');
} else {
  console.log('Regex did not match!');
}
