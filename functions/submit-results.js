// Cloudflare Pages Function — POST /submit-results
// Runs when a visitor completes the assessment. It does three things,
// each best-effort and independent (one failing never blocks the others):
//   1. Emails the visitor their results        (Resend)
//   2. Emails Jerome a new-lead notification   (Resend)
//   3. Upserts the lead into Attio + adds a note with their results
//
// Secrets (set in Cloudflare Pages → Settings → Variables, encrypted):
//   RESEND_API_KEY   — never logged, never sent to the browser
//   ATTIO_API_KEY    — never logged, never sent to the browser
//
// Non-secret config:
const FROM_EMAIL   = "Better Security · Compass <assessment@bettersecurity.ai>";
const REPLY_TO     = "jerome.jayapal@bettersecurity.ai";
const NOTIFY_EMAIL = "jerome.jayapal@bettersecurity.ai";

const NAVY = "#1F2A44";
const BLUE = "#2E5E8C";
const GREY_BG = "#F3F4F6";
const GREY_TX = "#6B7280";
const BORDER = "#E2E5EA";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function dimRows(list) {
  return list.map(function (d) {
    return esc(d.name) + " (" + d.score + "/6)";
  }).join("<br>");
}

// ---- Email templates -------------------------------------------------------

function resultsEmailHtml(d) {
  const pct = Math.round((d.score / 36) * 100);
  const strong = dimRows(d.strongest);
  const weak = dimRows(d.weakest);
  const talkCta =
    '<a href="mailto:' + REPLY_TO +
    '?subject=' + encodeURIComponent("AI governance readiness — let's talk") +
    '" style="display:inline-block;background:' + BLUE + ';color:#fff;text-decoration:none;' +
    'font-size:15px;font-weight:600;padding:11px 22px;border-radius:8px;">Want to talk it through? Reach out</a>';

  return [
'<div style="font-family:Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:' + NAVY + ';">',
  '<div style="background:' + NAVY + ';padding:20px 24px;border-radius:12px 12px 0 0;">',
    '<span style="color:#fff;font-size:16px;font-weight:600;">Better Security &nbsp;·&nbsp; Compass</span>',
  '</div>',
  '<div style="border:1px solid ' + BORDER + ';border-top:none;border-radius:0 0 12px 12px;padding:24px;">',
    '<p style="font-size:16px;line-height:1.7;margin:0 0 16px;">Hi there,</p>',
    '<p style="font-size:16px;line-height:1.7;margin:0 0 20px;">Thanks for taking the AI Governance Readiness Assessment. Here’s where you landed.</p>',
    '<div style="background:' + GREY_BG + ';border-radius:12px;padding:18px 20px;margin:0 0 20px;">',
      '<div style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:' + GREY_TX + ';margin-bottom:6px;">Your tier</div>',
      '<div style="font-size:22px;font-weight:600;color:' + NAVY + ';margin-bottom:4px;">' + esc(d.tier) + '</div>',
      '<div style="font-size:14px;color:' + GREY_TX + ';margin-bottom:12px;">Score: ' + d.score + ' of 36</div>',
      '<div style="height:10px;background:' + BORDER + ';border-radius:100px;overflow:hidden;">',
        '<div style="height:10px;width:' + pct + '%;background:' + BLUE + ';border-radius:100px;"></div>',
      '</div>',
    '</div>',
    '<p style="font-size:16px;line-height:1.7;margin:0 0 20px;">' + esc(d.tierMessage) + '</p>',
    '<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr>',
      '<td valign="top" width="50%" style="padding-right:10px;">',
        '<div style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:' + GREY_TX + ';margin-bottom:8px;">Strongest areas</div>',
        '<div style="font-size:14px;line-height:1.9;">' + strong + '</div>',
      '</td>',
      '<td valign="top" width="50%" style="padding-left:10px;">',
        '<div style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:' + GREY_TX + ';margin-bottom:8px;">Where the gaps are</div>',
        '<div style="font-size:14px;line-height:1.9;">' + weak + '</div>',
      '</td>',
    '</tr></table>',
    '<div style="border-left:3px solid ' + BLUE + ';background:' + GREY_BG + ';padding:14px 16px;margin:0 0 24px;font-style:italic;font-size:15px;color:' + NAVY + ';">',
      'A tool enforces governance you’ve designed. It doesn’t design it for you.',
    '</div>',
    talkCta,
    '<div style="margin-top:28px;padding-top:18px;border-top:1px solid ' + BORDER + ';font-size:14px;line-height:1.7;color:' + GREY_TX + ';">',
      'Jerome Jayapal<br>Independent AI governance &amp; security advisory<br>',
      '<a href="https://bettersecurity.ai" style="color:' + BLUE + ';">bettersecurity.ai</a>',
    '</div>',
  '</div>',
'</div>'
  ].join("");
}

