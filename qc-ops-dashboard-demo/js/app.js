/* =============================================================================
   QC-Ops dashboard demo — rendering + interactions
   ============================================================================= */
(function () {
  "use strict";
  const D = window.DEMO_DATA;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const nfmt = (n) => n.toLocaleString("vi-VN");

  /* ---- Donuts ---- */
  function conic(stops) {
    const parts = []; let prev = 0;
    stops.forEach(([color, pct]) => { parts.push(`${color} ${prev}%`, `${color} ${pct}%`); prev = pct; });
    return `conic-gradient(${parts.join(", ")})`;
  }
  function paintDonuts() {
    const io = D.OVERVIEW;
    $("#ioRing").style.background = conic([["#f97316", io.inboundPct], ["#16a34a", 100]]);
    const bu = io.bu;
    $("#buRing").style.background = conic([["#6b2ec6", bu.pso], ["#4f46e5", bu.pso + bu.tcp], ["#94a3b8", 100]]);
  }

  /* ---- Bar chart (7 ngày / 30 ngày / 12 tháng) ---- */
  let curRange = "7d";
  function renderChart() {
    const c = D.CHART[curRange];
    const n = c.series.length;
    const max = Math.max(1, ...c.series.reduce((a, s) => a.concat(s.in, s.out), []));
    const barW = n <= 7 ? 13 : n <= 12 ? 11 : 6;
    const labelEvery = n <= 12 ? 1 : 5;
    $("#chart").innerHTML = c.series.map((s, i) => {
      const hIn = Math.max(3, Math.round((s.in / max) * 170));
      const hOut = Math.max(3, Math.round((s.out / max) * 170));
      const showLabel = i % labelEvery === 0 || i === n - 1;
      return `<div class="chart__col" title="${c.labels[i]} · Inbound ${s.in} · Outbound ${s.out}">
        <div class="chart__bars">
          <div class="chart__bar chart__bar--in" style="width:${barW}px;height:${hIn}px"></div>
          <div class="chart__bar chart__bar--out" style="width:${barW}px;height:${hOut}px"></div>
        </div>
        <div class="chart__x">${showLabel ? c.labels[i] : ""}</div>
      </div>`;
    }).join("");

    const total = c.series.reduce((a, s) => a + s.in + s.out, 0);
    $("#statUploaded").textContent = nfmt(total);
    $("#statAvg").textContent = c.avg;
    const delta = curRange === "7d" ? 12.4 : curRange === "30d" ? 8.1 : 15.6;
    $("#statDelta").innerHTML = `<span class="up">▲ +${delta}%</span><span class="note">so với kỳ trước</span>`;
  }

  /* ---- Top-5 ---- */
  function renderTop5(elId, rows, label) {
    const max = Math.max(...rows.map((r) => r.calls));
    $(elId).innerHTML = rows.map((r, i) => `
      <div class="top5__row">
        <span class="top5__rank">${i + 1}</span>
        <span class="top5__label">${label} <span class="top5__id">${esc(r.id)}</span></span>
        <span class="top5__bar"><span class="top5__fill top5__fill--${r.bu}" style="width:${Math.round((r.calls / max) * 100)}%"></span></span>
        <span><span class="top5__count">${nfmt(r.calls)}</span><span class="top5__unit">cuộc gọi</span></span>
      </div>`).join("");
  }

  /* ---- User-ID block ---- */
  const GLOBAL_MAX = Math.max(...D.USERS.map((u) => u.total));
  function uvRowHtml(u, i) {
    const barW = Math.max(6, Math.round((u.total / GLOBAL_MAX) * 100));
    const odooPct = u.total ? (u.odoo / u.total) * 100 : 0;
    return `<tr>
      <td class="uv-rank">${i + 1}</td>
      <td><span class="uv-id">${esc(u.id)}</span></td>
      <td class="num"><span class="uv-num-total">${nfmt(u.total)}</span></td>
      <td class="num"><span class="uv-num-odoo">${nfmt(u.odoo)}</span></td>
      <td class="col-bar">
        <span class="uv-bar" style="width:${barW}%" title="${nfmt(u.odoo)} từ Odoo · ${nfmt(u.total - u.odoo)} nguồn khác">
          <span class="uv-bar__odoo" style="width:${odooPct}%"></span>
          <span class="uv-bar__rest" style="width:${100 - odooPct}%"></span>
        </span>
      </td>
    </tr>`;
  }
  function renderUvTable(filter) {
    const q = (filter || "").trim().toLowerCase();
    let rows = D.USERS;
    if (q) rows = rows.filter((u) => u.id.toLowerCase().includes(q));
    const shown = rows.slice(0, 7);
    $("#uvBody").innerHTML = shown.length ? shown.map(uvRowHtml).join("")
      : `<tr><td colspan="5" class="uv-empty">Không có User ID nào khớp "${esc(filter)}"</td></tr>`;
    $("#uvFoot").textContent = q
      ? `Hiển thị ${Math.min(7, rows.length)} / ${rows.length} User ID khớp · tổng ${D.USERS.length} ID trong dữ liệu`
      : `Hiển thị Top 7 / ${D.USERS.length} User ID có nhiều cuộc gọi nhất`;
  }

  /* ---- Modal ---- */
  function renderModalTable() {
    const q = ($("#uvModalFilter").value || "").trim().toLowerCase();
    let rows = D.USERS;
    if (q) rows = rows.filter((u) => u.id.toLowerCase().includes(q));
    $("#uvModalBody").innerHTML = rows.length ? rows.map(uvRowHtml).join("")
      : `<tr><td colspan="5" class="uv-empty">Không có kết quả</td></tr>`;
    $("#uvModalSub").textContent = `${rows.length} / ${D.USERS.length} User ID`;
  }
  function openModal() { $("#uvModal").classList.add("is-open"); document.body.style.overflow = "hidden"; renderModalTable(); setTimeout(() => $("#uvModalFilter").focus(), 30); }
  function closeModal() { $("#uvModal").classList.remove("is-open"); document.body.style.overflow = ""; }

  /* ---- Heatmap (status filter + per-status colour) ---- */
  let heatStatus = "all";
  const HEAT_COLORS = {
    all: [234, 88, 12],          // cam đỏ
    answered: [79, 70, 229],     // xanh tím
    unanswered: [100, 116, 139], // xám (giữ nguyên)
  };
  function cellValue(c) {
    if (heatStatus === "answered") return c.answered;
    if (heatStatus === "unanswered") return c.unanswered;
    return c.answered + c.unanswered;
  }
  function renderHeatmap() {
    const hm = D.HEATMAP;
    const [cr, cg, cb] = HEAT_COLORS[heatStatus] || HEAT_COLORS.all;
    let max = 0;
    hm.rows.forEach((r) => r.cells.forEach((c) => { max = Math.max(max, cellValue(c)); }));
    max = Math.max(1, max);
    const parts = [`<div class="heat-colhead"></div>`];
    hm.cols.forEach((c) => parts.push(`<div class="heat-colhead">${c}</div>`));
    hm.rows.forEach((row) => {
      parts.push(`<div class="heat-rowlabel">${row.label}</div>`);
      row.cells.forEach((c) => {
        const v = cellValue(c);
        const t = v / max;
        const alpha = v === 0 ? 0.04 : 0.1 + t * 0.78;
        const color = t > 0.62 ? "#fff" : "#12142f";
        parts.push(`<div class="heat-cell" style="background:rgba(${cr},${cg},${cb},${alpha.toFixed(3)});color:${color}">${v}</div>`);
      });
    });
    $("#heatmap").innerHTML = parts.join("");
  }

  /* ---- Sidebar interactions ---- */
  function isMobile() { return window.matchMedia("(max-width: 860px)").matches; }
  function initSidebar() {
    const app = $("#app");
    $("#sbTrigger").addEventListener("click", () => {
      if (isMobile()) app.classList.toggle("sb-mobile-open");
      else app.classList.toggle("sb-collapsed");
    });
    $("#sbBackdrop").addEventListener("click", () => app.classList.remove("sb-mobile-open"));
    $$(".sb-collapsible-trigger").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (app.classList.contains("sb-collapsed") && !isMobile()) { app.classList.remove("sb-collapsed"); return; }
        const item = btn.closest(".sb-menu-item");
        const open = !item.classList.contains("is-open");
        item.classList.toggle("is-open", open);
        item.setAttribute("data-state", open ? "open" : "closed");
      });
    });
    // mark active nav item on click (within a menu)
    $$(".sb-menu-button:not(.sb-collapsible-trigger)").forEach((a) => {
      a.addEventListener("click", (e) => {
        if (a.getAttribute("href") === "#") e.preventDefault();
        $$(".sb-menu-button").forEach((x) => x.classList.remove("is-active"));
        a.classList.add("is-active");
        if (isMobile()) app.classList.remove("sb-mobile-open");
      });
    });
  }

  /* ---- Init ---- */
  function init() {
    $("#statUploaded"); // ensure DOM ready
    paintDonuts();
    renderChart();
    renderTop5("#top5Caller", D.TOP5_CALLER, "Caller id:");
    renderTop5("#top5Callee", D.TOP5_CALLEE, "Callee id:");
    renderUvTable("");
    renderHeatmap();
    initSidebar();

    $("#rangeToggle").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-range]");
      if (!btn) return;
      curRange = btn.dataset.range;
      $$("#rangeToggle button").forEach((b) => b.classList.toggle("is-active", b === btn));
      renderChart();
    });
    $("#heatStatus").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-status]");
      if (!btn) return;
      heatStatus = btn.dataset.status;
      $$("#heatStatus button").forEach((b) => b.classList.toggle("is-active", b === btn));
      renderHeatmap();
    });

    $("#uvFilter").addEventListener("input", (e) => renderUvTable(e.target.value));
    $("#uvDetailBtn").addEventListener("click", openModal);
    $("#uvModalClose").addEventListener("click", closeModal);
    $("#uvModal").addEventListener("click", (e) => { if (e.target.id === "uvModal") closeModal(); });
    $("#uvModalFilter").addEventListener("input", renderModalTable);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

    // tabs visual-only
    $$(".tabs .tab").forEach((b) => b.addEventListener("click", () => {
      $$(".tabs .tab").forEach((s) => s.classList.remove("is-active")); b.classList.add("is-active");
    }));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
