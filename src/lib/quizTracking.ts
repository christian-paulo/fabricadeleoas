import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "quiz_session_id";
const TRACKED_KEY = "quiz_first_click_tracked";

const generateSessionId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const getQuizSessionId = (): string => {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = generateSessionId();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
};

/** Records the first click on the quiz (called when user clicks "Começar Agora"). Idempotent. */
export const trackQuizFirstClick = async (): Promise<void> => {
  if (localStorage.getItem(TRACKED_KEY) === "1") return;
  const sessionId = getQuizSessionId();
  try {
    const { error } = await supabase
      .from("quiz_leads" as any)
      .insert({ session_id: sessionId });
    // Ignore unique-violation (already tracked from another tab)
    if (error && !String(error.message || "").toLowerCase().includes("duplicate")) {
      console.warn("quiz_leads insert:", error);
    }
    localStorage.setItem(TRACKED_KEY, "1");
  } catch (e) {
    console.warn("trackQuizFirstClick failed", e);
  }
};

/** Links the current quiz session to an email/profile (called at checkout). */
export const linkQuizLead = async (params: { email?: string; profileId?: string }) => {
  const sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) return;
  const update: Record<string, any> = {};
  if (params.email) update.email = params.email;
  if (params.profileId) update.profile_id = params.profileId;
  if (Object.keys(update).length === 0) return;
  try {
    await supabase.from("quiz_leads" as any).update(update).eq("session_id", sessionId);
  } catch (e) {
    console.warn("linkQuizLead failed", e);
  }
};
