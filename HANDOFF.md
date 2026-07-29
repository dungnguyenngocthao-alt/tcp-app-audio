# TCPVoiceAI — Frontend Handoff

> Technical handoff for the engineer integrating this prototype into a production site.
> **Single-file, dependency-free, mobile-first web prototype** — vanilla HTML/CSS/JS, no framework, no build step, no backend.

---

## 1. Executive Summary

| Field | Detail |
| --- | --- |
| **Product** | **TCPVoiceAI** — acoustic-intelligence tool that analyses sales-call audio and produces sentiment / keyword / evaluation reports. |
| **Purpose** | Interactive UI prototype of the full call-analysis workflow on the **Talent Connect Plus Design System**. |
| **Language** | Vietnamese (`<html lang="vi">`). |
| **Core flow** | Login (Google-only mock) → **Dashboard** (upload + configure + analytics) → **Analyzing popup** (queue) → **Results** (analysis + inline evaluation + transcript) → saved into **Đánh giá cuộc gọi**. |
| **Main interactions** | Drag/drop + browse upload, database bulk-connect, drawer nav, sortable/filterable tables, modals (confirm/review/add-employee/processing), inline evaluation, `.xlsx`/`.txt` export, transcript search + click-to-seek. |
| **Animation** | CSS-only: processing pulse, equalizer bars, modal pop, drawer slide, animated login backdrop. |
| **Dependencies** | **None** (JS). One external network call: Google Fonts `@import`. |
| **Backend** | **None.** All data is mock/in-memory; login, upload, DB-connect and analysis are simulated client-side and reset on reload. |

---

## 2. Folder Structure

```
tcp-app-audio/
├── index.html            # Entire app — all screens + modals in one document (~1.2k lines)
├── css/
│   ├── tokens.css        # Design-system tokens (CSS custom properties) + Google Fonts @import
│   └── app.css           # Components, layout, theme, responsive (~2.5k lines)
├── js/
│   └── app.js            # All interactivity — single IIFE, "use strict" (~2.3k lines)
├── assets/
│   └── sonic-mark.svg    # Legacy mark — NOT referenced by current build (safe to delete)
├── README.md             # Prototype notes
└── HANDOFF.md            # This document
```

> `scratch-artifact.html` in the working tree is a **generated single-file bundle** (inlined CSS+JS) for previews — not a source file.

---

## 3. Asset Inventory

| Asset | Type | Usage | Optimization |
| --- | --- | --- | --- |
| Brand logo (triangle mark) | Inline `data:` SVG | `.brand__logo` background in `app.css` | ✅ Inlined, zero requests |
| Google "G" logo | Inline `<svg>` | Login button + profile | ✅ Inline |
| UI icons (all) | Inline `<svg>` (Phosphor set, `viewBox 0 0 256 256`, `fill=currentColor`) | Nav, buttons, card labels | ✅ Inline, inherit color; no icon font |
| Login backdrop icons | 7 inline `<svg>` in `.login-decor` | Decorative animated background | ✅ `aria-hidden` |
| `assets/sonic-mark.svg` | External SVG | **Unused** | ⚠️ Legacy — remove |
| Fonts: Inter, JetBrains Mono | Google Fonts | Body / mono type | ⚠️ Remote `@import` — see §12/§15 |

No raster images, video, Lottie, or 3D assets. **No favicon defined.**

---

## 4. Component / Screen Inventory

The app is a client-side SPA. Screens (`<section class="screen" data-screen="…">`) are shown one at a time by `show(name)`. **Processing is a modal, not a screen.**

| Screen (`data-screen`) | VN label | Purpose | Notes |
| --- | --- | --- | --- |
| `login` | Đăng nhập | Mock Google-only sign-in gate | Animated backdrop; button → `dashboard` |
| `dashboard` | Dashboard | **Embedded upload + AI-config panel** at top, then date filter + KPI/donut/bar/word-cloud analytics; `.xlsx` export | The single upload panel is **relocated** here (see below) |
| `results` | Kết quả phân tích | Two-column: MAIN (outcome + inline eval, then 2-col analysis cards) + RAIL (audio player + searchable transcript) | Built once by `layoutResults()` |
| `uploads` | **Đánh giá cuộc gọi** | Call log with stats/filters/pagination + review overrides + **Chú thích** column; a **"Lịch sử upload"** tab shows the raw call sheet | The upload panel also relocates here |
| `employees` | Nhân viên | Agent roster; add (manual/CSV), delete, sortable columns | (Manager-role feature) |
| `settings` | Cài đặt | **Master-detail**: menu (Hồ sơ của tôi / Bộ từ khoá cảm xúc) + selected-section pane | |
| `history` | Lưu trữ | Legacy archive screen | **Not in the current nav** — reachable only in code; remove if unused |

