/* =============================================================================
   Mock data for the QC-Ops TCPVoiceAI dashboard demo.
   Figures seeded from the real production capture (qc-ops.talentconnectplus.edu.vn)
   then extended with a plausible distribution so every block has realistic content.
   "odoo" = number of that user's calls that originated in / were synced from Odoo.
   "Today" is pinned to T2 05/10/2026 (as on the live snapshot).
   ============================================================================= */
(function (global) {
  "use strict";

  const TODAY = new Date(2026, 9, 5); // 2026-10-05 (month is 0-based)
  const pad = (n) => String(n).padStart(2, "0");
  const ddmm = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;

  // Deterministic pseudo-random so the demo renders identically each load.
  let _seed = 20251005;
  function rand() { _seed = (_seed * 1103515245 + 12345) & 0x7fffffff; return _seed / 0x7fffffff; }
  function ri(min, max) { return Math.floor(min + rand() * (max - min + 1)); }

  /* ---- Overview headline figures (match the live snapshot) ---- */
  const OVERVIEW = {
    totalCalls: 11087,
    inboundPct: 39,
    outboundPct: 61,
    bu: { pso: 17, tcp: 1, unknown: 82 },
  };

  /* ---- Bar chart: 3 ranges, always populated, ending today (05/10/2026) ---- */
  function dayRange(n) {
    const labels = [], series = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(TODAY); d.setDate(TODAY.getDate() - i);
      labels.push(ddmm(d));
      const dow = d.getDay(); // 0 Sun .. 6 Sat
      const base = dow === 0 || dow === 6 ? 0.4 : 1;
      series.push({ in: Math.round(base * ri(8, 55)), out: Math.round(base * ri(10, 70)) });
    }
    return { labels, series, unit: "ngày" };
  }
  function monthRange(n) {
    const labels = [], series = [];
    const MON = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(TODAY.getFullYear(), TODAY.getMonth() - i, 1);
      labels.push(`${MON[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`);
      series.push({ in: ri(260, 820), out: ri(360, 1050) });
    }
    return { labels, series, unit: "tháng" };
  }
  const CHART = {
    "7d": Object.assign(dayRange(7), { avg: "3:48" }),
    "30d": Object.assign(dayRange(30), { avg: "3:41" }),
    "12m": Object.assign(monthRange(12), { avg: "4:05" }),
  };

  const TOP5_CALLER = [
    { id: "203", calls: 986, bu: "unknown" },
    { id: "2303", calls: 893, bu: "pso" },
    { id: "2302", calls: 351, bu: "pso" },
    { id: "196", calls: 347, bu: "unknown" },
    { id: "204", calls: 327, bu: "unknown" },
  ];
  const TOP5_CALLEE = [
    { id: "6200", calls: 1665, bu: "unknown" },
    { id: "6205", calls: 558, bu: "unknown" },
    { id: "110", calls: 271, bu: "unknown" },
    { id: "279", calls: 262, bu: "unknown" },
    { id: "6201", calls: 156, bu: "unknown" },
  ];

  /* ---- Heatmap: 7 days x 5 time buckets, split by call status ---- */
  let _hs = 7; function hr() { _hs = (_hs * 1103515245 + 12345) & 0x7fffffff; return _hs / 0x7fffffff; }
  const HEAT_LABELS = ["T2 · 05-10", "T3 · 06-10", "T4 · 07-10", "T5 · 08-10", "T6 · 09-10", "T7 · 10-10", "CN · 11-10"];
  const HEAT_WEIGHT = [
    [0.5, 1, 0.7, 1, 0.5], [0.6, 1, 0.8, 1, 0.5], [0.5, 0.9, 0.7, 0.9, 0.5],
    [0.6, 1, 0.8, 1.1, 0.6], [0.7, 1.2, 0.9, 1.2, 0.7], [0.2, 0.4, 0.3, 0.4, 0.2], [0.1, 0.3, 0.2, 0.3, 0.1],
  ];
  const HEATMAP = {
    cols: ["6–9h", "9–12h", "12–14h", "14–17h", "17–20h"],
    rows: HEAT_LABELS.map((label, r) => ({
      label,
      cells: HEAT_WEIGHT[r].map((w) => ({
        answered: Math.round(w * (6 + hr() * 10)),
        unanswered: Math.round(w * (1 + hr() * 4)),
      })),
    })),
  };

  /* ---- User-ID call-volume dataset ---- */
  const seeds = [
    ["203", 986], ["2303", 893], ["2302", 351], ["196", 347], ["204", 327],
    ["212", 318], ["231", 204], ["510", 142], ["522", 131], ["423", 96],
    ["6200", 1665], ["6205", 558], ["110", 271], ["279", 262], ["6201", 156],
    ["6202", 143], ["6210", 121], ["6305", 98], ["0983989878", 77], ["0979892297", 214],
    ["0903826230", 63], ["0963671679", 58], ["0765685911", 51], ["0866160366", 47],
    ["0903758626", 44], ["0906656898", 73], ["0768471839", 69], ["0912888021", 41],
    ["0987112233", 38], ["0901234567", 35],
  ];
  const USERS = seeds.map(([id, total]) => ({ id, total, odoo: Math.min(total, Math.round(total * (0.25 + rand() * 0.5))) }));
  const prefixes = ["20", "21", "23", "61", "62", "63", "0901", "0902", "0903", "0908", "0912", "0987"];
  for (let i = 0; i < 95; i++) {
    const pfx = prefixes[ri(0, prefixes.length - 1)];
    const id = pfx + String(ri(0, 9999)).padStart(pfx.length > 2 ? 6 : 2, "0");
    if (USERS.some((u) => u.id === id)) continue;
    const total = ri(3, 120);
    USERS.push({ id, total, odoo: Math.min(total, Math.round(total * (0.1 + rand() * 0.7))) });
  }
  USERS.sort((a, b) => b.total - a.total);

  global.DEMO_DATA = { OVERVIEW, CHART, TOP5_CALLER, TOP5_CALLEE, HEATMAP, USERS };
})(window);
