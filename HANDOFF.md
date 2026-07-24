# TCPVoiceAI — Frontend Handoff

> Technical handoff for the engineer integrating this prototype into a production site.
> The app is a **single-file, dependency-free, mobile-first web prototype** — no framework, no build step, no backend.

---

## 1. Executive Summary

| Field | Detail |
| --- | --- |
| **Product** | **TCPVoiceAI** — acoustic-intelligence tool that analyses sales-call audio and produces sentiment/keyword/evaluation reports. |
| **Purpose** | Interactive UI prototype demonstrating the full call-analysis workflow on the **Talent Connect Plus Design System**. |
| **Target audience** | Sales/QA managers reviewing agent call performance. |
| **Language** | Vietnamese (`<html lang="vi">`). All copy is Vietnamese. |
| **Page objective** | Upload/import calls → view AI analysis → manually re-evaluate → browse history & dashboards. |
| **Main interactions** | Google-only mock login, file/Sheet upload, drawer navigation, sortable/filterable tables, pagination, modals (confirm/review/add-employee), inline manual evaluation, `.xlsx`/`.txt` export, CSV import. |
| **Animation** | CSS-only: processing pulse, equalizer bars, modal pop, drawer slide, animated login backdrop (grid drift + floating icons). |
| **Dependencies** | **None** (JS). One external network call: Google Fonts `@import`. |
| **Backend** | **None.** All data is mock/in-memory. Login, uploads, and analysis are simulated client-side. |

---

## 2. Folder Structure

```
tcp-app-audio/
├── index.html            # Entire app — all 10 screens in one document
├── css/
│   ├── tokens.css        # Design-system foundations (CSS custom properties) + Google Fonts @import
│   └── app.css           # Component, layout, theme & responsive styling (~2.3k lines)
├── js/
│   └── app.js            # All interactivity — single IIFE, "use strict" (~2.1k lines)
├── assets/
│   └── sonic-mark.svg    # Legacy waveform mark — NOT referenced by current build (safe to delete)
├── README.md             # Original prototype notes (OUTDATED — predates most screens)
└── HANDOFF.md            # This document
```

> `scratch-artifact.html` may appear in the working tree — it is a **generated single-file bundle** (inlined CSS+JS) used for previews. Not a source file; do not integrate it.

---

## 3. Asset Inventory

| Asset | Type | Usage | Optimization |
| --- | --- | --- | --- |
| Brand logo (triangle mark) | Inline `data:` SVG | `.brand__logo` background in `app.css` | ✅ Inlined, gradient-filled, zero requests |
| Google "G" logo | Inline `<svg>` | Login button (`#googleLoginBtn`) | ✅ Inline, 4-path |
| UI icons (~all) | Inline `<svg>` (Phosphor set, `viewBox="0 0 256 256"`, `fill=currentColor`) | Every nav item, button, card label | ✅ Inline, inherit color; no icon font/library |
| Login backdrop icons | 7 inline `<svg>` in `.login-decor` | Decorative animated background | ✅ Inline, `aria-hidden` |
| `assets/sonic-mark.svg` | External SVG file | **Unused** by current build | ⚠️ Legacy — remove or ignore |
| Fonts: Inter, JetBrains Mono | Google Fonts | Body / mono type | ⚠️ Loaded via remote `@import` — see §7/§12/§15 |

No raster images, video, Lottie, or 3D assets. **No favicon is defined.**

---

## 4. Component Inventory

The app is a client-side SPA of **10 screens** (`<section class="screen" data-screen="…">`), shown one at a time via `show(name)` toggling `.is-active`.

