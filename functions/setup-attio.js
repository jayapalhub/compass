// Cloudflare Pages Function — POST /setup-attio  (ONE-TIME)
// Creates the custom columns on the Attio "people" object that submit-results.js
// populates. Idempotent: if a column already exists, it's skipped (409 ignored).
// Safe to run more than once. Reads ATTIO_API_KEY from env. Returns a summary.
//
// Requires the Attio token to have the `object_configuration:read-write` scope.
// This endpoint can be removed after a successful run.

const ATTRIBUTES = [
  { title: "AI readiness score",        api_slug: "compass_score",     type: "number" },
  { title: "AI readiness tier",         api_slug: "compass_tier",      type: "text" },
  { title: "Strongest areas",           api_slug: "compass_strongest", type: "text" },
  { title: "Top gaps",                  api_slug: "compass_gaps",      type: "text" },
  { title: "Company (from assessment)", api_slug: "compass_company",   type: "text" },
  { title: "Lead source",               api_slug: "compass_source",    type: "text" },
];

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function onRequestPost(context) {
  const { env } = context;
  if (!env.ATTIO_API_KEY) {
    return json({ success: false, error: "ATTIO_API_KEY not set" }, 500);
  }

  const summary = [];
  for (const attr of ATTRIBUTES) {
    try {
      const resp = await fetch("https://api.attio.com/v2/objects/people/attributes", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + env.ATTIO_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: {
            title: attr.title,
            api_slug: attr.api_slug,
            type: attr.type,
            is_required: false,
            is_unique: false,
            is_multiselect: false,
            default_value: null,
            description: "Set automatically from the Compass readiness assessment.",
          },
        }),
      });

      if (resp.ok) {
        summary.push({ slug: attr.api_slug, status: "created" });
      } else if (resp.status === 409) {
        summary.push({ slug: attr.api_slug, status: "already_exists" });
      } else {
        summary.push({ slug: attr.api_slug, status: "error " + resp.status });
      }
    } catch (e) {
      summary.push({ slug: attr.api_slug, status: "error", message: e && e.message });
    }
  }

  return json({ success: true, attributes: summary });
}

export async function onRequest(context) {
  if (context.request.method !== "POST") {
    return json({ success: false, error: "method_not_allowed" }, 405);
  }
  return onRequestPost(context);
}
