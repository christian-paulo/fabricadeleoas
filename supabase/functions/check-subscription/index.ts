import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      await supabaseClient.from("profiles").update({ is_subscriber: false, stripe_customer_id: null, stripe_subscription_id: null }).eq("id", user.id);
      return new Response(JSON.stringify({ subscribed: false, status: "none", trial_end: null, subscription_end: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 1 });

    let subscribed = false;
    let trialEnd: string | null = null;
    let subscriptionEnd: string | null = null;
    let status = "none";

    if (subscriptions.data.length > 0) {
      const sub = subscriptions.data[0];
      status = sub.status;
      subscribed = ["active", "trialing"].includes(sub.status);

      // Safely convert timestamps
      if (sub.trial_end && typeof sub.trial_end === "number") {
        try { trialEnd = new Date(sub.trial_end * 1000).toISOString(); } catch { trialEnd = null; }
      }
      if (sub.current_period_end && typeof sub.current_period_end === "number") {
        try { subscriptionEnd = new Date(sub.current_period_end * 1000).toISOString(); } catch { subscriptionEnd = null; }
      }

      const trialStartDate = (sub.trial_start && typeof sub.trial_start === "number")
        ? new Date(sub.trial_start * 1000).toISOString()
        : null;

      await supabaseClient.from("profiles").update({
        is_subscriber: subscribed,
        stripe_customer_id: customerId,
        stripe_subscription_id: sub.id,
        trial_start_date: trialStartDate,
      }).eq("id", user.id);

      logStep("Subscription found", { status, subscribed, trialEnd, subscriptionEnd });
    } else {
      await supabaseClient.from("profiles").update({ is_subscriber: false, stripe_customer_id: customerId }).eq("id", user.id);
      logStep("No subscriptions found");
    }

    return new Response(JSON.stringify({ subscribed, status, trial_end: trialEnd, subscription_end: subscriptionEnd }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
