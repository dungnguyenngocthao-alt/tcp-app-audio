/* =============================================================================
   Mock data for the QC-Ops TCPVoiceAI dashboard demo.
   Numbers seeded from the real production capture (qc-ops.talentconnectplus.edu.vn)
   then extended with a plausible distribution so the new "call volume by user" block,
   its filter and the full-list popup all have realistic content to work with.
   "odoo" = number of that user's calls that were synced from / originated in Odoo.
   ============================================================================= */
(function (global) {
  "use strict";

  // Headline figures shown in the overview cards (match the live site snapshot).
  const OVERVIEW = {
    totalCalls: 11087,          // "11.087 cuộc gọi"
    uploaded: 0,                // "0 Cuộc gọi đã upload" (current range)
    uploadedDeltaPct: -100,     // "▼ -100% so với kỳ trước"
    avgDuration: "—",           // "TB thời lượng gọi"
    inboundPct: 39,
    outboundPct: 61,
    bu: { pso: 17, tcp: 1, unknown: 82 },
    rangeDays: ["05-10", "06-10", "07-10", "08-10", "09-10", "10-10", "11-10"],
    // near-zero current-week series (inbound/outbound per day) — matches live empty state
    series: [
      { in: 0, out: 0 }, { in: 0, out: 0 }, { in: 0, out: 0 }, { in: 0, out: 0 },
      { in: 0, out: 0 }, { in: 0, out: 0 }, { in: 0, out: 0 },
    ],
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

  // 7 rows x 5 time buckets heatmap. Each cell is split by call status so the
  // status tab list (All / Unanswered / Answered) has something to filter on.
  // (The live grid reads 0 only because it is the current/future week with no data yet.)
  let _hs = 7; function hr() { _hs = (_hs * 1103515245 + 12345) & 0x7fffffff; return _hs / 0x7fffffff; }
  const HEAT_LABELS = ["T2 · 05-10", "T3 · 06-10", "T4 · 07-10", "T5 · 08-10", "T6 · 09-10", "T7 · 10-10", "CN · 11-10"];
  // Relative busyness: weekdays busier midday/afternoon, weekend quieter.
  const HEAT_WEIGHT = [
    [0.5, 1, 0.7, 1, 0.5], [0.6, 1, 0.8, 1, 0.5], [0.5, 0.9, 0.7, 0.9, 0.5],
    [0.6, 1, 0.8, 1.1, 0.6], [0.7, 1.2, 0.9, 1.2, 0.7], [0.2, 0.4, 0.3, 0.4, 0.2], [0.1, 0.3, 0.2, 0.3, 0.1],
  ];
  const HEATMAP = {
    cols: ["6–9h", "9–12h", "12–14h", "14–17h", "17–20h"],
    rows: HEAT_LABELS.map((label, r) => ({
      label,
      cells: HEAT_WEIGHT[r].map((w) => {
        const answered = Math.round(w * (6 + hr() * 10));
        const unanswered = Math.round(w * (1 + hr() * 4));
        return { answered, unanswered };
      }),
    })),
  };

  /* ---------------------------------------------------------------------------
     USER-ID call-volume dataset (for the new table block).
     A mix of caller IDs, callee IDs and IDs that act as both.
     --------------------------------------------------------------------------- */
  // Deterministic pseudo-random so the demo renders identically each load.
  let _seed = 1337;
  function rand() { _seed = (_seed * 1103515245 + 12345) & 0x7fffffff; return _seed / 0x7fffffff; }
  function ri(min, max) { return Math.floor(min + rand() * (max - min + 1)); }

  const seeds = [
    // id, total, type  (odoo portion filled in below)
    ["203", 986, "caller"], ["2303", 893, "caller"], ["2302", 351, "caller"],
    ["196", 347, "caller"], ["204", 327, "caller"], ["212", 318, "caller"],
    ["231", 204, "caller"], ["510", 142, "caller"], ["522", 131, "caller"],
    ["423", 96, "both"],
    ["6200", 1665, "callee"], ["6205", 558, "callee"], ["110", 271, "callee"],
    ["279", 262, "callee"], ["6201", 156, "callee"], ["6202", 143, "callee"],
    ["6210", 121, "callee"], ["6305", 98, "callee"],
    ["0983989878", 77, "callee"], ["0979892297", 214, "both"],
    ["0903826230", 63, "callee"], ["0963671679", 58, "callee"],
    ["0765685911", 51, "callee"], ["0866160366", 47, "callee"],
    ["0903758626", 44, "callee"], ["0906656898", 73, "caller"],
    ["0768471839", 69, "caller"], ["0912888021", 41, "callee"],
    ["0987112233", 38, "callee"], ["0901234567", 35, "callee"],
  ];

  const USERS = seeds.map(([id, total, type]) => {
    const odoo = Math.min(total, Math.round(total * (0.25 + rand() * 0.5)));
    return { id, type, total, odoo };
  });

  // Extend with more generated IDs so the "view all" popup is substantial.
  const prefixes = ["20", "21", "23", "61", "62", "63", "0901", "0902", "0903", "0908", "0912", "0987"];
  for (let i = 0; i < 95; i++) {
    const pfx = prefixes[ri(0, prefixes.length - 1)];
    const id = pfx + String(ri(0, 9999)).padStart(pfx.length > 2 ? 6 : 2, "0");
    if (USERS.some((u) => u.id === id)) continue;
    const total = ri(3, 120);
    const odoo = Math.min(total, Math.round(total * (0.1 + rand() * 0.7)));
    const type = pfx.length > 2 ? (rand() < 0.4 ? "caller" : "callee") : (rand() < 0.55 ? "caller" : (rand() < 0.5 ? "callee" : "both"));
    USERS.push({ id, type, total, odoo });
  }

  USERS.sort((a, b) => b.total - a.total);

  global.DEMO_DATA = { OVERVIEW, TOP5_CALLER, TOP5_CALLEE, HEATMAP, USERS };
})(window);
