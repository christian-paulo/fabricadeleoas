import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-abacatepay-signature",
};

/**
 * AbacatePay sends events. We rely on the URL secret query param for validation
 * (recommended pattern in their docs). HMAC verification can be added if Abacate
 * provides a signature header.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const url = new URL(req.url);
    const secretInUrl = url.searchParams.get("webhookSecret");
    const expectedSecret = Deno.env.get("ABACATEPAY_WEBHOOK_SECRET");
    if (expectedSecret && secretInUrl !== expectedSecret) {
      console.warn("[abacate-webhook] invalid secret");
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const payload = await req.json();
    console.log("[abacate-webhook] event", JSON.stringify(payload));

    const event = payload.event || payload.type;
    const data = payload.data || payload;

    // Try to extract identifiers
    const externalId: string | undefined = data?.externalId || data?.billing?.externalId;
    const subscriptionId: string | undefined = data?.id || data?.billing?.id;
    const customerId: string | undefined = data?.customerId || data?.customer?.id;
    const status: string | undefined = data?.status || data?.billing?.status;
    const metadata = data?.metadata || data?.billing?.metadata || {};

    // Resolve user
    let userId: string | undefined = metadata?.user_id;
    let plan: string | undefined = metadata?.plan;

    if (!userId && externalId && externalId.includes("__")) {
      const [u, p] = externalId.split("__");
      userId = u;
      plan = plan || p;
    }
    if (!userId && subscriptionId) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("id, subscription_plan")
        .eq("abacate_subscription_id", subscriptionId)
        .maybeSingle();
      if (prof) {
        userId = prof.id;
        plan = plan || prof.subscription_plan || undefined;
      }
    }

    if (!userId) {
      console.warn("[abacate-webhook] no user found for event");
      return new Response(JSON.stringify({ received: true, matched: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const updates: Record<string, unknown> = {};
    if (subscriptionId) updates.abacate_subscription_id = subscriptionId;
    if (customerId) updates.abacate_customer_id = customerId;
    if (plan) updates.subscription_plan = plan;
    updates.payment_provider = "abacate";

    const evt = String(event || "").toLowerCase();
    const stat = String(status || "").toUpperCase();

    if (
      evt.includes("paid") || evt.includes("billing.paid") ||
      evt.includes("subscription.activated") || stat === "PAID"
    ) {
      updates.is_subscriber = true;
      updates.canceled_at = null;
    }

    if (
      evt.includes("cancel") || evt.includes("subscription.cancelled") ||
      stat === "CANCELLED"
    ) {
      updates.is_subscriber = false;
      updates.canceled_at = new Date().toISOString();
    }

    if (evt.includes("expired") || stat === "EXPIRED" || evt.includes("refund") || stat === "REFUNDED") {
      updates.is_subscriber = false;
    }

    const { error: upErr } = await supabase.from("profiles").update(updates).eq("id", userId);
    if (upErr) console.error("[abacate-webhook] profile update error", upErr);

    return new Response(JSON.stringify({ received: true, userId, updates }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[abacate-webhook] error", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
