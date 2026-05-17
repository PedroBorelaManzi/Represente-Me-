import os

file_path = 'src/contexts/SettingsContext.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Update avatar_url retrieval
content = content.replace(
    'avatar_url: data.avatar_url,',
    'avatar_url: user?.user_metadata?.avatar_url || data.avatar_url,'
)

# Update upsert logic
old_upsert = '''    const { error } = await supabase
      .from("user_settings")
      .upsert({
        user_id: user.id,
        ...updated,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });'''

new_upsert = '''    if (newSettings.avatar_url !== undefined) {
      await supabase.auth.updateUser({
        data: { avatar_url: newSettings.avatar_url }
      });
    }

    const { avatar_url, ...dbSettings } = updated;

    const { error } = await supabase
      .from("user_settings")
      .upsert({
        user_id: user.id,
        ...dbSettings,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });'''

content = content.replace(old_upsert, new_upsert)

# Update theme fallback
content = content.replace(
    "theme: (data.theme as 'light' | 'dark') ?? defaultSettings.theme,",
    "theme: (data.theme as 'light' | 'dark') || (localStorage.getItem('theme') as 'light' | 'dark') || defaultSettings.theme,"
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated SettingsContext.tsx')