**Modals / overlays:** processing popup (`#procModal`, with a file card + progress + analysis **queue**), confirm dialog (`#confirmModal`), review dialog (`#reviewModal`, legacy — evaluation is now inline on Results), add-employee dialog (`#empModal`), slide-in drawer (`#menu`).

**Drawer nav (all screens):** Dashboard · Đánh giá cuộc gọi · Nhân viên · Cài đặt · **Đăng xuất** (pinned to the bottom). The hamburger sits in the **left** corner with the logo beside it; the drawer slides in from the left.

**Shared upload panel:** there is exactly **one** upload+config panel (`#analyzePanel`). `show(name)` moves it into the active screen's `[data-upload-mount]` (dashboard or Đánh giá cuộc gọi), so it appears inline in either without duplicate IDs.

---

## 5. CSS Documentation

Load order matters: **`tokens.css` first**, then **`app.css`** (the AI/high-tech theme layer lives at the end of `app.css` and wins by cascade — note it contains several `!important` overrides, e.g. `.input, .select { background:#fff !important }`).

| Aspect | Detail |
| --- | --- |
| **Namespace** | Design tokens prefixed `--tcp-*`; bridge tokens `--color-blue-7`, `--color-violet-26`. |
| **Naming** | BEM-ish (`block__element--modifier`). |
| **Color** | Neutral/brand scales, semantic `--tcp-bg/-fg/-accent`, feedback colors, theme extras `--tcp-glass`, `--tcp-glow-*`, `--tcp-gradient-*`. |
| **Type** | `--tcp-font-sans` (Inter), `--tcp-font-mono` (JetBrains Mono). Weights capped at 500 (brand wordmark is the exception). |
| **Spacing / Radius / Shadow / Motion** | 4pt scale `--tcp-space-*`; `--tcp-radius-*`; `--tcp-shadow-*` + focus rings; `--tcp-ease`, `--tcp-dur-*`. |
| **Breakpoints** | `480/560` (small-phone), `768` (tablet), `900` (settings/outcome split, results rail), `1200` (desktop). |
| **Theme** | **Light mode only** (no `prefers-color-scheme`). Glassmorphism via `backdrop-filter` (+`-webkit-`). |
| **Shell** | `.phone` fills the viewport (`100dvh`); screens are `position:absolute; inset:0` and scroll internally via `.screen__scroll`. |
| **Key layouts** | `.dash-analyze__grid` (upload | config, height-synced); `.results-grid` → `.results-main` + `.results-side` (rail is `position:sticky`, transcript scrolls internally); `.settings-layout` (menu + detail); masonry via `column-count` for `.results-cards`. |

---

## 6. JavaScript Documentation

Single file `js/app.js`, one **IIFE** with `"use strict"`, script at end of `<body>` (runs on parse). No modules/globals leaked.

| Subsystem | Purpose / notes |
| --- | --- |
| `show(name)` / `setActiveMenu` | Screen router; also **relocates** the shared upload panel into the active screen's mount. Nav via `[data-nav]` allow-list. |
| Upload flow | Drag/drop + browse (`selectedFiles`), 4 sample files, **2-per-row compact previews** with "Xoá tất cả", employee select. |
| Bulk / database | "Bulk upload" tab = **database connection only** (`dbConnection` state). Connect → persists across tabs/resets; import pulls mock rows. |
| Processing | `runProcessing()` drives a progress `setInterval`; shown in the **`#procModal` popup** with a **queue** (`renderProcQueue`); on finish → Results. |
| Results | `selectResultFile`, `mockCall`, file strip, **inline evaluation** (`renderOutcomeReview`/`confirmOutcomeInline`), toolbar (`#reanalyzeBtn` cycles model + re-runs, `#saveResultBtn` = final decision → Đánh giá), audio player, transcript search (`runTranscriptSearch`), click-a-line-to-seek, keyword highlighting (`highlightTranscript`). |
| `layoutResults()` | Builds the **MAIN + RAIL** structure once from the flat `.card` list by index (0 outcome … 9 transcript). ⚠️ Adding/removing a `.card` in the Results `.page` requires updating this index map. |
| Uploads / Đánh giá | `UPLOAD_LOG` model, `renderUploads`, filters + pagination, review overrides (`effRate`), delete-with-confirm; **eval/sheet view switch** (`[data-upview]` → `renderCallHistory`). |
| Employees | Sortable table, CSV/TSV `FileReader` import, add/delete. |
| Settings | Master-detail menu (`[data-setnav]` → `[data-setpane]`), profile save, sentiment keyword editors (recolor transcript). |
| Export | `buildXlsx` (real `.xlsx` via `zipStore`+`crc32`+`TextEncoder`, **dependency-free**), `exportTranscript` (`.txt`), `downloadBlob`. |
| Shared helpers | `showConfirm`, `mockCall`, `AVATAR_COLORS`, `nameHash`, `initials`, `escAttr`, `durToSec`, `effRate`. |

