import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const body = await req.json().catch(() => ({}));
    const setupIntentId = body.setup_intent_id as string | undefined;

    if (!setupIntentId) {
      return new Response(JSON.stringify({ error: "setup_intent_id is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
    if (setupIntent.status !== "succeeded") {
      return new Response(
        JSON.stringify({ error: `SetupIntent status: ${setupIntent.status}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const customerId = typeof setupIntent.customer === "string"
      ? setupIntent.customer
      : setupIntent.customer?.id;
    const paymentMethodId = typeof setupIntent.payment_method === "string"
      ? setupIntent.payment_method
      : setupIntent.payment_method?.id;
    const priceId = setupIntent.metadata?.price_id;

    if (!customerId || !paymentMethodId || !priceId) {
      return new Response(
        JSON.stringify({ error: "SetupIntent missing customer/payment_method/price_id" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Idempotência: se já existe subscription ativa/em cobrança, retorna ela
    const existing = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });
    const reusable = existing.data.find((s) =>
      ["active", "trialing", "past_due", "incomplete"].includes(s.status)
    );
    if (reusable) {
      return new Response(
        JSON.stringify({ subscription_id: reusable.id, status: reusable.status, reused: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Define o cartão como default
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    // Cria a subscription cobrando imediatamente
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      default_payment_method: paymentMethodId,
      trial_period_days: 0,
      payment_behavior: "error_if_incomplete",
      expand: ["latest_invoice.payment_intent"],
      metadata: setupIntent.metadata as Record<string, string>,
    });

    return new Response(
      JSON.stringify({ subscription_id: subscription.id, status: subscription.status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
