import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { User } from "@supabase/supabase-js";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signIn: (email: string, pass: string) => Promise<any>;
  signInOffline: (cachedUser: any) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session?.user) {
          const minimalUser = { id: session.user.id, email: session.user.email };
          localStorage.setItem("rm_cached_user", JSON.stringify(minimalUser));
          localStorage.setItem("rm_has_logged_in_once", "true");
        }
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Erro ao carregar sessão:", err);
        setLoading(false); // Destrava o loading
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const minimalUser = { id: session.user.id, email: session.user.email };
        localStorage.setItem("rm_cached_user", JSON.stringify(minimalUser));
        localStorage.setItem("rm_has_logged_in_once", "true");
      }
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, pass: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    if (error) throw error;
    if (data?.user) {
      const minimalUser = { id: data.user.id, email: data.user.email };
      localStorage.setItem("rm_cached_user", JSON.stringify(minimalUser));
      localStorage.setItem("rm_has_logged_in_once", "true");
    }
    return data;
  };

  const signInOffline = (cachedUser: any) => {
    setUser(cachedUser);
    setLoading(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("rm_cached_user");
    localStorage.removeItem('has_completed_onboarding');
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, signIn, signInOffline }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