**No** `fetch`/`XHR`/WebSocket/`localStorage`/`sessionStorage` — nothing persists across reload. **No IntersectionObserver.**

---

## 7. Animation Documentation

All CSS `@keyframes` (no JS libraries): `pulse`, `eq` (equalizer), `modal-pop`, `drawer-fade`, `drawer-slide` (from the left), `aiGridDrift` (login grid), `loginFloat` (7 faint login icons). `@media (prefers-reduced-motion: reduce)` disables the login animations and pins the icons static. Transforms/opacity for GPU-friendly compositing.

---

## 8. Responsive Documentation

Mobile-first inside `.phone`. Reflows widen at each breakpoint:

| Width | Behavior |
| --- | --- |
| **< 768 (mobile)** | Single column; dashboard upload stacks; Results stacks (outcome above eval, cards single-column, rail below). |
| **768–899** | Dashboard upload = 2 columns (upload | config, height-synced). |
| **≥ 900** | Settings = menu + detail; Results outcome+eval sit side by side; Results = MAIN + sticky RAIL; analysis cards = 2-col masonry. |
| **≥ 1200 (desktop)** | Full-width analytics grids. |
| **Menu (all sizes)** | Hamburger + logo at the left; drawer from the left; logout pinned bottom. |
| **Wide tables** | `.emp-table-wrap` scrolls horizontally (`overflow-x:auto`) — e.g. the 10-column "Lịch sử upload" sheet. |

Audited (no horizontal overflow) at 360/414/768/1024/1440. **Known limitation:** the Results layout is JS-index-driven — fragile to card additions.

---

## 9. Browser Support

Modern evergreen. Uses CSS custom properties, Flexbox, Grid, `column-count`, `backdrop-filter` (+`-webkit-`), `position:sticky`, `100dvh`, `data:` SVG backgrounds; JS `TextEncoder`, `Blob`, `URL.createObjectURL`, ES6+.

| Browser | Status |
| --- | --- |
| Chrome / Edge (desktop, Android) | ✅ Primary |
| Safari / Mobile Safari | ✅ (`-webkit-backdrop-filter` present; `viewport-fit=cover`) |
| Firefox | ✅ |
| IE11 / legacy | ❌ No transpilation/polyfills |

**Known issue:** offline, the Google Fonts `@import` fails and the app falls back to system fonts (harmless).

---

## 10. Accessibility Notes

| Area | Status |
| --- | --- |
| Semantic roles | `role="application"`, `menu/menuitem`, `tablist/tab`, `dialog`+`aria-modal` on modals |
| Labels/state | Extensive `aria-label`, `aria-hidden` on decorative SVGs, `aria-expanded`/`aria-haspopup` (burger), `aria-selected`/`aria-pressed` (tabs/menu), `aria-sort` (columns) |
| Keyboard | Native `<button>`s; modals close on `Escape` |
| Reduced motion | Respected (login animations off) |
| **Gaps to check** | No skip-link; no focus trap inside modals; verify focus-visible rings and contrast on gradient/glass surfaces; test SR flow across absolutely-positioned screens. |

---

## 11. SEO Notes

⚠️ **Minimal — an internal app prototype, not a marketing page.**

| Tag | Present? |
| --- | --- |
| `<title>` · `<html lang>` · `theme-color` · `viewport` | ✅ |
| Meta description · Open Graph · Twitter · Canonical · Schema · `robots` · Favicon | ❌ |

