import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Format date to Utmify format: "YYYY-MM-DD HH:MM:SS" in UTC
const formatDateUtmify = (timestamp: number): string => {
  const d = new Date(timestamp * 1000);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
};

// Map Stripe event to Utmify status
const mapStatus = (eventType: string, invoice?: Stripe.Invoice): string => {
  switch (eventType) {
    case "invoice.paid":
      return "paid";
    case "invoice.payment_failed":
      return "refused";
    case "charge.refunded":
      return "refunded";
    case "customer.subscription.deleted":
      return "refunded";
    default:
      return "paid";
  }
};

// Map Stripe payment method to Utmify format
const mapPaymentMethod = (pm?: string | null): string => {
  if (!pm) return "credit_card";
  if (pm.includes("card")) return "credit_card";
  if (pm.includes("boleto")) return "boleto";
  if (pm.includes("pix")) return "pix";
  return "credit_card";
};

// Product mapping (live prices)
const PRODUCTS: Record<string, { id: string; name: string; planId: string; planName: string }> = {
  "price_1TRjkrIsQknBjnEnLFTuLQtu": {
    id: "prod_UOF0wA3Z0IfrcU",
    name: "Fábrica de Leoas",
    planId: "price_1TRjkrIsQknBjnEnLFTuLQtu",
    planName: "Plano Semestral",
  },
  "price_1TPSXJIsQknBjnEnKoQxE06s": {
    id: "prod_UOF0wA3Z0IfrcU",
    name: "Fábrica de Leoas",
    planId: "price_1TPSXJIsQknBjnEnKoQxE06s",
    planName: "Plano Semestral",
  },
  "price_1TPSGiIsQknBjnEncL7IlriJ": {
    id: "prod_UOEkdbPryEAq4z",
    name: "Fábrica de Leoas",
    planId: "price_1TPSGiIsQknBjnEncL7IlriJ",
    planName: "Plano Mensal",
  },
  "price_1TPSXhIsQknBjnEn0WjwG2CS": {
    id: "prod_UOF1O7d2Nl1y5T",
    name: "Fábrica de Leoas",
    planId: "price_1TPSXhIsQknBjnEn0WjwG2CS",
    planName: "Plano Anual",
  },
};

