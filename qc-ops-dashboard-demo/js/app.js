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

  let selectedUser = null;   // ext string or null
  let curRange = "7d";
  let heatStatus = "all";

  /* ---------- Donuts ---------- */
  function conic(stops) {
    const parts = []; let prev = 0;
    stops.forEach(([c, p]) => { parts.push(`${c} ${prev}%`, `${c} ${p}%`); prev = p; });
    return `conic-gradient(${parts.join(", ")})`;
  }
  function paintDonuts() {
    if (selectedUser) {
      const u = D.byExt[selectedUser];
      const inPct = u.total ? Math.round((u.inbound / u.total) * 100) : 0;
      $("#ioRing").style.background = conic([["#f97316", inPct], ["#16a34a", 100]]);
      $("#ioNum").textContent = nfmt(u.total);
      $("#ioInPct").textContent = inPct + "%";
      $("#ioOutPct").textContent = (100 - inPct) + "%";
      // BU donut → single BU 100%
      $("#buRing").style.background = conic([[BU_DOT[u.bu], 100]]);
      $("#buNum").textContent = nfmt(u.total);
      $("#buLegend").innerHTML = `<span class="legend__item"><span class="dot dot--${u.bu}"></span>${BU_LABEL[u.bu]} <b class="legend__pct">100%</b></span>`;
    } else {
      const io = D.OVERVIEW;
      $("#ioRing").style.background = conic([["#f97316", io.inboundPct], ["#16a34a", 100]]);
      $("#ioNum").textContent = nfmt(io.totalCalls);
      $("#ioInPct").textContent = io.inboundPct + "%";
      $("#ioOutPct").textContent = io.outboundPct + "%";
      const bu = io.bu;
      $("#buRing").style.background = conic([["#6b2ec6", bu.pso], ["#4f46e5", bu.pso + bu.tcp], ["#94a3b8", 100]]);
      $("#buNum").textContent = nfmt(io.totalCalls);
      $("#buLegend").innerHTML =
        `<span class="legend__item"><span class="dot dot--pso"></span>PSO <b class="legend__pct">${bu.pso}%</b></span>` +
        `<span class="legend__item"><span class="dot dot--tcp"></span>TCP <b class="legend__pct">${bu.tcp}%</b></span>` +
        `<span class="legend__item"><span class="dot dot--unk"></span>Chưa rõ <b class="legend__pct">${bu.unknown}%</b></span>`;
    }
  }

  /* ---------- Chart ---------- */
  function renderChart() {
    const c = D.CHART[curRange];
    const n = c.series.length;
    const max = Math.max(1, ...c.series.reduce((a, s) => a.concat(s.in, s.out), []));
    const barW = n <= 7 ? 13 : n <= 12 ? 11 : 6;
    const labelEvery = n <= 12 ? 1 : 5;
    $("#chart").innerHTML = c.series.map((s, i) => {
      const hIn = Math.max(3, Math.round((s.in / max) * 170));
      const hOut = Math.max(3, Math.round((s.out / max) * 170));
      const show = i % labelEvery === 0 || i === n - 1;
      return `<div class="chart__col" title="${c.labels[i]} · In ${s.in} · Out ${s.out}"><div class="chart__bars"><div class="chart__bar chart__bar--in" style="width:${barW}px;height:${hIn}px"></div><div class="chart__bar chart__bar--out" style="width:${barW}px;height:${hOut}px"></div></div><div class="chart__x">${show ? c.labels[i] : ""}</div></div>`;
    }).join("");
    if (selectedUser) {
      const u = D.byExt[selectedUser];
      $("#statUploaded").textContent = nfmt(u.total);
      $("#statAvg").textContent = c.avg;
      $("#statDelta").innerHTML = `<span class="note">Ext. ${esc(u.ext)}</span>`;
    } else {
      const total = c.series.reduce((a, s) => a + s.in + s.out, 0);
      $("#statUploaded").textContent = nfmt(total);
      $("#statAvg").textContent = c.avg;
      const delta = curRange === "7d" ? 12.4 : curRange === "30d" ? 8.1 : 15.6;
      $("#statDelta").innerHTML = `<span class="up">▲ +${delta}%</span><span class="note">so với kỳ trước</span>`;
    }
  }

  /* ---------- Top-5 (email, clickable) ---------- */
  function renderTop5(elId, rows, label) {
    const max = Math.max(...rows.map((r) => r.calls));
    $(elId).innerHTML = rows.map((r, i) => `
      <div class="top5__row">
        <span class="top5__rank">${i + 1}</span>
        <span class="top5__email" data-ext="${esc(r.ext)}" title="${esc(r.email)} · Ext. ${esc(r.ext)}">${esc(r.email)}</span>
        <span class="top5__bar"><span class="top5__fill top5__fill--${r.bu}" style="width:${Math.round((r.calls / max) * 100)}%"></span></span>
        <span><span class="top5__count">${nfmt(r.calls)}</span><span class="top5__unit">cuộc gọi</span></span>
      </div>`).join("");
  }

  /* ---------- Ext table ---------- */
  const GLOBAL_MAX = Math.max(...D.USERS.map((u) => u.total));
  function uvRowHtml(u, i) {
    const barW = Math.max(6, Math.round((u.total / GLOBAL_MAX) * 100));
    const odooPct = u.total ? (u.odoo / u.total) * 100 : 0;
    const sel = selectedUser === u.ext ? " is-selected" : "";
    return `<tr class="${sel}">
      <td class="uv-rank">${i + 1}</td>
      <td><span class="uv-ext" data-ext="${esc(u.ext)}">${esc(u.ext)}</span></td>
      <td><span class="uv-email" data-ext="${esc(u.ext)}">${esc(u.email)}</span></td>
      <td class="num"><span class="uv-num-total">${nfmt(u.total)}</span></td>
      <td class="num"><span class="uv-num-odoo">${nfmt(u.odoo)}</span></td>
      <td class="col-bar"><span class="uv-bar" style="width:${barW}%" title="${nfmt(u.odoo)} từ Odoo · ${nfmt(u.total - u.odoo)} nguồn khác"><span class="uv-bar__odoo" style="width:${odooPct}%"></span><span class="uv-bar__rest" style="width:${100 - odooPct}%"></span></span></td>
    </tr>`;
  }
  function filteredUsers() {
    const qs = [$("#uvFilter").value, $("#emailFilter").value].map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (!qs.length) return D.USERS;
    return D.USERS.filter((u) => qs.every((q) => u.ext.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)));
  }
  function renderUvTable() {
    const rows = filteredUsers();
    const shown = rows.slice(0, 7);
    $("#uvBody").innerHTML = shown.length ? shown.map(uvRowHtml).join("")
      : `<tr><td colspan="6" class="uv-empty">Không có Ext/Email nào khớp bộ lọc</td></tr>`;
    const q = $("#uvFilter").value.trim() || $("#emailFilter").value.trim();
    $("#uvFoot").textContent = q
      ? `Hiển thị ${Math.min(7, rows.length)} / ${rows.length} Ext khớp · tổng ${D.USERS.length} Ext trong dữ liệu`
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

  /* ---------- User select (auto-fill) ---------- */
  function selectUser(ext) {
    const u = D.byExt[ext]; if (!u) return;
    selectedUser = ext;
    $("#emailFilter").value = u.email;
    const banner = $("#userBanner");
    banner.hidden = false;
    $("#ubName").textContent = u.name;
    $("#ubEmail").textContent = u.email;
    $("#ubExt").textContent = "Ext. " + u.ext;
    closeModal();
    activateTab("overview");
    paintDonuts(); renderChart(); renderUvTable();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function clearUser() {
    selectedUser = null;
    $("#userBanner").hidden = true;
    $("#emailFilter").value = "";
    $("#uvFilter").value = "";
    paintDonuts(); renderChart(); renderUvTable();
  }

  /* ---------- Heatmap 24h ---------- */
  const HEAT_COLORS = { all: [234, 88, 12], answered: [79, 70, 229], unanswered: [100, 116, 139] };
  function cellValue(c) { return heatStatus === "answered" ? c.answered : heatStatus === "unanswered" ? c.unanswered : c.answered + c.unanswered; }
  function renderHeatmap() {
    const hm = D.HEATMAP;
    const [cr, cg, cb] = HEAT_COLORS[heatStatus] || HEAT_COLORS.all;
    let max = 0; hm.rows.forEach((r) => r.cells.forEach((c) => { max = Math.max(max, cellValue(c)); }));
    max = Math.max(1, max);
    const parts = [`<div class="heat-colhead"></div>`];
    hm.cols.forEach((h) => parts.push(`<div class="heat-colhead">${h}h</div>`));
    hm.rows.forEach((row) => {
      parts.push(`<div class="heat-rowlabel">${row.label}</div>`);
      row.cells.forEach((c) => {
        const v = cellValue(c); const t = v / max;
        const alpha = v === 0 ? 0.04 : 0.1 + t * 0.78;
        const color = t > 0.62 ? "#fff" : "#12142f";
        parts.push(`<div class="heat-cell" title="${v} cuộc gọi" style="background:rgba(${cr},${cg},${cb},${alpha.toFixed(3)});color:${color}">${v || ""}</div>`);
      });
    });
    $("#heatmap").innerHTML = parts.join("");
  }

  /* ---------- Calls list ---------- */
  let callsPage = 1;
  function filteredCalls() {
    const q = ($("#callSearch").value || "").trim().toLowerCase();
    const bu = $("#callBu").value;
    return D.CALLS.filter((c) => {
      if (bu !== "all" && c.bu !== bu) return false;
      if (q && !(c.id.toLowerCase().includes(q) || c.from.toLowerCase().includes(q) || c.to.toLowerCase().includes(q))) return false;
      return true;
    });
  }
  function callRowHtml(c) {
    const cls = c.dir === "Outbound" ? "chip--out" : "chip--in";
    const rec = c.rec
      ? `<span class="rec-link"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/></svg>Nghe ghi âm</span>`
      : `<span class="rec-none">Chưa có</span>`;
    return `<tr>
      <td><span class="call-id">${esc(c.id)}</span></td>
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
    const start = (callsPage - 1) * per;
    const slice = rows.slice(start, start + per);
    $("#callsBody").innerHTML = slice.length ? slice.map(callRowHtml).join("")
      : `<tr><td colspan="9" class="uv-empty">Không có cuộc gọi nào khớp bộ lọc</td></tr>`;
    const from = rows.length ? start + 1 : 0;
    const to = start + slice.length;
    $("#callsCount").textContent = `Hiển thị ${from}–${to} trên ${nfmt(rows.length)} cuộc gọi`;
    $("#callsPageInfo").textContent = `Trang ${callsPage} / ${pages}`;
    $("#callsPrev").disabled = callsPage <= 1;
    $("#callsNext").disabled = callsPage >= pages;
  }

  /* ---------- Tabs ---------- */
  function activateTab(name) {
    $$("#tabs .tab").forEach((b) => b.classList.toggle("is-active", b.dataset.tab === name));
    $$("[data-pane]").forEach((p) => { p.hidden = p.getAttribute("data-pane") !== name; });
    if (name === "calls") renderCalls();
  }

  /* ---------- Init ---------- */
  function init() {
    paintDonuts();
    renderChart();
    renderTop5("#top5Caller", D.TOP5_CALLER, "Caller");
    renderTop5("#top5Callee", D.TOP5_CALLEE, "Callee");
    renderUvTable();
    renderHeatmap();
    renderCalls();

    // Tabs (+ deep link ?tab=calls)
    $("#tabs").addEventListener("click", (e) => { const b = e.target.closest(".tab"); if (b) activateTab(b.dataset.tab); });
    try { if (new URLSearchParams(location.search).get("tab") === "calls") activateTab("calls"); } catch (e) {}

    // Range + heatmap status
    $("#rangeToggle").addEventListener("click", (e) => { const b = e.target.closest("button[data-range]"); if (!b) return; curRange = b.dataset.range; $$("#rangeToggle button").forEach((x) => x.classList.toggle("is-active", x === b)); renderChart(); });
    $("#heatStatus").addEventListener("click", (e) => { const b = e.target.closest("button[data-status]"); if (!b) return; heatStatus = b.dataset.status; $$("#heatStatus button").forEach((x) => x.classList.toggle("is-active", x === b)); renderHeatmap(); });

    // Ext table + email filter + user select
    $("#uvFilter").addEventListener("input", renderUvTable);
    $("#emailFilter").addEventListener("input", () => { if (!$("#emailFilter").value.trim() && selectedUser) clearUser(); else { if (selectedUser) { selectedUser = null; $("#userBanner").hidden = true; paintDonuts(); renderChart(); } renderUvTable(); } });
    $("#ovReset").addEventListener("click", clearUser);
    $("#ubClear").addEventListener("click", clearUser);
    document.addEventListener("click", (e) => {
      const el = e.target.closest("[data-ext]");
      if (el) { selectUser(el.getAttribute("data-ext")); }
    });

    // Modal
    $("#uvDetailBtn").addEventListener("click", openModal);
    $("#uvModalClose").addEventListener("click", closeModal);
    $("#uvModal").addEventListener("click", (e) => { if (e.target.id === "uvModal") closeModal(); });
    $("#uvModalFilter").addEventListener("input", renderModalTable);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

    // Calls filters + pagination
    $("#callSearch").addEventListener("input", () => { callsPage = 1; renderCalls(); });
    $("#callBu").addEventListener("change", () => { callsPage = 1; renderCalls(); });
    $("#callsPerPage").addEventListener("change", () => { callsPage = 1; renderCalls(); });
    $("#callReset").addEventListener("click", () => { $("#callSearch").value = ""; $("#callBu").value = "all"; callsPage = 1; renderCalls(); });
    $("#callsPrev").addEventListener("click", () => { if (callsPage > 1) { callsPage--; renderCalls(); } });
    $("#callsNext").addEventListener("click", () => { callsPage++; renderCalls(); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
