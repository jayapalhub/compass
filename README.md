# Better Security · Compass

A single-page AI governance readiness site: an interactive readiness assessment
and an open, filterable landscape of AI governance tools. Static HTML/CSS/JS plus
one Cloudflare Pages Function that subscribes emails to Beehiiv.

## Structure

```
.
├── index.html              # the whole page (nav, hero, tools, assessment, about, footer)
├── assets/
│   ├── css/styles.css
│   └── js/app.js           # assessment logic + tool rendering (no localStorage)
├── data/
│   └── tools.json          # EDIT THIS to update tools + the "Last reviewed" date
├── functions/
│   ├── subscribe.js        # POST /subscribe → Beehiiv (reads BEEHIIV_API_KEY)
│   └── submit-results.js   # POST /submit-results → Resend email + Attio CRM
├── _headers                # basic security headers
└── .gitignore
```

## Updating the tool list (no developer needed)

Open `data/tools.json` and edit it directly.

- `last_reviewed` at the top controls the "Last reviewed: …" date shown on the page.
- Each tool object needs: `name`, `category`, `target_buyer`, `one_liner`,
  `description`, `framework_coverage`, `website`, `reviewed`.
- The Category and Target Buyer filters build themselves from the data — add a new
  category and it appears automatically.

Commit and push; Cloudflare Pages redeploys.

## Local preview

It's plain static files, so any static server works, e.g.:

```
npx serve .
```

(The `/subscribe` function only runs on Cloudflare, or under `npx wrangler pages dev .`.)

## Deploy: Cloudflare Pages settings

| Setting                | Value          |
| ---------------------- | -------------- |
| Framework preset       | **None**       |
| Build command          | *(leave blank)* |
| Build output directory | **/** (repo root) |

There is no build step — Cloudflare serves the files as-is and auto-detects the
`functions/` directory.

## Secrets (Cloudflare → Settings → Variables and Secrets → Production)

Add each as an **encrypted** variable, then **redeploy** (env changes only take
effect on a new deployment). None of these are sent to the browser or committed.

| Variable | Used by | Get it from |
| --- | --- | --- |
| `BEEHIIV_API_KEY` | `subscribe.js` (newsletter) | Beehiiv → Settings → API |
| `RESEND_API_KEY`  | `submit-results.js` (emails) | Resend → API Keys |
| `ATTIO_API_KEY`   | `submit-results.js` (CRM) | Attio → Workspace settings → Developers |

Non-secret config lives in the function files:
- Beehiiv Publication ID (`pub_dd357204-...`) in `functions/subscribe.js`.
- `FROM_EMAIL`, `REPLY_TO`, `NOTIFY_EMAIL` at the top of `functions/submit-results.js`.

### Resend domain note
The results email is sent **from** `assessment@bettersecurity.ai`. In Resend you must
**verify the `bettersecurity.ai` domain** (add the DNS records it gives you — easy
since the domain is on Cloudflare) before sending will work. Until the domain is
verified, emails will fail (the assessment still works; it just won't send mail).

## What happens when someone finishes the assessment

`POST /submit-results` runs three best-effort steps (any one failing never blocks
the others, and never blocks the visitor's results screen):
1. Emails the visitor their results (Resend).
2. Emails Jerome a new-lead notification (Resend).
3. Upserts the person in Attio (matched by email, so no duplicates) and attaches a
   note with their score, tier, and dimension breakdown.