| Screen (`data-screen`) | VN label | Purpose | Key states / behavior |
| --- | --- | --- | --- |
| `login` | Đăng nhập | Mock Google-only sign-in gate | Animated backdrop; button → `dashboard` |
| `analysis` | Upload file | Upload audio (drag/drop or browse) or Excel/Google-Sheet import; model & sensitivity config | Tabs (file / bulk); config card |
| `processing` | Analyzing | Simulated progress with staged status text | Progress bar + pulse animation |
| `results` | Kết quả phân tích | Outcome %, evaluation detail, audio preview, quality bars, keywords, sentiment, talk split, summary, actions, **transcript** | Responsive multi-column (JS `layoutResults`); inline manual evaluation |
| `history` | Lịch sử | Past analyses list | Row → open single result |
| `dashboard` | Dashboard | KPIs, donut (in/out), bar chart, top-3 agents, word cloud; **.xlsx export** | Date range + period (week/month/year) filters |
| `employees` | Nhân viên | Agent roster; add (manual/CSV), delete | Sortable columns, `aria-sort` |
| `uploads` | **Đánh giá cuộc gọi** | Call log with stats/filters/pagination; manual re-evaluation overrides AI; **Chú thích** note column | Review modal, per-row detail, delete-with-confirm |
| `callhistory` | **Lịch sử cuộc gọi** | Raw imported call sheet (10 cols incl. Transcript, URL, Size, Type) | Read-only, horizontal scroll |
| `settings` | Cài đặt | Hub → **Hồ sơ của tôi** (profile) + **Bộ từ khoá cảm xúc** (sentiment keyword editor) | Pane switching; keyword add/remove recolors transcript |

**Shared components:** app bar (`.appbar`), slide-in drawer (`.drawer`), confirm modal (`#confirmModal`), review modal (`#reviewModal`), add-employee modal (`#empModal`), cards (`.card`), data tables (`.emp-table`), pagination (`.pagination`), chips, sparthan bars, audio preview player.

---

## 5. CSS Documentation

Two stylesheets, load order matters: **`tokens.css` first**, then **`app.css`** (the AI/high-tech theme layer lives at the end of `app.css` and wins by cascade).

| Aspect | Detail |
| --- | --- |
| **Namespace** | All design tokens prefixed `--tcp-*`. Bridge tokens: `--color-blue-7`, `--color-violet-26`. |
| **Naming** | BEM-ish (`block__element--modifier`), e.g. `.result-card__label--success`, `.btn--accent`. |
| **Color tokens** | Neutral scale `--tcp-neutral-50…900`; brand `--tcp-brand-50…900`; semantic `--tcp-bg`, `--tcp-fg-*`, `--tcp-accent`, feedback `--tcp-success/warning/error-*`; theme extras `--tcp-glass`, `--tcp-glow-*`, `--tcp-gradient-hero/accent/text`. |
| **Typography** | `--tcp-font-sans` (Inter), `--tcp-font-mono` (JetBrains Mono). **Weights capped at 500** via `--tcp-fw-*` (semibold/bold aliased to 500) — deliberate light look; brand wordmark is the one exception (700). Sizes `--tcp-fs-mini…h1`, line-heights `--tcp-lh-*`. |
| **Spacing** | 4pt scale `--tcp-space-0…16`. |
| **Radius** | `--tcp-radius-xs…2xl`, `--tcp-radius-pill`. |
| **Shadow** | `--tcp-shadow-2xs…2xl`, focus rings `--tcp-ring`, `--tcp-ring-accent`. |
| **Motion** | `--tcp-ease` (cubic-bezier), `--tcp-dur-fast/base/slow`. |
| **Breakpoints** | `480px`, `560px` (max-width, small-phone tweaks); `768px`, `1200px` (min-width, tablet/desktop). See §8. |
| **Theme** | **Light mode only.** No `prefers-color-scheme` handling. Glassmorphism via `backdrop-filter` (with `-webkit-` prefix). |
| **Layout shell** | `.phone` fixed mobile-frame container; screens are `position:absolute; inset:0`. |

---

## 6. JavaScript Documentation

Single file `js/app.js`, wrapped in one **IIFE** with `"use strict"`. No modules, no exports, no globals leaked. Runs on parse (script is at end of `<body>`, no `DOMContentLoaded` needed).

