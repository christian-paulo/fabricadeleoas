import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const hasPaidAccess = (subscription: Stripe.Subscription) => {
  return subscription.status === "active" || (subscription.status === "trialing" && !!subscription.default_payment_method);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("User not authenticated");

    const token = authHeader.replace("Bearer ", "");
    const { data, error } = await supabaseClient.auth.getUser(token);
    if (error) throw error;

    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
    }

    const existingSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
      expand: ["data.pending_setup_intent"],
    });

    const paidSubscription = existingSubscriptions.data.find(hasPaidAccess);
    if (paidSubscription) {
      return new Response(JSON.stringify({ already_subscribed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const reusablePendingSubscription = existingSubscriptions.data.find((subscription) => {
      const pendingSetupIntent =
        subscription.pending_setup_intent && typeof subscription.pending_setup_intent !== "string"
          ? subscription.pending_setup_intent
          : null;

      return ["trialing", "incomplete", "past_due", "unpaid"].includes(subscription.status)
        && !subscription.default_payment_method
        && !!pendingSetupIntent?.client_secret;
    });

    if (reusablePendingSubscription) {
      const pendingSetupIntent = reusablePendingSubscription.pending_setup_intent as Stripe.SetupIntent;

      return new Response(
        JSON.stringify({
          subscription_id: reusablePendingSubscription.id,
          client_secret: pendingSetupIntent.client_secret,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: "price_1TEx9fI4dFrhArZvg5kThQaN" }],
      trial_period_days: 3,
      payment_behavior: "default_incomplete",
      payment_settings: {
        save_default_payment_method: "on_subscription",
      },
      trial_settings: {
        end_behavior: {
          missing_payment_method: "cancel",
        },
      },
      expand: ["pending_setup_intent"],
    });

    const setupIntent = subscription.pending_setup_intent as Stripe.SetupIntent | null;
    if (!setupIntent?.client_secret) {
      throw new Error("Não foi possível iniciar a coleta do cartão");
    }

    return new Response(
      JSON.stringify({
        subscription_id: subscription.id,
        client_secret: setupIntent.client_secret,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
