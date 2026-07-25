const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type CmsService = {
  slug?: string;
  titleAr?: string;
  titleEn?: string;
  paymentEnabled?: boolean;
  paymentPriceSar?: number;
  paymentDescription?: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function assertSameSiteUrl(url: string, fallback: string) {
  const parsed = new URL(url);
  const expected = new URL(fallback);
  if (parsed.origin !== expected.origin) return fallback;
  return parsed.toString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const siteUrl = Deno.env.get("SITE_URL");

    if (!stripeSecretKey || !supabaseUrl || !serviceRoleKey || !siteUrl) {
      return jsonResponse({ error: "Payment environment is not configured" }, 500);
    }

    const payload = await req.json();
    const serviceSlug = String(payload.serviceSlug ?? "").trim();
    if (!serviceSlug) {
      return jsonResponse({ error: "Missing serviceSlug" }, 400);
    }

    const successUrl = assertSameSiteUrl(
      String(payload.successUrl ?? `${siteUrl}/payment-success`),
      `${siteUrl}/payment-success`,
    );
    const cancelUrl = assertSameSiteUrl(
      String(payload.cancelUrl ?? `${siteUrl}/frameworks`),
      `${siteUrl}/frameworks`,
    );

    const cmsResponse = await fetch(
      `${supabaseUrl}/rest/v1/cms_content?id=eq.main&select=content`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      },
    );

    if (!cmsResponse.ok) {
      return jsonResponse({ error: "Could not read CMS content" }, 500);
    }

    const cmsRows = await cmsResponse.json();
    const content = cmsRows?.[0]?.content ?? {};
    const services = Array.isArray(content.serviceModels)
      ? content.serviceModels as CmsService[]
      : [];
    const service = services.find((item) => item.slug === serviceSlug);

    if (!service || !service.paymentEnabled) {
      return jsonResponse({ error: "Payment is not enabled for this service" }, 400);
    }

    const amountSar = Number(service.paymentPriceSar ?? 0);
    if (!Number.isInteger(amountSar) || amountSar <= 0) {
      return jsonResponse({ error: "Invalid service price" }, 400);
    }

    const serviceTitle = String(service.titleAr || service.titleEn || serviceSlug);
    const amountHalalas = amountSar * 100;
    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("success_url", successUrl);
    params.set("cancel_url", cancelUrl);
    params.set("line_items[0][quantity]", "1");
    params.set("line_items[0][price_data][currency]", "sar");
    params.set("line_items[0][price_data][unit_amount]", String(amountHalalas));
    params.set("line_items[0][price_data][product_data][name]", serviceTitle);
    params.set(
      "line_items[0][price_data][product_data][description]",
      String(service.paymentDescription || "WEAA Logistics service payment"),
    );
    params.set("metadata[service_slug]", serviceSlug);
    params.set("metadata[service_title]", serviceTitle);

    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const stripeSession = await stripeResponse.json();
    if (!stripeResponse.ok) {
      return jsonResponse(
        { error: "Stripe checkout failed", details: stripeSession?.error?.message },
        502,
      );
    }

    await fetch(`${supabaseUrl}/rest/v1/service_payments`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        service_slug: serviceSlug,
        service_title: serviceTitle,
        amount_sar: amountSar,
        currency: "sar",
        stripe_checkout_session_id: stripeSession.id,
        status: "checkout_created",
      }),
    });

    return jsonResponse({ id: stripeSession.id, url: stripeSession.url });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
