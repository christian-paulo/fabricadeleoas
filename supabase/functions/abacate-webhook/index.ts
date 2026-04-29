import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const META_PIXEL_ID = "1453509346269854";

// Plan -> price (BRL)
const PLAN_PRICE: Record<string, number> = {
  monthly: 39.9,
  mensal: 39.9,
  semestral: 119.9,
  annual: 197.9,
  anual: 197.9,
};

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input.trim().toLowerCase());
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sendMetaPurchase(opts: {
  email?: string;
  value: number;
  currency?: string;
  eventId: string;
  plan?: string;
}) {
  const token = Deno.env.get("META_PIXEL_ACCESS_TOKEN");
  if (!token) {
    console.warn("[meta-capi] missing META_PIXEL_ACCESS_TOKEN");
    return;
  }
  try {
    const userData: Record<string, unknown> = {};
    if (opts.email) userData.em = [await sha256(opts.email)];

    const body = {
      data: [
        {
          event_name: "Purchase",
          event_time: Math.floor(Date.now() / 1000),
          event_id: opts.eventId,
          action_source: "website",
          user_data: userData,
          custom_data: {
            currency: opts.currency || "BRL",
            value: opts.value,
            content_name: opts.plan || "subscription",
            content_type: "product",
          },
        },
      ],
    };

    const resp = await fetch(
      `https://graph.facebook.com/v19.0/${META_PIXEL_ID}/events?access_token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    const text = await resp.text();
    console.log("[meta-capi] purchase response", resp.status, text);
  } catch (e) {
    console.error("[meta-capi] error", e);
  }
}

// Format date to Utmify format: "YYYY-MM-DD HH:MM:SS" in UTC
function formatDateUtmify(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

async function sendToUtmify(payload: Record<string, unknown>): Promise<void> {
  const apiToken = Deno.env.get("UTMIFY_API_TOKEN");
  if (!apiToken) {
    console.warn("[utmify] UTMIFY_API_TOKEN not set, skipping");
    return;
  }
  try {
    const resp = await fetch("https://api.utmify.com.br/api-credentials/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-token": apiToken },
      body: JSON.stringify(payload),
    });
    const text = await resp.text();
    console.log("[utmify] response", resp.status, text);
  } catch (e) {
    console.error("[utmify] error", e);
  }
}

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

    // Send Purchase event to Meta Conversions API + Utmify (only on first paid event)
    if (isPaid && !event.includes("renew")) {
      const value = (plan && PLAN_PRICE[plan.toLowerCase()]) || 0;
      const eventId = `abacate_${subscriptionId || externalId || Date.now()}`;
      await sendMetaPurchase({
        email,
        value,
        currency: "BRL",
        eventId,
        plan,
      });

      // Fetch profile for UTMs and customer info
      let profileData: any = null;
      if (userId) {
        const { data } = await supabase
          .from("profiles")
          .select("email, full_name, whatsapp, utm_source, utm_medium, utm_campaign, utm_content")
          .eq("id", userId)
          .maybeSingle();
        profileData = data;
      } else if (email) {
        const { data } = await supabase
          .from("profiles")
          .select("email, full_name, whatsapp, utm_source, utm_medium, utm_campaign, utm_content")
          .ilike("email", email)
          .maybeSingle();
        profileData = data;
      }

      const now = new Date();
      const valueInCents = Math.round(value * 100);
      const planLabel = plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : "Assinatura";

      const utmifyPayload = {
        orderId: subscriptionId || eventId,
        platform: "AbacatePay",
        paymentMethod: "pix" as const,
        status: "paid" as const,
        createdAt: formatDateUtmify(now),
        approvedDate: formatDateUtmify(now),
        refundedAt: null,
        customer: {
          name: profileData?.full_name || "Cliente",
          email: profileData?.email || email || "sem-email@fabricadeleoas.online",
          phone: profileData?.whatsapp || null,
          document: null,
          country: "BR",
        },
        products: [
          {
            id: plan || "subscription",
            name: `Fábrica de Leoas - ${planLabel}`,
            planId: plan || null,
            planName: planLabel,
            quantity: 1,
            priceInCents: valueInCents,
          },
        ],
        trackingParameters: {
          src: null,
          sck: null,
          utm_source: profileData?.utm_source || null,
          utm_campaign: profileData?.utm_campaign || null,
          utm_medium: profileData?.utm_medium || null,
          utm_content: profileData?.utm_content || null,
          utm_term: null,
        },
        commission: {
          totalPriceInCents: valueInCents,
          gatewayFeeInCents: 0,
          userCommissionInCents: valueInCents,
          currency: "BRL" as const,
        },
        isTest: false,
      };

      await sendToUtmify(utmifyPayload);
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
