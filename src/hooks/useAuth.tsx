import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type SubscriptionStatus = {
  subscribed: boolean;
  status: string;
  trial_end: string | null;
  subscription_end: string | null;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  subscription: SubscriptionStatus | null;
  isAdmin: boolean;
  profile: any | null;
  signOut: () => Promise<void>;
  checkSubscription: () => Promise<SubscriptionStatus | null>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<any | null>(null);

  const refreshProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

    if (error) {
      console.error("Profile fetch failed:", error);
      return;
    }

    if (data) {
      setProfile(data);
      return;
    }

    const fallbackProfile = {
      id: user.id,
      email: user.email ?? null,
      onboarding_completed: false,
    };

    const { data: createdProfile, error: createError } = await supabase
      .from("profiles")
      .upsert(fallbackProfile as any, { onConflict: "id" })
      .select("*")
      .maybeSingle();

    if (createError) {
      console.error("Profile bootstrap failed:", createError);
      setProfile(fallbackProfile as any);
      return;
    }

    setProfile(createdProfile ?? (fallbackProfile as any));
  };

  const checkSubscription = async (): Promise<SubscriptionStatus | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) {
        console.error("Check subscription error:", error);
        setSubscription(null);
        return null;
      }

      if (data) {
        const nextSubscription = data as SubscriptionStatus;
        setSubscription(nextSubscription);
        return nextSubscription;
      }

      setSubscription(null);
      return null;
    } catch (e) {
      console.error("Subscription check failed:", e);
      setSubscription(null);
      return null;
    }
  };

  const checkAdmin = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!!data);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => authSub.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      refreshProfile();
      checkSubscription();
      checkAdmin(user.id);

      // Auto-refresh subscription every 60s
      const interval = setInterval(checkSubscription, 60000);
      return () => clearInterval(interval);
    } else {
      setProfile(null);
      setSubscription(null);
      setIsAdmin(false);
    }
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setSubscription(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, subscription, isAdmin, profile, signOut, checkSubscription, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
