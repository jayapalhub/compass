// Cloudflare Pages Function — POST /subscribe
// Adds an email to Beehiiv. The API key is read from the BEEHIIV_API_KEY
// environment variable (set as an encrypted secret in the Pages project).
// It is NEVER sent to the browser and NEVER logged.

const PUBLICATION_ID = "pub_dd357204-a389-41bc-9b1b-d0a99892a2f4"; // not secret

// Verified against beehiiv API docs (June 2026):
// POST https://api.beehiiv.com/v2/publications/{publicationId}/subscriptions
// Headers: Authorization: Bearer <token>, Content-Type: application/json
// Body: { email (required), custom_fields[], utm_source, ... }
const BEEHIIV_ENDPOINT = `https://api.beehiiv.com/v2/publications/${PUBLICATION_ID}/subscriptions`;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function onRequestPost(context) {
  const { request, env } = context;

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ success: false, error: "invalid_request" }, 400);
  }

  const email = (payload && typeof payload.email === "string" ? payload.email : "").trim();
  const company = (payload && typeof payload.company === "string" ? payload.company : "").trim();

  if (!email || !EMAIL_RE.test(email)) {
    return json({ success: false, error: "invalid_email" }, 400);
  }

  if (!env.BEEHIIV_API_KEY) {
    // Misconfiguration — don't reveal details to the client.
    console.error("subscribe: BEEHIIV_API_KEY is not set");
    return json({ success: false, error: "server_not_configured" }, 500);
  }

  const body = {
    email,
    reactivate_existing: true,
    send_welcome_email: false,
    utm_source: "compass",
  };

  if (company) {
    body.custom_fields = [{ name: "Company", value: company }];
  }

  try {
    const resp = await fetch(BEEHIIV_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.BEEHIIV_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (resp.ok) {
      return json({ success: true });
    }

    // Log status only — never the key, never the full response if it might echo auth.
    console.error(`subscribe: beehiiv returned status ${resp.status}`);
    return json({ success: false, error: "subscribe_failed" }, 502);
  } catch (err) {
    console.error("subscribe: request to beehiiv failed", err && err.message);
    return json({ success: false, error: "subscribe_failed" }, 502);
  }
}

// Reject non-POST methods cleanly.
export async function onRequest(context) {
  if (context.request.method !== "POST") {
    return json({ success: false, error: "method_not_allowed" }, 405);
  }
  return onRequestPost(context);
}