function notifyEmailHtml(d) {
  return [
'<div style="font-family:Helvetica,Arial,sans-serif;max-width:560px;color:' + NAVY + ';">',
  '<h2 style="font-size:18px;">New assessment lead</h2>',
  '<table cellpadding="6" style="font-size:14px;border-collapse:collapse;">',
    '<tr><td style="color:' + GREY_TX + ';">Name</td><td>' + (d.name ? esc(d.name) : "—") + '</td></tr>',
    '<tr><td style="color:' + GREY_TX + ';">Email</td><td><a href="mailto:' + esc(d.email) + '">' + esc(d.email) + '</a></td></tr>',
    '<tr><td style="color:' + GREY_TX + ';">Company</td><td>' + (d.company ? esc(d.company) : "—") + '</td></tr>',
    '<tr><td style="color:' + GREY_TX + ';">Score</td><td>' + d.score + ' / 36</td></tr>',
    '<tr><td style="color:' + GREY_TX + ';">Tier</td><td><strong>' + esc(d.tier) + '</strong></td></tr>',
    '<tr><td style="color:' + GREY_TX + ';">Strongest</td><td>' + dimRows(d.strongest) + '</td></tr>',
    '<tr><td style="color:' + GREY_TX + ';">Gaps</td><td>' + dimRows(d.weakest) + '</td></tr>',
  '</table>',
  '<p style="font-size:13px;color:' + GREY_TX + ';">Saved to Attio. Reply to the lead from here, or open them in Attio to follow up.</p>',
'</div>'
  ].join("");
}

function attioNote(d) {
  const lines = [];
  lines.push("**AI Governance Readiness Assessment**", "");
  lines.push("- **Email:** " + d.email);
  lines.push("- **Company:** " + (d.company || "—"));
  lines.push("- **Score:** " + d.score + " / 36");
  lines.push("- **Tier:** " + d.tier, "");
  lines.push("**Strongest areas**");
  d.strongest.forEach(function (x) { lines.push("- " + x.name + " (" + x.score + "/6)"); });
  lines.push("", "**Where the gaps are**");
  d.weakest.forEach(function (x) { lines.push("- " + x.name + " (" + x.score + "/6)"); });
  if (Array.isArray(d.dimensions) && d.dimensions.length) {
    lines.push("", "**All dimensions**");
    d.dimensions.forEach(function (x) { lines.push("- " + x.name + ": " + x.score + "/6"); });
  }
  lines.push("", "_Submitted via compass.bettersecurity.ai_");
  return lines.join("\n");
}

// ---- External calls --------------------------------------------------------

async function sendEmail(env, to, subject, html) {
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + env.RESEND_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: to, reply_to: REPLY_TO, subject: subject, html: html }),
  });
  if (!resp.ok) throw new Error("resend status " + resp.status);
}

function dimSummary(list) {
  return list.map(function (x) { return x.name + " (" + x.score + "/6)"; }).join(", ");
}

