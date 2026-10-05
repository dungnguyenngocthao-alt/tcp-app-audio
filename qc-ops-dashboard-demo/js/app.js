/* =============================================================================
   QC-Ops dashboard demo — rendering + interactions
   ============================================================================= */
(function () {
  "use strict";
  const D = window.DEMO_DATA;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const nfmt = (n) => n.toLocaleString("vi-VN"); // 11.087 style

  /* ---- Donut rings (conic-gradient, matches live) ---- */
  function conic(stops) {
    // stops: [[cssColor, pct], ...] cumulative percentages
    const parts = [];
    let prev = 0;
    stops.forEach(([color, pct]) => { parts.push(`${color} ${prev}%`, `${color} ${pct}%`); prev = pct; });
    return `conic-gradient(${parts.join(", ")})`;
  }
  function paintDonuts() {
    const io = D.OVERVIEW;
    $("#ioRing").style.background = conic([
      ["#f97316", io.inboundPct],
      ["#16a34a", 100],
    ]);
    const bu = io.bu;
    $("#buRing").style.background = conic([
      ["#6b2ec6", bu.pso],
      ["#4f46e5", bu.pso + bu.tcp],
      ["#94a3b8", 100],
    ]);
  }

  /* ---- Bar chart (current-week, near-empty like live) ---- */
  function renderChart() {
    const el = $("#chart");
    const s = D.OVERVIEW.series;
    const max = Math.max(1, ...s.map((d) => Math.max(d.in, d.out)));
    el.innerHTML = D.OVERVIEW.rangeDays.map((day, i) => {
      const d = s[i];
      const hIn = Math.max(5, Math.round((d.in / max) * 170));
      const hOut = Math.max(5, Math.round((d.out / max) * 170));
      return `<div class="chart__col">
        <div class="chart__bars">
          <div class="chart__bar chart__bar--in" style="height:${hIn}px"></div>
          <div class="chart__bar chart__bar--out" style="height:${hOut}px"></div>
        </div>
        <div class="chart__x">${day}</div>
      </div>`;
    }).join("");
  }

  /* ---- Top-5 lists ---- */
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

  /* ---- NEW BLOCK: User-ID call volume table ---- */
  const GLOBAL_MAX = Math.max(...D.USERS.map((u) => u.total));
  const TYPE_LABEL = { caller: "Caller", callee: "Callee", both: "Cả hai" };
  function uvRowHtml(u, i) {
    const barW = Math.max(6, Math.round((u.total / GLOBAL_MAX) * 100));
    const odooPct = u.total ? (u.odoo / u.total) * 100 : 0;
    return `<tr>
      <td class="uv-rank">${i + 1}</td>
      <td><span class="uv-id">${esc(u.id)}</span></td>
      <td><span class="tag tag--${u.type}">${TYPE_LABEL[u.type]}</span></td>
      <td>
        <div class="uv-bar-cell">
          <span class="uv-bar" style="width:${barW}%" title="${nfmt(u.odoo)} từ Odoo · ${nfmt(u.total - u.odoo)} nguồn khác">
            <span class="uv-bar__odoo" style="width:${odooPct}%"></span>
            <span class="uv-bar__rest" style="width:${100 - odooPct}%"></span>
          </span>
          <span class="uv-nums"><span class="uv-total">${nfmt(u.total)}</span><span class="uv-sub">${nfmt(u.odoo)} Odoo</span></span>
        </div>
      </td>
    </tr>`;
  }
  function renderUvTable(filter) {
    const q = (filter || "").trim().toLowerCase();
    let rows = D.USERS;
    if (q) rows = rows.filter((u) => u.id.toLowerCase().includes(q));
    const shown = rows.slice(0, 15);
    const body = $("#uvBody");
    body.innerHTML = shown.length
      ? shown.map(uvRowHtml).join("")
      : `<tr><td colspan="4" class="uv-empty">Không có User ID nào khớp "${esc(filter)}"</td></tr>`;
    $("#uvFoot").textContent = q
      ? `Hiển thị ${Math.min(15, rows.length)} / ${rows.length} User ID khớp · tổng ${D.USERS.length} ID trong dữ liệu`
      : `Hiển thị Top 15 / ${D.USERS.length} User ID có nhiều cuộc gọi nhất`;
  }

  /* ---- Modal: all user IDs ---- */
  function renderModalTable() {
    const q = ($("#uvModalFilter").value || "").trim().toLowerCase();
    const type = $("#uvModalType").value;
    let rows = D.USERS;
    if (type !== "all") rows = rows.filter((u) => u.type === type);
    if (q) rows = rows.filter((u) => u.id.toLowerCase().includes(q));
    $("#uvModalBody").innerHTML = rows.length
      ? rows.map(uvRowHtml).join("")
      : `<tr><td colspan="4" class="uv-empty">Không có kết quả</td></tr>`;
    $("#uvModalSub").textContent = `${rows.length} / ${D.USERS.length} User ID`;
  }
  function openModal() { $("#uvModal").classList.add("is-open"); document.body.style.overflow = "hidden"; renderModalTable(); setTimeout(() => $("#uvModalFilter").focus(), 30); }
  function closeModal() { $("#uvModal").classList.remove("is-open"); document.body.style.overflow = ""; }

  /* ---- Heatmap (with status filter) ---- */
  let heatStatus = "all";
  function cellValue(c) {
    if (heatStatus === "answered") return c.answered;
    if (heatStatus === "unanswered") return c.unanswered;
    return c.answered + c.unanswered;
  }
  function renderHeatmap() {
    const hm = D.HEATMAP;
    let max = 0;
    hm.rows.forEach((r) => r.cells.forEach((c) => { max = Math.max(max, cellValue(c)); }));
    max = Math.max(1, max);
    const parts = [];
    parts.push(`<div class="heat-colhead"></div>`);
    hm.cols.forEach((c) => parts.push(`<div class="heat-colhead">${c}</div>`));
    hm.rows.forEach((row) => {
      parts.push(`<div class="heat-rowlabel">${row.label}</div>`);
      row.cells.forEach((c) => {
        const v = cellValue(c);
        const t = v / max;                       // 0..1 intensity
        const alpha = v === 0 ? 0.04 : 0.1 + t * 0.78;
        const color = t > 0.62 ? "#fff" : "#12142f";
        parts.push(`<div class="heat-cell" style="background:rgba(37,99,235,${alpha.toFixed(3)});color:${color}">${v}</div>`);
      });
    });
    $("#heatmap").innerHTML = parts.join("");
  }

  /* ---- Overview static-ish fills ---- */
  function renderOverview() {
    $("#statUploaded").textContent = nfmt(D.OVERVIEW.uploaded);
    $("#statAvg").textContent = D.OVERVIEW.avgDuration;
    paintDonuts();
    renderChart();
    renderTop5("#top5Caller", D.TOP5_CALLER, "Caller id:");
    renderTop5("#top5Callee", D.TOP5_CALLEE, "Callee id:");
  }

  /* ---- Wire up ---- */
  function init() {
    renderOverview();
    renderUvTable("");
    renderHeatmap();

    $("#uvFilter").addEventListener("input", (e) => renderUvTable(e.target.value));
    $("#uvDetailBtn").addEventListener("click", openModal);
    $("#uvModalClose").addEventListener("click", closeModal);
    $("#uvModal").addEventListener("click", (e) => { if (e.target.id === "uvModal") closeModal(); });
    $("#uvModalFilter").addEventListener("input", renderModalTable);
    $("#uvModalType").addEventListener("change", renderModalTable);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

    $("#heatStatus").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-status]");
      if (!btn) return;
      heatStatus = btn.dataset.status;
      $$("#heatStatus button").forEach((b) => b.classList.toggle("is-active", b === btn));
      renderHeatmap();
    });

    // tabs + range toggles: visual-only active state switch
    $$(".tabs .tab, .range-toggle button").forEach((b) => {
      b.addEventListener("click", () => {
        const sibs = b.parentElement.children;
        Array.from(sibs).forEach((s) => s.classList.remove("is-active"));
        b.classList.add("is-active");
      });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
