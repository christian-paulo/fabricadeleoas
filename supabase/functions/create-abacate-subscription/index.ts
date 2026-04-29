import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRODUCTS: Record<string, { id: string; label: string }> = {
  mensal:    { id: "prod_uBNane3ng1bwfYbtnccS5rc3", label: "Mensal" },
  semestral: { id: "prod_Bjy3HCZC2GgnEgFZgtg23y51", label: "Semestral" },
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user?.email) throw new Error("Unauthenticated");
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const plan = String(body.plan || "").toLowerCase();
    const product = PRODUCTS[plan];
    if (!product) throw new Error(`Invalid plan: ${plan}`);

    // Get/create profile data
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, whatsapp, abacate_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    let customerId = profile?.abacate_customer_id ?? null;

    // Create customer if not exists
    if (!customerId) {
      const customerRes = await fetch("https://api.abacatepay.com/v2/customer/create", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: profile?.full_name || user.email!.split("@")[0],
          email: user.email,
          cellphone: profile?.whatsapp || undefined,
        }),
      });
      const customerJson = await customerRes.json();
      if (!customerJson.success || !customerJson.data?.id) {
        console.error("[abacate] customer create failed", customerJson);
        // Continue without customerId — checkout will collect data
      } else {
        customerId = customerJson.data.id;
        await supabase.from("profiles").update({ abacate_customer_id: customerId }).eq("id", user.id);
      }
    }

    const origin = req.headers.get("origin") || "https://fabricadeleoas.online";

    const subPayload: Record<string, unknown> = {
      items: [{ id: product.id, quantity: 1 }],
      methods: ["CARD", "PIX"],
      externalId: `${user.id}__${plan}`,
      completionUrl: `${origin}/dashboard?abacate=success&plan=${plan}`,
      returnUrl: `${origin}/auth?abacate=cancelled`,
      metadata: { user_id: user.id, plan, email: user.email },
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
    if (!subJson.success || !subJson.data?.url) {
      console.error("[abacate] subscription create failed", subJson);
      throw new Error(subJson.error || "Failed to create subscription checkout");
    }

    // Save provisional record
    await supabase.from("profiles").update({
      subscription_plan: plan,
      payment_provider: "abacate",
      abacate_subscription_id: subJson.data.id,
    }).eq("id", user.id);

    return new Response(JSON.stringify({
      url: subJson.data.url,
      id: subJson.data.id,
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
