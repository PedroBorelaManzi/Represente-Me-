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
  subscription_plan?: 'Acesso Exclusivo' | 'Profissional' | 'Master';
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
  subscription_plan: 'Acesso Exclusivo',
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
        setSettings({
          alerta_days: data.alerta_days ?? defaultSettings.alerta_days,
          critico_days: data.critico_days ?? defaultSettings.critico_days,
          perda_days: data.perda_days ?? defaultSettings.perda_days,
          inativo_days: data.inativo_days ?? defaultSettings.inativo_days,
          theme: data.theme ?? defaultSettings.theme,
          has_completed_onboarding: data.has_completed_onboarding ?? defaultSettings.has_completed_onboarding,
          categories: data.categories || [],
          revenue_ceiling: parseFloat(data.revenue_ceiling?.toString() || "1000000") ?? defaultSettings.revenue_ceiling,
          subscription_plan: (data.subscription_plan as any) || defaultSettings.subscription_plan,
        });
      } else {
        setSettings(defaultSettings);
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

    if (!error) setSettings(updated);
  };

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [settings.theme]);

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};
