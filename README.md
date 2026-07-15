# SonicAI — Acoustic Intelligence (mobile web app)

A phone-first web app prototype for **SonicAI**, an acoustic-intelligence tool
that analyses sales-call audio and produces a sentiment/keyword report.

The UI is built directly on the **Talent Connect Plus Design System**
(imported from the Claude Design project via the design MCP): the same colour
primitives, typography (Inter + JetBrains Mono), spacing, radii, shadow and
motion tokens drive every screen.

## Screens

1. **New Analysis** — upload an audio file (drag & drop or browse) or paste an
   external link, choose a processing model, set sensitivity, toggle
   auto-detect anomalies, and start processing.
2. **Analyzing Audio** — animated processing state with a live progress bar and
   staged status messages.
3. **Kết quả phân tích (Results)** — outcome + confidence, highlighted
   keywords, customer sentiment bars, talk-duration split, summary, suggested
   actions, and a full call transcript with keyword highlighting.

## Design tokens

| Role            | Token / value                    |
| --------------- | -------------------------------- |
| Brand (indigo)  | `--tcp-brand-500` `#1F1F6D`      |
| Accent / CTA    | `--tcp-accent` `#4F46E5`         |
| Ink (headings)  | `--tcp-ink` `#0F1B2D`            |
| Type — sans     | Inter                            |
| Type — mono     | JetBrains Mono                   |

All raw tokens live in [`css/tokens.css`](css/tokens.css); component and layout
styling is in [`css/app.css`](css/app.css).

## Run

No build step. Serve the folder statically:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Structure

```
index.html        # all three screens
css/tokens.css    # imported TCP design-system foundations
css/app.css       # app + component styling
js/app.js         # navigation, upload, processing sim, transcript tabs
assets/           # SonicAI waveform mark
```
