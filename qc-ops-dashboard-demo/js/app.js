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

  // shared multi-select filter — selecting a value adds a pill and filters live.
  let selEmails = [], selExts = [];
  // shared date range (yyyy-mm-dd from the <input type=date>), applies to calls.
  let selFrom = "", selTo = "";
  // the Xuất báo cáo dialog keeps its own selection (same combo/pill UI).
  let exEmails = [], exExts = [];

  // call.time looks like "14:12 29/9/26" → a Date (year 2000+yy)
  function callDate(c) {
    const m = String(c.time).match(/(\d{1,2}):(\d{2})\s+(\d{1,2})\/(\d{1,2})\/(\d{2})/);
    if (!m) return null;
    return new Date(2000 + +m[5], +m[4] - 1, +m[3], +m[1], +m[2]);
  }
  function inRange(c, from, to) {
    if (!from && !to) return true;
    const d = callDate(c);
    if (!d) return true;
    if (from && d < new Date(from + "T00:00:00")) return false;
    if (to && d > new Date(to + "T23:59:59")) return false;
    return true;
  }
  let curRange = "7d";
  let heatStatus = "all";
  let callsPage = 1;

  const extOf = (c) => (c.dir === "Outbound" ? c.from : c.to);
  const emailOf = (c) => (D.byExt[extOf(c)] ? D.byExt[extOf(c)].email : "—");

  const filterActive = () => selEmails.length > 0 || selExts.length > 0;
  const dateActive = () => !!(selFrom || selTo);
  const dashFiltered = () => filterActive() || dateActive();
  // the user set, scoped by the date range (if any) then the email/ext pills
  function matchedUsers() {
    let us = dateActive() ? D.usersInRange(selFrom, selTo) : D.USERS;
    if (filterActive()) us = us.filter((u) => selEmails.includes(u.email) || selExts.includes(u.ext));
    return us;
  }
  const userSelected = (u) => selEmails.includes(u.email) || selExts.includes(u.ext);

  /* ---------- Donuts ---------- */
  function conic(stops) { const p = []; let prev = 0; stops.forEach(([c, x]) => { p.push(`${c} ${prev}%`, `${c} ${x}%`); prev = x; }); return `conic-gradient(${p.join(", ")})`; }
  function paintDonuts() {
    if (dashFiltered()) {
      const us = matchedUsers();
      const total = us.reduce((a, u) => a + u.total, 0);
      const inb = us.reduce((a, u) => a + u.inbound, 0);
      const inPct = total ? Math.round((inb / total) * 100) : 0;
      $("#ioRing").style.background = conic([["#f97316", inPct], ["#16a34a", 100]]);
      $("#ioNum").textContent = nfmt(total);
      $("#ioInPct").textContent = inPct + "%"; $("#ioOutPct").textContent = (100 - inPct) + "%";
      const bt = { pso: 0, tcp: 0, unknown: 0 };
      us.forEach((u) => { bt[u.bu] += u.total; });
      const pso = total ? Math.round((bt.pso / total) * 100) : 0;
      const tcp = total ? Math.round((bt.tcp / total) * 100) : 0;
      const unk = Math.max(0, 100 - pso - tcp);
      $("#buRing").style.background = conic([["#6b2ec6", pso], ["#4f46e5", pso + tcp], ["#94a3b8", 100]]);
      $("#buNum").textContent = nfmt(total);
      $("#buLegend").innerHTML =
        `<span class="legend__item"><span class="dot dot--pso"></span>PSO <b class="legend__pct">${pso}%</b></span>` +
        `<span class="legend__item"><span class="dot dot--tcp"></span>TCP <b class="legend__pct">${tcp}%</b></span>` +
        `<span class="legend__item"><span class="dot dot--unk"></span>Chưa rõ <b class="legend__pct">${unk}%</b></span>`;
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

  /* ---------- Chart (line: inbound + outbound) ---------- */
  function renderChart() {
    const c = D.CHART[curRange], n = c.series.length;
    const el = $("#chart");
    const W = Math.max(260, Math.round(el.clientWidth) || 640), H = 196;
    const padX = 16, padT = 14, padB = 24;
    const plotH = H - padT - padB, plotBottom = padT + plotH;
    const maxV = Math.max(1, ...c.series.map((s) => Math.max(s.in, s.out)));
    const xAt = (i) => (n <= 1 ? W / 2 : padX + (i / (n - 1)) * (W - 2 * padX));
    const yAt = (v) => padT + plotH - (v / maxV) * plotH;
    const line = (key) => c.series.map((s, i) => `${i ? "L" : "M"}${xAt(i).toFixed(1)} ${yAt(s[key]).toFixed(1)}`).join(" ");
    const dots = (key, cls) => (n <= 12 ? c.series.map((s, i) => `<circle class="${cls}" cx="${xAt(i).toFixed(1)}" cy="${yAt(s[key]).toFixed(1)}" r="3"><title>${c.labels[i]} · ${s[key]}</title></circle>`).join("") : "");
    const grid = [0.5, 1].map((f) => `<line class="chart__grid" x1="${padX}" y1="${(plotBottom - f * plotH).toFixed(1)}" x2="${W - padX}" y2="${(plotBottom - f * plotH).toFixed(1)}"/>`).join("");
    const labelEvery = n <= 12 ? 1 : 5;
    const labels = c.series.map((s, i) => ((i % labelEvery === 0 || i === n - 1)
      ? `<text class="chart__xlabel" x="${xAt(i).toFixed(1)}" y="${H - 7}" text-anchor="middle">${c.labels[i]}</text>` : "")).join("");
    el.innerHTML =
      `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Inbound / Outbound theo thời gian">
        ${grid}
        <line class="chart__axis" x1="${padX}" y1="${plotBottom}" x2="${W - padX}" y2="${plotBottom}"/>
        <path class="chart__line chart__line--out" d="${line("out")}"/>
        <path class="chart__line chart__line--in" d="${line("in")}"/>
        ${dots("out", "chart__dot chart__dot--out")}
        ${dots("in", "chart__dot chart__dot--in")}
        ${labels}
      </svg>`;
    if (dashFiltered()) {
      const us = matchedUsers();
      const total = us.reduce((a, u) => a + u.total, 0);
      $("#statUploaded").textContent = nfmt(total);
      $("#statAvg").textContent = c.avg;
      const lbl = filterActive() && us.length === 1 ? ("Ext. " + esc(us[0].ext))
        : filterActive() ? (us.length + " Ext đã chọn") : "Theo khoảng ngày";
      $("#statDelta").innerHTML = `<span class="note">${lbl}</span>`;
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
    $(elId).innerHTML = rows.length
      ? rows.map((r, i) => `
      <div class="top5__row">
        <span class="top5__rank">${i + 1}</span>
        <span class="top5__email" data-email="${esc(r.email)}" title="${esc(r.email)} · Ext. ${esc(r.ext)}">${esc(r.email)}</span>
        <span class="top5__right"><span class="top5__count">${nfmt(r.calls)}</span><span class="top5__unit">cuộc gọi</span></span>
      </div>`).join("")
      : `<div class="top5__empty">Không có dữ liệu khớp bộ lọc</div>`;
  }
  // caller → outbound calls, callee → inbound calls. With no filter use the
  // production Top-5 lists; with a filter, derive from the matching Ext users.
  function topRows(kind) {
    if (!dashFiltered()) return kind === "caller" ? D.TOP5_CALLER : D.TOP5_CALLEE;
    const key = kind === "caller" ? "outbound" : "inbound";
    return matchedUsers()
      .map((u) => ({ ext: u.ext, email: u.email, calls: u[key], bu: u.bu }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 5);
  }
  function renderTop5All() {
    renderTop5("#top5Caller", topRows("caller"));
    renderTop5("#top5Callee", topRows("callee"));
  }

  /* ---------- Ext table (% Odoo bar, equal length) ---------- */
  function uvRowHtml(u, i, highlight) {
    const pct = u.total ? Math.round((u.odoo / u.total) * 100) : 0;
    const sel = highlight && userSelected(u) ? " is-selected" : "";
    return `<tr class="${sel}">
      <td class="uv-rank">${i + 1}</td>
      <td><span class="uv-email" data-email="${esc(u.email)}">${esc(u.email)}</span></td>
      <td><span class="uv-ext" data-ext="${esc(u.ext)}">${esc(u.ext)}</span></td>
      <td class="num"><span class="uv-num-total">${nfmt(u.total)}</span></td>
      <td class="num"><span class="uv-num-in">${nfmt(u.inbound)}</span></td>
      <td class="num"><span class="uv-num-out">${nfmt(u.outbound)}</span></td>
      <td class="num"><span class="uv-num-odoo">${nfmt(u.odoo)}</span></td>
      <td class="col-bar"><div class="pct-cell"><span class="pct-bar"><span class="pct-bar__fill" style="width:${pct}%"></span></span><span class="pct-val">${pct}%</span></div></td>
    </tr>`;
  }
  function renderUvTable() {
    const all = matchedUsers().slice().sort((a, b) => b.total - a.total);
    // with an email/ext filter, show exactly the filtered Ext (no Top-7 cap)
    const rows = filterActive() ? all : all.slice(0, 7);
    $("#uvBody").innerHTML = rows.length ? rows.map((u, i) => uvRowHtml(u, i, false)).join("")
      : `<tr><td colspan="8" class="uv-empty">Không có Ext/Email nào khớp bộ lọc</td></tr>`;
    $("#uvFoot").textContent = filterActive()
      ? `Hiển thị ${rows.length} Ext khớp bộ lọc · tổng ${D.USERS.length} Ext`
      : `Hiển thị Top 7 / ${D.USERS.length} Ext có nhiều cuộc gọi nhất`;
  }

  /* ---------- Modal ---------- */
  function renderModalTable() {
    const q = ($("#uvModalFilter").value || "").trim().toLowerCase();
    let rows = (dateActive() ? D.usersInRange(selFrom, selTo) : D.USERS).slice().sort((a, b) => b.total - a.total);
    if (q) rows = rows.filter((u) => u.ext.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q));
    $("#uvModalBody").innerHTML = rows.length ? rows.map((u, i) => uvRowHtml(u, i, true)).join("") : `<tr><td colspan="8" class="uv-empty">Không có kết quả</td></tr>`;
    $("#uvModalSub").textContent = `${rows.length} / ${D.USERS.length} Ext`;
  }

  /* ---------- Export report (CSV) ---------- */
  function openExport() {
    $("#exportUseFilter").checked = filterActive();
    toggleExportFields();
    exEmails.length = 0; exExts.length = 0; renderPills("export");
    $("#exEmail").value = ""; $("#exExt").value = ""; $("#exBu").value = "all";
    $("#exFrom").value = ""; $("#exTo").value = "";
    $("#exportModal").classList.add("is-open"); document.body.style.overflow = "hidden";
  }
  function closeExport() { closeMenu(); $("#exportModal").classList.remove("is-open"); document.body.style.overflow = ""; }
  function toggleExportFields() { $("#exportFields").classList.toggle("is-disabled", $("#exportUseFilter").checked); }
  function exportRows() {
    if ($("#exportUseFilter").checked) {
      return D.CALLS.filter((c) => inRange(c, selFrom, selTo) &&
        (!filterActive() || selExts.includes(extOf(c)) || selEmails.includes(emailOf(c))));
    }
    const bu = $("#exBu").value;
    const from = $("#exFrom").value, to = $("#exTo").value;
    const useSel = exEmails.length > 0 || exExts.length > 0;
    return D.CALLS.filter((c) => {
      if (bu !== "all" && c.bu !== bu) return false;
      if (!inRange(c, from, to)) return false;
      if (useSel && !(exExts.includes(extOf(c)) || exEmails.includes(emailOf(c)))) return false;
      return true;
    });
  }
  function runExport() {
    const rows = exportRows();
    const cell = (v) => '"' + String(v).replace(/"/g, '""') + '"';
    const head = ["Thời gian", "Email", "Phân loại", "Gọi từ", "Gọi đến", "BU", "Thời lượng", "Ghi âm"];
    const lines = [head.map(cell).join(",")];
    rows.forEach((c) => lines.push([c.time, emailOf(c), c.dir, c.from, c.to, BU_LABEL[c.bu], c.dur, c.rec ? "Có" : "Chưa"].map(cell).join(",")));
    const csv = "﻿" + lines.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "bao-cao-cuoc-goi.csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    closeExport();
  }
  function openModal() { $("#uvModal").classList.add("is-open"); document.body.style.overflow = "hidden"; renderModalTable(); setTimeout(() => $("#uvModalFilter").focus(), 30); }
  function closeModal() { $("#uvModal").classList.remove("is-open"); document.body.style.overflow = ""; }

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
    const bu = $("#callBu").value;
    return D.CALLS.filter((c) => {
      if (bu !== "all" && c.bu !== bu) return false;
      if (!inRange(c, selFrom, selTo)) return false;
      if (filterActive() && !(selExts.includes(extOf(c)) || selEmails.includes(emailOf(c)))) return false;
      return true;
    });
  }
  function callRowHtml(c) {
    const cls = c.dir === "Outbound" ? "chip--out" : "chip--in";
    const rec = c.rec
      ? `<span class="rec-link"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/></svg>Nghe ghi âm</span>`
      : `<span class="rec-none">Chưa có</span>`;
    return `<tr>
      <td>${esc(c.time)}</td>
      <td><span class="call-email" data-email="${esc(emailOf(c))}">${esc(emailOf(c))}</span></td>
      <td><span class="chip ${cls}">${c.dir}</span></td>
      <td>${esc(c.from)}</td>
      <td>${esc(c.to)}</td>
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

  /* ---------- Filter: dropdown + pills (live) ---------- */
  function renderFiltered() {
    paintDonuts(); renderChart(); renderTop5All(); renderUvTable(); renderCalls();
  }
  // two combo scopes share the machinery: "filter" (live dashboard) + "export"
  // (the Xuất báo cáo dialog). Arrays are mutated in place, never reassigned.
  function storeFor(scope) { return scope === "export" ? { email: exEmails, ext: exExts } : { email: selEmails, ext: selExts }; }
  function arrFor(scope, type) { return storeFor(scope)[type]; }

  function resetFilter() {
    selEmails.length = 0; selExts.length = 0; selFrom = ""; selTo = "";
    $$('[data-filter]').forEach((i) => { if ((i.getAttribute("data-scope") || "filter") === "filter") i.value = ""; });
    $$('[data-date]').forEach((i) => (i.value = ""));
    closeMenu(); $("#callBu").value = "all";
    callsPage = 1; renderPills("filter"); renderFiltered();
  }

  const PILL_ICON = {
    email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
    ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 5h8"/><path d="M13 12h8"/><path d="M13 19h8"/><path d="m3 17 2 2 4-4"/><rect x="3" y="4" width="6" height="6" rx="1"/></svg>',
  };
  function pillHtml(scope, type, v) {
    const label = type === "ext" ? "Ext. " + v : v;
    return `<span class="fpill">${PILL_ICON[type]}<span class="fpill__t">${esc(label)}</span><button class="fpill__x" data-pill-remove data-scope="${scope}" data-type="${type}" data-val="${esc(v)}" aria-label="Bỏ">×</button></span>`;
  }
  function renderPills(scope) {
    const st = storeFor(scope);
    const items = st.email.map((v) => pillHtml(scope, "email", v)).concat(st.ext.map((v) => pillHtml(scope, "ext", v)));
    const has = items.length > 0;
    $$(`[data-pills="${scope}"]`).forEach((box) => { box.innerHTML = items.join(""); box.hidden = !has; });
  }
  function addPill(scope, type, value) {
    const arr = arrFor(scope, type);
    if (!arr.includes(value)) arr.push(value);
    renderPills(scope);
    if (scope === "filter") { callsPage = 1; renderFiltered(); }
  }
  function removePill(scope, type, value) {
    const arr = arrFor(scope, type), i = arr.indexOf(value);
    if (i >= 0) arr.splice(i, 1);
    renderPills(scope);
    if (scope === "filter") { callsPage = 1; renderFiltered(); }
  }

  /* dropdown suggestions (max 5, from the data in the system) */
  let openMenu = null, activeIdx = -1;
  function suggestFor(scope, type, q) {
    q = q.trim().toLowerCase();
    if (!q) return [];
    const chosen = arrFor(scope, type);
    if (type === "email") {
      return D.USERS.filter((u) => !chosen.includes(u.email) && u.email.toLowerCase().includes(q))
        .slice(0, 5).map((u) => ({ value: u.email, main: u.email, sub: "Ext. " + u.ext }));
    }
    return D.USERS.filter((u) => !chosen.includes(u.ext) && (u.ext.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)))
      .slice(0, 5).map((u) => ({ value: u.ext, main: "Ext. " + u.ext, sub: u.email }));
  }
  function closeMenu() {
    $$('[data-menu]').forEach((m) => { m.hidden = true; m.innerHTML = ""; });
    openMenu = null; activeIdx = -1;
  }
  function openFor(input) {
    const type = input.getAttribute("data-filter");
    const scope = input.getAttribute("data-scope") || "filter";
    const menu = input.parentElement.querySelector("[data-menu]");
    const items = suggestFor(scope, type, input.value);
    if (!items.length) { menu.hidden = true; menu.innerHTML = ""; if (openMenu === menu) openMenu = null; return; }
    menu.innerHTML = items.map((it, i) =>
      `<button type="button" class="combo__opt${i === 0 ? " is-active" : ""}" data-scope="${scope}" data-type="${type}" data-val="${esc(it.value)}"><span class="combo__main">${esc(it.main)}</span><span class="combo__sub">${esc(it.sub)}</span></button>`).join("");
    menu.hidden = false; openMenu = menu; activeIdx = 0;
  }
  function moveActive(d) {
    if (!openMenu) return;
    const opts = Array.from(openMenu.querySelectorAll(".combo__opt"));
    if (!opts.length) return;
    activeIdx = (activeIdx + d + opts.length) % opts.length;
    opts.forEach((o, i) => o.classList.toggle("is-active", i === activeIdx));
    opts[activeIdx].scrollIntoView({ block: "nearest" });
  }
  function commitActive(input) {
    if (!openMenu) return false;
    const opt = openMenu.querySelector(".combo__opt.is-active") || openMenu.querySelector(".combo__opt");
    if (!opt) return false;
    addPill(opt.getAttribute("data-scope"), opt.getAttribute("data-type"), opt.getAttribute("data-val"));
    input.value = ""; closeMenu();
    return true;
  }

  /* ---------- Tabs ---------- */
  function activateTab(name) {
    $$("#tabs .tab").forEach((b) => b.classList.toggle("is-active", b.dataset.tab === name));
    $$("[data-pane]").forEach((p) => { p.hidden = p.getAttribute("data-pane") !== name; });
    if (name === "calls") renderCalls();
    if (name === "overview") renderChart(); // re-measure width now the pane is visible
  }

  /* ---------- Init ---------- */
  function init() {
    paintDonuts(); renderChart(); renderTop5All();
    renderUvTable(); renderHeatmap(); renderCalls(); renderPills("filter"); renderPills("export");

    $("#tabs").addEventListener("click", (e) => { const b = e.target.closest(".tab"); if (b) activateTab(b.dataset.tab); });
    try { if (new URLSearchParams(location.search).get("tab") === "calls") activateTab("calls"); } catch (e) {}

    $("#rangeToggle").addEventListener("click", (e) => { const b = e.target.closest("button[data-range]"); if (!b) return; curRange = b.dataset.range; $$("#rangeToggle button").forEach((x) => x.classList.toggle("is-active", x === b)); renderChart(); });
    $("#heatStatus").addEventListener("click", (e) => { const b = e.target.closest("button[data-status]"); if (!b) return; heatStatus = b.dataset.status; $$("#heatStatus button").forEach((x) => x.classList.toggle("is-active", x === b)); renderHeatmap(); });

    // Combo inputs (email + ext): live dropdown of data in the system.
    $$('[data-filter]').forEach((i) => {
      i.addEventListener("input", () => openFor(i));
      i.addEventListener("focus", () => { if (i.value.trim()) openFor(i); });
      i.addEventListener("keydown", (e) => {
        if (e.key === "ArrowDown") { e.preventDefault(); moveActive(1); }
        else if (e.key === "ArrowUp") { e.preventDefault(); moveActive(-1); }
        else if (e.key === "Enter") { e.preventDefault(); commitActive(i); }
        else if (e.key === "Escape") { closeMenu(); }
      });
    });
    // Shared date range (Từ / Đến) — syncs both filters and re-renders calls
    $$('[data-date]').forEach((i) => i.addEventListener("change", () => {
      const which = i.getAttribute("data-date");
      if (which === "from") selFrom = i.value; else selTo = i.value;
      $$(`[data-date="${which}"]`).forEach((o) => { if (o.value !== i.value) o.value = i.value; });
      callsPage = 1; renderFiltered();
    }));

    // Pick a suggestion (mousedown beats the input blur / document click)
    document.addEventListener("mousedown", (e) => {
      const opt = e.target.closest(".combo__opt");
      if (!opt) return;
      e.preventDefault();
      addPill(opt.getAttribute("data-scope"), opt.getAttribute("data-type"), opt.getAttribute("data-val"));
      const inp = opt.closest(".combo").querySelector("[data-filter]");
      if (inp) inp.value = "";
      closeMenu();
    });

    // Delegated clicks: outside-close, pill-remove, reset, table values
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".combo")) closeMenu();
      const rx = e.target.closest("[data-pill-remove]");
      if (rx) { removePill(rx.getAttribute("data-scope"), rx.getAttribute("data-type"), rx.getAttribute("data-val")); return; }
      if (e.target.closest("[data-filter-reset]")) { resetFilter(); return; }
      // Click an email / ext value in a table → add a pill (filters live),
      // staying on the current tab. Clicking inside the modal closes it first.
      const em = e.target.closest("[data-email]");
      if (em) { closeModal(); addPill("filter", "email", em.getAttribute("data-email")); return; }
      const ex = e.target.closest("[data-ext]");
      if (ex) { closeModal(); addPill("filter", "ext", ex.getAttribute("data-ext")); return; }
    });

    $("#uvDetailBtn").addEventListener("click", openModal);
    $("#uvModalClose").addEventListener("click", closeModal);
    $("#uvModal").addEventListener("click", (e) => { if (e.target.id === "uvModal") closeModal(); });
    $("#uvModalFilter").addEventListener("input", renderModalTable);

    // Export report
    $("#exportBtn").addEventListener("click", openExport);
    $("#exportClose").addEventListener("click", closeExport);
    $("#exportCancel").addEventListener("click", closeExport);
    $("#exportModal").addEventListener("click", (e) => { if (e.target.id === "exportModal") closeExport(); });
    $("#exportUseFilter").addEventListener("change", toggleExportFields);
    $("#exportRun").addEventListener("click", runExport);

    document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeModal(); closeExport(); } });

    $("#callBu").addEventListener("change", () => { callsPage = 1; renderCalls(); });
    $("#callsPerPage").addEventListener("change", () => { callsPage = 1; renderCalls(); });
    $("#callsPrev").addEventListener("click", () => { if (callsPage > 1) { callsPage--; renderCalls(); } });
    $("#callsNext").addEventListener("click", () => { callsPage++; renderCalls(); });

    // keep the line chart's width/height crisp on resize
    let rz; window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(renderChart, 150); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
