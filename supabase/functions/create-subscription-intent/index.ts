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
    let email: string | null = null;
    let userId: string | null = null;

    // Try to get user from auth header first
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data, error } = await supabaseClient.auth.getUser(token);
      if (!error && data.user?.email) {
        email = data.user.email;
        userId = data.user.id;
      }
    }

    let priceId = "price_1TRjkrIsQknBjnEnLFTuLQtu"; // default semestral (live, sem trial)
    let trialDays = 0;

    if (!email) {
      try {
        const body = await req.json();
        if (body.email) email = body.email;
        if (body.price_id) priceId = body.price_id;
        if (body.trial_days !== undefined) trialDays = body.trial_days;
      } catch {
        // no body
      }
    } else {
      try {
        const body = await req.json();
        if (body.price_id) priceId = body.price_id;
        if (body.trial_days !== undefined) trialDays = body.trial_days;
      } catch {
        // no body
      }
    }

    // Validate price_id (live prices)
    const validPrices = [
      "price_1TRjkrIsQknBjnEnLFTuLQtu", // Semestral (novo, sem trial)
      "price_1TPSXJIsQknBjnEnKoQxE06s", // Semestral (legado, mantido para compat)
      "price_1TPSGiIsQknBjnEncL7IlriJ", // Mensal
      "price_1TPSXhIsQknBjnEn0WjwG2CS", // Anual
    ];
    if (!validPrices.includes(priceId)) {
      throw new Error("Invalid price selected");
    }

    if (!email) throw new Error("Email is required");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });

    const customers = await stripe.customers.list({ email, limit: 1 });
    let customerId: string;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email,
        metadata: userId ? { supabase_user_id: userId } : {},
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

    const subscriptionParams: any = {
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: {
        save_default_payment_method: "on_subscription",
      },
      expand: ["pending_setup_intent", "latest_invoice.payment_intent"],
    };

    if (trialDays > 0) {
      // Mantido para compat: nunca usado por padrão (cobrança imediata)
      subscriptionParams.trial_period_days = trialDays;
      subscriptionParams.trial_settings = {
        end_behavior: { missing_payment_method: "cancel" },
      };
    } else {
      // Força explicitamente sem trial, sobrescrevendo qualquer trial do preço
      subscriptionParams.trial_period_days = 0;
    }

    const subscription = await stripe.subscriptions.create(subscriptionParams);

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
