import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

export interface Settings {
  alerta_days: number;
  critico_days: number;
  perda_days: number;
  inativo_days: number;
  theme?: 'light' | 'dark';
  has_completed_onboarding?: boolean;
  categories?: string[];
  revenue_ceiling?: number;
}

interface SettingsContextType {
  settings: Settings;
  loading: boolean;
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
}

const defaultSettings: Settings = {
  alerta_days: 30,
  critico_days: 45,
  perda_days: 60,
  inativo_days: 90,
  theme: 'light',
  has_completed_onboarding: false,
  categories: [],
  revenue_ceiling: 1000000,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    async function loadSettings() {
      if (!user) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!error && data) {
        let hasCompleted = data.has_completed_onboarding ?? defaultSettings.has_completed_onboarding;
        let categories = data.categories || [];

        // Auto-complete onboarding para usuários existentes com dados
        if (!hasCompleted) {
          const { count } = await supabase
            .from("clients")
            .select("*", { count: 'exact', head: true })
            .eq("user_id", user.id);

          if (count && count > 0) {
            hasCompleted = true;
            
            if (categories.length === 0) {
              const { data: orders } = await supabase
                .from("orders")
                .select("category")
                .eq("user_id", user.id);
              
              if (orders && orders.length > 0) {
                const unique = Array.from(new Set(orders.map(o => o.category).filter(Boolean)));
                categories = unique as string[];
              }
            }

            await supabase.from("user_settings").upsert({
              user_id: user.id,
              has_completed_onboarding: true,
              categories,
              updated_at: new Date().toISOString()
            });
          }
        }

        setSettings({
          alerta_days: data.alerta_days ?? defaultSettings.alerta_days,
          critico_days: data.critico_days ?? defaultSettings.critico_days,
          perda_days: data.perda_days ?? defaultSettings.perda_days,
          inativo_days: data.inativo_days ?? defaultSettings.inativo_days,
          theme: data.theme ?? defaultSettings.theme,
          has_completed_onboarding: hasCompleted,
          categories: categories,
          revenue_ceiling: parseFloat(data.revenue_ceiling?.toString() || "1000000") ?? defaultSettings.revenue_ceiling,
        });
      } else if (error) {
        console.error("Error loading settings:", error);
      } else {
        // No settings found, create them
        try {
          // Antes de criar com o padrão, checar se já tem dados para bypassar onboarding
          const { count } = await supabase
            .from("clients")
            .select("*", { count: 'exact', head: true })
            .eq("user_id", user.id);
          
          const initialOnboarding = count && count > 0;

          await supabase.from("user_settings").upsert({
            user_id: user.id,
            ...defaultSettings,
            has_completed_onboarding: initialOnboarding,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
          
          setSettings({ ...defaultSettings, has_completed_onboarding: initialOnboarding });
        } catch (e) {
          console.error("Failed to Initialize settings:", e);
          setSettings(defaultSettings);
        }
      }
      setLoading(false);
    }

    loadSettings();
  }, [user]);

  const updateSettings = async (newSettings: Partial<Settings>) => {
    if (!user) return;

    const updated = { ...settings, ...newSettings };

    const { error } = await supabase
      .from("user_settings")
      .upsert({
        user_id: user.id,
        ...updated,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (!error) {
      setSettings(updated);
    } else {
      console.error("Error updating settings:", error);
      throw error;
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    const metaColorScheme = document.querySelector('meta[name="color-scheme"]');

    if (settings.theme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#09090b');
      if (metaColorScheme) metaColorScheme.setAttribute('content', 'dark');
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#f8fafc');
      if (metaColorScheme) metaColorScheme.setAttribute('content', 'light');
    }
  }, [settings.theme]);

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};
