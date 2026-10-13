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
  // call status (trạng thái) — one colour per status, shared by the pie,
  // the heatmap and the status chips in the call list
  const ST_KEYS = D.STATUS_KEYS, ST_LABEL = D.STATUS_LABEL;
  const ST_RGB = {
    answered: [79, 70, 229], unanswered: [100, 116, 139], busy: [245, 158, 11], failed: [220, 38, 38],
    cancelled: [219, 39, 119], nosignal: [14, 165, 233], voicemail: [101, 163, 13],
  };
  const stHex = (k) => "#" + ST_RGB[k].map((v) => v.toString(16).padStart(2, "0")).join("");

  // shared multi-select filter — selecting a value adds a pill and filters live.
  let selEmails = [], selExts = [];
  // shared date range (yyyy-mm-dd from the <input type=date>), applies to calls.
  let selFrom = "", selTo = "";
  // the Xuất báo cáo dialog keeps its own selection (same combo/pill UI).
  let exEmails = [], exExts = [];
  // multi-select status filter (pills, same as email / ext) — live + export scopes
  let selStatuses = [], exStatuses = [];

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
  let uvStatus = "all";
  let callsPage = 1;

  const extOf = (c) => (c.dir === "Outbound" ? c.from : c.to);
  const emailOf = (c) => (D.byExt[extOf(c)] ? D.byExt[extOf(c)].email : "—");

  const filterActive = () => selEmails.length > 0 || selExts.length > 0;
  const dateActive = () => !!(selFrom || selTo);
  const statusActive = () => selStatuses.length > 0;
  const dashFiltered = () => filterActive() || dateActive() || statusActive();
  // keep only the given statuses: totals become those statuses' calls, with
  // inbound / outbound / Odoo kept in the user's own proportions
  function scaleToStatuses(us, keys) {
    return us.map((u) => {
      const t = keys.reduce((a, k) => a + (u.status[k] || 0), 0);
      const rin = u.total ? u.inbound / u.total : 0, rod = u.total ? u.odoo / u.total : 0;
      const inbound = Math.round(t * rin), status = {};
      ST_KEYS.forEach((k) => (status[k] = keys.includes(k) ? u.status[k] : 0));
      return Object.assign({}, u, { total: t, inbound, outbound: t - inbound, odoo: Math.round(t * rod), status });
    });
  }
  // every Ext, scoped by the date range then the status pills (no email/ext pick)
  function baseUsers() {
    const us = dateActive() ? D.usersInRange(selFrom, selTo) : D.USERS;
    return statusActive() ? scaleToStatuses(us, selStatuses) : us;
  }
  // ...then narrowed to the email / ext pills
  function matchedUsers() {
    let us = baseUsers();
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

  /* ---------- Status pie ---------- */
  function paintStatus() {
    let counts;
    if (dashFiltered()) {
      counts = {}; ST_KEYS.forEach((k) => (counts[k] = 0));
      matchedUsers().forEach((u) => ST_KEYS.forEach((k) => (counts[k] += u.status[k])));
    } else counts = D.OVERVIEW.status;
    const total = ST_KEYS.reduce((a, k) => a + counts[k], 0);
    let acc = 0; const stops = [];
    ST_KEYS.forEach((k) => { acc += counts[k]; stops.push([stHex(k), total ? (acc / total) * 100 : 0]); });
    $("#stRing").style.background = total ? conic(stops) : "#eceef9";
    $("#stNum").textContent = nfmt(total);
    $("#stLegend").innerHTML = ST_KEYS.map((k) => {
      const pct = total ? (counts[k] / total) * 100 : 0;
      const p = pct > 0 && pct < 1 ? "<1" : Math.round(pct);
      const off = statusActive() && !selStatuses.includes(k) ? " is-off" : "";
      return `<div class="st-legend__row${off}"><span class="dot" style="background:${stHex(k)}"></span><span class="st-legend__label">${ST_LABEL[k]}</span><span class="st-legend__count">${nfmt(counts[k])}</span><b class="legend__pct">${p}%</b></div>`;
    }).join("");
  }

  const secFmt = (sec) => Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0");

  /* ---------- Conversion funnel ----------
     Natural progression of a call. Built from the full status mix, so it
     follows the date / email / ext filters but not the status pills (a funnel
     cut down to a few statuses would no longer be a funnel). */
  function funnelUsers() {
    let us = dateActive() ? D.usersInRange(selFrom, selTo) : D.USERS;
    if (filterActive()) us = us.filter((u) => selEmails.includes(u.email) || selExts.includes(u.ext));
    return us;
  }
  // answered calls are rarely < 30s → skew each duration mix toward longer talks
  const ANS_SKEW = [0.45, 1, 1.1, 1.2];
  function qualityOf(answered, w) {
    const aw = w.map((x, i) => x * ANS_SKEW[i]), sum = aw.reduce((a, b) => a + b, 0) || 1;
    const share = (aw[1] + aw[2] + aw[3]) / sum; // > 30s
    return Math.round(answered * share);
  }
  function renderFunnel() {
    const st = {}; ST_KEYS.forEach((k) => (st[k] = 0));
    let quality = 0;
    if (filterActive() || dateActive()) {
      funnelUsers().forEach((u) => { ST_KEYS.forEach((k) => (st[k] += u.status[k])); quality += qualityOf(u.status.answered, u.durw); });
    } else {
      Object.assign(st, D.OVERVIEW.status);
      quality = qualityOf(st.answered, D.DUR_BASE);
    }
    const total = ST_KEYS.reduce((a, k) => a + st[k], 0);
    const connected = total - st.failed - st.nosignal;
    const rang = connected - st.busy - st.cancelled;
    const drop = (parts) => parts.filter(([, v]) => v > 0).map(([l, v]) => `${l} ${nfmt(v)}`).join(" · ");
    const stages = [
      { name: "Tổng cuộc gọi", sub: "Gọi đi + gọi đến", v: total },
      { name: "Tín hiệu kết nối", sub: "Trừ Thất bại, Mất sóng", v: connected, drop: drop([["Thất bại", st.failed], ["Mất sóng", st.nosignal]]) },
      { name: "Đổ chuông / Khách bắt máy", sub: "Trừ Bận, Huỷ cuộc gọi", v: rang, drop: drop([["Bận", st.busy], ["Huỷ cuộc gọi", st.cancelled]]) },
      { name: "Nghe máy thực tế", sub: "Answered", v: st.answered, drop: drop([["Không nghe máy", st.unanswered], ["Hộp thư thoại", st.voicemail]]) },
      { name: "Cuộc gọi chất lượng", sub: "Nghe máy, thời lượng > 30 giây", v: quality,
        dropLabel: "nghe máy ≤ 30 giây" },
    ];
    $("#funnel").innerHTML = stages.map((s, i) => {
      const pctTotal = total ? (s.v / total) * 100 : 0;
      const prev = i ? stages[i - 1].v : 0;
      const step = i && prev ? Math.round((s.v / prev) * 100) : 100;
      const w = Math.max(s.v ? 8 : 0, pctTotal);
      return `<div class="fn-row fn-row--${i + 1}">
        <div class="fn-label"><span class="fn-step">${i + 1}</span><div><div class="fn-name">${s.name}</div><div class="fn-sub">${s.sub}</div></div></div>
        <div class="fn-track"><div class="fn-bar" style="width:${w.toFixed(1)}%"><span>${nfmt(s.v)}</span></div></div>
        <div class="fn-meta">
          <div class="fn-pct">${pctTotal >= 10 || !pctTotal ? Math.round(pctTotal) : pctTotal.toFixed(1).replace(".", ",")}%<small> tổng</small></div>
          ${i ? `<div class="fn-conv">${step}% so với tầng trước</div>` : `<div class="fn-conv">Điểm bắt đầu</div>`}
        </div>
      </div>`;
    }).join("");
    lastFunnel = { stages, total };
    const conv = total ? Math.round((quality / total) * 100) : 0;
    $("#funnelFoot").innerHTML = `<span>Tỷ lệ chuyển đổi toàn phễu: <b>${conv}%</b> cuộc gọi trở thành cuộc gọi chất lượng</span>` +
      (statusActive() ? `<span class="funnel-foot__note">Phễu luôn tính trên đủ 7 trạng thái, không áp dụng bộ lọc Trạng thái</span>` : "");
  }

  /* ---------- Chart (line: inbound + outbound) ---------- */
  let chartGeo = null;
  function onChartMove(e) {
    const g = chartGeo; if (!g) return;
    const host = $("#chart"), svg = host.querySelector("svg"); if (!svg) return;
    const hr = host.getBoundingClientRect(), sr = svg.getBoundingClientRect();
    const scaleX = sr.width / g.W, scaleY = sr.height / g.H;
    const mx = e.clientX - sr.left;
    let best = 0, bd = Infinity;
    for (let i = 0; i < g.xs.length; i++) { const d = Math.abs(g.xs[i] * scaleX - mx); if (d < bd) { bd = d; best = i; } }
    const cur = svg.querySelector(".chart__cursor");
    cur.setAttribute("x1", g.xs[best]); cur.setAttribute("x2", g.xs[best]); cur.style.display = "";
    const hi = svg.querySelector(".chart__hl--in"), ho = svg.querySelector(".chart__hl--out");
    hi.setAttribute("cx", g.xs[best]); hi.setAttribute("cy", g.yin[best]); hi.style.display = "";
    ho.setAttribute("cx", g.xs[best]); ho.setAttribute("cy", g.yout[best]); ho.style.display = "";
    const s = g.series[best], tip = host.querySelector(".chart__tip");
    tip.innerHTML = `<div class="chart__tip-date">${g.labels[best]}</div>` +
      `<div class="chart__tip-row"><span class="chart__tip-dot chart__tip-dot--in"></span>Inbound<b>${nfmt(s.in)}</b></div>` +
      `<div class="chart__tip-row"><span class="chart__tip-dot chart__tip-dot--out"></span>Outbound<b>${nfmt(s.out)}</b></div>`;
    tip.hidden = false;
    const px = (sr.left - hr.left) + g.xs[best] * scaleX;
    const py = (sr.top - hr.top) + Math.min(g.yin[best], g.yout[best]) * scaleY;
    const half = tip.offsetWidth / 2;
    const clampedX = Math.max(half + 2, Math.min(hr.width - half - 2, px));
    tip.style.left = clampedX + "px"; tip.style.top = (py - 12) + "px";
  }
  function onChartLeave() {
    const svg = $("#chart").querySelector("svg");
    if (svg) svg.querySelectorAll(".chart__cursor,.chart__hl").forEach((el) => (el.style.display = "none"));
    const tip = $("#chart").querySelector(".chart__tip"); if (tip) tip.hidden = true;
  }
  function renderChart() {
    renderDuration();
    const c = D.CHART[curRange], n = c.series.length;
    const el = $("#chart");
    const W = Math.max(260, Math.round(el.clientWidth) || 640), H = 196;
    const padX = 16, padT = 14, padB = 24;
    const plotH = H - padT - padB, plotBottom = padT + plotH;
    const maxV = Math.max(1, ...c.series.map((s) => Math.max(s.in, s.out)));
    const xAt = (i) => (n <= 1 ? W / 2 : padX + (i / (n - 1)) * (W - 2 * padX));
    const yAt = (v) => padT + plotH - (v / maxV) * plotH;
    // smooth (Catmull-Rom → cubic Bézier) so the lines curve instead of kink
    const smooth = (pts) => {
      if (pts.length < 2) return pts.length ? `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}` : "";
      const t = 0.18;
      let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
        const c1x = p1[0] + (p2[0] - p0[0]) * t, c1y = p1[1] + (p2[1] - p0[1]) * t;
        const c2x = p2[0] - (p3[0] - p1[0]) * t, c2y = p2[1] - (p3[1] - p1[1]) * t;
        d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
      }
      return d;
    };
    const line = (key) => smooth(c.series.map((s, i) => [xAt(i), yAt(s[key])]));
    const grid = [0.5, 1].map((f) => `<line class="chart__grid" x1="${padX}" y1="${(plotBottom - f * plotH).toFixed(1)}" x2="${W - padX}" y2="${(plotBottom - f * plotH).toFixed(1)}"/>`).join("");
    // show as many x labels as fit without overlapping, spaced evenly and
    // anchored on the latest point (adapts to width / mobile)
    const minLabelPx = 46, avail = W - 2 * padX;
    // spread labels evenly and always keep the first + last points labelled,
    // shrinking the count until none overlap
    const evenIdx = (kk) => { if (kk <= 1) return [0]; const s = new Set(); for (let j = 0; j < kk; j++) s.add(Math.round(j * (n - 1) / (kk - 1))); return [...s].sort((a, b) => a - b); };
    let k = Math.min(n, Math.max(2, Math.floor(avail / minLabelPx) + 1)), idxs = evenIdx(k);
    while (k > 2) {
      let ok = true;
      for (let j = 1; j < idxs.length; j++) if (xAt(idxs[j]) - xAt(idxs[j - 1]) < minLabelPx) { ok = false; break; }
      if (ok) break;
      idxs = evenIdx(--k);
    }
    const shown = new Set(idxs);
    const labels = c.series.map((s, i) => (shown.has(i)
      ? `<text class="chart__xlabel" x="${xAt(i).toFixed(1)}" y="${H - 7}" text-anchor="middle">${c.labels[i]}</text>` : "")).join("");
    el.innerHTML =
      `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Inbound / Outbound theo thời gian">
        ${grid}
        <line class="chart__axis" x1="${padX}" y1="${plotBottom}" x2="${W - padX}" y2="${plotBottom}"/>
        <line class="chart__cursor" x1="0" y1="${padT}" x2="0" y2="${plotBottom}" style="display:none"/>
        <path class="chart__line chart__line--out" d="${line("out")}"/>
        <path class="chart__line chart__line--in" d="${line("in")}"/>
        <circle class="chart__hl chart__hl--out" r="5.5" style="display:none"/>
        <circle class="chart__hl chart__hl--in" r="5.5" style="display:none"/>
        ${labels}
      </svg>
      <div class="chart__tip" hidden></div>`;
    chartGeo = {
      W, H, padX, padT, plotBottom,
      xs: c.series.map((s, i) => +xAt(i).toFixed(2)),
      yin: c.series.map((s) => +yAt(s.in).toFixed(2)),
      yout: c.series.map((s) => +yAt(s.out).toFixed(2)),
      labels: c.labels, series: c.series,
    };
    if (dashFiltered()) {
      const us = matchedUsers();
      const total = us.reduce((a, u) => a + u.total, 0);
      $("#statUploaded").textContent = nfmt(total);
      $("#statAvg").textContent = c.avg;
      $("#statMax").textContent = c.max; $("#statMin").textContent = c.min;
      const lbl = filterActive() && us.length === 1 ? ("Ext. " + esc(us[0].ext))
        : filterActive() ? (us.length + " Ext đã chọn")
        : statusActive() ? (selStatuses.length === 1 ? ST_LABEL[selStatuses[0]] : selStatuses.length + " trạng thái đã chọn")
        : "Theo khoảng ngày";
      $("#statDelta").innerHTML = `<span class="note">${lbl}</span>`;
    } else {
      const total = c.series.reduce((a, s) => a + s.in + s.out, 0);
      $("#statUploaded").textContent = nfmt(total);
      $("#statAvg").textContent = c.avg;
      $("#statMax").textContent = c.max; $("#statMin").textContent = c.min;
      const d = curRange === "7d" ? 12.4 : curRange === "30d" ? 8.1 : 15.6;
      $("#statDelta").innerHTML = `<span class="up">▲ +${d}%</span><span class="note">so với kỳ trước</span>`;
    }
  }

  /* ---------- Call-duration histogram ---------- */
  function durationCounts() {
    if (dashFiltered()) {
      const acc = D.DUR_BUCKETS.map(() => 0);
      matchedUsers().forEach((u) => D.splitArr(u.total, u.durw).forEach((v, i) => (acc[i] += v)));
      return acc;
    }
    const c = D.CHART[curRange];
    return D.splitArr(c.series.reduce((a, s) => a + s.in + s.out, 0), c.dur);
  }
  function renderDuration() {
    const counts = durationCounts();
    const all = counts.reduce((a, b) => a + b, 0), noise = counts[0], useful = all - noise;
    const idx = D.DUR_BUCKETS.map((b, i) => i);
    const base = all;
    const max = Math.max(1, ...idx.map((i) => counts[i]));
    $("#statUseful").textContent = nfmt(useful);
    $("#durChart").style.gridTemplateColumns = `repeat(${idx.length}, minmax(0, 1fr))`;
    $("#durChart").innerHTML = idx.map((i) => {
      const b = D.DUR_BUCKETS[i], v = counts[i];
      const pct = base ? Math.round((v / base) * 100) : 0;
      const h = Math.max(v ? 3 : 0, (v / max) * 100);
      return `<div class="dh-col dh-col--${b.key}" title="${b.label} · ${b.desc}: ${nfmt(v)} cuộc gọi (${pct}%)">
        <div class="dh-track">
          <div class="dh-val"><b>${nfmt(v)}</b><span>${pct}%</span></div>
          <div class="dh-bar" style="height:calc((100% - var(--dh-lbl, 30px)) * ${(h / 100).toFixed(3)})"></div>
        </div>
        <div class="dh-lbl">${b.label}</div>
        <div class="dh-desc">${b.desc}</div>
      </div>`;
    }).join("");
  }

  /* ---------- Top-5 (email, no bar) ---------- */
  function renderTop5(elId, rows) {
    const head = `<div class="top5__head"><span class="top5__rank">#</span><span class="top5__email">Email</span><span class="top5__ext">Ext.</span><span class="top5__right">Cuộc gọi</span></div>`;
    $(elId).innerHTML = rows.length
      ? head + rows.map((r, i) => `
      <div class="top5__row">
        <span class="top5__rank">${i + 1}</span>
        <span class="top5__email" data-email="${esc(r.email)}" title="${esc(r.email)}">${esc(r.email)}</span>
        <span class="top5__ext" data-ext="${esc(r.ext)}" title="Ext. ${esc(r.ext)}">${esc(r.ext)}</span>
        <span class="top5__right"><span class="top5__count">${nfmt(r.calls)}</span></span>
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
      <td class="num"><span class="uv-num-avg">${secFmt(u.avgSec)}</span></td>
      <td class="num"><span class="uv-num-odoo">${nfmt(u.odoo)}</span></td>
      <td class="col-bar"><div class="pct-cell"><span class="pct-bar"><span class="pct-bar__fill" style="width:${pct}%"></span></span><span class="pct-val">${pct}%</span></div></td>
    </tr>`;
  }
  // scope a user row to one status: totals become that status' calls, with
  // inbound / outbound / Odoo kept in the user's own proportions
  function byStatus(us) {
    return uvStatus === "all" ? us : scaleToStatuses(us, [uvStatus]);
  }
  const uvStatusNote = () => (uvStatus === "all" ? "" : ` · Trạng thái: ${ST_LABEL[uvStatus]}`);
  function renderUvTable() {
    const all = byStatus(matchedUsers()).sort((a, b) => b.total - a.total);
    // with an email/ext filter, show exactly the filtered Ext (no Top-7 cap)
    const rows = filterActive() ? all : all.slice(0, 7);
    $("#uvBody").innerHTML = rows.length ? rows.map((u, i) => uvRowHtml(u, i, false)).join("")
      : `<tr><td colspan="9" class="uv-empty">Không có Ext/Email nào khớp bộ lọc</td></tr>`;
    $("#uvFoot").textContent = filterActive()
      ? `Hiển thị ${rows.length} Ext khớp bộ lọc · tổng ${D.USERS.length} Ext${uvStatusNote()}`
      : `Hiển thị Top 7 / ${D.USERS.length} Ext có nhiều cuộc gọi nhất${uvStatusNote()}`;
  }

  /* ---------- Success rate per agent (Nghe máy / tổng) ---------- */
  function srRowHtml(u, i, highlight) {
    const ans = u.status.answered || 0;
    const pct = u.total ? Math.round((ans / u.total) * 100) : 0;
    const sel = highlight && userSelected(u) ? " is-selected" : "";
    return `<tr class="${sel}">
      <td class="uv-rank">${i + 1}</td>
      <td><span class="uv-email" data-email="${esc(u.email)}" title="${esc(u.email)}">${esc(u.email)}</span></td>
      <td><span class="uv-ext" data-ext="${esc(u.ext)}">${esc(u.ext)}</span></td>
      <td class="num"><span class="uv-num-total">${nfmt(u.total)}</span></td>
      <td class="num"><span class="sr-num-ans">${nfmt(ans)}</span></td>
      <td class="col-bar"><div class="pct-cell"><span class="pct-bar"><span class="pct-bar__fill pct-bar__fill--ans" style="width:${pct}%"></span></span><span class="pct-val pct-val--ans">${pct}%</span></div></td>
    </tr>`;
  }
  function renderSrTable() {
    const all = matchedUsers().slice().sort((a, b) => b.total - a.total);
    const rows = filterActive() ? all : all.slice(0, 7);
    $("#srBody").innerHTML = rows.length ? rows.map((u, i) => srRowHtml(u, i, false)).join("")
      : `<tr><td colspan="6" class="uv-empty">Không có Ext/Email nào khớp bộ lọc</td></tr>`;
    $("#srFoot").textContent = filterActive()
      ? `Hiển thị ${rows.length} Ext khớp bộ lọc · tổng ${D.USERS.length} Ext`
      : `Hiển thị Top 7 / ${D.USERS.length} Ext có nhiều cuộc gọi nhất`;
  }
  function renderSrModalTable() {
    const q = ($("#srModalFilter").value || "").trim().toLowerCase();
    let rows = baseUsers().slice().sort((a, b) => b.total - a.total);
    if (q) rows = rows.filter((u) => u.ext.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q));
    $("#srModalBody").innerHTML = rows.length ? rows.map((u, i) => srRowHtml(u, i, true)).join("") : `<tr><td colspan="6" class="uv-empty">Không có kết quả</td></tr>`;
    $("#srModalSub").textContent = `${rows.length} / ${D.USERS.length} Ext`;
  }
  function openSrModal() { $("#srModal").classList.add("is-open"); document.body.style.overflow = "hidden"; renderSrModalTable(); setTimeout(() => $("#srModalFilter").focus(), 30); }
  function closeSrModal() { $("#srModal").classList.remove("is-open"); if (!$("#uvModal").classList.contains("is-open")) document.body.style.overflow = ""; }

  /* ---------- Modal ---------- */
  function renderModalTable() {
    const q = ($("#uvModalFilter").value || "").trim().toLowerCase();
    let rows = byStatus(baseUsers()).slice().sort((a, b) => b.total - a.total);
    if (q) rows = rows.filter((u) => u.ext.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q));
    $("#uvModalBody").innerHTML = rows.length ? rows.map((u, i) => uvRowHtml(u, i, true)).join("") : `<tr><td colspan="9" class="uv-empty">Không có kết quả</td></tr>`;
    $("#uvModalSub").textContent = `${rows.length} / ${D.USERS.length} Ext${uvStatusNote()}`;
  }

  /* ---------- Export report (CSV) ---------- */
  function openExport() {
    $("#exportUseFilter").checked = filterActive() || statusActive();
    toggleExportFields();
    exEmails.length = 0; exExts.length = 0; exStatuses.length = 0; renderPills("export"); renderStatusPickers("export");
    $("#exEmail").value = ""; $("#exExt").value = ""; $("#exBu").value = "all";
    $("#exFrom").value = ""; $("#exTo").value = "";
    $("#exportModal").classList.add("is-open"); document.body.style.overflow = "hidden";
  }
  function closeExport() { closeMenu(); closeStMenus(); $("#exportModal").classList.remove("is-open"); document.body.style.overflow = ""; }
  function toggleExportFields() { $("#exportFields").classList.toggle("is-disabled", $("#exportUseFilter").checked); }
  function exportRows() {
    if ($("#exportUseFilter").checked) {
      return D.CALLS.filter((c) => inRange(c, selFrom, selTo) &&
        (!statusActive() || selStatuses.includes(c.status)) &&
        (!filterActive() || selExts.includes(extOf(c)) || selEmails.includes(emailOf(c))));
    }
    const bu = $("#exBu").value;
    const from = $("#exFrom").value, to = $("#exTo").value;
    const useSel = exEmails.length > 0 || exExts.length > 0;
    return D.CALLS.filter((c) => {
      if (bu !== "all" && c.bu !== bu) return false;
      if (!inRange(c, from, to)) return false;
      if (useSel && !(exExts.includes(extOf(c)) || exEmails.includes(emailOf(c)))) return false;
      if (exStatuses.length && !exStatuses.includes(c.status)) return false;
      return true;
    });
  }
  function runExport() {
    const rows = exportRows();
    const cell = (v) => '"' + String(v).replace(/"/g, '""') + '"';
    const head = ["Thời gian", "Email", "Phân loại", "Gọi từ", "Gọi đến", "BU", "Thời lượng", "Trạng thái", "Ghi âm"];
    const lines = [head.map(cell).join(",")];
    rows.forEach((c) => lines.push([c.time, emailOf(c), c.dir, c.from, c.to, BU_LABEL[c.bu], c.dur, ST_LABEL[c.status], c.rec ? "Có" : "Chưa"].map(cell).join(",")));
    const csv = "﻿" + lines.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "bao-cao-cuoc-goi.csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    closeExport();
  }
  function setUvStatus(v) {
    uvStatus = v; renderSingleStatus();
    renderUvTable(); if ($("#uvModal").classList.contains("is-open")) renderModalTable();
  }
  function setHeatStatus(v) { heatStatus = v; renderSingleStatus(); renderHeatmap(); aiHeat(); }
  function openModal() { renderSingleStatus(); $("#uvModal").classList.add("is-open"); document.body.style.overflow = "hidden"; renderModalTable(); setTimeout(() => $("#uvModalFilter").focus(), 30); }
  function closeModal() { $("#uvModal").classList.remove("is-open"); document.body.style.overflow = ""; }

  /* ---------- Heatmap 24h ---------- */
  const HEAT_COLORS = Object.assign({ all: [234, 88, 12] }, ST_RGB);
  const heatKeys = () => {
    const pool = statusActive() ? selStatuses : ST_KEYS;
    return heatStatus === "all" ? pool : pool.filter((k) => k === heatStatus);
  };
  const cellValue = (c) => heatKeys().reduce((a, k) => a + (c[k] || 0), 0);
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

  /* ---------- AI phân tích ----------
     Text insights generated from the numbers currently on screen (rule-based,
     so they update instantly with every filter / range / status change).
     Swap aiCompose() for a call to an LLM endpoint when wiring real AI. */
  const AI_ICON = {
    good: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/></svg>',
  };
  const pctOf = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const RANGE_TXT = { "7d": "7 ngày gần nhất", "30d": "30 ngày gần nhất", "12m": "12 tháng gần nhất" };
  function aiScope() {
    if (filterActive()) { const n = matchedUsers().length; return n === 1 ? `Ext. ${esc(matchedUsers()[0].ext)}` : `${n} Ext đang lọc`; }
    if (dateActive()) return "khoảng ngày đã chọn";
    if (statusActive()) return "các trạng thái đang lọc";
    return RANGE_TXT[curRange];
  }
  function aiCompose(id, d) {
    const items = d.items.filter(Boolean);
    $(`#${id} [data-ai-body]`).innerHTML =
      `<p class="ai-lead">${d.lead}</p>` +
      (items.length ? `<ul class="ai-list">${items.map((it) => `<li class="ai-item ai-item--${it.t}"><span class="ai-item__icon">${AI_ICON[it.t]}</span><span>${it.h}</span></li>`).join("")}</ul>` : "") +
      (d.reco && d.reco.length ? `<div class="ai-reco"><span class="ai-reco__lbl">Đề xuất</span><ul>${d.reco.map((r) => `<li>${r}</li>`).join("")}</ul></div>` : "");
  }

  function aiOverview() {
    const us = matchedUsers(), c = D.CHART[curRange];
    const calls = dashFiltered() ? us.reduce((a, u) => a + u.total, 0) : c.series.reduce((a, s) => a + s.in + s.out, 0);
    const delta = dashFiltered() ? null : curRange === "7d" ? 12.4 : curRange === "30d" ? 8.1 : 15.6;
    const tot = us.reduce((a, u) => a + u.total, 0);
    const inPct = dashFiltered() ? pctOf(us.reduce((a, u) => a + u.inbound, 0), tot) : D.OVERVIEW.inboundPct;
    const outPct = 100 - inPct;
    let bu;
    if (dashFiltered()) { const bt = { pso: 0, tcp: 0, unknown: 0 }; us.forEach((u) => (bt[u.bu] += u.total)); bu = { pso: pctOf(bt.pso, tot), tcp: pctOf(bt.tcp, tot) }; bu.unknown = Math.max(0, 100 - bu.pso - bu.tcp); }
    else bu = D.OVERVIEW.bu;
    const odooPct = pctOf(us.reduce((a, u) => a + u.odoo, 0), tot);
    const callers = topRows("caller"), callees = topRows("callee");
    const outAll = us.reduce((a, u) => a + u.outbound, 0);
    const top5Share = pctOf(callers.reduce((a, r) => a + r.calls, 0), outAll);
    const items = [
      outPct >= 55 ? { t: "info", h: `${dashFiltered() ? "" : `Trên toàn bộ <b>${nfmt(D.OVERVIEW.totalCalls)}</b> cuộc gọi, `}Outbound chiếm <b>${outPct}%</b> — đội ngũ chủ yếu chủ động gọi ra; Inbound <b>${inPct}%</b>.` }
        : inPct >= 55 ? { t: "info", h: `Inbound chiếm <b>${inPct}%</b> — khách hàng chủ động liên hệ nhiều hơn gọi ra (<b>${outPct}%</b>).` }
        : { t: "info", h: `Inbound / Outbound khá cân bằng: <b>${inPct}%</b> / <b>${outPct}%</b>.` },
      callers[0] && (us.length > 5
        ? { t: top5Share >= 50 ? "warn" : "info", h: `<b>${esc(callers[0].email)}</b> (Ext. ${esc(callers[0].ext)}) gọi ra nhiều nhất với <b>${nfmt(callers[0].calls)}</b> cuộc; Top 5 caller chiếm <b>${top5Share}%</b> lượng gọi ra${top5Share >= 50 ? " — sản lượng đang phụ thuộc vào ít nhân sự" : ""}.` }
        : { t: "info", h: `<b>${esc(callers[0].email)}</b> (Ext. ${esc(callers[0].ext)}) gọi ra nhiều nhất với <b>${nfmt(callers[0].calls)}</b> cuộc.` }),
      callees[0] && { t: "info", h: `<b>${esc(callees[0].email)}</b> (Ext. ${esc(callees[0].ext)}) nhận nhiều cuộc gọi đến nhất: <b>${nfmt(callees[0].calls)}</b> cuộc.` },
      bu.unknown >= 30 ? { t: "warn", h: `<b>${bu.unknown}%</b> cuộc gọi chưa xác định BU — cơ cấu PSO <b>${bu.pso}%</b> / TCP <b>${bu.tcp}%</b> chưa phản ánh đúng thực tế.` }
        : { t: "good", h: `Phần lớn cuộc gọi đã gán BU: PSO <b>${bu.pso}%</b>, TCP <b>${bu.tcp}%</b>.` },
      { t: odooPct >= 60 ? "good" : odooPct >= 40 ? "info" : "warn", h: `<b>${odooPct}%</b> cuộc gọi phát sinh từ Odoo${odooPct < 60 ? " — còn nhiều cuộc gọi chưa được lưu vết trên CRM" : ", lưu vết CRM tốt"}.` },
    ];
    const reco = [];
    if (bu.unknown >= 30) reco.push("Chuẩn hoá mapping Ext → BU để báo cáo theo BU chính xác hơn.");
    if (odooPct < 60) reco.push("Khuyến khích thực hiện cuộc gọi từ Odoo để đồng bộ lịch sử chăm sóc khách hàng.");
    if (us.length > 5 && top5Share >= 50) reco.push("Phân bổ lại danh sách gọi để giảm phụ thuộc vào nhóm Top 5.");
    aiCompose("aiOverview", {
      lead: `Trong ${aiScope()}, hệ thống ghi nhận <b>${nfmt(calls)}</b> cuộc gọi` + (delta != null ? `, <b class="ai-up">tăng ${String(delta).replace(".", ",")}%</b> so với kỳ trước.` : "."),
      items, reco,
    });
  }

  function aiDuration() {
    const counts = durationCounts(), all = counts.reduce((a, b) => a + b, 0), c = D.CHART[curRange];
    const p = counts.map((v) => pctOf(v, all)), useful = all - counts[0];
    let dom = 0; counts.forEach((v, i) => { if (v > counts[dom]) dom = i; });
    const B = D.DUR_BUCKETS;
    aiCompose("aiDuration", {
      lead: `<b>${pctOf(useful, all)}%</b> cuộc gọi (${nfmt(useful)}/${nfmt(all)}) kéo dài trên 30 giây — được tính là cuộc gọi hiệu quả.`,
      items: [
        p[0] > 20 ? { t: "warn", h: `<b>${p[0]}%</b> cuộc gọi dưới 30 giây: nhiều cuộc gọi rác hoặc khách dập máy sớm.` }
          : { t: "good", h: `Cuộc gọi dưới 30 giây ở mức thấp (<b>${p[0]}%</b>), ít nhiễu.` },
        { t: "info", h: `Nhóm <b>${B[dom].label}</b> (${B[dom].desc.toLowerCase()}) chiếm tỷ trọng lớn nhất: <b>${p[dom]}%</b>.` },
        { t: p[3] >= 20 ? "good" : "info", h: `<b>${p[3]}%</b> cuộc gọi tư vấn chuyên sâu trên 3 phút.` },
        { t: "info", h: `TB thời lượng <b>${c.avg}</b>, dài nhất <b>${c.max}</b>.` },
      ],
      reco: [p[0] > 20 ? "Rà soát chất lượng data số điện thoại và câu mở đầu kịch bản để giảm cuộc gọi dưới 30 giây."
        : "Phân tích ghi âm nhóm trên 3 phút để nhân rộng kịch bản tư vấn hiệu quả."],
    });
  }

  function aiStatus() {
    const counts = {}; ST_KEYS.forEach((k) => (counts[k] = 0));
    if (dashFiltered()) matchedUsers().forEach((u) => ST_KEYS.forEach((k) => (counts[k] += u.status[k])));
    else Object.assign(counts, D.OVERVIEW.status);
    const total = ST_KEYS.reduce((a, k) => a + counts[k], 0);
    if (!total) { aiCompose("aiStatus", { lead: "Không có cuộc gọi nào khớp bộ lọc để phân tích.", items: [] }); return; }
    const ansPct = pctOf(counts.answered, total);
    const miss = ST_KEYS.filter((k) => k !== "answered" && counts[k] > 0).sort((a, b) => counts[b] - counts[a]);
    const tech = pctOf(counts.failed + counts.nosignal, total);
    const agents = matchedUsers().filter((u) => u.total >= 30).map((u) => ({ u, r: u.total ? u.status.answered / u.total : 0 })).sort((a, b) => b.r - a.r);
    const best = agents[0], worst = agents[agents.length - 1];
    const gap = best && worst ? Math.round((best.r - worst.r) * 100) : 0;
    const items = [
      miss[0] && { t: "warn", h: `<b>${ST_LABEL[miss[0]]}</b> là nguyên nhân không kết nối lớn nhất: <b>${pctOf(counts[miss[0]], total)}%</b> tổng cuộc gọi${miss[1] ? `, tiếp theo là ${ST_LABEL[miss[1]]} (${pctOf(counts[miss[1]], total)}%)` : ""}.` },
      (counts.failed + counts.nosignal) > 0 && { t: tech >= 5 ? "warn" : "good", h: `Lỗi kỹ thuật (Thất bại + Mất sóng) chiếm <b>${tech}%</b>${tech >= 5 ? " — cao hơn mức nên chấp nhận (~5%)" : ", trong ngưỡng an toàn"}.` },
      best && agents.length > 1 && { t: "good", h: `<b>${esc(best.u.email)}</b> có tỷ lệ nghe máy cao nhất: <b>${Math.round(best.r * 100)}%</b>.` },
      worst && agents.length > 1 && { t: gap >= 10 ? "warn" : "info", h: `<b>${esc(worst.u.email)}</b> thấp nhất: <b>${Math.round(worst.r * 100)}%</b> (chênh <b>${gap}</b> điểm % so với người cao nhất).` },
    ];
    const reco = [];
    if (miss[0] === "unanswered" || miss[0] === "voicemail") reco.push("Gọi lại các số không nghe máy vào khung giờ có tỷ lệ nghe máy cao (xem mật độ theo khung giờ).");
    if (miss[0] === "busy" || miss[0] === "cancelled") reco.push("Giãn lịch gọi lại 15–30 phút với các số báo bận / huỷ.");
    if (tech >= 5) reco.push("Kiểm tra đường truyền, nhà mạng và lọc số không hợp lệ.");
    if (gap >= 10) reco.push("Chia sẻ cách tiếp cận của nhân viên có tỷ lệ nghe máy cao cho nhóm thấp hơn.");
    aiCompose("aiStatus", {
      lead: `Tỷ lệ nghe máy đạt <b>${ansPct}%</b> trên <b>${nfmt(total)}</b> cuộc gọi${statusActive() ? " (trong phạm vi trạng thái đang lọc)" : ""}.`,
      items, reco,
    });
  }

  let lastFunnel = null;
  function aiFunnel() {
    const f = lastFunnel; if (!f || !f.total) { aiCompose("aiFunnel", { lead: "Chưa có dữ liệu phễu để phân tích.", items: [] }); return; }
    const st = f.stages, conv = pctOf(st[4].v, f.total);
    let li = 1; for (let i = 2; i < st.length; i++) if (st[i - 1].v - st[i].v > st[li - 1].v - st[li].v) li = i;
    let wi = 1; for (let i = 2; i < st.length; i++) if (st[i].v / (st[i - 1].v || 1) < st[wi].v / (st[wi - 1].v || 1)) wi = i;
    const loss = st[li - 1].v - st[li].v;
    const RECO = [null,
      "Kiểm tra chất lượng đường truyền / nhà mạng và làm sạch danh sách số trước khi gọi.",
      "Hạn chế gọi lặp khi máy bận; đặt lịch gọi lại sau 15–30 phút.",
      "Ưu tiên gọi vào khung giờ có tỷ lệ nghe máy cao và thiết lập lịch gọi lại cho số không nghe máy.",
      "Chuẩn hoá 30 giây mở đầu của kịch bản để giữ chân khách sau khi bắt máy."];
    aiCompose("aiFunnel", {
      lead: `Toàn phễu chuyển đổi <b>${conv}%</b>: cứ 100 cuộc gọi có khoảng <b>${conv}</b> cuộc gọi chất lượng (nghe máy &gt; 30 giây).`,
      items: [
        { t: "warn", h: `Rơi nhiều nhất ở bước <b>${st[li - 1].name} → ${st[li].name}</b>: mất <b>${nfmt(loss)}</b> cuộc (${pctOf(loss, st[li - 1].v)}% tầng trước)${st[li].drop ? `, chủ yếu do ${st[li].drop}` : ""}.` },
        wi !== li && { t: "info", h: `Bước có tỷ lệ chuyển đổi thấp nhất: <b>${st[wi].name}</b> (${pctOf(st[wi].v, st[wi - 1].v)}% so với tầng trước).` },
        { t: pctOf(st[4].v, st[3].v) >= 85 ? "good" : "info", h: `<b>${pctOf(st[4].v, st[3].v)}%</b> cuộc gọi nghe máy duy trì được trên 30 giây.` },
        { t: pctOf(st[1].v, st[0].v) >= 95 ? "good" : "warn", h: `Tín hiệu kết nối đạt <b>${pctOf(st[1].v, st[0].v)}%</b> tổng cuộc gọi.` },
      ],
      reco: [RECO[li]].concat(wi !== li ? [RECO[wi]] : []),
    });
  }

  function aiHeat() {
    const rows = D.HEATMAP.rows, keys = heatKeys(), H = D.HEATMAP.cols.length;
    const what = heatStatus === "all" ? "cuộc gọi" : `cuộc gọi “${ST_LABEL[heatStatus]}”`;
    const hourTot = Array(H).fill(0), dayTot = rows.map(() => 0);
    rows.forEach((r, ri) => r.cells.forEach((c, h) => { const v = keys.reduce((a, k) => a + (c[k] || 0), 0); hourTot[h] += v; dayTot[ri] += v; }));
    const all = hourTot.reduce((a, b) => a + b, 0);
    if (!all) { aiCompose("aiHeat", { lead: `Không có ${what} trong dữ liệu khung giờ.`, items: [] }); return; }
    let peak = 0; hourTot.forEach((v, h) => { if (v > hourTot[peak]) peak = h; });
    let win = 0; for (let h = 0; h < H - 1; h++) if (hourTot[h] + hourTot[h + 1] > hourTot[win] + hourTot[win + 1]) win = h;
    let bd = 0; dayTot.forEach((v, i) => { if (v > dayTot[bd]) bd = i; });
    const weekend = pctOf(dayTot[5] + dayTot[6], all);
    // answer rate per hour, always from the full status mix
    const ans = Array(H).fill(0), tot = Array(H).fill(0);
    rows.forEach((r) => r.cells.forEach((c, h) => { ans[h] += c.answered; tot[h] += ST_KEYS.reduce((a, k) => a + (c[k] || 0), 0); }));
    const maxTot = Math.max(...tot), cand = tot.map((v, h) => h).filter((h) => tot[h] >= maxTot * 0.25);
    const rate = (h) => ans[h] / (tot[h] || 1);
    const bestH = cand.reduce((a, h) => (rate(h) > rate(a) ? h : a), cand[0]);
    const worstH = cand.reduce((a, h) => (rate(h) < rate(a) ? h : a), cand[0]);
    const lunch = (hourTot[12] || 0) < ((hourTot[10] + hourTot[14]) / 2) * 0.7;
    const active = hourTot.map((v, h) => h).filter((h) => hourTot[h] > 0);
    aiCompose("aiHeat", {
      lead: `Cao điểm ${what} rơi vào <b>${peak}h–${peak + 1}h</b>; khung <b>${win}h–${win + 2}h</b> tập trung <b>${pctOf(hourTot[win] + hourTot[win + 1], all)}%</b> lưu lượng cả tuần.`,
      items: [
        { t: "info", h: `<b>${rows[bd].label}</b> là ngày nhiều ${what} nhất (<b>${nfmt(dayTot[bd])}</b>); cuối tuần chỉ chiếm <b>${weekend}%</b>.` },
        { t: "good", h: `Tỷ lệ nghe máy cao nhất lúc <b>${bestH}h</b> (${Math.round(rate(bestH) * 100)}%), thấp nhất lúc <b>${worstH}h</b> (${Math.round(rate(worstH) * 100)}%).` },
        lunch && { t: "info", h: `Lưu lượng giảm rõ trong giờ nghỉ trưa <b>12h–13h</b>.` },
        active.length && { t: "info", h: `Hoạt động gọi diễn ra từ <b>${active[0]}h</b> đến <b>${active[active.length - 1] + 1}h</b>; ngoài khung này gần như không có cuộc gọi.` },
      ],
      reco: [`Dồn chiến dịch gọi ra vào khung có tỷ lệ nghe máy cao (quanh ${bestH}h); dùng giờ thấp điểm cho gọi lại và follow-up.`],
    });
  }
  function renderAI() { aiOverview(); aiDuration(); aiStatus(); aiFunnel(); aiHeat(); }

  /* ---------- Calls list ---------- */
  function filteredCalls() {
    const bu = $("#callBu").value;
    return D.CALLS.filter((c) => {
      if (bu !== "all" && c.bu !== bu) return false;
      if (!inRange(c, selFrom, selTo)) return false;
      if (filterActive() && !(selExts.includes(extOf(c)) || selEmails.includes(emailOf(c)))) return false;
      if (statusActive() && !selStatuses.includes(c.status)) return false;
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
      <td><span class="call-email" data-email="${esc(emailOf(c))}" title="${esc(emailOf(c))}">${esc(emailOf(c))}</span></td>
      <td><span class="chip ${cls}">${c.dir}</span></td>
      <td>${esc(c.from)}</td>
      <td>${esc(c.to)}</td>
      <td><span class="chip chip--bu"><span class="chip-dot" style="background:${BU_DOT[c.bu]}"></span>${BU_LABEL[c.bu]}</span></td>
      <td>${esc(c.dur)}</td>
      <td><span class="chip chip--st" style="--st:${ST_RGB[c.status].join(",")}"><span class="chip-dot"></span>${ST_LABEL[c.status]}</span></td>
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
      : `<tr><td colspan="10" class="uv-empty">Không có cuộc gọi nào khớp bộ lọc</td></tr>`;
    $("#callsCount").textContent = `Hiển thị ${rows.length ? start + 1 : 0}–${start + slice.length} trên ${nfmt(rows.length)} cuộc gọi`;
    $("#callsPageInfo").textContent = `Trang ${callsPage} / ${pages}`;
    $("#callsPrev").disabled = callsPage <= 1;
    $("#callsNext").disabled = callsPage >= pages;
  }

  /* ---------- Filter: dropdown + pills (live) ---------- */
  /* ---------- Per-block status dropdown (single choice, with status dots) ----------
     Used by "Lưu lượng cuộc gọi" (+ its popup, shared value) and the heatmap.
     Only statuses inside the filter selection can be picked; a block sitting
     on a now-excluded status falls back to "Tất cả trạng thái". */
  const stAllowed = (k) => !statusActive() || selStatuses.includes(k);
  // "Tất cả" dot = a little ring of the statuses it currently covers
  function allDotStyle() {
    const keys = ST_KEYS.filter(stAllowed), n = keys.length || 1, stops = [];
    keys.forEach((k, i) => stops.push([stHex(k), ((i + 1) / n) * 100]));
    return `background:${conic(stops)}`;
  }
  const singleDot = (v) => `<span class="chip-dot st-dot" style="${v === "all" ? allDotStyle() : "background:" + stHex(v)}"></span>`;
  const singleLabel = (v) => (v === "all" ? "Tất cả trạng thái" : ST_LABEL[v]);
  const singleValue = (target) => (target === "heat" ? heatStatus : uvStatus);
  function singleMenuHtml(target) {
    const cur = singleValue(target);
    return ["all"].concat(ST_KEYS).map((k) => {
      const dis = k !== "all" && !stAllowed(k);
      return `<button type="button" class="st-opt st-opt--single${k === cur ? " is-current" : ""}" data-st-pick data-target="${target}" data-val="${k}" role="menuitemradio" aria-checked="${k === cur}"${dis ? " disabled" : ""}>${singleDot(k)}<span class="st-opt__label">${singleLabel(k)}</span><span class="st-opt__tick">${CHECK_SVG}</span></button>`;
    }).join("");
  }
  function renderSingleStatus() {
    $$("[data-st-single]").forEach((t) => {
      const target = t.getAttribute("data-target"), v = singleValue(target);
      t.innerHTML = `${singleDot(v)}<span class="st-single__label">${singleLabel(v)}</span>`;
      const menu = t.parentElement.querySelector("[data-st-menu]");
      if (!menu.hidden) menu.innerHTML = singleMenuHtml(target);
    });
  }
  function syncBlockStatusSelects() {
    if (uvStatus !== "all" && !stAllowed(uvStatus)) uvStatus = "all";
    if (heatStatus !== "all" && !stAllowed(heatStatus)) heatStatus = "all";
    renderSingleStatus();
  }
  function renderFiltered() {
    syncBlockStatusSelects();
    paintDonuts(); paintStatus(); renderChart(); renderTop5All(); renderUvTable(); renderSrTable(); renderFunnel(); renderHeatmap(); renderCalls(); renderAI();
  }
  // two combo scopes share the machinery: "filter" (live dashboard) + "export"
  // (the Xuất báo cáo dialog). Arrays are mutated in place, never reassigned.
  function storeFor(scope) { return scope === "export" ? { email: exEmails, ext: exExts, status: exStatuses } : { email: selEmails, ext: selExts, status: selStatuses }; }
  function arrFor(scope, type) { return storeFor(scope)[type]; }

  function resetFilter() {
    selEmails.length = 0; selExts.length = 0; selStatuses.length = 0; selFrom = ""; selTo = "";
    $$('[data-filter]').forEach((i) => { if ((i.getAttribute("data-scope") || "filter") === "filter") i.value = ""; });
    $$('[data-date]').forEach((i) => (i.value = ""));
    closeMenu(); closeStMenus(); $("#callBu").value = "all";
    callsPage = 1; renderPills("filter"); renderStatusPickers("filter"); renderFiltered();
  }

  const PILL_ICON = {
    email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
    ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 5h8"/><path d="M13 12h8"/><path d="M13 19h8"/><path d="m3 17 2 2 4-4"/><rect x="3" y="4" width="6" height="6" rx="1"/></svg>',
  };
  function pillHtml(scope, type, v) {
    const label = type === "ext" ? "Ext. " + v : type === "status" ? ST_LABEL[v] : v;
    const icon = type === "status" ? `<span class="fpill__dot" style="background:${stHex(v)}"></span>` : PILL_ICON[type];
    return `<span class="fpill">${icon}<span class="fpill__t">${esc(label)}</span><button class="fpill__x" data-pill-remove data-scope="${scope}" data-type="${type}" data-val="${esc(v)}" aria-label="Bỏ">×</button></span>`;
  }
  function renderPills(scope) {
    const st = storeFor(scope);
    const items = st.email.map((v) => pillHtml(scope, "email", v)).concat(st.ext.map((v) => pillHtml(scope, "ext", v)))
      .concat(ST_KEYS.filter((k) => st.status.includes(k)).map((v) => pillHtml(scope, "status", v)));
    const has = items.length > 0;
    $$(`[data-pills="${scope}"]`).forEach((box) => { box.innerHTML = items.join(""); box.hidden = !has; });
  }
  function addPill(scope, type, value) {
    const arr = arrFor(scope, type);
    if (!arr.includes(value)) arr.push(value);
    renderPills(scope); if (type === "status") renderStatusPickers(scope);
    if (scope === "filter") { callsPage = 1; renderFiltered(); }
  }
  function removePill(scope, type, value) {
    const arr = arrFor(scope, type), i = arr.indexOf(value);
    if (i >= 0) arr.splice(i, 1);
    renderPills(scope); if (type === "status") renderStatusPickers(scope);
    if (scope === "filter") { callsPage = 1; renderFiltered(); }
  }

  /* status dropdown (multi-select). Picking an option toggles a pill; the menu
     stays open so several statuses can be picked in a row. */
  const CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
  function stMenuHtml(scope) {
    const chosen = arrFor(scope, "status");
    return ST_KEYS.map((k) => `<button type="button" class="st-opt${chosen.includes(k) ? " is-checked" : ""}" data-st-opt data-scope="${scope}" data-val="${k}" role="menuitemcheckbox" aria-checked="${chosen.includes(k)}"><span class="st-opt__box">${CHECK_SVG}</span><span class="chip-dot" style="background:${stHex(k)}"></span><span class="st-opt__label">${ST_LABEL[k]}</span></button>`).join("");
  }
  function renderStatusPickers(scope) {
    const n = arrFor(scope, "status").length;
    $$(`[data-st-trigger][data-scope="${scope}"]`).forEach((t) => {
      t.textContent = n ? `Đã chọn ${n} trạng thái` : "Chọn trạng thái…";
      t.classList.toggle("has-value", n > 0);
      const menu = t.parentElement.querySelector("[data-st-menu]");
      if (!menu.hidden) menu.innerHTML = stMenuHtml(scope);
    });
  }
  function closeStMenus(except) {
    $$("[data-st-menu]").forEach((m) => { if (m !== except) { m.hidden = true; m.innerHTML = ""; } });
    $$("[data-st-trigger]").forEach((t) => t.setAttribute("aria-expanded", "false"));
  }
  function toggleStMenu(trigger) {
    const menu = trigger.parentElement.querySelector("[data-st-menu]");
    const open = menu.hidden;
    closeMenu(); closeStMenus(menu);
    if (open) { menu.innerHTML = trigger.hasAttribute("data-st-single") ? singleMenuHtml(trigger.getAttribute("data-target")) : stMenuHtml(trigger.getAttribute("data-scope")); menu.hidden = false; trigger.setAttribute("aria-expanded", "true"); }
    else closeStMenus();
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
    paintDonuts(); paintStatus(); renderChart(); renderTop5All();
    renderUvTable(); renderSrTable(); renderFunnel(); renderHeatmap(); renderCalls(); renderAI(); renderPills("filter"); renderPills("export");
    renderStatusPickers("filter"); renderStatusPickers("export"); renderSingleStatus();

    $("#tabs").addEventListener("click", (e) => { const b = e.target.closest(".tab"); if (b) activateTab(b.dataset.tab); });
    try { if (new URLSearchParams(location.search).get("tab") === "calls") activateTab("calls"); } catch (e) {}

    $("#rangeToggle").addEventListener("click", (e) => { const b = e.target.closest("button[data-range]"); if (!b) return; curRange = b.dataset.range; $$("#rangeToggle button").forEach((x) => x.classList.toggle("is-active", x === b)); renderChart(); aiOverview(); aiDuration(); });


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
      const stTrig = e.target.closest("[data-st-trigger]");
      if (stTrig) { toggleStMenu(stTrig); return; }
      const stPick = e.target.closest("[data-st-pick]");
      if (stPick) {
        if (stPick.disabled) return;
        const v = stPick.getAttribute("data-val");
        if (stPick.getAttribute("data-target") === "heat") setHeatStatus(v); else setUvStatus(v);
        closeStMenus(); return;
      }
      const stOpt = e.target.closest("[data-st-opt]");
      if (stOpt) {
        const sc = stOpt.getAttribute("data-scope"), v = stOpt.getAttribute("data-val");
        if (arrFor(sc, "status").includes(v)) removePill(sc, "status", v); else addPill(sc, "status", v);
        return;
      }
      if (!e.target.closest("[data-st-menu]")) closeStMenus();
      const rx = e.target.closest("[data-pill-remove]");
      if (rx) { removePill(rx.getAttribute("data-scope"), rx.getAttribute("data-type"), rx.getAttribute("data-val")); return; }
      if (e.target.closest("[data-filter-reset]")) { resetFilter(); return; }
      // Click an email / ext value in a table → add a pill (filters live),
      // staying on the current tab. Clicking inside the modal closes it first.
      const em = e.target.closest("[data-email]");
      if (em) { closeModal(); closeSrModal(); addPill("filter", "email", em.getAttribute("data-email")); return; }
      const ex = e.target.closest("[data-ext]");
      if (ex) { closeModal(); closeSrModal(); addPill("filter", "ext", ex.getAttribute("data-ext")); return; }
    });

    $("#uvDetailBtn").addEventListener("click", openModal);
    $("#uvModalClose").addEventListener("click", closeModal);
    $("#uvModal").addEventListener("click", (e) => { if (e.target.id === "uvModal") closeModal(); });
    $("#uvModalFilter").addEventListener("input", renderModalTable);
    $("#srDetailBtn").addEventListener("click", openSrModal);
    $("#srModalClose").addEventListener("click", closeSrModal);
    $("#srModal").addEventListener("click", (e) => { if (e.target.id === "srModal") closeSrModal(); });
    $("#srModalFilter").addEventListener("input", renderSrModalTable);

    // Export report
    $("#exportBtn").addEventListener("click", openExport);
    $("#exportClose").addEventListener("click", closeExport);
    $("#exportCancel").addEventListener("click", closeExport);
    $("#exportModal").addEventListener("click", (e) => { if (e.target.id === "exportModal") closeExport(); });
    $("#exportUseFilter").addEventListener("change", toggleExportFields);
    $("#exportRun").addEventListener("click", runExport);

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      // first Escape closes an open status menu, the next one the dialog
      if ($$("[data-st-menu]").some((m) => !m.hidden)) { closeStMenus(); return; }
      closeModal(); closeSrModal(); closeExport();
    });

    $("#callBu").addEventListener("change", () => { callsPage = 1; renderCalls(); });
    $("#callsPerPage").addEventListener("change", () => { callsPage = 1; renderCalls(); });
    $("#callsPrev").addEventListener("click", () => { if (callsPage > 1) { callsPage--; renderCalls(); } });
    $("#callsNext").addEventListener("click", () => { callsPage++; renderCalls(); });

    // keep the line chart's width/height crisp on resize
    let rz; window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(renderChart, 150); });
    // line-chart hover: tooltip + vertical guide + highlighted points.
    // pointer events unify mouse + touch; clear on leave/up/cancel so a tap on
    // touch devices doesn't leave a highlighted point stuck on the line.
    const chartHost = $("#chart");
    chartHost.addEventListener("pointermove", onChartMove);
    chartHost.addEventListener("pointerleave", onChartLeave);
    chartHost.addEventListener("pointerup", onChartLeave);
    chartHost.addEventListener("pointercancel", onChartLeave);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
