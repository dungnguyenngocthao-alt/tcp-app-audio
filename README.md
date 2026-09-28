# TCPVoiceAI — Acoustic Intelligence (web app)

An interactive UI prototype for **TCPVoiceAI**, an acoustic-intelligence tool
that analyses sales-call audio and produces sentiment / keyword / evaluation
reports. Vietnamese UI (`<html lang="vi">`).

The interface is built directly on the **Talent Connect Plus Design System**:
the same colour primitives, typography (Inter + JetBrains Mono), spacing, radii,
shadow and motion tokens drive every screen. Responsive from mobile (375) →
tablet (1024) → desktop (1440), with a persistent sidebar shell ≥ 1024px.

> **Prototype:** no backend. Login, upload, DB-connect and analysis are
> simulated client-side with in-memory mock data and reset on reload.

## Stack

- **Vanilla HTML / CSS / JS** — no framework, **no build step**, no bundler.
- One external network call: Google Fonts (`@import` in `css/tokens.css`).
- All interactivity in a single IIFE (`js/app.js`).

## Structure

```
index.html            # Entire app — all screens + modals in one document
css/tokens.css        # Design-system tokens (CSS custom properties) + Google Fonts @import
css/app.css           # Components, layout, theme, responsive
js/app.js             # Navigation, upload, processing sim, tables, transcript
assets/               # Brand mark(s)
vercel.json           # Static hosting config (headers, clean URLs)
scripts/build-standalone.js  # Optional: inline everything into one HTML file
HANDOFF.md            # Full engineering handoff doc
```

## Run locally

No build step — serve the folder statically with anything:

```bash
npm run dev            # -> npx serve .   (http://localhost:3000)
# or
python3 -m http.server 8000   # -> http://localhost:8000
```

## Deploy to Vercel

This is a static site, so deployment is zero-config.

**Option A — Git (recommended):**
1. Push this repo to GitHub/GitLab/Bitbucket.
2. In Vercel → **Add New… → Project** → import the repo.
3. Framework Preset: **Other**. Build Command: *(empty)*. Output Directory: *(empty / root)*.
4. **Deploy.** `vercel.json` supplies caching + security headers; `.vercelignore`
   keeps docs and scratch files out of the deployment.

**Option B — CLI:**
```bash
npm i -g vercel
vercel          # preview deploy
vercel --prod   # production deploy
```

No environment variables are required (the prototype has no backend).

## Single-file bundle (optional handoff)

To produce one self-contained HTML file (CSS + JS inlined) for email/preview:

```bash
npm run bundle   # -> dist/TCPVoiceAI.standalone.html
```

## Design tokens

| Role            | Token / value            |
| --------------- | ------------------------ |
| Accent / CTA    | `--tcp-accent` `#5B4FE9` |
| Ink (headings)  | `--tcp-ink` `#12142F`    |
| Type — sans     | Inter                    |
| Type — mono     | JetBrains Mono           |

Raw tokens live in [`css/tokens.css`](css/tokens.css); component and layout
styling is in [`css/app.css`](css/app.css). Full details for the integrating
engineer are in [`HANDOFF.md`](HANDOFF.md).
