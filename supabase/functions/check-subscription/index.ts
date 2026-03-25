import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

const toIsoString = (timestamp?: number | null) => {
  if (typeof timestamp !== "number") return null;

  try {
    return new Date(timestamp * 1000).toISOString();
  } catch {
    return null;
  }
};

const hasPaidAccess = (subscription: Stripe.Subscription) => {
  return subscription.status === "active" || (subscription.status === "trialing" && !!subscription.default_payment_method);
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

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      await supabaseClient
        .from("profiles")
        .update({
          is_subscriber: false,
          stripe_customer_id: null,
          stripe_subscription_id: null,
          trial_start_date: null,
        })
        .eq("id", user.id);

      return new Response(JSON.stringify({ subscribed: false, status: "none", trial_end: null, subscription_end: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });

    const validSubscription = subscriptions.data.find(hasPaidAccess) ?? null;
    const latestSubscription = subscriptions.data[0] ?? null;

    if (!validSubscription) {
      await supabaseClient
        .from("profiles")
        .update({
          is_subscriber: false,
          stripe_customer_id: customerId,
          stripe_subscription_id: null,
          trial_start_date: null,
        })
        .eq("id", user.id);

      return new Response(
        JSON.stringify({
          subscribed: false,
          status: latestSubscription?.status ?? "none",
          trial_end: null,
          subscription_end: null,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const trialEnd = toIsoString(validSubscription.trial_end);
    const subscriptionEnd = toIsoString(validSubscription.current_period_end);
    const trialStartDate = toIsoString(validSubscription.trial_start);

    await supabaseClient
      .from("profiles")
      .update({
        is_subscriber: true,
        stripe_customer_id: customerId,
        stripe_subscription_id: validSubscription.id,
        trial_start_date: trialStartDate,
      })
      .eq("id", user.id);

    logStep("Valid subscription found", {
      status: validSubscription.status,
      subscriptionId: validSubscription.id,
      hasDefaultPaymentMethod: !!validSubscription.default_payment_method,
    });

    return new Response(
      JSON.stringify({
        subscribed: true,
        status: validSubscription.status,
        trial_end: trialEnd,
        subscription_end: subscriptionEnd,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message });

    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
