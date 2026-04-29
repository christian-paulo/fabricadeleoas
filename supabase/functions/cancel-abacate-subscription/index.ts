import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("ABACATEPAY_API_KEY");
    if (!apiKey) throw new Error("ABACATEPAY_API_KEY not set");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) throw new Error("Unauthenticated");
    const user = userData.user;

    const { data: profile } = await supabase
      .from("profiles")
      .select("abacate_subscription_id")
      .eq("id", user.id)
      .maybeSingle();

    const subId = profile?.abacate_subscription_id;
    if (!subId) throw new Error("No AbacatePay subscription found for this user");

    const res = await fetch(
      `https://api.abacatepay.com/v2/subscriptions/cancel?id=${encodeURIComponent(subId)}`,
      {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}` },
      }
    );
    const json = await res.json();
    if (!json.success) {
      console.error("[abacate cancel] failed", json);
      throw new Error(json.error || "Failed to cancel subscription");
    }

    await supabase.from("profiles").update({
      is_subscriber: false,
      canceled_at: new Date().toISOString(),
    }).eq("id", user.id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[cancel-abacate-subscription] error", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
