import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "quiz_session_id";
const TRACKED_KEY = "quiz_first_click_tracked";
const EMAIL_KEY = "quiz_lead_email";

const generateSessionId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const safeGet = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* in-app browsers (Instagram/FB) may block storage in private mode */
  }
};

export const getQuizSessionId = (): string => {
  let id = safeGet(SESSION_KEY);
  if (!id) {
    id = generateSessionId();
    safeSet(SESSION_KEY, id);
  }
  return id;
};

/** Records the first click on the quiz (called when user clicks "Começar Agora"). Idempotent.
 *  `variant` identifies which welcome screen the lead saw (e.g. "default", "v1", "v2", "v3"). */
export const trackQuizFirstClick = async (variant: string = "default"): Promise<void> => {
  if (safeGet(TRACKED_KEY) === "1") return;
  const sessionId = getQuizSessionId();
  try {
    const { error } = await supabase
      .from("quiz_leads" as any)
      .insert({ session_id: sessionId, variant });
    if (error && !String(error.message || "").toLowerCase().includes("duplicate")) {
      console.warn("quiz_leads insert:", error);
    }
    safeSet(TRACKED_KEY, "1");
  } catch (e) {
    console.warn("trackQuizFirstClick failed", e);
  }
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

/**
 * Links the current quiz session to an email/profile.
 * Resilient to cross-browser scenarios (e.g. Instagram/FB in-app browsers
 * where the user opens checkout in an external browser):
 *  1. Try to update by current session_id (same browser).
 *  2. If no row was affected and we have an email, try to update by email
 *     (matches the lead created on the original browser).
 *  3. If still no match, insert a new lead row so we don't lose the data.
 */
/**
 * Saves the quiz progress (responses + last_step + name) to quiz_leads in real-time.
 * Called on each step of the onboarding so we capture data even if the lead never finishes.
 * Idempotent: updates the existing lead row by session_id.
 */
export const saveQuizProgress = async (params: {
  step?: string;
  name?: string;
  email?: string;
  responses?: Record<string, any>;
}): Promise<void> => {
  const sessionId = getQuizSessionId();
  const update: Record<string, any> = { updated_at: new Date().toISOString() };
  if (params.step) update.last_step = params.step;
  if (params.name && params.name.trim()) update.name = params.name.trim();
  if (params.email && params.email.trim()) update.email = normalizeEmail(params.email);
  if (params.responses) update.responses = params.responses;

  try {
    // Try update first
    const { data, error } = await supabase
      .from("quiz_leads" as any)
      .update(update)
      .eq("session_id", sessionId)
      .select("id");
    if (!error && data && data.length > 0) return;

    // No row yet (e.g. user landed directly on a quiz step) — insert one
    await supabase.from("quiz_leads" as any).insert({
      session_id: sessionId,
      variant: "default",
      ...update,
    });
  } catch (e) {
    console.warn("saveQuizProgress failed", e);
  }
};

export const linkQuizLead = async (params: { email?: string; profileId?: string }) => {
  const email = params.email ? normalizeEmail(params.email) : undefined;
  if (email) safeSet(EMAIL_KEY, email);

  const sessionId = safeGet(SESSION_KEY) ?? safeGet(EMAIL_KEY) ? safeGet(SESSION_KEY) : null;
  const update: Record<string, any> = {};
  if (email) update.email = email;
  if (params.profileId) update.profile_id = params.profileId;
  if (Object.keys(update).length === 0) return;

  try {
    // 1) Same-browser path: update by session_id
    if (sessionId) {
      const { data, error } = await supabase
        .from("quiz_leads" as any)
        .update(update)
        .eq("session_id", sessionId)
        .select("id");
      if (!error && data && data.length > 0) return;
    }

    // 2) Cross-browser path: update by email (in-app -> external browser)
    if (email) {
      const { data, error } = await supabase
        .from("quiz_leads" as any)
        .update(update)
        .eq("email", email)
        .select("id");
      if (!error && data && data.length > 0) return;
    }

    // 3) No existing lead found — create one so the conversion is still tracked
    const fallbackSession = sessionId || getQuizSessionId();
    await supabase.from("quiz_leads" as any).insert({
      session_id: fallbackSession,
      ...update,
    });
  } catch (e) {
    console.warn("linkQuizLead failed", e);
  }
};