| Subsystem | Purpose / notes |
| --- | --- |
| `show(name)` / `setActiveMenu` | Screen router — toggles `.is-active`, resets scroll, fires per-screen hooks (`renderCallHistory`, `showSettingsPane`, `layoutResults`, etc.). Nav via `[data-nav]` allow-list. |
| Drawer menu | `[data-burger]` open, `[data-menu-close]` close. |
| Upload flow | Drag/drop + browse; bulk Excel/Sheet mock import (`genLogBatch`). |
| Processing sim | `setInterval`-driven progress + staged messages → `results`. |
| Results | `selectResultFile`, `mockCall`, file strip, inline evaluation (`renderOutcomeReview` / `renderOutcomeDetail`), audio preview player, transcript tab switching + keyword highlighting. |
| `layoutResults()` | **Index-based** card distribution into 1/2/3 columns by breakpoint. ⚠️ Adding/removing a `.card` in the results `.page` requires updating the hardcoded index map and count (see §14/§15). |
| Uploads / Đánh giá | `UPLOAD_LOG` model, `renderUploads`, filters (date/agent), pagination, review modal (`openReview`), manual override (`effRate`), delete-with-confirm. |
| Call history | `renderCallHistory` + `chMeta` (derives Type/From/Size/URL/Transcript per call id). |
| Employees | Sortable table, CSV/TSV parse via `FileReader`, add/delete. |
| Settings | Pane switch, profile save, sentiment keyword editors (recolor transcript). |
| Export | `buildXlsx` (real `.xlsx` via `zipStore`+`crc32`+`TextEncoder`, **dependency-free**), `exportTranscript` (`.txt`), `downloadBlob` (`Blob`+`URL.createObjectURL`). |
| Shared helpers | `showConfirm`, `mockCall`, `AVATAR_COLORS`, `nameHash`, `initials`, `escAttr`, `durToSec`, `effRate`. |

**No** `fetch`, `XMLHttpRequest`, WebSocket, `localStorage`, or `sessionStorage` — nothing persists across reload. **No IntersectionObserver**; animations are CSS-driven.

---

## 7. Animation Documentation

All animations are **pure CSS** (`@keyframes` in `app.css`). No JS animation libraries.

| Animation | Trigger | Duration | Easing | Fallback / notes |
| --- | --- | --- | --- | --- |
| `pulse` | Processing badge | ~loop | ease | Purely decorative |
| `eq` | Equalizer/waveform bars | loop | ease | Audio-preview & processing |
| `modal-pop` | Modal open | `--tcp-dur-slow` | `--tcp-ease` | Scale+fade in |
| `drawer-fade` | Drawer backdrop | `--tcp-dur-slow` | ease | |
| `drawer-slide` | Drawer panel (slides from **left**) | `--tcp-dur-slow` | `--tcp-ease` | |
| `aiGridDrift` | Login tech-grid backdrop | 22s | linear | Disabled under reduced-motion |
| `loginFloat` | 7 login backdrop icons | 14–19s | ease-in-out | Faint (opacity ~5–7%), staggered; disabled + shown static under reduced-motion |

`@media (prefers-reduced-motion: reduce)` disables the login grid + float animations and pins icons static. Transforms/opacity used for GPU-friendly compositing (`will-change` on floating icons).

---

## 8. Responsive Documentation

Mobile-first. The `.phone` shell fills the viewport; screens are absolutely positioned and scroll internally (`.screen__scroll`).

| Breakpoint | Behavior |
| --- | --- |
| **< 768 (mobile)** | Single-column everywhere; Results = 1 column; small-phone tweaks at ≤560/≤480 (fewer login icons, tighter grid). |
| **768–1199 (tablet)** | Results = 2 columns (`layoutResults` "t" group). |
| **≥ 1200 (desktop)** | Results = 3 columns ("d" group); wide tables shown full. |
| **Menu (all sizes)** | Hamburger pinned to the **left corner**, logo beside it; drawer slides from the left. |
| **Wide tables** | `.emp-table-wrap` scrolls horizontally (`overflow-x:auto`) — e.g. the 10-column "Lịch sử cuộc gọi" sheet; the Transcript column is the last column, reached by horizontal scroll. |