function attioValues(d) {
  const values = {
    email_addresses: [{ email_address: d.email }],
    compass_score: [{ value: d.score }],
    compass_tier: [{ value: d.tier }],
    compass_strongest: [{ value: dimSummary(d.strongest) }],
    compass_gaps: [{ value: dimSummary(d.weakest) }],
    compass_source: [{ value: "Compass assessment" }],
  };
  if (d.company) values.compass_company = [{ value: d.company }];
  if (d.name) {
    const parts = d.name.split(" ");
    values.name = [{
      first_name: parts[0] || d.name,
      last_name: parts.length > 1 ? parts.slice(1).join(" ") : "",
      full_name: d.name,
    }];
  }
  return values;
}

async function saveToAttio(env, d) {
  // 1) Upsert the person by email (no duplicates on repeat assessments)
  const up = await fetch(
    "https://api.attio.com/v2/objects/people/records?matching_attribute=email_addresses",
    {
      method: "PUT",
      headers: {
        Authorization: "Bearer " + env.ATTIO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: { values: attioValues(d) } }),
    }
  );
  if (!up.ok) throw new Error("attio upsert status " + up.status);
  const upJson = await up.json();
  const recordId = upJson && upJson.data && upJson.data.id && upJson.data.id.record_id;
  if (!recordId) throw new Error("attio: no record id");

  // 2) Attach the results as a note
  const note = await fetch("https://api.attio.com/v2/notes", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + env.ATTIO_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: {
        parent_object: "people",
        parent_record_id: recordId,
        title: "AI Readiness — " + d.tier + " (" + d.score + "/36)",
        format: "markdown",
        content: attioNote(d),
      },
    }),
  });
  if (!note.ok) throw new Error("attio note status " + note.status);
}

// ---- Handler ---------------------------------------------------------------

export async function onRequestPost(context) {
  const { request, env } = context;

  let p;
  try {
    p = await request.json();
  } catch {
    return json({ success: false, error: "invalid_request" }, 400);
  }

  const d = {
    email: (p && typeof p.email === "string" ? p.email : "").trim(),
    name: (p && typeof p.name === "string" ? p.name : "").trim(),
    company: (p && typeof p.company === "string" ? p.company : "").trim(),
    score: Number(p && p.score) || 0,
    tier: String((p && p.tier) || ""),
    tierMessage: String((p && p.tierMessage) || ""),
    strongest: Array.isArray(p && p.strongest) ? p.strongest : [],
    weakest: Array.isArray(p && p.weakest) ? p.weakest : [],
    dimensions: Array.isArray(p && p.dimensions) ? p.dimensions : [],
  };

  if (!EMAIL_RE.test(d.email)) {
    return json({ success: false, error: "invalid_email" }, 400);
  }

  const result = { emailedVisitor: false, notified: false, savedToCrm: false };

  // 1) Results email to the visitor
  if (env.RESEND_API_KEY) {
    try {
      await sendEmail(env, d.email, "Your AI Governance Readiness results", resultsEmailHtml(d));
      result.emailedVisitor = true;
    } catch (e) { console.error("results email failed:", e && e.message); }

    // 2) Notification to Jerome
    try {
      await sendEmail(env, NOTIFY_EMAIL,
        "New lead: " + d.tier + " (" + d.score + "/36)" + (d.company ? " — " + d.company : ""),
        notifyEmailHtml(d));
      result.notified = true;
    } catch (e) { console.error("notify email failed:", e && e.message); }
  } else {
    console.error("submit-results: RESEND_API_KEY not set");
  }

  // 3) Save to Attio
  if (env.ATTIO_API_KEY) {
    try {
      await saveToAttio(env, d);
      result.savedToCrm = true;
    } catch (e) { console.error("attio save failed:", e && e.message); }
  } else {
    console.error("submit-results: ATTIO_API_KEY not set");
  }

  return json({ success: true, result: result });
}

export async function onRequest(context) {
  if (context.request.method !== "POST") {
    return json({ success: false, error: "method_not_allowed" }, 405);
  }
  return onRequestPost(context);
}