async function sendToUtmify(payload: Record<string, unknown>): Promise<void> {
  const apiToken = Deno.env.get("UTMIFY_API_TOKEN");
  if (!apiToken) {
    logStep("UTMIFY_API_TOKEN not set, skipping Utmify send");
    return;
  }

  logStep("Sending to Utmify", { orderId: payload.orderId, status: payload.status });

  const response = await fetch("https://api.utmify.com.br/api-credentials/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-token": apiToken,
    },
    body: JSON.stringify(payload),
  });

  const result = await response.text();
  logStep("Utmify response", { status: response.status, body: result });

  if (!response.ok) {
    console.error(`[STRIPE-WEBHOOK] Utmify error: ${response.status} - ${result}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!signature || !webhookSecret) {
      logStep("Missing signature or webhook secret");
      return new Response(JSON.stringify({ error: "Missing signature" }), { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      logStep("Webhook signature verification failed", { error: (err as Error).message });
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
    }

    logStep("Event received", { type: event.type, id: event.id });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // ── Subscription lifecycle: trial start / activation / cancellation ──────
    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated"
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id;

      if (customerId) {
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        const email = customer.email || "";

        if (email) {
          const priceId = subscription.items?.data?.[0]?.price?.id || "";
          const productInfo = PRODUCTS[priceId];
          const planName = productInfo?.planName || "Assinatura";

          const isTrial = subscription.status === "trialing";
          const isActive = subscription.status === "active";
          const hasPaymentMethod = !!subscription.default_payment_method;

          // Only record if it's a trial with payment captured or an active sub
          if ((isTrial && hasPaymentMethod) || isActive) {
            const trialStartDate = subscription.trial_start
              ? new Date(subscription.trial_start * 1000).toISOString()
              : null;
            const trialEndDate = subscription.trial_end
              ? new Date(subscription.trial_end * 1000).toISOString()
              : null;

            await supabaseAdmin
              .from("profiles")
              .update({
                is_subscriber: true,
                stripe_customer_id: customerId,
                stripe_subscription_id: subscription.id,
                trial_start_date: trialStartDate,
                trial_end_date: trialEndDate,
                subscription_plan: planName,
                canceled_at: null,
              })
              .eq("email", email);

            logStep("Subscription recorded", { email, status: subscription.status, planName });
          }
        }
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id;

      if (customerId) {
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        const email = customer.email || "";

        if (email) {
          await supabaseAdmin
            .from("profiles")
            .update({
              is_subscriber: false,
              canceled_at: new Date().toISOString(),
            })
            .eq("email", email);

          logStep("Subscription cancelled", { email });
        }
      }
    }

    // Handle relevant events
    if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;

      if (!customerId) {
        logStep("No customer ID found");
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
      const email = customer.email || "";
      const name = customer.name || email;

      // Get UTM data from profile
      let utmData: Record<string, string | null> = {
        utm_source: null,
        utm_medium: null,
        utm_campaign: null,
        utm_content: null,
      };
      let phone: string | null = null;

      if (email) {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("utm_source, utm_medium, utm_campaign, utm_content, whatsapp")
          .eq("email", email)
          .maybeSingle();

        if (profile) {
          utmData = {
            utm_source: profile.utm_source,
            utm_medium: profile.utm_medium,
            utm_campaign: profile.utm_campaign,
            utm_content: profile.utm_content,
          };
          phone = profile.whatsapp;
        }
      }

      // Get line items info
      const lineItem = invoice.lines?.data?.[0];
      const priceId = lineItem?.price?.id || "";
      const productInfo = PRODUCTS[priceId] || {
        id: priceId,
        name: "Fábrica de Leoas",
        planId: priceId,
        planName: "Assinatura",
      };

      const amountInCents = invoice.amount_paid || invoice.total || 0;
      // Stripe fees ~3.99% + R$0.39 for BR cards (approximate)
      const gatewayFee = Math.round(amountInCents * 0.0399 + 39);
      const userCommission = amountInCents - gatewayFee;

      const subscriptionId = typeof invoice.subscription === "string"
        ? invoice.subscription
        : invoice.subscription?.id || invoice.id;

      const createdAt = formatDateUtmify(invoice.created);
      const approvedDate = event.type === "invoice.paid"
        ? formatDateUtmify(Math.floor(Date.now() / 1000))
        : null;

      const paymentMethodType = invoice.payment_intent
        ? await (async () => {
            try {
              const piId = typeof invoice.payment_intent === "string"
                ? invoice.payment_intent
                : invoice.payment_intent?.id;
              if (!piId) return null;
              const pi = await stripe.paymentIntents.retrieve(piId);
              const pmId = typeof pi.payment_method === "string" ? pi.payment_method : pi.payment_method?.id;
              if (!pmId) return null;
              const pm = await stripe.paymentMethods.retrieve(pmId);
              return pm.type;
            } catch {
              return null;
            }
          })()
        : null;

      const utmifyPayload = {
        orderId: subscriptionId,
        platform: "FabricaDeLeoas",
        paymentMethod: mapPaymentMethod(paymentMethodType),
        status: mapStatus(event.type),
        createdAt,
        approvedDate,
        refundedAt: null,
        customer: {
          name,
          email,
          phone,
          document: null,
          country: "BR",
        },
        products: [
          {
            id: productInfo.id,
            name: productInfo.name,
            planId: productInfo.planId,
            planName: productInfo.planName,
            quantity: 1,
            priceInCents: amountInCents,
          },
        ],
        trackingParameters: {
          src: null,
          sck: null,
          utm_source: utmData.utm_source || null,
          utm_campaign: utmData.utm_campaign || null,
          utm_medium: utmData.utm_medium || null,
          utm_content: utmData.utm_content || null,
          utm_term: null,
        },
        commission: {
          totalPriceInCents: amountInCents,
          gatewayFeeInCents: gatewayFee,
          userCommissionInCents: userCommission,
          currency: "BRL",
        },
      };

      await sendToUtmify(utmifyPayload);
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const customerId = typeof charge.customer === "string" ? charge.customer : charge.customer?.id;

      if (customerId) {
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        const email = customer.email || "";
        const name = customer.name || email;

        let utmData: Record<string, string | null> = {
          utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null,
        };
        let phone: string | null = null;

        if (email) {
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("utm_source, utm_medium, utm_campaign, utm_content, whatsapp")
            .eq("email", email)
            .maybeSingle();
          if (profile) {
            utmData = {
              utm_source: profile.utm_source,
              utm_medium: profile.utm_medium,
              utm_campaign: profile.utm_campaign,
              utm_content: profile.utm_content,
            };
            phone = profile.whatsapp;
          }
        }

        // Try to find subscription from invoice
        let subscriptionId = charge.id;
        if (charge.invoice) {
          try {
            const invoiceId = typeof charge.invoice === "string" ? charge.invoice : charge.invoice.id;
            const inv = await stripe.invoices.retrieve(invoiceId);
            if (inv.subscription) {
              subscriptionId = typeof inv.subscription === "string" ? inv.subscription : inv.subscription.id;
            }
          } catch { /* use charge id */ }
        }

        const amountInCents = charge.amount || 0;
        const gatewayFee = Math.round(amountInCents * 0.0399 + 39);

        const utmifyPayload = {
          orderId: subscriptionId,
          platform: "FabricaDeLeoas",
          paymentMethod: mapPaymentMethod(charge.payment_method_details?.type),
          status: "refunded",
          createdAt: formatDateUtmify(charge.created),
          approvedDate: formatDateUtmify(charge.created),
          refundedAt: formatDateUtmify(Math.floor(Date.now() / 1000)),
          customer: {
            name,
            email,
            phone,
            document: null,
            country: "BR",
          },
          products: [
            {
              id: "prod_UKQ6GwFwJs1fyu",
              name: "Fábrica de Leoas",
              planId: null,
              planName: null,
              quantity: 1,
              priceInCents: amountInCents,
            },
          ],
          trackingParameters: {
            src: null, sck: null,
            utm_source: utmData.utm_source || null,
            utm_campaign: utmData.utm_campaign || null,
            utm_medium: utmData.utm_medium || null,
            utm_content: utmData.utm_content || null,
            utm_term: null,
          },
          commission: {
            totalPriceInCents: amountInCents,
            gatewayFeeInCents: gatewayFee,
            userCommissionInCents: amountInCents - gatewayFee,
            currency: "BRL",
          },
        };

        await sendToUtmify(utmifyPayload);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