**Known limitations:** Results column layout is JS-index-driven (fragile to card additions). The `.phone` frame assumes it owns the full viewport — see §12/§15 for embedding.

---

## 9. Browser Support

Targets modern evergreen browsers. Uses CSS custom properties, Flexbox, Grid, `backdrop-filter` (+`-webkit-`), `background: url(data:svg)`, and JS `TextEncoder`, `Blob`, `URL.createObjectURL`, arrow functions, template literals, `Array.from`.

| Browser | Status | Notes |
| --- | --- | --- |
| Chrome (desktop/Android) | ✅ | Primary target |
| Edge | ✅ | Chromium parity |
| Safari (macOS) | ✅ | `-webkit-backdrop-filter` present |
| Mobile Safari (iOS) | ✅ | `viewport-fit=cover` set; primary mobile target |
| Firefox | ✅ | `backdrop-filter` enabled by default in current versions |
| IE11 / legacy | ❌ | No transpilation; ES6+ and modern CSS assumed |

**Known issue:** In an offline sandbox the Google Fonts `@import` fails and the app falls back to system fonts (harmless). No polyfills bundled.

---

## 10. Accessibility Notes

| Area | Status |
| --- | --- |
| Semantic roles | `role="application"`, `menu`/`menuitem`, `tablist`/`tab`, `dialog`+`aria-modal` on modals |
| Labels | Extensive `aria-label` (37), `aria-labelledby`, `aria-hidden` on decorative SVGs (86) |
| State | `aria-expanded`/`aria-haspopup` (burger), `aria-selected` (tabs), `aria-sort` (sortable columns), `aria-pressed` |
| Keyboard | Buttons are native `<button>`; modals close on `Escape` |
| Reduced motion | `prefers-reduced-motion` respected (login animations off) |
| Contrast | Light theme with deep-navy ink on light surfaces — verify AA on gradient/glass surfaces |
| **Gaps to check** | No visible skip-link; focus-trap inside modals is not implemented; verify focus-visible rings on all interactive elements; screen-reader flow across absolutely-positioned screens should be tested. |

---

## 11. SEO Notes

⚠️ **Minimal — this is an app prototype, not a marketing page.**

| Tag | Present? |
| --- | --- |
| `<title>` | ✅ "TCPVoiceAI — Acoustic Intelligence" |
| `<html lang>` | ✅ `vi` |
| `theme-color` | ✅ `#F5F5F5` |
| `viewport` | ✅ |
| Meta description | ❌ |
| Open Graph / Twitter Card | ❌ |
| Canonical | ❌ |
| Schema.org / JSON-LD | ❌ |
| `robots` | ❌ |
| Favicon | ❌ |

Add these at integration time if the page needs to be indexable/shareable (it likely should be `noindex` as an internal tool).

---

## 12. Integration Notes

| Concern | Ownership / action |
| --- | --- |
| **Header / footer** | This prototype provides its **own** in-app top bar + drawer — it does **not** ship a site header/footer. Decide whether to keep the in-app bar or replace with the host site's chrome. |
| **Routing** | Client-side screen toggling only (no URL/History API). If the host app needs deep links, wire `show()` to a router. |
| **The `.phone` shell** | Assumes it owns the full viewport (fixed frame). To embed inside an existing page, scope/remove `.phone` fixed positioning or mount in a dedicated route. |
| **Auth** | Google login is a **mock** — replace `#googleLoginBtn` handler with real OAuth. |
| **API / data** | All data (`UPLOAD_LOG`, employees, `mockCall`, dashboard figures) is in-memory mock. Replace with real endpoints; there is no persistence layer. |
| **Assets / fonts** | Self-host Inter + JetBrains Mono (see §15) instead of the remote `@import` for privacy/perf/offline. |
| **Design system** | Tokens in `tokens.css` mirror the Talent Connect Plus system — reuse rather than fork if the host already includes it. |
| **Analytics / cookies / CMS** | None included — add per host standards. |

