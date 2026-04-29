import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * AbacatePay webhook handler.
 *
 * The webhook URL is configured in AbacatePay panel with `?webhookSecret=...`
 * which we verify against ABACATEPAY_WEBHOOK_SECRET if set.
 *
 * Flow:
 *  - If event identifies a known userId (via metadata or externalId or stored sub_id) → update profiles.
 *  - Otherwise, persist on pending_subscriptions (matched later by email when account is created).
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

    const event = String(payload.event || payload.type || "").toLowerCase();
    const data = payload.data || payload;

    const externalId: string | undefined = data?.externalId || data?.billing?.externalId || data?.subscription?.externalId;
    const subscriptionId: string | undefined = data?.id || data?.subscription?.id || data?.billing?.id;
    const customerId: string | undefined = data?.customerId || data?.customer?.id;
    const status: string = String(data?.status || data?.billing?.status || "").toUpperCase();
    const metadata = data?.metadata || data?.subscription?.metadata || data?.billing?.metadata || {};

    let userId: string | undefined = metadata?.user_id;
    let plan: string | undefined = metadata?.plan;
    let email: string | undefined = metadata?.email || data?.customer?.email;

    if (externalId) {
      // Format: user:<id>__<plan> OR email:<email>__<plan>
      const m = externalId.match(/^(user|email):(.+?)__(.+)$/);
      if (m) {
        if (m[1] === "user" && !userId) userId = m[2];
        if (m[1] === "email" && !email) email = m[2];
        if (!plan) plan = m[3];
      }
    }

    // Try to find user by stored subscriptionId
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

    // Try to find user by email
    if (!userId && email) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("id")
        .ilike("email", email)
        .maybeSingle();
      if (prof) userId = prof.id;
    }

    const isPaid = event.includes("paid") || event.includes("activated") || status === "PAID" || status === "ACTIVE";
    const isCancelled = event.includes("cancel") || status === "CANCELLED";
    const isExpiredOrRefunded = event.includes("expired") || event.includes("refund") || status === "EXPIRED" || status === "REFUNDED";

    if (userId) {
      const updates: Record<string, unknown> = { payment_provider: "abacate" };
      if (subscriptionId) updates.abacate_subscription_id = subscriptionId;
      if (customerId) updates.abacate_customer_id = customerId;
      if (plan) updates.subscription_plan = plan;
      if (isPaid) { updates.is_subscriber = true; updates.canceled_at = null; }
      if (isCancelled) { updates.is_subscriber = false; updates.canceled_at = new Date().toISOString(); }
      if (isExpiredOrRefunded) updates.is_subscriber = false;

      const { error: upErr } = await supabase.from("profiles").update(updates).eq("id", userId);
      if (upErr) console.error("[abacate-webhook] profile update error", upErr);
    } else if (email) {
      // Pre-account flow: update pending_subscriptions
      const upsertData: Record<string, unknown> = {
        email,
        plan: plan || "unknown",
        abacate_subscription_id: subscriptionId,
        abacate_customer_id: customerId,
        status: isPaid ? "paid" : isCancelled ? "cancelled" : isExpiredOrRefunded ? "expired" : "pending",
        paid_at: isPaid ? new Date().toISOString() : null,
        metadata,
      };
      // Conflict on subscription_id if available, otherwise just insert
      if (subscriptionId) {
        await supabase.from("pending_subscriptions")
          .upsert(upsertData, { onConflict: "abacate_subscription_id" });
      } else {
        await supabase.from("pending_subscriptions").insert(upsertData);
      }
    } else {
      console.warn("[abacate-webhook] no user or email found");
    }

    return new Response(JSON.stringify({ received: true, userId, email }), {
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