Likely should be `noindex` as an internal tool.

---

## 12. Integration Notes

| Concern | Ownership / action |
| --- | --- |
| **Header/footer** | Ships its own in-app top bar + drawer; no site header/footer. Reconcile with host chrome. |
| **The `.phone` shell** | Fixed full-viewport frame — re-scope/remove for embedding. |
| **Routing** | Client-side screen toggling only (no URL/History API). Wire `show()` to a router for deep links. |
| **Auth** | Google login is a **mock** — replace `#googleLoginBtn` handler with real OAuth. |
| **Data** | `UPLOAD_LOG`, employees, `mockCall`, dashboard figures, DB-connect are in-memory mock. Replace with real endpoints; add persistence. |
| **Fonts** | Self-host Inter + JetBrains Mono instead of the remote `@import`. |
| **Design system** | Tokens mirror the Talent Connect Plus system — reuse rather than fork. |
| **Analytics / cookies / CMS** | None included — add per host standards. |

---

## 13. Third-party Dependencies

| Library | Delivery | Replacement |
| --- | --- | --- |
| **Inter** (Google Fonts, variable) | Remote `@import` in `tokens.css` | `@fontsource/inter`, self-hosted WOFF2 |
| **JetBrains Mono** (Google Fonts) | Remote `@import` | `@fontsource/jetbrains-mono` |
| Phosphor icon paths | Inlined SVG | Already dependency-free |

**No runtime JS libraries.** Excel export + ZIP/CRC32 are hand-rolled.

---

## 14. TODO List

**Developer**
- [ ] Replace mock Google login with real OAuth.
- [ ] Wire real APIs (calls, employees, dashboard metrics, DB import) + persistence.
- [ ] Adapt the `.phone` shell for embedding; reconcile in-app bar vs host chrome.
- [ ] Self-host fonts; remove Google `@import`.
- [ ] Keep `layoutResults()` index map in sync when editing Results cards.
- [ ] Remove the unused `history` screen and `assets/sonic-mark.svg`; consider removing the legacy `#reviewModal` (evaluation is inline now).

**Backend** — endpoints for auth, upload/transcription, analysis, call-log CRUD, employee CRUD, dashboard aggregates, DB source, report export.

**Content** — replace mock names/transcripts/phone numbers/figures. **SEO** — add meta or `noindex` + favicon. **Analytics/CMS** — add per host.

---

## 15. Integration Risks

| Risk | Severity | Detail / mitigation |
| --- | --- | --- |
| **Global CSS leakage** | Medium | Generic class names (`.card`, `.btn`, `.page`, `.input`, `.tab`, `.msg`) + theme-layer `!important` rules can collide with host styles. Scope under a root or shadow DOM. |
| **`.phone` fixed shell** | High | Fights host layout; must be re-scoped for embedding. |
| **Results layout fragility** | Medium | `layoutResults()` distributes cards by hardcoded index and builds once — a stray `.card` breaks the mapping (has happened before). |
| **Panel relocation** | Low | The single `#analyzePanel` is moved between mounts on nav; if a screen with a `[data-upload-mount]` is duplicated, IDs could clash. |
| **Remote font `@import`** | Medium | Blocking external request; fails offline; render-blocking. Self-host. |
| **No focus trap in modals** | Medium | Accessibility gap. |
| **No persistence** | Info | State resets on reload — expected for a prototype. |

---

## 16. Production Checklist

- [ ] Images optimized — n/a (all SVG inline/data-URI) ✅
- [ ] Fonts optimized — ❌ self-host (currently remote `@import`)
- [ ] Responsive verified — ✅ (re-verify after embedding)
- [ ] Accessibility verified — ⚠️ add focus trap + skip link; recheck contrast
- [ ] Animations tested — ✅ incl. reduced-motion
- [ ] Dependencies documented — ✅ (none; fonts only)
- [ ] SEO complete — ❌ add meta or `noindex` + favicon
- [ ] Analytics / cookie manager excluded — ✅ (add at integration)
- [ ] Header excluded — ⚠️ app ships its own top bar; reconcile with host
- [ ] Footer excluded — ✅ (none shipped)
- [ ] CSS scoped to avoid host collisions — ❌ scope before merge
- [ ] Mock auth / data / DB-connect replaced with real API — ❌
- [ ] Production ready — ❌ (prototype; complete the above first)
