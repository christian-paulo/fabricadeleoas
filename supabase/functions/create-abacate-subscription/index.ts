import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRODUCTS: Record<string, { id: string; label: string }> = {
  monthly:   { id: "prod_uBNane3ng1bwfYbtnccS5rc3", label: "Mensal" },
  mensal:    { id: "prod_uBNane3ng1bwfYbtnccS5rc3", label: "Mensal" },
  semestral: { id: "prod_Bjy3HCZC2GgnEgFZgtg23y51", label: "Semestral" },
  annual:    { id: "prod_prY5aFWLULfEURBQgDbeu1GR", label: "Anual" },
  anual:     { id: "prod_prY5aFWLULfEURBQgDbeu1GR", label: "Anual" },
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

    const body = await req.json().catch(() => ({}));
    const plan = String(body.plan || "").toLowerCase();
    const email = String(body.email || "").trim().toLowerCase();
    const fullName: string | undefined = body.full_name;
    const cellphone: string | undefined = body.cellphone;
    const product = PRODUCTS[plan];
    if (!product) throw new Error(`Invalid plan: ${plan}`);
    if (!email) throw new Error("Missing email");

    // Try to find existing authenticated user (for users who already have an account)
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    let existingCustomerId: string | null = null;
    if (authHeader) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const { data: userData } = await supabase.auth.getUser(token);
        if (userData?.user) {
          userId = userData.user.id;
          const { data: prof } = await supabase
            .from("profiles")
            .select("abacate_customer_id, full_name, whatsapp")
            .eq("id", userId)
            .maybeSingle();
          existingCustomerId = prof?.abacate_customer_id ?? null;
        }
      } catch (_e) { /* ignore — pre-account flow */ }
    }

    // Create AbacatePay customer if we don't have one yet
    let customerId = existingCustomerId;
    if (!customerId) {
      const customerRes = await fetch("https://api.abacatepay.com/v2/customers/create", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: {
            name: fullName || email.split("@")[0],
            email,
            cellphone: cellphone || undefined,
          },
        }),
      });
      const customerJson = await customerRes.json();
      if (customerJson?.data?.id) {
        customerId = customerJson.data.id;
      } else {
        console.warn("[abacate] customer create failed (continuing)", customerJson);
      }
      if (userId && customerId) {
        await supabase.from("profiles").update({ abacate_customer_id: customerId }).eq("id", userId);
      }
    }

    const origin = req.headers.get("origin") || "https://fabricadeleoas.online";
    const externalId = userId ? `user:${userId}__${plan}` : `email:${email}__${plan}`;

    const subPayload: Record<string, unknown> = {
      items: [{ id: product.id, quantity: 1 }],
      methods: ["CARD"],
      externalId,
      completionUrl: userId
        ? `${origin}/dashboard?abacate=success&plan=${plan}`
        : `${origin}/checkout?payment=success&plan=${plan}`,
      returnUrl: `${origin}/checkout?abacate=cancelled`,
      metadata: { user_id: userId, email, plan },
    };
    if (customerId) subPayload.customerId = customerId;

    const subRes = await fetch("https://api.abacatepay.com/v2/subscriptions/create", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subPayload),
    });
    const subJson = await subRes.json();
    if (!subJson?.data?.url) {
      console.error("[abacate] subscription create failed", subJson);
      throw new Error(subJson?.error || "Failed to create subscription checkout");
    }

    const subscriptionId = subJson.data.id;
    const checkoutUrl = subJson.data.url;

    // Persist provisional record so we can match the webhook later
    if (userId) {
      await supabase.from("profiles").update({
        subscription_plan: plan,
        payment_provider: "abacate",
        abacate_subscription_id: subscriptionId,
        ...(customerId ? { abacate_customer_id: customerId } : {}),
      }).eq("id", userId);
    } else {
      // Pre-account: store in pending_subscriptions
      await supabase.from("pending_subscriptions").upsert({
        email,
        plan,
        abacate_subscription_id: subscriptionId,
        abacate_customer_id: customerId,
        status: "pending",
        metadata: { full_name: fullName, cellphone },
      }, { onConflict: "abacate_subscription_id" });
    }

    return new Response(JSON.stringify({
      url: checkoutUrl,
      id: subscriptionId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[create-abacate-subscription] error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
