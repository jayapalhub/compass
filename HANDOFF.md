# Project: "Compass" — AI Governance Readiness Site (Better Security)

A complete, self-contained handoff. Paste into a fresh chat to bring it up to speed.

## What it is
A single-page marketing + lead-generation site for Jerome Jayapal's independent AI
governance advisory practice. Two front doors: (1) an interactive 12-question
**AI Governance Readiness Assessment** that captures a lead and diagnoses their gaps,
and (2) an open, filterable **landscape of 24 AI governance tools**. Strategic wedge
throughout: *"A tool enforces governance you've designed. It doesn't design it for you."*

## Live URLs
- **Production site:** https://compass.bettersecurity.ai (custom domain, live with SSL)
- **Cloudflare default URL:** compass-6sq.pages.dev
- **GitHub repo:** https://github.com/jayapalhub/compass

## Tech stack
- Plain static **HTML / CSS / JS** (no framework, no build step), hosted on **Cloudflare Pages**.
- **Cloudflare Pages Functions** (serverless) for backend calls.
- No localStorage/sessionStorage — assessment state lives in memory during the session.
- Tool data in an editable `data/tools.json` (the `last_reviewed` field drives the
  "Last reviewed" date shown on the page).
- Mobile-responsive, accessible, no console errors. Brand: navy `#1F2A44`, accent
  blue `#2E5E8C`, calm boutique-consultancy feel.

## Repo structure
```
compass/
├── index.html                 # whole page: nav, hero, tools, assessment, about, footer
├── assets/
│   ├── css/styles.css
│   └── js/app.js              # assessment logic + tool rendering (relative asset paths)
├── data/
│   └── tools.json             # ← EDIT THIS to update tools + the "Last reviewed" date
├── functions/
│   ├── subscribe.js           # POST /subscribe → Beehiiv (newsletter)
│   └── submit-results.js      # POST /submit-results → Resend emails + Attio CRM
├── _headers                   # basic security headers
├── README.md
└── .gitignore                 # excludes .env / secrets
```
(A one-time `functions/setup-attio.js` was used to create the Attio columns, then removed.)

## Cloudflare Pages settings
- Framework preset: **None**
- Build command: **(blank)**
- Build output directory: **`/`**
- Auto-deploys on every push to `main`.

## Environment variables
Cloudflare → Settings → Variables and Secrets, all **encrypted**; redeploy after changes.

| Variable | Used by | Status |
|---|---|---|
| `BEEHIIV_API_KEY` | `subscribe.js` | set & working |
| `RESEND_API_KEY` | `submit-results.js` | set & working |
| `ATTIO_API_KEY` | `submit-results.js` | set & working |

Non-secret config in code: Beehiiv Publication ID (`pub_dd357204-…`) in `subscribe.js`;
`FROM_EMAIL` (`assessment@bettersecurity.ai`), `REPLY_TO` / `NOTIFY_EMAIL`
(`jerome.jayapal@bettersecurity.ai`) at the top of `submit-results.js`.

## The assessment
- Flow: email capture (email required; **name optional**, company optional) → 12
  questions, one per screen, with progress bar/dots + Back button → results.
- 6 dimensions × 2 questions, each answer worth 0–3 points (max 36).
- Results screen shows: tier, score bar, 2 strongest + 2 weakest dimensions by name,
  the wedge line, and tier-specific CTAs.
- **Tiers:** 28–36 "Ready to Evaluate" → points to the tool landscape; 16–27
  "Foundation Gaps"; 0–15 "Not Tool-Ready Yet" (tool link de-emphasized). "Reach out"
  CTAs are `mailto:jerome.jayapal@bettersecurity.ai`.

## What happens when someone finishes (the `/submit-results` pipeline)
Three best-effort steps; any one failing never blocks the others or the results screen:
1. **Emails the visitor** their branded results (Resend), from `assessment@bettersecurity.ai`.
2. **Emails Jerome** a new-lead notification with name/email/company/score/tier/gaps (Resend).
3. **Saves to Attio:** upserts the person (matched by email, so no duplicates),
   populates custom columns, and attaches a results note.

Newsletter signups (footer + at assessment start) go to **Beehiiv** separately —
Beehiiv is the newsletter list only, not the CRM.

## Integrations chosen (after comparison)
- **Email:** Resend (forever-free 3,000/mo; sends from your verified domain). Domain
  `bettersecurity.ai` is verified in Resend.
- **CRM:** Attio (free tier includes API). Its People grid is the sortable "spreadsheet" of leads.
- **Newsletter:** Beehiiv.

## Attio custom columns (on the People object)
Created and tested: **AI readiness score** (number), **AI readiness tier**,
**Strongest areas**, **Top gaps**, **Company (from assessment)**, **Lead source** (text).
- New attributes must be manually added to the People **table view** to be visible
  (People → `+` on column headers → toggle them on).
- The Attio token needs scopes: records read/write, notes read/write, and object
  configuration read/write.
- Internal slugs: `compass_score`, `compass_tier`, `compass_strongest`,
  `compass_gaps`, `compass_company`, `compass_source`. (Creating an attribute via the
  API requires a `config: {}` object in the body.)

## Verified end-to-end
Live tests confirmed: site loads, 24 tool cards render, all 3 assessment tiers score
correctly, newsletter→Beehiiv works, results email + notification email + Attio
person/note/columns all populate (`emailedVisitor / notified / savedToCrm` all `true`).

## How to maintain (no developer / no terminal needed)
- **Update tools weekly:** edit `data/tools.json` directly on GitHub (open the file →
  pencil icon → edit → "Commit changes"). Update the `last_reviewed` date too.
  Cloudflare auto-redeploys in ~1 minute. Filters (Category, Target Buyer) rebuild
  automatically from the data.

## Housekeeping / open items
- Delete the test lead in Attio (`Jerry Jayapal` / "Better Pickleball (test)") and the
  earlier `deploy-check-DELETE@example.com` Beehiiv subscriber if still present.
- Names only populate **going forward** (names weren't collected before they were added).
- First Resend emails may occasionally land in spam until the sending domain warms up.

## Key decisions made
- Beehiiv kept strictly as the newsletter; Attio is the system of record for leads.
- Everyone who finishes the assessment auto-receives their results by email.
- Name field is **optional** (to protect completion rate).
- No calendar/booking widget, no user accounts, no CMS — all per the original scope.
