import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { offlineCache, CacheKeys } from "../lib/offlineCache";
import { syncQueue } from "../lib/syncQueue";

export type SubscriptionStatus = 'active' | 'past_due' | 'inactive' | 'trialing';

interface Settings {
  alerta_days: number;
  critico_days: number;
  perda_days: number;
  inativo_days: number;
  theme: 'light' | 'dark';
  has_completed_onboarding: boolean;
  categories: string[];
  revenue_ceiling: number;
  subscription_status: SubscriptionStatus;
  plan_id: string;
  avatar_url?: string;
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
  subscription_status: 'active', // Default to active to avoid locking out offline users
  plan_id: 'exclusivo',
  avatar_url: undefined,
};

interface SettingsContextType {
  settings: Settings;
  loading: boolean;
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<Settings>(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    
    return {
      ...defaultSettings,
      theme: savedTheme || defaultSettings.theme,
    };
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const location = useLocation();
  const isDashboard = location.pathname.startsWith("/dashboard");

  useEffect(() => {
    async function loadSettings() {
      if (!user) {
        const savedTheme = localStorage.getItem('theme') || 'light';
        setSettings({
          ...defaultSettings,
          theme: (savedTheme === 'dark' ? 'dark' : 'light'),
        });
        setLoading(false);
        return;
      }
      
      setLoading(true);
      
      // Try to load cached settings immediately to prevent blocking offline users
      const cached = offlineCache.get(CacheKeys.USER_SETTINGS) as any;
      if (cached) {
        setSettings({
          alerta_days: cached.alerta_days ?? defaultSettings.alerta_days,
          critico_days: cached.critico_days ?? defaultSettings.critico_days,
          perda_days: cached.perda_days ?? defaultSettings.perda_days,
          inativo_days: cached.inativo_days ?? defaultSettings.inativo_days,
          theme: (localStorage.getItem('theme') as 'light' | 'dark') || cached.theme || defaultSettings.theme,
          has_completed_onboarding: cached.has_completed_onboarding ?? defaultSettings.has_completed_onboarding,
          categories: cached.categories || [],
          revenue_ceiling: parseFloat(cached.revenue_ceiling?.toString() || "1000000") ?? defaultSettings.revenue_ceiling,
          subscription_status: (cached.subscription_status as SubscriptionStatus) || 'active',
          plan_id: cached.plan_id || 'exclusivo',
          avatar_url: cached.avatar_url,
        });
      }

      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!error && data) {
        let hasCompleted = data.has_completed_onboarding ?? defaultSettings.has_completed_onboarding;
        let categories = data.categories || [];
        const subStatus = (data.subscription_status as SubscriptionStatus) || 'active';

        if (!hasCompleted) {
          const { count } = await supabase
            .from("clients")
            .select("*", { count: 'exact', head: true })
            .eq("user_id", user.id);

          if (count && count > 0) {
            hasCompleted = true;
            await supabase.from("user_settings").upsert({
              user_id: user.id,
              has_completed_onboarding: true,
              updated_at: new Date().toISOString()
            });
          }
        }

        // Not overwriting localStorage theme with DB theme to respect device preference

        const finalAvatar = localStorage.getItem('avatar_' + user.id) || user?.user_metadata?.avatar_url || data.avatar_url;
        if (finalAvatar && finalAvatar.startsWith('data:') && !localStorage.getItem('avatar_' + user.id)) {
          localStorage.setItem('avatar_' + user.id, finalAvatar);
        }

        const freshSettings = {
          alerta_days: data.alerta_days ?? defaultSettings.alerta_days,
          critico_days: data.critico_days ?? defaultSettings.critico_days,
          perda_days: data.perda_days ?? defaultSettings.perda_days,
          inativo_days: data.inativo_days ?? defaultSettings.inativo_days,
          theme: (localStorage.getItem('theme') as 'light' | 'dark') || (data.theme as 'light' | 'dark') || defaultSettings.theme,
          has_completed_onboarding: hasCompleted,
          categories: categories,
          revenue_ceiling: parseFloat(data.revenue_ceiling?.toString() || "1000000") ?? defaultSettings.revenue_ceiling,
          subscription_status: subStatus,
          plan_id: data.plan_id || 'exclusivo',
          avatar_url: finalAvatar,
        };

        setSettings(freshSettings);
        offlineCache.set(CacheKeys.USER_SETTINGS, data);
      } else {
        // Fallback to cache or defaults
        if (!cached) {
          setSettings(defaultSettings);
        }
      }
      setLoading(false);
    }

    loadSettings();
  }, [user]);

  const updateSettings = async (newSettings: Partial<Settings>) => {
    if (!user) return;
    
    let avatarUrl = newSettings.avatar_url;

    if (avatarUrl && avatarUrl.startsWith('data:')) {
      try {
        localStorage.setItem("avatar_" + user.id, avatarUrl);
        await supabase.auth.updateUser({
          data: { avatar_url: avatarUrl }
        });
      } catch (e) {
        console.error("Error saving avatar:", e);
      }
    }

    const updated = { 
      ...settings, 
      ...newSettings,
      ...(avatarUrl ? { avatar_url: avatarUrl } : {})
    };
    setSettings(updated);
    
    // Save immediately to local offline cache
    offlineCache.set(CacheKeys.USER_SETTINGS, updated);
    
    if (newSettings.theme) {
      localStorage.setItem('theme', newSettings.theme);
    }

    const { avatar_url, ...dbSettings } = updated;

    const { error } = await supabase
      .from("user_settings")
      .upsert({
        user_id: user.id,
        ...dbSettings,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) {
      console.error("Error updating settings:", error);
    }
  };

    useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark' && isDashboard) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, [settings.theme, isDashboard]);

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};
