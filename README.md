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
│   └── subscribe.js        # POST /subscribe → Beehiiv (reads BEEHIIV_API_KEY)
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

## Secret: BEEHIIV_API_KEY

In the Cloudflare Pages project → **Settings → Environment variables → Production**
(and Preview if you want it there too), add an **encrypted** variable named exactly
`BEEHIIV_API_KEY` with your Beehiiv API key as the value. **Redeploy** after adding
it (env changes only take effect on a new deployment). The key is never sent to the
browser and never committed.

Beehiiv Publication ID (`pub_dd357204-...`) is not secret and lives in
`functions/subscribe.js`.
