#!/usr/bin/env node
/**
 * Build a single, self-contained HTML file (CSS + JS inlined) for previews,
 * email handoff, or opening straight from disk with no web server.
 *
 * Usage:  node scripts/build-standalone.js [outfile]
 * Default output: dist/TCPVoiceAI.standalone.html
 *
 * This is a convenience only — the real deploy target is the split static
 * files (index.html + css/ + js/ + assets/), which Vercel serves as-is.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const out = process.argv[2] || path.join(root, "dist", "TCPVoiceAI.standalone.html");

let html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const tokens = fs.readFileSync(path.join(root, "css/tokens.css"), "utf8");
const appcss = fs.readFileSync(path.join(root, "css/app.css"), "utf8");
const appjs = fs.readFileSync(path.join(root, "js/app.js"), "utf8");

// Replacement FUNCTIONS so $-sequences ($$, $&, ...) in file contents are
// inserted verbatim rather than interpreted as replacement patterns.
html = html.replace('<link rel="stylesheet" href="css/tokens.css">', () => `<style>\n${tokens}\n</style>`);
html = html.replace('<link rel="stylesheet" href="css/app.css">', () => `<style>\n${appcss}\n</style>`);
html = html.replace('<script src="js/app.js"></script>', () => `<script>\n${appjs}\n</script>`);

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log("Wrote", out, "(" + html.length + " chars)");
