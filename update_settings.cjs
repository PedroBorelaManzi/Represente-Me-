const fs = require('fs');
const file = 'src/contexts/SettingsContext.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'avatar_url: data.avatar_url,',
  'avatar_url: user?.user_metadata?.avatar_url || data.avatar_url,'
);

let old_upsert = '    const { error } = await supabase\n' +
'      .from("user_settings")\n' +
'      .upsert({\n' +
'        user_id: user.id,\n' +
'        ...updated,\n' +
'        updated_at: new Date().toISOString(),\n' +
'      }, { onConflict: \'user_id\' });';

let new_upsert = '    if (newSettings.avatar_url !== undefined) {\n' +
'      await supabase.auth.updateUser({\n' +
'        data: { avatar_url: newSettings.avatar_url }\n' +
'      });\n' +
'    }\n' +
'\n' +
'    const { avatar_url, ...dbSettings } = updated;\n' +
'\n' +
'    const { error } = await supabase\n' +
'      .from("user_settings")\n' +
'      .upsert({\n' +
'        user_id: user.id,\n' +
'        ...dbSettings,\n' +
'        updated_at: new Date().toISOString(),\n' +
'      }, { onConflict: \'user_id\' });';

content = content.replace(old_upsert, new_upsert);

content = content.replace(
  "theme: (data.theme as 'light' | 'dark') ?? defaultSettings.theme,",
  "theme: (data.theme as 'light' | 'dark') || (localStorage.getItem('theme') as 'light' | 'dark') || defaultSettings.theme,"
);

fs.writeFileSync(file, content);
console.log('Updated SettingsContext.tsx');
