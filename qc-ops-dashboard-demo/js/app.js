/* =============================================================================
   QC-Ops dashboard demo — rendering + interactions
   ============================================================================= */
(function () {
  "use strict";
  const D = window.DEMO_DATA;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const nfmt = (n) => Number(n).toLocaleString("vi-VN");

  const BU_LABEL = { pso: "PSO", tcp: "TCP", unknown: "Chưa rõ" };
  const BU_DOT = { pso: "#6b2ec6", tcp: "#4f46e5", unknown: "#94a3b8" };

  // shared filter state (applies to overview donuts, Ext table AND the calls list)
  let fEmail = "", fExt = "";
  let curRange = "7d";
  let heatStatus = "all";
  let callsPage = 1;

  const extOf = (c) => (c.dir === "Outbound" ? c.from : c.to);
  const emailOf = (c) => (D.byExt[extOf(c)] ? D.byExt[extOf(c)].email : "—");

  function matchUsers() {
    return D.USERS.filter((u) =>
      (!fEmail || u.email.toLowerCase().includes(fEmail.toLowerCase())) &&
      (!fExt || u.ext.toLowerCase().includes(fExt.toLowerCase())));
  }
  function activeUser() { if (!fEmail && !fExt) return null; const m = matchUsers(); return m.length === 1 ? m[0] : null; }

  /* ---------- Donuts ---------- */
  function conic(stops) { const p = []; let prev = 0; stops.forEach(([c, x]) => { p.push(`${c} ${prev}%`, `${c} ${x}%`); prev = x; }); return `conic-gradient(${p.join(", ")})`; }
  function paintDonuts() {
    const u = activeUser();
    if (u) {
      const inPct = u.total ? Math.round((u.inbound / u.total) * 100) : 0;
      $("#ioRing").style.background = conic([["#f97316", inPct], ["#16a34a", 100]]);
      $("#ioNum").textContent = nfmt(u.total);
      $("#ioInPct").textContent = inPct + "%"; $("#ioOutPct").textContent = (100 - inPct) + "%";
      $("#buRing").style.background = conic([[BU_DOT[u.bu], 100]]);
      $("#buNum").textContent = nfmt(u.total);
      $("#buLegend").innerHTML = `<span class="legend__item"><span class="dot dot--${u.bu}"></span>${BU_LABEL[u.bu]} <b class="legend__pct">100%</b></span>`;
    } else {
      const io = D.OVERVIEW;
      $("#ioRing").style.background = conic([["#f97316", io.inboundPct], ["#16a34a", 100]]);
      $("#ioNum").textContent = nfmt(io.totalCalls);
      $("#ioInPct").textContent = io.inboundPct + "%"; $("#ioOutPct").textContent = io.outboundPct + "%";
      const bu = io.bu;
      $("#buRing").style.background = conic([["#6b2ec6", bu.pso], ["#4f46e5", bu.pso + bu.tcp], ["#94a3b8", 100]]);
      $("#buNum").textContent = nfmt(io.totalCalls);
      $("#buLegend").innerHTML =
        `<span class="legend__item"><span class="dot dot--pso"></span>PSO <b class="legend__pct">${bu.pso}%</b></span>` +
        `<span class="legend__item"><span class="dot dot--tcp"></span>TCP <b class="legend__pct">${bu.tcp}%</b></span>` +
        `<span class="legend__item"><span class="dot dot--unk"></span>Chưa rõ <b class="legend__pct">${bu.unknown}%</b></span>`;
    }
  }

  /* ---------- Chart (stacked bar) ---------- */
  function renderChart() {
    const c = D.CHART[curRange], n = c.series.length;
    const max = Math.max(1, ...c.series.map((s) => s.in + s.out));
    const barW = n <= 7 ? 18 : n <= 12 ? 15 : 7;
    const labelEvery = n <= 12 ? 1 : 5;
    $("#chart").innerHTML = c.series.map((s, i) => {
      const tot = s.in + s.out, h = Math.max(3, Math.round((tot / max) * 170));
      const inH = tot ? Math.round((s.in / tot) * h) : 0, outH = h - inH;
      const show = i % labelEvery === 0 || i === n - 1;
      return `<div class="chart__col" title="${c.labels[i]} · In ${s.in} · Out ${s.out}"><div class="chart__stack" style="width:${barW}px;height:${h}px"><div class="chart__seg chart__seg--out" style="height:${outH}px"></div><div class="chart__seg chart__seg--in" style="height:${inH}px"></div></div><div class="chart__x">${show ? c.labels[i] : ""}</div></div>`;
    }).join("");
    const u = activeUser();
    if (u) {
      $("#statUploaded").textContent = nfmt(u.total);
      $("#statAvg").textContent = c.avg;
      $("#statDelta").innerHTML = `<span class="note">Ext. ${esc(u.ext)}</span>`;
    } else {
      const total = c.series.reduce((a, s) => a + s.in + s.out, 0);
      $("#statUploaded").textContent = nfmt(total);
      $("#statAvg").textContent = c.avg;
      const d = curRange === "7d" ? 12.4 : curRange === "30d" ? 8.1 : 15.6;
      $("#statDelta").innerHTML = `<span class="up">▲ +${d}%</span><span class="note">so với kỳ trước</span>`;
    }
  }

  /* ---------- Top-5 (email, no bar) ---------- */
  function renderTop5(elId, rows) {
    $(elId).innerHTML = rows.map((r, i) => `
      <div class="top5__row">
        <span class="top5__rank">${i + 1}</span>
        <span class="top5__email" data-email="${esc(r.email)}" title="${esc(r.email)} · Ext. ${esc(r.ext)}">${esc(r.email)}</span>
        <span class="top5__right"><span class="top5__count">${nfmt(r.calls)}</span><span class="top5__unit">cuộc gọi</span></span>
      </div>`).join("");
  }

  /* ---------- Ext table (% Odoo bar, equal length) ---------- */
  function uvRowHtml(u, i) {
    const pct = u.total ? Math.round((u.odoo / u.total) * 100) : 0;
    const sel = activeUser() && activeUser().ext === u.ext ? " is-selected" : "";
    return `<tr class="${sel}">
      <td class="uv-rank">${i + 1}</td>
      <td><span class="uv-ext" data-ext="${esc(u.ext)}">${esc(u.ext)}</span></td>
      <td><span class="uv-email" data-email="${esc(u.email)}">${esc(u.email)}</span></td>
      <td class="num"><span class="uv-num-total">${nfmt(u.total)}</span></td>
      <td class="num"><span class="uv-num-odoo">${nfmt(u.odoo)}</span></td>
      <td class="col-bar"><div class="pct-cell"><span class="pct-bar"><span class="pct-bar__fill" style="width:${pct}%"></span></span><span class="pct-val">${pct}%</span></div></td>
    </tr>`;
  }
  function filteredUsers() {
    const q = $("#uvFilter").value.trim().toLowerCase();
    return matchUsers().filter((u) => !q || u.ext.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q));
  }
  function renderUvTable() {
    const rows = filteredUsers(), shown = rows.slice(0, 7);
    $("#uvBody").innerHTML = shown.length ? shown.map(uvRowHtml).join("")
      : `<tr><td colspan="6" class="uv-empty">Không có Ext/Email nào khớp bộ lọc</td></tr>`;
    const q = $("#uvFilter").value.trim() || fEmail || fExt;
    $("#uvFoot").textContent = q
      ? `Hiển thị ${Math.min(7, rows.length)} / ${rows.length} Ext khớp · tổng ${D.USERS.length} Ext`
      : `Hiển thị Top 7 / ${D.USERS.length} Ext có nhiều cuộc gọi nhất`;
  }

  /* ---------- Modal ---------- */
  function renderModalTable() {
    const q = ($("#uvModalFilter").value || "").trim().toLowerCase();
    let rows = D.USERS;
    if (q) rows = rows.filter((u) => u.ext.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q));
    $("#uvModalBody").innerHTML = rows.length ? rows.map(uvRowHtml).join("") : `<tr><td colspan="6" class="uv-empty">Không có kết quả</td></tr>`;
    $("#uvModalSub").textContent = `${rows.length} / ${D.USERS.length} Ext`;
  }
  function openModal() { $("#uvModal").classList.add("is-open"); document.body.style.overflow = "hidden"; renderModalTable(); setTimeout(() => $("#uvModalFilter").focus(), 30); }
  function closeModal() { $("#uvModal").classList.remove("is-open"); document.body.style.overflow = ""; }

  /* ---------- Filter chips ---------- */
  function chip(type, label) {
    const ic = type === "email"
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 5h8"/><path d="M13 12h8"/><path d="M13 19h8"/><path d="m3 17 2 2 4-4"/><rect x="3" y="4" width="6" height="6" rx="1"/></svg>';
    return `<span class="fchip">${ic}<span>${esc(label)}</span><button class="fchip__x" data-clear="${type}" aria-label="Bỏ lọc">×</button></span>`;
  }
  function renderChips() {
    const chips = [];
    if (fEmail) chips.push(chip("email", fEmail));
    if (fExt) chips.push(chip("ext", "Ext. " + fExt));
    const box = $("#filterChips");
    box.innerHTML = chips.join("");
    box.hidden = chips.length === 0;
  }

  /* ---------- Heatmap 24h ---------- */
  const HEAT_COLORS = { all: [234, 88, 12], answered: [79, 70, 229], unanswered: [100, 116, 139] };
  const cellValue = (c) => (heatStatus === "answered" ? c.answered : heatStatus === "unanswered" ? c.unanswered : c.answered + c.unanswered);
  function renderHeatmap() {
    const hm = D.HEATMAP, [cr, cg, cb] = HEAT_COLORS[heatStatus] || HEAT_COLORS.all;
    let max = 0; hm.rows.forEach((r) => r.cells.forEach((c) => { max = Math.max(max, cellValue(c)); })); max = Math.max(1, max);
    const parts = [`<div class="heat-colhead"></div>`];
    hm.cols.forEach((h) => parts.push(`<div class="heat-colhead">${h}h</div>`));
    hm.rows.forEach((row) => {
      parts.push(`<div class="heat-rowlabel">${row.label}</div>`);
      row.cells.forEach((c) => {
        const v = cellValue(c), t = v / max;
        const a = v === 0 ? 0.04 : 0.1 + t * 0.78, color = t > 0.62 ? "#fff" : "#12142f";
        parts.push(`<div class="heat-cell" title="${v} cuộc gọi" style="background:rgba(${cr},${cg},${cb},${a.toFixed(3)});color:${color}">${v || ""}</div>`);
      });
    });
    $("#heatmap").innerHTML = parts.join("");
  }

  /* ---------- Calls list ---------- */
  function filteredCalls() {
    const q = ($("#callSearch").value || "").trim().toLowerCase();
    const bu = $("#callBu").value, fe = fEmail.toLowerCase(), fx = fExt.toLowerCase();
    return D.CALLS.filter((c) => {
      if (bu !== "all" && c.bu !== bu) return false;
      if (q && !(c.id.toLowerCase().includes(q) || c.from.toLowerCase().includes(q) || c.to.toLowerCase().includes(q))) return false;
      if (fe && !emailOf(c).toLowerCase().includes(fe)) return false;
      if (fx && !(extOf(c).toLowerCase().includes(fx) || c.from.toLowerCase().includes(fx) || c.to.toLowerCase().includes(fx))) return false;
      return true;
    });
  }
  function callRowHtml(c) {
    const cls = c.dir === "Outbound" ? "chip--out" : "chip--in";
    const rec = c.rec
      ? `<span class="rec-link"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/></svg>Nghe ghi âm</span>`
      : `<span class="rec-none">Chưa có</span>`;
    return `<tr>
      <td><span class="call-email" data-email="${esc(emailOf(c))}">${esc(emailOf(c))}</span></td>
      <td>${esc(c.time)}</td>
      <td>${esc(c.from)}</td>
      <td>${esc(c.to)}</td>
      <td><span class="chip ${cls}">${c.dir}</span></td>
      <td><span class="chip chip--bu"><span class="chip-dot" style="background:${BU_DOT[c.bu]}"></span>${BU_LABEL[c.bu]}</span></td>
      <td>${esc(c.dur)}</td>
      <td>${rec}</td>
      <td><button class="btn-ghost">Xem chi tiết</button></td>
    </tr>`;
  }
  function renderCalls() {
    const rows = filteredCalls();
    const per = parseInt($("#callsPerPage").value, 10) || 10;
    const pages = Math.max(1, Math.ceil(rows.length / per));
    if (callsPage > pages) callsPage = pages;
    const start = (callsPage - 1) * per, slice = rows.slice(start, start + per);
    $("#callsBody").innerHTML = slice.length ? slice.map(callRowHtml).join("")
      : `<tr><td colspan="9" class="uv-empty">Không có cuộc gọi nào khớp bộ lọc</td></tr>`;
    $("#callsCount").textContent = `Hiển thị ${rows.length ? start + 1 : 0}–${start + slice.length} trên ${nfmt(rows.length)} cuộc gọi`;
    $("#callsPageInfo").textContent = `Trang ${callsPage} / ${pages}`;
    $("#callsPrev").disabled = callsPage <= 1;
    $("#callsNext").disabled = callsPage >= pages;
  }

  /* ---------- Shared filter setter ---------- */
  function setFilter(p) {
    if ("email" in p) fEmail = p.email;
    if ("ext" in p) fExt = p.ext;
    $$('[data-filter="email"]').forEach((i) => { if (i.value !== fEmail) i.value = fEmail; });
    $$('[data-filter="ext"]').forEach((i) => { if (i.value !== fExt) i.value = fExt; });
    callsPage = 1;
    renderChips(); paintDonuts(); renderChart(); renderUvTable(); renderCalls();
  }
  function resetAll() {
    $("#uvFilter").value = ""; $("#callSearch").value = ""; $("#callBu").value = "all"; callsPage = 1;
    setFilter({ email: "", ext: "" });
  }

  /* ---------- Tabs ---------- */
  function activateTab(name) {
    $$("#tabs .tab").forEach((b) => b.classList.toggle("is-active", b.dataset.tab === name));
    $$("[data-pane]").forEach((p) => { p.hidden = p.getAttribute("data-pane") !== name; });
    if (name === "calls") renderCalls();
  }

  /* ---------- Init ---------- */
  function init() {
    paintDonuts(); renderChart();
    renderTop5("#top5Caller", D.TOP5_CALLER);
    renderTop5("#top5Callee", D.TOP5_CALLEE);
    renderUvTable(); renderHeatmap(); renderCalls(); renderChips();

    $("#tabs").addEventListener("click", (e) => { const b = e.target.closest(".tab"); if (b) activateTab(b.dataset.tab); });
    try { if (new URLSearchParams(location.search).get("tab") === "calls") activateTab("calls"); } catch (e) {}

    $("#rangeToggle").addEventListener("click", (e) => { const b = e.target.closest("button[data-range]"); if (!b) return; curRange = b.dataset.range; $$("#rangeToggle button").forEach((x) => x.classList.toggle("is-active", x === b)); renderChart(); });
    $("#heatStatus").addEventListener("click", (e) => { const b = e.target.closest("button[data-status]"); if (!b) return; heatStatus = b.dataset.status; $$("#heatStatus button").forEach((x) => x.classList.toggle("is-active", x === b)); renderHeatmap(); });

    // Shared Email / Ext inputs (overview + calls)
    $$('[data-filter="email"]').forEach((i) => i.addEventListener("input", () => setFilter({ email: i.value.trim() })));
    $$('[data-filter="ext"]').forEach((i) => i.addEventListener("input", () => setFilter({ ext: i.value.trim() })));

    $("#uvFilter").addEventListener("input", renderUvTable);
    $("#ovReset").addEventListener("click", resetAll);
    $("#callReset").addEventListener("click", resetAll);

    // Click email / ext anywhere → set filter
    document.addEventListener("click", (e) => {
      const clr = e.target.closest("[data-clear]");
      if (clr) { setFilter(clr.getAttribute("data-clear") === "email" ? { email: "" } : { ext: "" }); return; }
      const em = e.target.closest("[data-email]");
      if (em) { closeModal(); activateTab("overview"); setFilter({ email: em.getAttribute("data-email"), ext: "" }); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
      const ex = e.target.closest("[data-ext]");
      if (ex) { closeModal(); activateTab("overview"); setFilter({ ext: ex.getAttribute("data-ext"), email: "" }); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    });

    $("#uvDetailBtn").addEventListener("click", openModal);
    $("#uvModalClose").addEventListener("click", closeModal);
    $("#uvModal").addEventListener("click", (e) => { if (e.target.id === "uvModal") closeModal(); });
    $("#uvModalFilter").addEventListener("input", renderModalTable);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

    $("#callSearch").addEventListener("input", () => { callsPage = 1; renderCalls(); });
    $("#callBu").addEventListener("change", () => { callsPage = 1; renderCalls(); });
    $("#callsPerPage").addEventListener("change", () => { callsPage = 1; renderCalls(); });
    $("#callsPrev").addEventListener("click", () => { if (callsPage > 1) { callsPage--; renderCalls(); } });
    $("#callsNext").addEventListener("click", () => { callsPage++; renderCalls(); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
