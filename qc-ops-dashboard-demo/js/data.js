/* =============================================================================
   Mock data for the QC-Ops TCPVoiceAI dashboard demo.
   Figures seeded from the real production capture (qc-ops.talentconnectplus.edu.vn).
   Extensions ("Ext.") are internal agents with a name + email; external parties in
   the call list are plain phone numbers. "Today" is pinned to 05/10/2026.
   ============================================================================= */
(function (global) {
  "use strict";

  const TODAY = new Date(2026, 9, 5);
  const pad = (n) => String(n).padStart(2, "0");
  const ddmm = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;

  let _seed = 20251005;
  function rand() { _seed = (_seed * 1103515245 + 12345) & 0x7fffffff; return _seed / 0x7fffffff; }
  function ri(min, max) { return Math.floor(min + rand() * (max - min + 1)); }
  function pick(a) { return a[ri(0, a.length - 1)]; }

  function deaccent(s) {
    return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
  }
  const FIRST = ["An", "Bình", "Chi", "Dũng", "Giang", "Hà", "Hải", "Hoa", "Hùng", "Khoa", "Lan", "Linh", "Long", "Mai", "Minh", "Nam", "Nga", "Ngọc", "Như", "Phong", "Phúc", "Quân", "Quỳnh", "Sơn", "Tâm", "Thảo", "Thành", "Trang", "Trung", "Tuấn", "Vân", "Việt", "Yến", "Đạt"];
  const LAST = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý"];
  const BUS = ["pso", "tcp", "unknown"];
  function pickBu() { const r = rand(); return r < 0.17 ? "pso" : r < 0.18 ? "tcp" : "unknown"; }

  /* ---- Extensions (internal agents) ---- */
  // [ext, totalCalls]  — the first block are the real Top-caller/callee extensions.
  const extSeeds = [
    ["203", 986], ["2303", 893], ["2302", 351], ["196", 347], ["204", 327],
    ["212", 318], ["231", 204], ["510", 142], ["522", 131], ["423", 96],
    ["6200", 1665], ["6205", 558], ["110", 271], ["279", 262], ["6201", 156],
    ["6202", 143], ["6210", 121], ["6305", 98], ["6306", 86], ["6207", 74],
    ["205", 69], ["206", 63], ["207", 58], ["233", 51], ["234", 47],
    ["511", 44], ["512", 41], ["235", 38], ["236", 35], ["6211", 31],
    ["6212", 28], ["208", 24], ["209", 21], ["513", 18], ["237", 14], ["238", 9],
  ];
  const usedEmails = {};
  const USERS = extSeeds.map(([ext, total]) => {
    const first = pick(FIRST), last = pick(LAST);
    let base = (deaccent(first) + "." + deaccent(last)).toLowerCase();
    let email = base + "@talentconnectplus.edu.vn";
    if (usedEmails[email]) { email = base + ext.slice(-2) + "@talentconnectplus.edu.vn"; }
    usedEmails[email] = 1;
    const inbound = Math.round(total * (0.3 + rand() * 0.35));
    const outbound = total - inbound;
    const odoo = Math.min(total, Math.round(total * (0.25 + rand() * 0.5)));
    return { ext, name: last + " " + first, email, total, inbound, outbound, odoo, bu: pickBu() };
  });
  USERS.sort((a, b) => b.total - a.total);
  const byExt = {}; USERS.forEach((u) => (byExt[u.ext] = u));

  /* ---- Overview headline (global, when no user selected) ---- */
  const OVERVIEW = { totalCalls: 11087, inboundPct: 39, outboundPct: 61, bu: { pso: 17, tcp: 1, unknown: 82 } };

  /* ---- Bar chart ranges (always populated, ending today) ---- */
  function dayRange(n) {
    const labels = [], series = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(TODAY); d.setDate(TODAY.getDate() - i);
      labels.push(ddmm(d));
      const base = (d.getDay() === 0 || d.getDay() === 6) ? 0.4 : 1;
      series.push({ in: Math.round(base * ri(8, 55)), out: Math.round(base * ri(10, 70)) });
    }
    return { labels, series };
  }
  function monthRange(n) {
    const labels = [], series = [], MON = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(TODAY.getFullYear(), TODAY.getMonth() - i, 1);
      labels.push(`${MON[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`);
      series.push({ in: ri(260, 820), out: ri(360, 1050) });
    }
    return { labels, series };
  }
  const CHART = {
    "7d": Object.assign(dayRange(7), { avg: "3:48" }),
    "30d": Object.assign(dayRange(30), { avg: "3:41" }),
    "12m": Object.assign(monthRange(12), { avg: "4:05" }),
  };

  /* ---- Top-5 caller / callee (show email) ---- */
  const topCallerExts = ["203", "2303", "2302", "196", "204"];
  const topCalleeExts = ["6200", "6205", "110", "279", "6201"];
  const callerCalls = { "203": 986, "2303": 893, "2302": 351, "196": 347, "204": 327 };
  const calleeCalls = { "6200": 1665, "6205": 558, "110": 271, "279": 262, "6201": 156 };
  const TOP5_CALLER = topCallerExts.map((e) => ({ ext: e, email: byExt[e].email, calls: callerCalls[e], bu: byExt[e].bu }));
  const TOP5_CALLEE = topCalleeExts.map((e) => ({ ext: e, email: byExt[e].email, calls: calleeCalls[e], bu: byExt[e].bu }));

  /* ---- Heatmap: 7 days x 24 hours (1 cell = 1 hour), split by status ---- */
  let _hs = 7; function hr() { _hs = (_hs * 1103515245 + 12345) & 0x7fffffff; return _hs / 0x7fffffff; }
  const HEAT_LABELS = ["T2 · 05-10", "T3 · 06-10", "T4 · 07-10", "T5 · 08-10", "T6 · 09-10", "T7 · 10-10", "CN · 11-10"];
  // hourly weight 0..23 — quiet overnight, busy 8-11 & 13-18
  const HOUR_W = [0, 0, 0, 0, 0, .05, .15, .4, .9, 1, 1, .85, .5, .8, 1, .95, .85, .6, .35, .2, .1, .05, 0, 0];
  const DAY_W = [1, 1, .95, 1.05, 1.1, .4, .25];
  const HEATMAP = {
    cols: Array.from({ length: 24 }, (_, h) => h),
    rows: HEAT_LABELS.map((label, r) => ({
      label,
      cells: HOUR_W.map((w) => {
        const scale = w * DAY_W[r];
        const answered = Math.round(scale * (8 + hr() * 14));
        const unanswered = Math.round(scale * (1 + hr() * 5));
        return { answered, unanswered };
      }),
    })),
  };

  /* ---- Call list rows ---- */
  const extPool = USERS.map((u) => u.ext);
  const phonePool = ["0983989878", "0979892297", "0903826230", "0963671679", "0765685911",
    "0866160366", "0903758626", "0906656898", "0768471839", "0912888021", "0987112233",
    "0901234567", "0938220145", "0905778990", "0918003476", "0902551300", "0933776512"];
  // The first rows mirror the live snapshot exactly.
  const CALLS_SEED = [
    ["1790665965.18048", "14:12 29/9/26", "510", "0983989878", "Outbound", "0:12", true],
    ["1790665935.18046", "14:12 29/9/26", "231", "0903826230", "Outbound", "0:32", true],
    ["1790665776.18040", "14:11 29/9/26", "0979892297", "6205", "Inbound", "3:24", true],
    ["1790665775.18038", "14:09 29/9/26", "212", "0963671679", "Outbound", "0:49", false],
    ["1790665687.18031", "14:09 29/9/26", "0979892297", "6205", "Inbound", "0:18", false],
    ["1790665665.18028", "14:07 29/9/26", "522", "0765685911", "Outbound", "0:19", false],
    ["1790665606.18026", "14:06 29/9/26", "212", "0866160366", "Outbound", "1:35", true],
    ["1790665446.18023", "14:04 29/9/26", "212", "0903758626", "Outbound", "0:53", true],
    ["1790665278.18012", "14:02 29/9/26", "0906656898", "423", "Inbound", "0:13", false],
    ["1790664434.18006", "13:47 29/9/26", "0768471839", "6200", "Inbound", "5:37", true],
  ];
  const CALLS = CALLS_SEED.map((r) => ({ id: r[0], time: r[1], from: r[2], to: r[3], dir: r[4], bu: "unknown", dur: r[5], rec: r[6] }));
  // generate more rows for pagination
  let callUid = 1790664400, mm = 44;
  for (let i = 0; i < 110; i++) {
    const dir = rand() < 0.62 ? "Outbound" : "Inbound";
    const ext = pick(extPool), phone = pick(phonePool);
    const from = dir === "Outbound" ? ext : phone;
    const to = dir === "Outbound" ? phone : ext;
    callUid -= ri(20, 160); mm -= 1; if (mm < 0) mm = 59;
    const hh = 13 - Math.floor(i / 12);
    const secs = ri(3, 380);
    const dur = Math.floor(secs / 60) + ":" + pad(secs % 60);
    CALLS.push({
      id: callUid + "." + (18005 - i), time: `${pad(Math.max(8, hh))}:${pad(ri(0, 59))} ${pick(["29/9/26", "28/9/26", "27/9/26"])}`,
      from, to, dir, bu: pickBu(), dur, rec: rand() < 0.6,
    });
  }
  const CALLS_TOTAL_LABEL = 11095; // headline total shown like the live site

  global.DEMO_DATA = {
    OVERVIEW, CHART, TOP5_CALLER, TOP5_CALLEE, HEATMAP, USERS, byExt, CALLS, CALLS_TOTAL_LABEL,
  };
})(window);