---

## 13. Third-party Dependencies

| Library | Version | Purpose | Delivery | Install | Replacement |
| --- | --- | --- | --- | --- | --- |
| **Inter** | Google Fonts (variable) | Sans UI type | Remote `@import` in `tokens.css` | Self-host WOFF2 | `@fontsource/inter` |
| **JetBrains Mono** | Google Fonts | Mono (IDs, numerics) | Remote `@import` | Self-host WOFF2 | `@fontsource/jetbrains-mono` |
| Phosphor icon paths | — (inlined) | UI icons | Inline SVG (copied paths) | n/a | Already dependency-free |

**No runtime JS libraries.** Excel export and ZIP/CRC32 are hand-rolled in `app.js`.

---

## 14. TODO List

**Developer**
- [ ] Replace mock Google login with real OAuth.
- [ ] Wire real API for calls, employees, dashboard metrics; add a persistence layer.
- [ ] Decide host-chrome vs. in-app bar; adapt `.phone` shell for embedding.
- [ ] Self-host fonts; remove Google `@import`.
- [ ] When editing Results cards, update `layoutResults()` index map + count (currently 10 cards).
- [ ] Remove unused `assets/sonic-mark.svg` and stale `scratch-artifact.html`.

**Backend**
- [ ] Endpoints: auth, upload/transcription, analysis results, call log CRUD, employee CRUD, dashboard aggregates, report export.

**Content**
- [ ] Replace mock names, transcripts, phone numbers, and figures with real/placeholder-safe data.

**SEO**
- [ ] Add description / OG / canonical or set `noindex` for internal use; add favicon.

**Analytics / CMS**
- [ ] Add analytics + consent per host; wire CMS if copy must be editable.

---

## 15. Integration Risks

| Risk | Severity | Detail / mitigation |
| --- | --- | --- |
| **Global CSS leakage** | Medium | Tokens are `--tcp-*`-scoped, but component classes (`.card`, `.btn`, `.page`, `.input`, `.tab`) are **generic** and can collide with host styles. Mitigate by wrapping the app in a scoping root or shadow DOM. |
| **`.phone` fixed shell** | High | Fixed full-viewport frame will fight a host layout. Must be re-scoped for embedding. |
| **Results layout fragility** | Medium | `layoutResults()` distributes cards by hardcoded index; a stray `.card` in the results page silently drops the transcript (already hit & fixed once). Keep the index map in sync. |
| **Remote font `@import`** | Medium | Blocking external request; fails offline, adds a third-party origin, render-blocks. Self-host. |
| **No focus trap in modals** | Medium | Accessibility gap; keyboard users can tab out of open dialogs. |
| **No persistence** | Info | State resets on reload — expected for a prototype, surprising in production. |
| **JS runs on parse** | Low | Script at end of body with no guard; ensure the DOM markup is present before the script in any integration. |
| **SEO/shareability** | Low | Minimal meta — fine for an internal tool, add `noindex`. |

---

## 16. Production Checklist

- [ ] Images optimized — n/a (all SVG inline/data-URI) ✅
- [ ] Fonts optimized — ❌ currently remote `@import`; self-host
- [ ] Responsive verified — ✅ mobile/tablet/desktop (re-verify after embedding)
- [ ] Accessibility verified — ⚠️ add focus trap + skip link; recheck contrast
- [ ] Animations tested — ✅ incl. reduced-motion
- [ ] Dependencies documented — ✅ (none; fonts only)
- [ ] SEO complete — ❌ add meta or `noindex` + favicon
- [ ] Analytics excluded — ✅ (add at integration)
- [ ] Cookie manager excluded — ✅ (add at integration)
- [ ] Header excluded — ⚠️ app ships its own top bar; reconcile with host
- [ ] Footer excluded — ✅ (none shipped)
- [ ] CSS scoped to avoid host collisions — ❌ generic class names; scope before merge
- [ ] Mock auth/data replaced with real API — ❌
- [ ] Production ready — ❌ (prototype; complete the above first)
