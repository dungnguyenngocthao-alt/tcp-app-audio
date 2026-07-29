/* =============================================================================
   TCPVoiceAI — app interactions
   ============================================================================= */
(function () {
  "use strict";

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* -------------------------------------------------------------------------
     Screen navigation
     ------------------------------------------------------------------------- */
  const screens = {
    login:      $("#screen-login"),
    results:    $("#screen-results"),
    history:    $("#screen-history"),
    dashboard:  $("#screen-dashboard"),
    employees:  $("#screen-employees"),
    uploads:    $("#screen-uploads"),
    settings:   $("#screen-settings"),
  };

  function show(name) {
    Object.entries(screens).forEach(([key, el]) =>
      { if (el) el.classList.toggle("is-active", key === name); }
    );
    // reset scroll of the newly shown screen
    const active = screens[name];
    const scroller = $(".screen__scroll", active);
    if (scroller) scroller.scrollTop = 0;
    setActiveMenu(name);
    // The config card can only be measured once the analysis screen is visible.
  }

  /* -------------------------------------------------------------------------
     Burger menu — slide-in navigation drawer
     ------------------------------------------------------------------------- */
  const menu = $("#menu");

  function openMenu() {
    setActiveMenu(currentScreen());
    menu.hidden = false;
    $$("[data-burger]").forEach(b => b.setAttribute("aria-expanded", "true"));
  }
  function closeMenu() {
    menu.hidden = true;
    $$("[data-burger]").forEach(b => b.setAttribute("aria-expanded", "false"));
  }
  function currentScreen() {
    const el = document.querySelector(".screen.is-active");
    return el ? el.dataset.screen : "dashboard";
  }
  function setActiveMenu(screenName) {
    // Results has its own "Kết quả phân tích" menu entry; the primary
    // "Upload file" action is never marked active — it's a command.
    const active = screenName;
    $$(".drawer__item").forEach(item =>
      item.classList.toggle(
        "is-active",
        !item.classList.contains("drawer__item--primary") && item.dataset.nav === active
      )
    );
  }

  $$("[data-burger]").forEach(b => b.addEventListener("click", openMenu));
  $$("[data-menu-close]").forEach(b => b.addEventListener("click", closeMenu));
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !menu.hidden) closeMenu();
  });

  /* -------------------------------------------------------------------------
     Navigation actions — burger items + the results-screen back button.
     [data-nav]   → which screen to open ("analysis" is the only built target)
     [data-reset] → clear the current selection and start a fresh analysis
     ------------------------------------------------------------------------- */
  $$("[data-nav]").forEach(el =>
    el.addEventListener("click", () => {
      const target = el.dataset.nav;
      if (el.hasAttribute("data-reset")) resetAnalysis();
      if (target === "analysis" || target === "results" || target === "history" || target === "dashboard" || target === "employees" || target === "uploads" || target === "callhistory" || target === "settings" || target === "login") show(target);
      closeMenu();
    })
  );

  /* -------------------------------------------------------------------------
     Screen 0 · Login — Google sign-in only (mock gate → enters the app)
     ------------------------------------------------------------------------- */
  const googleLoginBtn = $("#googleLoginBtn");
  if (googleLoginBtn) googleLoginBtn.addEventListener("click", () => show("dashboard"));
  $$("[data-noop]").forEach(a => a.addEventListener("click", e => e.preventDefault()));

  /* -------------------------------------------------------------------------
     Screen 1 · upload source tabs
     ------------------------------------------------------------------------- */
  $$("[data-uptab]").forEach(tab =>
    tab.addEventListener("click", () => {
      const which = tab.dataset.uptab;
      $$("[data-uptab]").forEach(t => {
        const on = t === tab;
        t.classList.toggle("is-active", on);
        t.setAttribute("aria-selected", String(on));
      });
      $$("[data-uppane]").forEach(p =>
        p.hidden = p.dataset.uppane !== which
      );
      // Keep the AI config card available on both tabs.
      const pc = $("#screen-dashboard .card--profile");
      if (pc) pc.hidden = false;
      if (typeof syncProfileHeight === "function") syncProfileHeight();
    })
  );

  /* File picking + drag & drop — multiple files */
  const fileInput  = $("#fileInput");
  const browseBtn  = $("#browseBtn");
  const dropzone   = $("#dropzone");
  const fileListEl = $("#fileList");
  const procName   = $("#procFileName");
  const procMeta   = $("#procMeta");
  const DEFAULT_PROC_NAME = "Q3_Sales_Call_JohnDoe.wav";
  const DEFAULT_PROC_META = "Size: 45 MB • Thời lượng: 45:12";
  let selectedFiles = [];

  const FILE_ICON =
    '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M99.06,128.61a8,8,0,0,0-8.72,1.73L68.69,152H48a8,8,0,0,0-8,8v40a8,8,0,0,0,8,8H68.69l21.65,21.66A8,8,0,0,0,104,224V136A8,8,0,0,0,99.06,128.61ZM88,204.69,77.66,194.34A8,8,0,0,0,72,192H56V168H72a8,8,0,0,0,5.66-2.34L88,155.31ZM152,180a40.55,40.55,0,0,1-20,34.91A8,8,0,0,1,124,201.09a24.49,24.49,0,0,0,0-42.18A8,8,0,0,1,132,145.09,40.55,40.55,0,0,1,152,180Zm61.66-97.66-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40v80a8,8,0,0,0,16,0V40h88V88a8,8,0,0,0,8,8h48V216H168a8,8,0,0,0,0,16h32a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160Z"/></svg>';
  const XCLOSE_ICON =
    '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"/></svg>';

  function humanSize(bytes) {
    if (bytes == null) return "";
    const u = ["B", "KB", "MB", "GB"];
    let i = 0, n = bytes;
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return (i === 0 ? n : n.toFixed(1)) + " " + u[i];
  }

  function addFiles(list) {
    for (const f of Array.from(list || [])) {
      if (!selectedFiles.some(s => s.name === f.name && s.size === f.size)) selectedFiles.push(f);
    }
    renderFileList();
  }

  function renderFileList() {
    if (!selectedFiles.length) {
      fileListEl.hidden = true;
      fileListEl.innerHTML = "";
    } else {
      fileListEl.hidden = false;
      fileListEl.innerHTML = selectedFiles.map((f, i) => `
        <div class="filelist__row">
          <span class="filelist__icon">${FILE_ICON}</span>
          <div class="filelist__info">
            <div class="filelist__name" title="${escAttr(f.name)}">${f.name}</div>
            ${f.size != null ? `<div class="filelist__size">${humanSize(f.size)}</div>` : ""}
          </div>
          <button class="filelist__remove" type="button" data-remove="${i}" aria-label="Xóa tệp">${XCLOSE_ICON}</button>
        </div>`).join("");
    }
    updateProcLabel();
    syncProfileHeight();
  }

  function updateProcLabel() {
    const n = selectedFiles.length;
    if (!n) {
      procName.textContent = DEFAULT_PROC_NAME;
      if (procMeta) procMeta.textContent = DEFAULT_PROC_META;
      return;
    }
    procName.textContent = n === 1 ? selectedFiles[0].name : `${selectedFiles[0].name} +${n - 1} tệp`;
    if (procMeta) {
      const total = selectedFiles.reduce((a, f) => a + (f.size || 0), 0);
      procMeta.textContent = n + " tệp âm thanh" + (total ? " • " + humanSize(total) : "");
    }
  }

  /* Employee assignment (single-call upload) — the dropdown is kept in sync
     with the Nhân viên module. */
  const uploadEmp = $("#uploadEmp");
  function populateUploadEmp() {
    if (!uploadEmp) return;
    const cur = uploadEmp.value;
    uploadEmp.innerHTML = employees.map(e =>
      `<option value="${e.id}">${escAttr(e.name)} · ${escAttr(e.caller)}</option>`).join("");
    if (cur && employees.some(e => String(e.id) === cur)) uploadEmp.value = cur;
  }

  /* Upload-history helpers shared by single-call logging and bulk import. */
  let upIdSeq = 1043;
  function vnStamp(offsetMin) {
    const d = new Date(Date.now() - offsetMin * 60000);
    const p = n => String(n).padStart(2, "0");
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}, ${p(d.getHours())}:${p(d.getMinutes())}`;
  }
  function randPhone(h) {
    return "09" + String(10 + (h % 89)) + " " +
      String(100 + ((h >> 3) % 900)) + " " + String(100 + ((h >> 6) % 900));
  }
  // Record the just-analysed call(s) into the upload history, assigned to the
  // employee chosen on the upload screen.
  function logAnalyzedCall() {
    if (!selectedFiles.length || typeof UPLOAD_LOG === "undefined") return;
    const ag = employees.find(e => String(e.id) === String(uploadEmp && uploadEmp.value)) || employees[0];
    selectedFiles.forEach((f, i) => {
      const m = mockCall(f.name);
      const h = nameHash(f.name);
      UPLOAD_LOG.unshift({
        id: "UP-" + (upIdSeq++), time: vnStamp(i),
        agent: ag ? ag.name : "—", caller: ag ? ag.caller : "—",
        to: randPhone(h), dur: m.dur, rate: m.conf, outcome: m.type,
        file: f.name, date: resultDate || todayLabel(),
      });
    });
    if (typeof renderUploads === "function") renderUploads();
  }
  // Build a batch of call-log rows from a bulk source (Excel file / Sheet link).
  function genLogBatch(seed, n) {
    let h = nameHash(seed);
    const rows = [];
    for (let i = 0; i < n; i++) {
      h = (h * 31 + i * 97 + 13) >>> 0;
      const ag = employees[h % employees.length];
      const rate = 45 + (h % 50);
      const outcome = rate >= 80 ? "success" : rate >= 60 ? "warning" : "neutral";
      const id = "UP-" + (upIdSeq++);
      rows.push({
        id, time: vnStamp(i * 43 + (h % 30)),
        agent: ag.name, caller: ag.caller, to: randPhone(h),
        dur: (5 + (h % 25)) + ":" + String((h >> 2) % 60).padStart(2, "0"),
        rate, outcome, file: "Import_" + id + ".wav", date: todayLabel(),
      });
    }
    return rows;
  }

  const bulkFile   = $("#bulkFile");
  const bulkSheet  = $("#bulkSheet");
  const bulkResult = $("#bulkResult");
  const bulkImportBtn = $("#bulkImportBtn");
  function showBulkResult(msg, ok) {
    if (!bulkResult) return;
    bulkResult.hidden = false;
    bulkResult.className = "up-import-result " + (ok ? "is-ok" : "is-warn");
    bulkResult.textContent = msg;
  }
  if (bulkFile) bulkFile.addEventListener("change", () => {
    const f = bulkFile.files[0];
    if (f) showBulkResult("Đã chọn: " + f.name, true);
  });
  if (bulkImportBtn) bulkImportBtn.addEventListener("click", () => {
    const f = bulkFile && bulkFile.files[0];
    const link = bulkSheet ? bulkSheet.value.trim() : "";
    if (!f && !link) { showBulkResult("Chọn file Excel hoặc dán link Google Sheet để nhập.", false); return; }
    const src = f ? f.name : "Google Sheet";
    const rows = genLogBatch(f ? f.name : link, 5 + (nameHash(f ? f.name : link) % 4));
    if (typeof UPLOAD_LOG !== "undefined") UPLOAD_LOG.unshift(...rows);
    if (typeof renderUploads === "function") renderUploads();
    showBulkResult(`Đã nhập ${rows.length} cuộc gọi từ ${src} vào Đánh giá cuộc gọi.`, true);
    setTimeout(() => show("uploads"), 600);
  });

  /* The config card hugs its own content (no height matching with the upload
     column). Kept as a no-op so existing callers stay valid. */
  const profileCard = $("#screen-dashboard .card--profile");
  function syncProfileHeight() {
    if (profileCard) profileCard.style.height = "";
  }

  browseBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => { addFiles(fileInput.files); fileInput.value = ""; });

  /* Demo: load a few sample files so the multi-file flow is easy to try */
  const SAMPLE_FILES = [
    { name: "Q3_Sales_Call_JohnDoe.wav",   size: 47185920 },
    { name: "Demo_AcmeCorp_Round2.mp3",     size: 12582912 },
    { name: "Cold_Call_Nguyen_Minh.wav",    size: 33554432 },
    { name: "Renewal_BetaLogistics.flac",   size: 58720256 },
  ];
  const sampleBtn = $("#sampleBtn");
  if (sampleBtn) sampleBtn.addEventListener("click", () => addFiles(SAMPLE_FILES));
  fileListEl.addEventListener("click", e => {
    const rm = e.target.closest("[data-remove]");
    if (rm) { selectedFiles.splice(parseInt(rm.dataset.remove, 10), 1); renderFileList(); }
  });

  ["dragenter", "dragover"].forEach(evt =>
    dropzone.addEventListener(evt, e => {
      e.preventDefault();
      dropzone.classList.add("is-drag");
    })
  );
  ["dragleave", "drop"].forEach(evt =>
    dropzone.addEventListener(evt, e => {
      e.preventDefault();
      dropzone.classList.remove("is-drag");
    })
  );
  dropzone.addEventListener("drop", e => {
    if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files);
  });

  /* Sensitivity slider */
  const sensitivity = $("#sensitivity");
  const sensitivityValue = $("#sensitivityValue");
  const paintSlider = () => {
    const v = sensitivity.value;
    sensitivityValue.textContent = v + "%";
    sensitivity.style.background =
      `linear-gradient(90deg, var(--tcp-ink) 0 ${v}%, var(--tcp-neutral-200) ${v}% 100%)`;
  };
  sensitivity.addEventListener("input", paintSlider);
  paintSlider();

  /* AI model — chosen in the "AI Model Selection" card; echoed as a badge
     on the Analyzing screen. */
  const modelSelect   = $("#modelSelect");
  const procModelName = $("#procModelName");
  function currentModelName() {
    if (!modelSelect) return "TCPVoiceAI Insight 2.0 · Balanced";
    return modelSelect.options[modelSelect.selectedIndex].text;
  }

  /* -------------------------------------------------------------------------
     Screen 2 · processing simulation
     ------------------------------------------------------------------------- */
  const processBtn = $("#processBtn");
  const cancelBtn  = $("#cancelBtn");
  const procFill   = $("#procFill");
  const procPct    = $("#procPct");
  const procStage  = $("#procStage");
  const procModal  = $("#procModal");
  const procQueue  = $("#procQueue");
  function openProcModal() { if (procModal) procModal.hidden = false; }
  function closeProcModal() { if (procModal) procModal.hidden = true; }
  // Queue view — list the files being analysed, current one marked "processing".
  function renderProcQueue() {
    if (!procQueue) return;
    const files = (typeof selectedFiles !== "undefined" && selectedFiles.length)
      ? selectedFiles.map(f => f.name)
      : [$("#procFileName") ? $("#procFileName").textContent : "Cuộc gọi"];
    if (files.length < 2) { procQueue.hidden = true; procQueue.innerHTML = ""; return; }
    procQueue.hidden = false;
    procQueue.innerHTML =
      `<div class="proc-queue__head">Hàng đợi · ${files.length} tệp</div>` +
      files.map((n, i) => `
        <div class="proc-queue__item ${i === 0 ? "is-active" : ""}">
          <span class="proc-queue__dot"></span>
          <span class="proc-queue__name" title="${escAttr(n)}">${escAttr(n)}</span>
          <span class="proc-queue__state">${i === 0 ? "Đang xử lý" : "Chờ"}</span>
        </div>`).join("");
  }

  const STAGES = [
    { to: 18,  label: "Uploading audio stream..." },
    { to: 40,  label: "Normalizing waveform..." },
    { to: 71,  label: "Isolating speaker channels..." },
    { to: 88,  label: "Detecting sentiment & keywords..." },
    { to: 100, label: "Compiling intelligence report..." },
  ];

  let timer = null;
  let cancelled = false;

  function runProcessing() {
    cancelled = false;
    let pct = 0;
    let stageIdx = 0;
    setProgress(0, STAGES[0].label);

    timer = setInterval(() => {
      if (cancelled) return;
      pct = Math.min(pct + Math.random() * 4 + 1.5, 100);

      // advance stage label as thresholds are crossed
      while (stageIdx < STAGES.length - 1 && pct >= STAGES[stageIdx].to) stageIdx++;
      setProgress(pct, STAGES[stageIdx].label);

      if (pct >= 100) {
        clearInterval(timer);
        timer = null;
        setTimeout(() => {
          if (cancelled) return;
          closeProcModal();
          resultsBackTarget = "dashboard";
          renderFileStrip();
          selectResultFile(0);
          show("results");
          updateStripNav();   // measure now that the strip is on-screen
        }, 550);
      }
    }, 220);
  }

  function setProgress(pct, label) {
    const rounded = Math.round(pct);
    procFill.style.width = rounded + "%";
    procPct.textContent = rounded + "%";
    if (label) procStage.textContent = label;
  }

  /* Clear the current selection and return the upload form to its start state */
  function resetAnalysis() {
    cancelled = true;
    if (timer) { clearInterval(timer); timer = null; }
    if (fileInput) fileInput.value = "";
    selectedFiles = [];
    renderFileList();
    // Return the upload card to the "Tải cuộc gọi" tab and clear bulk inputs.
    const fileTab = $('[data-uptab="file"]');
    if (fileTab) fileTab.click();
    if (bulkFile) bulkFile.value = "";
    if (bulkSheet) bulkSheet.value = "";
    if (bulkResult) bulkResult.hidden = true;
    setProgress(0, STAGES[0].label);
  }

  processBtn.addEventListener("click", () => {
    if (procModelName) procModelName.textContent = currentModelName();
    if (typeof logAnalyzedCall === "function") logAnalyzedCall();
    renderProcQueue();
    openProcModal();
    runProcessing();
  });

  cancelBtn.addEventListener("click", () => {
    cancelled = true;
    if (timer) { clearInterval(timer); timer = null; }
    closeProcModal();
  });

  /* -------------------------------------------------------------------------
     Screen 3 · transcript sub-tabs + export
     ------------------------------------------------------------------------- */
  $$("[data-scripttab]").forEach(tab =>
    tab.addEventListener("click", () => {
      const which = tab.dataset.scripttab;
      $$("[data-scripttab]").forEach(t => t.classList.toggle("is-active", t === tab));
      $$("[data-scriptpane]").forEach(p =>
        p.hidden = p.dataset.scriptpane !== which
      );
    })
  );

  /* Briefly confirm an export action on any button */
  const CHECK_SVG =
    '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"/></svg>';
  function flashExport(btn, doneLabel) {
    if (btn.disabled) return;
    const original = btn.innerHTML;
    btn.innerHTML = CHECK_SVG + " " + doneLabel;
    btn.disabled = true;
    setTimeout(() => { btn.innerHTML = original; btn.disabled = false; }, 1600);
  }
  /* Same, but keeps an icon button icon-only (just swaps to a check) */
  function flashCheckIcon(btn) {
    if (btn.disabled) return;
    const original = btn.innerHTML;
    btn.innerHTML = CHECK_SVG;
    btn.disabled = true;
    setTimeout(() => { btn.innerHTML = original; btn.disabled = false; }, 1400);
  }
  /* Show/hide the results subtitle. It's redundant when the file strip is
     visible — the file name lives on the chip, so there's no subtitle. */

  /* Reusable confirm dialog */
  const confirmModal = $("#confirmModal");
  const confirmTitle = $("#confirmTitle");
  const confirmMsg   = $("#confirmMsg");
  const confirmOk    = $("#confirmOk");
  let confirmAction  = null;
  function showConfirm(opts) {
    if (!confirmModal) { if (opts.onConfirm) opts.onConfirm(); return; }
    confirmTitle.textContent = opts.title || "Xác nhận";
    confirmMsg.textContent = opts.message || "";
    confirmOk.textContent = opts.confirmLabel || "Xóa";
    confirmAction = opts.onConfirm || null;
    confirmModal.hidden = false;
  }
  function hideConfirm() { if (confirmModal) confirmModal.hidden = true; confirmAction = null; }
  if (confirmOk) confirmOk.addEventListener("click", () => { const a = confirmAction; hideConfirm(); if (a) a(); });
  $$("[data-confirm-cancel]").forEach(el => el.addEventListener("click", hideConfirm));
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && confirmModal && !confirmModal.hidden) hideConfirm();
  });

  const exportBtn = $("#exportBtn");
  if (exportBtn) exportBtn.addEventListener("click", () => {
    exportTranscript(currentResultName());
    flashCheckIcon(exportBtn);
  });

  /* -------------------------------------------------------------------------
     Screen 4 · History — past uploads with re-view / export, 10 per page
     ------------------------------------------------------------------------- */
  const HISTORY = [
    { file: "Q3_Sales_Call_JohnDoe.wav",   date: "10/26/2023, 2:30 PM", dur: "45:12", outcome: "Successful Sale", type: "success", conf: 98 },
    { file: "Demo_AcmeCorp_Round2.mp3",     date: "10/25/2023, 4:05 PM", dur: "32:48", outcome: "Follow-up",       type: "warning", conf: 74 },
    { file: "Cold_Call_Nguyen_Minh.wav",    date: "10/25/2023, 11:20 AM", dur: "18:03", outcome: "No Sale",         type: "neutral", conf: 61 },
    { file: "Renewal_BetaLogistics.flac",   date: "10/24/2023, 3:15 PM", dur: "27:39", outcome: "Successful Sale", type: "success", conf: 91 },
    { file: "Discovery_TechViet.mp3",       date: "10/24/2023, 9:48 AM", dur: "41:57", outcome: "Follow-up",       type: "warning", conf: 68 },
    { file: "Upsell_GreenFoods.wav",        date: "10/23/2023, 5:30 PM", dur: "22:14", outcome: "Successful Sale", type: "success", conf: 88 },
    { file: "Support_Escalation_042.mp3",   date: "10/23/2023, 1:02 PM", dur: "15:26", outcome: "No Sale",         type: "neutral", conf: 55 },
    { file: "Pitch_SaigonRetail.wav",       date: "10/22/2023, 10:11 AM", dur: "38:09", outcome: "Successful Sale", type: "success", conf: 94 },
    { file: "Q3_Review_HaiPhong.flac",      date: "10/21/2023, 4:44 PM", dur: "29:52", outcome: "Follow-up",       type: "warning", conf: 72 },
    { file: "Onboarding_DeltaBank.mp3",     date: "10/21/2023, 9:05 AM", dur: "34:18", outcome: "Successful Sale", type: "success", conf: 90 },
    { file: "Cold_Call_Tran_Anh.wav",       date: "10/20/2023, 2:57 PM", dur: "12:40", outcome: "No Sale",         type: "neutral", conf: 48 },
    { file: "Demo_OmniHealth.mp3",          date: "10/20/2023, 11:33 AM", dur: "26:05", outcome: "Follow-up",       type: "warning", conf: 66 },
    { file: "Renewal_VietStar.wav",         date: "10/19/2023, 3:21 PM", dur: "31:47", outcome: "Successful Sale", type: "success", conf: 87 },
    { file: "Discovery_MetroMall.flac",     date: "10/19/2023, 10:08 AM", dur: "44:29", outcome: "Follow-up",       type: "warning", conf: 70 },
    { file: "Pitch_BlueOcean.mp3",          date: "10/18/2023, 4:12 PM", dur: "19:55", outcome: "No Sale",         type: "neutral", conf: 52 },
    { file: "Upsell_SunMobile.wav",         date: "10/18/2023, 9:40 AM", dur: "23:33", outcome: "Successful Sale", type: "success", conf: 93 },
    { file: "Q3_Sales_PhuMy.mp3",           date: "10/17/2023, 1:50 PM", dur: "36:41", outcome: "Follow-up",       type: "warning", conf: 69 },
    { file: "Cold_Call_Le_Hoang.wav",       date: "10/17/2023, 10:26 AM", dur: "14:18", outcome: "No Sale",         type: "neutral", conf: 44 },
    { file: "Demo_NextGen_ERP.flac",        date: "10/16/2023, 3:38 PM", dur: "48:52", outcome: "Successful Sale", type: "success", conf: 96 },
    { file: "Renewal_CityLogistics.mp3",    date: "10/16/2023, 9:15 AM", dur: "28:07", outcome: "Successful Sale", type: "success", conf: 85 },
    { file: "Pitch_FreshMart.wav",          date: "10/15/2023, 2:44 PM", dur: "21:30", outcome: "Follow-up",       type: "warning", conf: 63 },
    { file: "Discovery_SkyTravel.mp3",      date: "10/15/2023, 11:02 AM", dur: "33:19", outcome: "No Sale",         type: "neutral", conf: 57 },
    { file: "Upsell_PrimeBank.wav",         date: "10/14/2023, 4:50 PM", dur: "25:44", outcome: "Successful Sale", type: "success", conf: 89 },
  ];

  const PER_PAGE = 10;
  const historyList  = $("#historyList");
  const historyPager = $("#historyPager");
  let historyPage = 1;

  const FILE_SVG =
    '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M99.06,128.61a8,8,0,0,0-8.72,1.73L68.69,152H48a8,8,0,0,0-8,8v40a8,8,0,0,0,8,8H68.69l21.65,21.66A8,8,0,0,0,104,224V136A8,8,0,0,0,99.06,128.61ZM88,204.69,77.66,194.34A8,8,0,0,0,72,192H56V168H72a8,8,0,0,0,5.66-2.34L88,155.31ZM152,180a40.55,40.55,0,0,1-20,34.91A8,8,0,0,1,124,201.09a24.49,24.49,0,0,0,0-42.18A8,8,0,0,1,132,145.09,40.55,40.55,0,0,1,152,180Zm61.66-97.66-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40v80a8,8,0,0,0,16,0V40h88V88a8,8,0,0,0,8,8h48V216H168a8,8,0,0,0,0,16h32a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160Z"/></svg>';
  const FOLDER_SVG =
    '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M216,72H131.31L104,44.69A15.86,15.86,0,0,0,92.69,40H40A16,16,0,0,0,24,56V200.62A15.4,15.4,0,0,0,39.38,216H216.89A15.13,15.13,0,0,0,232,200.89V88A16,16,0,0,0,216,72ZM40,56H92.69l16,16H40ZM216,200H40V88H216Z"/></svg>';
  const PENCIL_SVG =
    '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96a16,16,0,0,0,0-22.63ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.68,147.31,64l24-24L216,84.68Z"/></svg>';

  function escAttr(s) { return String(s).replace(/"/g, "&quot;"); }

  /* Mutable archive derived from HISTORY. Each file may live in a folder.
     (Dashboard keeps using the original HISTORY snapshot for its totals.) */
  let archSeq = 0;
  const archive = HISTORY.map(r => ({ ...r, id: ++archSeq, folder: null }));
  let folderSeq = 0;
  // Pre-seeded sample folders, one per sales rep, with a few calls filed away.
  const folders = [               // { id, name }
    { id: ++folderSeq, name: "Nguyễn Văn An" },
    { id: ++folderSeq, name: "Trần Thị Bình" },
    { id: ++folderSeq, name: "Lê Hoàng Cường" },
  ];
  [[0, 3, 7], [1, 4, 9], [2, 5]].forEach((idxs, fi) =>
    idxs.forEach(i => { if (archive[i]) archive[i].folder = folders[fi].id; })
  );
  let currentFolder = null;         // folder id, or null for the root
  let selectMode = false;
  const selected = new Set();       // selected file ids
  let renamingId = null;            // file id currently being renamed
  let pendingMoveToNew = false;     // "move into a brand-new folder" flow

  const A = {
    newFolderBtn:  $("#newFolderBtn"),
    selectModeBtn: $("#selectModeBtn"),
    newFolderRow:  $("#newFolderRow"),
    newFolderName: $("#newFolderName"),
    newFolderSave: $("#newFolderSave"),
    newFolderCancel: $("#newFolderCancel"),
    crumb:      $("#archCrumb"),
    crumbName:  $("#archCrumbName"),
    back:       $("#archBack"),
    foldersWrap:$("#archFolders"),
    selbar:     $("#archSelbar"),
    selCount:   $("#archSelCount"),
    moveTo:     $("#archMoveTo"),
    del:        $("#archDelete"),
  };

  const folderById = id => folders.find(f => f.id === id);
  const filesIn = folderId => archive.filter(it => it.folder === folderId);

  function renderArchive() {
    const inFolder = currentFolder !== null;

    // Breadcrumb
    A.crumb.hidden = !inFolder;
    if (inFolder) { const f = folderById(currentFolder); A.crumbName.textContent = f ? f.name : ""; }

    // Folder cards (only at the root)
    if (!inFolder && folders.length) {
      A.foldersWrap.hidden = false;
      A.foldersWrap.innerHTML = folders.map(f => `
        <div class="folder" data-folder="${f.id}" role="button" tabindex="0">
          <span class="folder__icon">${FOLDER_SVG}</span>
          <span class="folder__info">
            <span class="folder__name" title="${escAttr(f.name)}">${f.name}</span>
            <span class="folder__count">${filesIn(f.id).length} tệp</span>
          </span>
          <button class="folder__del" type="button" data-folder-del="${f.id}" aria-label="Xóa thư mục">${XCLOSE_ICON}</button>
        </div>`).join("");
    } else {
      A.foldersWrap.hidden = true;
      A.foldersWrap.innerHTML = "";
    }

    // Files in the current view
    const list = filesIn(currentFolder);
    const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    historyPage = Math.min(Math.max(1, historyPage), pages);
    const start = (historyPage - 1) * PER_PAGE;
    const rows = list.slice(start, start + PER_PAGE);

    historyList.innerHTML = rows.length
      ? rows.map(renderCard).join("")
      : `<p class="arch-empty">${inFolder ? "Thư mục này chưa có tệp nào." : "Chưa có tệp nào ở ngoài thư mục."}</p>`;
    renderPager(pages);

    // Selection bar
    A.selbar.hidden = !selectMode;
    if (selectMode) {
      A.selCount.textContent = selected.size + " đã chọn";
      A.del.disabled = selected.size === 0;
      renderMoveOptions();
    }
    A.selectModeBtn.classList.toggle("is-active", selectMode);
    A.selectModeBtn.setAttribute("aria-pressed", selectMode ? "true" : "false");
    A.selectModeBtn.title = selectMode ? "Xong" : "Chọn nhiều tệp";
    const selLabel = A.selectModeBtn.querySelector(".arch-select-btn__label");
    if (selLabel) selLabel.textContent = selectMode ? "Xong" : "Chọn nhiều";
  }

  function renderCard(r) {
    const checked = selected.has(r.id);
    const renaming = renamingId === r.id;
    const nameCell = renaming
      ? `<input class="hist__rename" type="text" value="${escAttr(r.file)}" data-rename-input="${r.id}" maxlength="60" autocomplete="off">`
      : `<div class="hist__name" title="${escAttr(r.file)}">${r.file}</div>`;
    let actions;
    if (renaming) {
      actions = `<button class="btn btn--ink btn--sm" type="button" data-rename-save="${r.id}">Lưu</button>
                 <button class="btn btn--outline btn--sm" type="button" data-rename-cancel>Hủy</button>`;
    } else if (selectMode) {
      actions = "";
    } else {
      actions = `<button class="iconbtn hist__rename-btn" type="button" data-rename="${r.id}" aria-label="Đổi tên" title="Đổi tên">${PENCIL_SVG}</button>
                 <button class="btn btn--outline btn--sm" type="button" data-view data-file="${escAttr(r.file)}" data-date="${escAttr(r.date)}">Xem lại</button>
                 <button class="btn btn--accent btn--sm" type="button" data-hist-export>Export</button>`;
    }
    return `
      <article class="hist${selectMode ? " hist--select" : ""}${checked ? " is-selected" : ""}" data-id="${r.id}">
        <div class="hist__head">
          <span class="hist__icon">${FILE_SVG}</span>
          <div class="hist__info">
            <div class="hist__titlerow">
              ${selectMode ? `<span class="hist__check${checked ? " is-checked" : ""}" aria-hidden="true">${checked ? CHECK_SVG : ""}</span>` : ""}
              ${nameCell}
              <span class="pill pill--${r.type}">${r.outcome}</span>
            </div>
            <div class="hist__meta">${r.date} &bull; ${r.dur}</div>
          </div>
        </div>
        <div class="hist__foot">
          <span class="hist__conf">Độ tin cậy <b>${r.conf}%</b></span>
          <div class="hist__actions">${actions}</div>
        </div>
      </article>`;
  }

  function renderMoveOptions() {
    let opts = `<option value="">Chuyển vào…</option>`;
    if (currentFolder !== null) opts += `<option value="__root__">↑ Đưa ra ngoài</option>`;
    opts += folders.filter(f => f.id !== currentFolder)
      .map(f => `<option value="${f.id}">${escAttr(f.name)}</option>`).join("");
    opts += `<option value="__new__">＋ Thư mục mới…</option>`;
    A.moveTo.innerHTML = opts;
    A.moveTo.value = "";
  }

  function renderPager(pages) {
    if (pages <= 1) { historyPager.innerHTML = ""; return; }
    let html = `<button class="page-btn" type="button" data-page="prev"
                  ${historyPage === 1 ? "disabled" : ""} aria-label="Trang trước">&lsaquo;</button>`;
    for (let i = 1; i <= pages; i++) {
      html += `<button class="page-btn ${i === historyPage ? "is-active" : ""}" type="button"
                 data-page="${i}" aria-label="Trang ${i}"
                 ${i === historyPage ? 'aria-current="page"' : ""}>${i}</button>`;
    }
    html += `<button class="page-btn" type="button" data-page="next"
               ${historyPage === pages ? "disabled" : ""} aria-label="Trang sau">&rsaquo;</button>`;
    historyPager.innerHTML = html;
  }

  /* --- Actions --------------------------------------------------------- */
  function openNewFolder() {
    A.newFolderRow.hidden = false;
    A.newFolderName.value = "";
    A.newFolderName.focus();
  }
  function closeNewFolder() { A.newFolderRow.hidden = true; pendingMoveToNew = false; }
  function saveNewFolder() {
    const name = A.newFolderName.value.trim();
    if (!name) { A.newFolderName.focus(); return; }
    const f = { id: ++folderSeq, name };
    folders.push(f);
    A.newFolderRow.hidden = true;
    if (pendingMoveToNew && selected.size) {
      archive.forEach(it => { if (selected.has(it.id)) it.folder = f.id; });
      selected.clear();
    }
    pendingMoveToNew = false;
    renderArchive();
  }
  function moveSelectedTo(folderId) {
    archive.forEach(it => { if (selected.has(it.id)) it.folder = folderId; });
    selected.clear();
    renderArchive();
  }
  function deleteSelected() {
    for (let i = archive.length - 1; i >= 0; i--) if (selected.has(archive[i].id)) archive.splice(i, 1);
    selected.clear();
    renderArchive();
  }
  function commitRename(id) {
    const inp = historyList.querySelector(`[data-rename-input="${id}"]`);
    const it = archive.find(a => a.id === id);
    if (inp && it) { const v = inp.value.trim(); if (v) it.file = v; }
    renamingId = null;
    renderArchive();
  }

  A.newFolderBtn.addEventListener("click", () => { pendingMoveToNew = false; openNewFolder(); });
  A.newFolderSave.addEventListener("click", saveNewFolder);
  A.newFolderCancel.addEventListener("click", closeNewFolder);
  A.newFolderName.addEventListener("keydown", e => {
    if (e.key === "Enter") saveNewFolder();
    else if (e.key === "Escape") closeNewFolder();
  });

  A.selectModeBtn.addEventListener("click", () => {
    selectMode = !selectMode;
    selected.clear();
    renamingId = null;
    renderArchive();
  });

  A.back.addEventListener("click", () => { currentFolder = null; historyPage = 1; renderArchive(); });

  A.foldersWrap.addEventListener("click", e => {
    const del = e.target.closest("[data-folder-del]");
    if (del) {
      const id = parseInt(del.dataset.folderDel, 10);
      const f = folderById(id);
      const n = filesIn(id).length;
      showConfirm({
        title: "Xóa thư mục?",
        message: `Thư mục "${f ? f.name : ""}" sẽ bị xóa.` + (n ? ` ${n} tệp bên trong sẽ được đưa ra ngoài.` : ""),
        confirmLabel: "Xóa thư mục",
        onConfirm: () => {
          archive.forEach(it => { if (it.folder === id) it.folder = null; });  // spill files back to root
          const i = folders.findIndex(fo => fo.id === id);
          if (i >= 0) folders.splice(i, 1);
          renderArchive();
        },
      });
      return;
    }
    const fo = e.target.closest("[data-folder]");
    if (fo) { currentFolder = parseInt(fo.dataset.folder, 10); historyPage = 1; renderArchive(); }
  });

  A.moveTo.addEventListener("change", () => {
    const v = A.moveTo.value;
    if (!v || !selected.size) { A.moveTo.value = ""; return; }
    if (v === "__new__") { pendingMoveToNew = true; openNewFolder(); A.moveTo.value = ""; return; }
    moveSelectedTo(v === "__root__" ? null : parseInt(v, 10));
  });
  A.del.addEventListener("click", () => {
    if (!selected.size) return;
    const n = selected.size;
    showConfirm({
      title: "Xóa tệp?",
      message: `${n} tệp đã chọn sẽ bị xóa vĩnh viễn.`,
      confirmLabel: "Xóa",
      onConfirm: deleteSelected,
    });
  });

  // Pagination clicks
  historyPager.addEventListener("click", e => {
    const btn = e.target.closest(".page-btn");
    if (!btn || btn.disabled) return;
    const pages = Math.max(1, Math.ceil(filesIn(currentFolder).length / PER_PAGE));
    const p = btn.dataset.page;
    if (p === "prev") historyPage--;
    else if (p === "next") historyPage++;
    else historyPage = parseInt(p, 10);
    renderArchive();
    const scroller = $(".screen__scroll", screens.history);
    if (scroller) scroller.scrollTop = 0;
  });

  // Card interactions: select-toggle, rename, re-view, export
  historyList.addEventListener("click", e => {
    const rOpen = e.target.closest("[data-rename]");
    if (rOpen) {
      renamingId = parseInt(rOpen.dataset.rename, 10);
      renderArchive();
      const inp = historyList.querySelector("[data-rename-input]");
      if (inp) { inp.focus(); inp.select(); }
      return;
    }
    if (e.target.closest("[data-rename-save]")) { commitRename(parseInt(e.target.closest("[data-rename-save]").dataset.renameSave, 10)); return; }
    if (e.target.closest("[data-rename-cancel]")) { renamingId = null; renderArchive(); return; }

    if (selectMode) {
      const card = e.target.closest(".hist");
      if (card) {
        const id = parseInt(card.dataset.id, 10);
        if (selected.has(id)) selected.delete(id); else selected.add(id);
        renderArchive();
      }
      return;
    }
    const view = e.target.closest("[data-view]");
    if (view) { showSingleResult(view.dataset.file, view.dataset.date, "history"); return; }
    const exp = e.target.closest("[data-hist-export]");
    if (exp) {
      const card = exp.closest(".hist");
      const it = card && archive.find(a => a.id === parseInt(card.dataset.id, 10));
      exportTranscript(it ? it.file : "");
      flashCheckIcon(exp);
    }
  });

  historyList.addEventListener("keydown", e => {
    const inp = e.target.closest("[data-rename-input]");
    if (!inp) return;
    if (e.key === "Enter") commitRename(parseInt(inp.dataset.renameInput, 10));
    else if (e.key === "Escape") { renamingId = null; renderArchive(); }
  });

  renderArchive();

  /* -------------------------------------------------------------------------
     Dashboard — aggregate metrics over all analysed calls (HISTORY)
     ------------------------------------------------------------------------- */
  const DL_SVG =
    '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M224,144v64a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V144a8,8,0,0,1,16,0v56H208V144a8,8,0,0,1,16,0Zm-101.66,5.66a8,8,0,0,0,11.32,0l40-40a8,8,0,0,0-11.32-11.32L136,124.69V32a8,8,0,0,0-16,0v92.69L93.66,98.34a8,8,0,0,0-11.32,11.32Z"/></svg>';

  // Parse a HISTORY "MM/DD/YYYY, h:mm AP" string into a local Date (day precision).
  function parseHistDate(s) {
    const [m, d, y] = s.split(",")[0].trim().split("/").map(Number);
    return new Date(y, m - 1, d);
  }
  // ISO yyyy-mm-dd (for <input type="date"> value/min/max)
  function isoDate(dt) {
    return dt.getFullYear() + "-" +
      String(dt.getMonth() + 1).padStart(2, "0") + "-" +
      String(dt.getDate()).padStart(2, "0");
  }
  const HIST_DATES = HISTORY.map(r => parseHistDate(r.date).getTime());
  const HIST_MIN = new Date(Math.min(...HIST_DATES));
  const HIST_MAX = new Date(Math.max(...HIST_DATES));
  // Volume shown in the call-direction donut for the full range (mock total).
  const PIE_TOTAL_FULL = 128, PIE_IN_RATIO = 79 / 128;

  function renderDashboard(subset) {
    const rows = subset || HISTORY;
    const fraction = HISTORY.length ? rows.length / HISTORY.length : 0;

    const rateEl = $("#dashAvgRate"), durEl = $("#dashAvgDur"),
          qualEl = $("#dashAvgQuality"), subEl = $("#dashRateSub");

    if (!rows.length) {
      if (rateEl) rateEl.textContent = "—";
      if (durEl) durEl.textContent = "—";
      if (qualEl) qualEl.textContent = "—";
      if (subEl) subEl.textContent = "Không có cuộc gọi trong khoảng này";
      renderCallPie(0);
      return;
    }

    const rates = rows.map(r => r.conf);
    const avgRate = Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
    const secs = rows.map(r => {
      const [m, s] = r.dur.split(":").map(Number);
      return m * 60 + s;
    });
    const avgSec = Math.round(secs.reduce((a, b) => a + b, 0) / secs.length);
    const mm = Math.floor(avgSec / 60), ss = avgSec % 60;
    // Audio quality tracks avg confidence, deterministic + clamped to a sane band.
    const quality = Math.min(9.6, Math.max(7.2, 7.4 + (avgRate - 60) / 100 * 3));

    if (rateEl) rateEl.textContent = avgRate + "%";
    if (durEl) durEl.textContent = mm + ":" + String(ss).padStart(2, "0");
    if (qualEl) qualEl.textContent = quality.toFixed(1);
    if (subEl) subEl.textContent = "trên " + rows.length + " cuộc gọi";

    // Volume counts scale with how much of the full range is selected.
    renderCallPie(fraction);
  }

  // Top 3 employees by success rate (fed by the Nhân viên module, so it's
  // rendered separately once `employees` exists).
  function renderDashTop3() {
    const list = $("#dashTop3");
    if (!list || typeof employees === "undefined" || !employees.length) return;
    const top = [...employees]
      .map(e => ({ e, rate: e.trend[e.trend.length - 1] }))
      .sort((a, b) => b.rate - a.rate).slice(0, 3);
    list.innerHTML = top.map((t, i) => {
      const e = t.e;
      const color = AVATAR_COLORS[nameHash(e.name) % AVATAR_COLORS.length];
      const rateClass = t.rate >= 70 ? "emp-rate--good" : t.rate >= 55 ? "emp-rate--mid" : "emp-rate--low";
      return `
        <div class="top3__row">
          <span class="top3__rank">${i + 1}</span>
          <span class="emp-avatar top3__avatar" style="background:${color}">${initials(e.name)}</span>
          <div class="top3__info">
            <div class="top3__name" title="${escAttr(e.name)}">${e.name}</div>
            <div class="top3__meta">Caller ID · ${escAttr(e.caller)}</div>
          </div>
          <span class="emp-rate ${rateClass}">${t.rate}%</span>
        </div>`;
    }).join("");
  }

  // Re-view (evaluation) / export transcript within a Top-3 row
  const dashTop3 = $("#dashTop3");
  if (dashTop3) {
    dashTop3.addEventListener("click", e => {
      const view = e.target.closest("[data-view]");
      if (view) {
        showSingleResult(view.dataset.file, view.dataset.date, "dashboard");
        return;
      }
      const exp = e.target.closest("[data-dash-export]");
      if (exp) {
        const row = exp.closest(".top3__row");
        const v = row && row.querySelector("[data-view]");
        exportTranscript(v ? v.dataset.file : "");
        flashCheckIcon(exp);
      }
    });
  }

  renderDashboard();

  /* Date-range filter — recompute the dashboard analysis over calls whose date
     falls within [from, to]. Inputs are bounded to the available data span. */
  (function initDateFilter() {
    const from = $("#dateFrom"), to = $("#dateTo"), reset = $("#dateReset");
    if (!from || !to) return;
    // Any date can be picked freely — no min/max bounds.
    // Default: "Từ" empty (open start), "Đến" = today.
    const todayISO = isoDate(new Date());
    const setDefaults = () => { from.value = ""; to.value = todayISO; };
    setDefaults();

    function apply() {
      // Empty "Từ" = open start; empty "Đến" = today. Swap if inverted.
      let a = from.value || "1970-01-01", b = to.value || todayISO;
      if (a > b) { const t = a; a = b; b = t; }
      const lo = new Date(a).getTime(), hi = new Date(b).getTime();
      const subset = HISTORY.filter(r => {
        const t = parseHistDate(r.date).getTime();
        return t >= lo && t <= hi;
      });
      renderDashboard(subset);
    }
    from.addEventListener("change", apply);
    to.addEventListener("change", apply);
    if (reset) reset.addEventListener("click", () => { setDefaults(); apply(); });
  })();

  /* Uploads-over-time bar chart (incoming + outgoing) with a range toggle.
     Each period shows two adjacent bars: [label, incoming, outgoing]. */
  const UPLOADS = {
    week: {
      total: 128,
      bars: [["T2", 9, 5], ["T3", 14, 8], ["T4", 11, 7], ["T5", 16, 10], ["T6", 19, 12], ["T7", 7, 4], ["CN", 4, 3]],
    },
    month: {
      total: 512,
      bars: Array.from({ length: 30 }, (_, i) => [String(i + 1), 4 + ((i * 5 + 2) % 15), 2 + ((i * 3 + 1) % 9)]),
    },
    year: {
      total: 4870,
      bars: [["T1", 200, 120], ["T2", 180, 110], ["T3", 220, 140], ["T4", 250, 160], ["T5", 230, 150],
             ["T6", 190, 110], ["T7", 210, 130], ["T8", 270, 180], ["T9", 290, 180], ["T10", 320, 200],
             ["T11", 340, 220], ["T12", 290, 180]],
    },
  };
  const chartTotal = $("#chartTotal");
  const chartPlot  = $("#chartPlot");
  const chartRange = $("#chartRange");
  function renderChart(range) {
    const d = UPLOADS[range];
    if (!d || !chartPlot) return;
    if (chartTotal) chartTotal.textContent = d.total.toLocaleString("vi-VN");
    const max = Math.max(...d.bars.map(b => Math.max(b[1], b[2])));
    const many = d.bars.length > 12;
    chartPlot.innerHTML = d.bars.map(([x, inc, out], i) => {
      const showX = !many || i % 5 === 0;
      return `<div class="chart-col" data-x="${x}" data-in="${inc}" data-out="${out}">
        <div class="chart-col__track">
          <div class="chart-col__bar chart-col__bar--in" style="height:${Math.max(3, Math.round(inc / max * 100))}%"></div>
          <div class="chart-col__bar chart-col__bar--out" style="height:${Math.max(3, Math.round(out / max * 100))}%"></div>
        </div>
        <div class="chart-col__x">${showX ? x : ""}</div>
      </div>`;
    }).join("");
  }
  if (chartRange) {
    chartRange.addEventListener("click", e => {
      const btn = e.target.closest(".seg__btn");
      if (!btn) return;
      $$(".seg__btn", chartRange).forEach(b => b.classList.toggle("is-active", b === btn));
      renderChart(btn.dataset.range);
    });
  }
  renderChart("week");

  /* Hover tooltip showing the incoming / outgoing counts for a period */
  const chartTip = $("#chartTip");
  function positionTip(col) {
    if (!chartTip) return;
    chartTip.innerHTML =
      `<div class="chart-tip__x">${col.dataset.x}</div>` +
      `<div class="chart-tip__row"><span class="cl-dot cl-dot--in"></span>Gọi đến: ${col.dataset.in}</div>` +
      `<div class="chart-tip__row"><span class="cl-dot cl-dot--out"></span>Gọi đi: ${col.dataset.out}</div>`;
    chartTip.hidden = false;
    const p = chartTip.parentElement.getBoundingClientRect();
    const c = col.getBoundingClientRect();
    chartTip.style.left = (c.left - p.left + c.width / 2) + "px";
    chartTip.style.top = (c.top - p.top - 8) + "px";
  }
  if (chartPlot && chartTip) {
    chartPlot.addEventListener("mouseover", e => {
      const col = e.target.closest(".chart-col");
      if (col) positionTip(col);
    });
    chartPlot.addEventListener("mousemove", e => {
      const col = e.target.closest(".chart-col");
      if (col) positionTip(col);
    });
    chartPlot.addEventListener("mouseleave", () => { chartTip.hidden = true; });
  }

  /* Call-direction donut — total incoming vs outgoing. `fraction` (0–1) scales
     the volume to the selected date range; the in/out split stays constant. */
  function renderCallPie(fraction) {
    const pie = $("#callPie");
    if (!pie) return;
    const f = fraction == null ? 1 : fraction;
    const total = Math.round(PIE_TOTAL_FULL * f);
    const inCount = Math.round(total * PIE_IN_RATIO);
    const inPct = total ? Math.round(inCount / total * 100) : 0;
    pie.style.background = `conic-gradient(#F97316 0 ${inPct}%, var(--tcp-accent) ${inPct}% 100%)`;
    const set = (id, v) => { const el = $("#" + id); if (el) el.textContent = v; };
    set("pieTotal", total.toLocaleString("vi-VN"));
    set("pieIn", inPct + "%");
    set("pieOut", (total ? 100 - inPct : 0) + "%");
  }

  /* -------------------------------------------------------------------------
     Screen 5b · Employees — per-agent calling performance, with add support
     ------------------------------------------------------------------------- */
  const AVATAR_COLORS = ["#6366F1", "#F97316", "#0EA5E9", "#10B981", "#E11D48", "#8B5CF6", "#F59E0B", "#14B8A6"];
  const TRASH_SVG =
    '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"/></svg>';
  function initials(name) {
    const parts = name.trim().split(/\s+/);
    const a = parts[0] ? parts[0][0] : "";
    const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (a + b).toUpperCase();
  }
  function nameHash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  }

  let empSeq = 0;
  const employees = [
    { id: ++empSeq, name: "Nguyễn Thị Hà",  caller: "1001", inbound: 142, outbound: 98,  trend: [61, 64, 68, 66, 72, 75, 78], last: "26/10/2023, 14:30" },
    { id: ++empSeq, name: "Trần Văn Dũng",   caller: "1002", inbound: 88,  outbound: 133, trend: [70, 69, 66, 64, 63, 60, 58], last: "26/10/2023, 11:05" },
    { id: ++empSeq, name: "Lê Hoàng Nam",    caller: "1003", inbound: 120, outbound: 120, trend: [55, 58, 60, 63, 67, 70, 73], last: "25/10/2023, 16:48" },
    { id: ++empSeq, name: "Phạm Minh Châu",  caller: "1004", inbound: 165, outbound: 71,  trend: [80, 82, 79, 83, 85, 84, 86], last: "25/10/2023, 09:20" },
    { id: ++empSeq, name: "Vũ Thanh Tùng",   caller: "1005", inbound: 64,  outbound: 96,  trend: [48, 50, 49, 52, 51, 54, 53], last: "24/10/2023, 15:12" },
  ];

  // Compact success-rate sparkline; green when trending up, red when down.
  function sparkline(vals) {
    const w = 88, h = 30, pad = 4;
    const min = Math.min(...vals), max = Math.max(...vals), span = (max - min) || 1;
    const xy = vals.map((v, i) => {
      const x = pad + i * (w - 2 * pad) / (vals.length - 1);
      const y = h - pad - (v - min) / span * (h - 2 * pad);
      return [x, y];
    });
    const up = vals[vals.length - 1] >= vals[0];
    const color = up ? "#16A34A" : "#DC2626";
    const pts = xy.map(p => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
    const last = xy[xy.length - 1];
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="none" aria-hidden="true">
      <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="2.6" fill="${color}"/>
    </svg>`;
  }

  const empTbody = $("#empTbody");
  // Column sorting — click a header to toggle ascending/descending.
  let empSort = { key: null, dir: 1 };   // dir: 1 = low→high (asc), -1 = high→low
  function parseEmpDate(s) {
    const m = /(\d{1,2})\/(\d{1,2})\/(\d{4}),\s*(\d{1,2}):(\d{2})/.exec(s || "");
    if (!m) return Number.POSITIVE_INFINITY;   // "Chưa có cuộc gọi" sorts as newest
    return new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]).getTime();
  }
  function empSortVal(e, key) {
    const rate = e.trend[e.trend.length - 1];
    if (key === "name")  return e.name.toLowerCase();
    if (key === "calls") return e.inbound + e.outbound;
    if (key === "rate")  return rate;
    if (key === "trend") return rate - e.trend[0];
    if (key === "last")  return parseEmpDate(e.last);
    return 0;
  }
  function renderEmployees() {
    if (!empTbody) return;
    const rows = employees.slice();
    if (empSort.key) {
      rows.sort((a, b) => {
        const va = empSortVal(a, empSort.key), vb = empSortVal(b, empSort.key);
        const c = typeof va === "string" ? va.localeCompare(vb, "vi") : va - vb;
        return c * empSort.dir;
      });
    }
    if (!rows.length) {
      empTbody.innerHTML = '<tr><td class="emp-empty" colspan="5">Không có nhân viên phù hợp với bộ lọc.</td></tr>';
      return;
    }
    empTbody.innerHTML = rows.map(e => {
      const total = e.inbound + e.outbound;
      const rate = e.trend[e.trend.length - 1];
      const delta = rate - e.trend[0];
      const up = delta >= 0;
      const color = AVATAR_COLORS[nameHash(e.name) % AVATAR_COLORS.length];
      const rateClass = rate >= 70 ? "emp-rate--good" : rate >= 55 ? "emp-rate--mid" : "emp-rate--low";
      return `
        <tr>
          <td class="emp-col-name">
            <div class="emp-person">
              <span class="emp-avatar" style="background:${color}">${initials(e.name)}</span>
              <div class="emp-person__meta">
                <div class="emp-person__name" title="${escAttr(e.name)}">${e.name}</div>
                <div class="emp-person__id">Caller ID · ${escAttr(e.caller)}</div>
              </div>
            </div>
          </td>
          <td>
            <div class="emp-total">${total.toLocaleString("vi-VN")}</div>
            <div class="emp-inout">
              <span><span class="cl-dot cl-dot--in"></span>${e.inbound} đến</span>
              <span><span class="cl-dot cl-dot--out"></span>${e.outbound} đi</span>
            </div>
          </td>
          <td><span class="emp-rate ${rateClass}">${rate}%</span></td>
          <td>
            <div class="emp-trend">
              ${sparkline(e.trend)}
              <span class="emp-delta ${up ? "emp-delta--up" : "emp-delta--down"}">${up ? "▲" : "▼"} ${Math.abs(delta)}%</span>
            </div>
          </td>
          <td class="emp-last">${e.last}</td>
          <td class="tbl-act">
            <button class="tbl-del emp-del" type="button" data-id="${e.id}" aria-label="Xóa nhân viên" title="Xóa nhân viên">${TRASH_SVG}</button>
          </td>
        </tr>`;
    }).join("");
    populateUploadEmp();
    if (typeof renderDashTop3 === "function") renderDashTop3();
  }
  // Delete an employee (with confirm).
  if (empTbody) empTbody.addEventListener("click", e => {
    const del = e.target.closest(".emp-del");
    if (!del) return;
    const id = parseInt(del.dataset.id, 10);
    const emp = employees.find(x => x.id === id);
    showConfirm({
      title: "Xóa nhân viên?",
      message: `Nhân viên "${emp ? emp.name : ""}" sẽ bị xóa khỏi danh sách.`,
      confirmLabel: "Xóa",
      onConfirm: () => {
        const i = employees.findIndex(x => x.id === id);
        if (i >= 0) employees.splice(i, 1);
        renderEmployees();
        updateSortIndicators();
      },
    });
  });
  function updateSortIndicators() {
    // Sortable headers show a neutral ⇅ by default (so they read as sortable),
    // and the active one shows the current direction.
    $$(".emp-th").forEach(th => {
      const active = th.dataset.sort === empSort.key;
      const caret = $(".emp-sort", th);
      if (caret) caret.textContent = active ? (empSort.dir === 1 ? "▲" : "▼") : "⇅";
      th.classList.toggle("is-sorted", active);
      th.setAttribute("aria-sort", active ? (empSort.dir === 1 ? "ascending" : "descending") : "none");
    });
  }
  $$(".emp-th").forEach(th =>
    th.addEventListener("click", () => {
      const key = th.dataset.sort;
      if (empSort.key === key) empSort.dir *= -1;   // toggle direction
      else empSort = { key, dir: 1 };               // new column → low→high first
      renderEmployees();
      updateSortIndicators();
    })
  );

  renderEmployees();
  updateSortIndicators();

  /* Add-employee modal (manual entry or Excel/CSV bulk upload) */
  const empModal   = $("#empModal");
  const empForm    = $("#empForm");
  const empName    = $("#empName");
  const empCaller  = $("#empCallerId");
  const empMode    = $("#empMode");
  const empFile    = $("#empFile");
  const empFileResult = $("#empFileResult");
  let empModeVal = "manual";
  let empImport = [];   // parsed rows pending from an uploaded file

  // Add one agent with plausible, deterministic seeded stats.
  function addEmployee(name, caller) {
    const h = nameHash(name + "|" + caller + "|" + (++empSeq));
    const base = 52 + (h % 34);
    const trend = Array.from({ length: 7 }, (_, i) =>
      Math.max(20, Math.min(96, base + Math.round((i - 3) * (((h >> (i + 1)) % 5) - 2)))));
    employees.unshift({
      id: empSeq, name, caller: caller || String(1000 + (h % 9000)),
      inbound: 20 + (h % 160), outbound: 20 + ((h >> 4) % 160),
      trend, last: "Chưa có cuộc gọi",
    });
  }

  // Parse CSV/TSV text → [{name, caller}]. Skips an obvious header row.
  function parseImport(text) {
    const out = [];
    text.split(/\r?\n/).forEach((line, i) => {
      if (!line.trim()) return;
      const cells = line.split(/[,;\t]/).map(c => c.trim().replace(/^"|"$/g, ""));
      if (i === 0 && /tên|name|họ|caller/i.test(line)) return;   // header
      if (cells[0]) out.push({ name: cells[0], caller: cells[1] || "" });
    });
    return out;
  }

  function setEmpMode(mode) {
    empModeVal = mode;
    if (empMode) $$(".seg__btn", empMode).forEach(b => b.classList.toggle("is-active", b.dataset.empmode === mode));
    $$("[data-emppane]").forEach(p => { p.hidden = p.dataset.emppane !== mode; });
  }
  if (empMode) empMode.addEventListener("click", e => {
    const btn = e.target.closest(".seg__btn");
    if (btn) setEmpMode(btn.dataset.empmode);
  });

  if (empFile) {
    empFile.addEventListener("change", () => {
      const f = empFile.files[0];
      empImport = [];
      if (!f) { if (empFileResult) empFileResult.hidden = true; return; }
      const reader = new FileReader();
      reader.onload = () => {
        empImport = parseImport(String(reader.result || ""));
        if (empFileResult) {
          empFileResult.hidden = false;
          empFileResult.className = "emp-upload__result" + (empImport.length ? " is-ok" : " is-warn");
          empFileResult.textContent = empImport.length
            ? `${f.name} · đọc được ${empImport.length} nhân viên`
            : `${f.name} · không đọc được dữ liệu. Dùng file .csv với cột: Họ tên, Caller ID.`;
        }
      };
      reader.readAsText(f);
    });
  }

  function openEmpModal() {
    if (!empModal) return;
    empForm.reset();
    empImport = [];
    if (empFileResult) empFileResult.hidden = true;
    setEmpMode("manual");
    empModal.hidden = false;
    setTimeout(() => empName && empName.focus(), 30);
  }
  function closeEmpModal() { if (empModal) empModal.hidden = true; }
  const empAddBtn = $("#empAddBtn");
  if (empAddBtn) empAddBtn.addEventListener("click", openEmpModal);
  $$("[data-emp-cancel]").forEach(el => el.addEventListener("click", closeEmpModal));
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && empModal && !empModal.hidden) closeEmpModal();
  });
  if (empForm) {
    empForm.addEventListener("submit", e => {
      e.preventDefault();
      if (empModeVal === "excel") {
        if (!empImport.length) { if (empFile) empFile.click(); return; }
        empImport.forEach(r => addEmployee(r.name, r.caller));
      } else {
        const name = (empName.value || "").trim();
        if (!name) { empName.focus(); return; }
        addEmployee(name, (empCaller.value || "").trim());
      }
      renderEmployees();
      updateSortIndicators();
      closeEmpModal();
    });
  }

  /* -------------------------------------------------------------------------
     Screen 5c · Upload history — every analysed call, with a detail link
     ------------------------------------------------------------------------- */
  const UP_OUTCOME = { success: "Tư vấn xuất sắc", warning: "Tư vấn hiệu quả", neutral: "Cần cải thiện" };
  const UPLOAD_LOG = [
    { id: "UP-1042", time: "26/10/2023, 14:30", agent: "Nguyễn Thị Hà", caller: "1001", to: "0901 234 567", dur: "12:45", rate: 82, outcome: "success", file: "Q3_Sales_Call_JohnDoe.wav",  date: "10/26/2023, 2:30 PM" },
    { id: "UP-1041", time: "26/10/2023, 11:05", agent: "Trần Văn Dũng",  caller: "1002", to: "0912 888 021", dur: "08:33", rate: 47, outcome: "neutral", file: "Cold_Call_Nguyen_Minh.wav",  date: "10/25/2023, 11:20 AM" },
    { id: "UP-1040", time: "25/10/2023, 16:48", agent: "Lê Hoàng Nam",   caller: "1003", to: "0987 112 233", dur: "15:20", rate: 73, outcome: "warning", file: "Demo_AcmeCorp_Round2.mp3",   date: "10/25/2023, 4:05 PM" },
    { id: "UP-1039", time: "25/10/2023, 09:20", agent: "Phạm Minh Châu",  caller: "1004", to: "0903 456 789", dur: "22:14", rate: 86, outcome: "success", file: "Renewal_BetaLogistics.flac", date: "10/24/2023, 3:15 PM" },
    { id: "UP-1038", time: "24/10/2023, 15:12", agent: "Vũ Thanh Tùng",  caller: "1005", to: "0938 220 145", dur: "06:57", rate: 53, outcome: "neutral", file: "Discovery_TechViet.mp3",     date: "10/24/2023, 9:48 AM" },
    { id: "UP-1037", time: "24/10/2023, 10:02", agent: "Nguyễn Thị Hà",  caller: "1001", to: "0977 654 321", dur: "18:41", rate: 79, outcome: "warning", file: "Upsell_GreenFoods.wav",      date: "10/23/2023, 5:30 PM" },
    { id: "UP-1036", time: "23/10/2023, 13:47", agent: "Phạm Minh Châu",  caller: "1004", to: "0905 778 990", dur: "27:39", rate: 91, outcome: "success", file: "Pitch_SaigonRetail.wav",     date: "10/22/2023, 10:11 AM" },
    { id: "UP-1035", time: "23/10/2023, 08:15", agent: "Lê Hoàng Nam",   caller: "1003", to: "0918 003 476", dur: "10:08", rate: 64, outcome: "warning", file: "Q3_Review_HaiPhong.flac",    date: "10/21/2023, 4:44 PM" },
  ];

  const upTbody   = $("#upTbody");
  const upPager   = $("#upPager");
  const upFrom    = $("#upFrom");
  const upTo      = $("#upTo");
  const upAgent   = $("#upAgent");
  const upReset   = $("#upReset");
  const UP_PER_PAGE = 6;
  let upPage = 1;

  function parseUpTime(s) {          // "dd/mm/yyyy, HH:MM" → epoch (day precision)
    const m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s || "");
    return m ? new Date(+m[3], +m[2] - 1, +m[1]).getTime() : 0;
  }
  function durToSec(d) { const [m, s] = String(d).split(":").map(Number); return (m || 0) * 60 + (s || 0); }
  // The confirmed rate: a manual re-evaluation overrides the AI's.
  function effRate(u) { return u.reviewed ? u.userRate : u.rate; }

  function populateUpAgent() {
    if (!upAgent) return;
    const names = [...new Set(UPLOAD_LOG.map(u => u.agent))];
    const cur = upAgent.value;
    upAgent.innerHTML = '<option value="all">Tất cả</option>' +
      names.map(n => `<option value="${escAttr(n)}">${n}</option>`).join("");
    if (cur && (cur === "all" || names.includes(cur))) upAgent.value = cur;
  }
  function filteredUploads() {
    const lo = upFrom && upFrom.value ? new Date(upFrom.value).getTime() : -Infinity;
    const hi = upTo && upTo.value ? new Date(upTo.value).getTime() : Infinity;
    const ag = upAgent ? upAgent.value : "all";
    return UPLOAD_LOG.filter(u => {
      const t = parseUpTime(u.time);
      return t >= lo && t <= hi && (ag === "all" || u.agent === ag);
    });
  }
  function renderUpStats(list) {
    const set = (id, v) => { const el = $("#" + id); if (el) el.textContent = v; };
    set("upStatCount", list.length.toLocaleString("vi-VN"));
    if (!list.length) { set("upStatDur", "—"); set("upStatRate", "—"); return; }
    const avgSec = Math.round(list.reduce((a, u) => a + durToSec(u.dur), 0) / list.length);
    set("upStatDur", Math.floor(avgSec / 60) + ":" + String(avgSec % 60).padStart(2, "0"));
    set("upStatRate", Math.round(list.reduce((a, u) => a + effRate(u), 0) / list.length) + "%");
  }
  function renderUpPager(pages) {
    if (!upPager) return;
    if (pages <= 1) { upPager.innerHTML = ""; return; }
    let html = `<button class="page-btn" type="button" data-uppage="prev" ${upPage === 1 ? "disabled" : ""} aria-label="Trang trước">&lsaquo;</button>`;
    for (let i = 1; i <= pages; i++)
      html += `<button class="page-btn ${i === upPage ? "is-active" : ""}" type="button" data-uppage="${i}" ${i === upPage ? 'aria-current="page"' : ""}>${i}</button>`;
    html += `<button class="page-btn" type="button" data-uppage="next" ${upPage === pages ? "disabled" : ""} aria-label="Trang sau">&rsaquo;</button>`;
    upPager.innerHTML = html;
  }
  function renderUploads() {
    if (!upTbody) return;
    populateUpAgent();
    const list = filteredUploads();
    renderUpStats(list);
    const pages = Math.max(1, Math.ceil(list.length / UP_PER_PAGE));
    if (upPage > pages) upPage = pages;
    const slice = list.slice((upPage - 1) * UP_PER_PAGE, upPage * UP_PER_PAGE);
    if (!slice.length) {
      upTbody.innerHTML = '<tr><td class="emp-empty" colspan="8">Không có cuộc gọi phù hợp với bộ lọc.</td></tr>';
      renderUpPager(pages);
      return;
    }
    upTbody.innerHTML = slice.map(u => {
      const color = AVATAR_COLORS[nameHash(u.agent) % AVATAR_COLORS.length];
      const eff = effRate(u);
      const rateClass = eff >= 70 ? "emp-rate--good" : eff >= 55 ? "emp-rate--mid" : "emp-rate--low";
      const srcTag = u.reviewed
        ? '<span class="up-src up-src--user" title="Kết quả do người dùng chốt">Đã chốt</span>'
        : '<span class="up-src up-src--ai" title="Kết quả do AI đánh giá">AI</span>';
      return `
        <tr>
          <td class="up-id">${u.id}</td>
          <td class="emp-last">${u.time}</td>
          <td class="emp-col-name">
            <div class="emp-person">
              <span class="emp-avatar" style="background:${color}">${initials(u.agent)}</span>
              <div class="emp-person__meta">
                <div class="emp-person__name" title="${escAttr(u.agent)}">${u.agent}</div>
                <div class="emp-person__id">Caller ID · ${escAttr(u.caller)}</div>
              </div>
            </div>
          </td>
          <td class="up-to">${u.to}</td>
          <td class="up-dur">${u.dur}</td>
          <td><span class="emp-rate ${rateClass}">${eff}%</span>${srcTag}</td>
          <td class="up-note">${u.reviewed && u.note ? `<span class="up-note__text" title="${escAttr(u.note)}">${escAttr(u.note)}</span>` : '<span class="up-note__empty">—</span>'}</td>
          <td>
            <div class="up-actions">
              <button class="btn btn--outline btn--sm up-review" type="button" data-id="${escAttr(u.id)}" ${u.reviewed ? "disabled" : ""}>Đánh giá lại</button>
              <button class="btn btn--outline btn--sm up-detail" type="button"
                      data-file="${escAttr(u.file)}" data-date="${escAttr(u.date)}">Xem chi tiết</button>
              <button class="tbl-del up-del" type="button" data-id="${escAttr(u.id)}" aria-label="Xóa cuộc gọi" title="Xóa cuộc gọi">${TRASH_SVG}</button>
            </div>
          </td>
        </tr>`;
    }).join("");
    renderUpPager(pages);
  }
  renderUploads();
  if (upTbody) {
    upTbody.addEventListener("click", e => {
      const del = e.target.closest(".up-del");
      if (del) {
        const id = del.dataset.id;
        const u = UPLOAD_LOG.find(x => x.id === id);
        showConfirm({
          title: "Xóa cuộc gọi?",
          message: `Cuộc gọi ${id}${u ? ` (${u.agent})` : ""} sẽ bị xóa khỏi Đánh giá cuộc gọi.`,
          confirmLabel: "Xóa",
          onConfirm: () => {
            const i = UPLOAD_LOG.findIndex(x => x.id === id);
            if (i >= 0) UPLOAD_LOG.splice(i, 1);
            renderUploads();
          },
        });
        return;
      }
      const rev = e.target.closest(".up-review");
      if (rev) { openReview(rev.dataset.id); return; }
      const btn = e.target.closest(".up-detail");
      if (btn) showSingleResult(btn.dataset.file, btn.dataset.date, "uploads");
    });
  }
  [upFrom, upTo, upAgent].forEach(el => el && el.addEventListener("change", () => { upPage = 1; renderUploads(); }));
  if (upReset) upReset.addEventListener("click", () => {
    if (upFrom) upFrom.value = ""; if (upTo) upTo.value = ""; if (upAgent) upAgent.value = "all";
    upPage = 1; renderUploads();
  });
  if (upPager) upPager.addEventListener("click", e => {
    const btn = e.target.closest(".page-btn");
    if (!btn) return;
    const list = filteredUploads();
    const pages = Math.max(1, Math.ceil(list.length / UP_PER_PAGE));
    const v = btn.dataset.uppage;
    if (v === "prev") upPage = Math.max(1, upPage - 1);
    else if (v === "next") upPage = Math.min(pages, upPage + 1);
    else upPage = parseInt(v, 10);
    renderUploads();
  });

  /* -------------------------------------------------------------------------
     Screen 5d · Call history — the imported call sheet, rendered as a plain
     read-only table (same columns as Đánh giá cuộc gọi, no filter/pagination).
     ------------------------------------------------------------------------- */
  const chTbody = $("#chTbody");
  const chCount = $("#chCount");
  const CH_HOTLINE = "1900 6068";
  const CH_TRANSCRIPTS = [
    "Xin chào anh/chị, em gọi từ Talent Connect Plus để tư vấn gói dịch vụ mới…",
    "Cảm ơn anh đã dành thời gian, mình xin phép trao đổi nhanh về nhu cầu tuyển dụng…",
    "Dạ bên em đang có chương trình ưu đãi cho khách hàng đăng ký trong tháng này…",
    "Em hiểu băn khoăn của chị về chi phí, để em phân tích ROI cụ thể hơn ạ…",
    "Anh cho em xin thông tin quy mô đội ngũ hiện tại để tư vấn chính xác nhất…",
    "Vâng ạ, em sẽ gửi bản demo và báo giá qua email ngay sau cuộc gọi này…",
    "Mình xác nhận lại lịch triển khai và các đầu mục bàn giao như đã trao đổi…",
    "Cảm ơn chị đã tin tưởng, em sẽ theo sát để đảm bảo trải nghiệm tốt nhất ạ…",
  ];
  // Derived sheet fields, stable per call id (doesn't touch the shared model).
  function chMeta(u) {
    const h = nameHash(u.id + "|" + u.agent);
    const inbound = h % 2 === 0;
    const sec = durToSec(u.dur);
    const sizeMb = Math.max(0.4, (sec * 0.13) / 60 * 8).toFixed(1); // ~mono voice recording
    return {
      type: inbound ? "Inbound" : "Outbound",
      from: inbound ? u.to : CH_HOTLINE,
      to:   inbound ? CH_HOTLINE : u.to,
      size: sizeMb + " MB",
      url:  "https://rec.talentconnect.plus/calls/" + u.id + ".wav",
      transcript: CH_TRANSCRIPTS[h % CH_TRANSCRIPTS.length],
    };
  }
  function renderCallHistory() {
    if (!chTbody) return;
    if (chCount) chCount.textContent = UPLOAD_LOG.length.toLocaleString("vi-VN") + " cuộc gọi";
    if (!UPLOAD_LOG.length) {
      chTbody.innerHTML = '<tr><td class="emp-empty" colspan="10">Chưa có cuộc gọi nào.</td></tr>';
      return;
    }
    chTbody.innerHTML = UPLOAD_LOG.map(u => {
      const color = AVATAR_COLORS[nameHash(u.agent) % AVATAR_COLORS.length];
      const m = chMeta(u);
      const typeClass = m.type === "Inbound" ? "ch-type--in" : "ch-type--out";
      return `
        <tr>
          <td class="up-id">${u.id}</td>
          <td class="emp-last">${u.time}</td>
          <td class="up-to">${escAttr(m.from)}</td>
          <td class="up-to">${escAttr(m.to)}</td>
          <td class="emp-col-name">
            <div class="emp-person">
              <span class="emp-avatar" style="background:${color}">${initials(u.agent)}</span>
              <div class="emp-person__meta">
                <div class="emp-person__name" title="${escAttr(u.agent)}">${u.agent}</div>
                <div class="emp-person__id">Caller ID · ${escAttr(u.caller)}</div>
              </div>
            </div>
          </td>
          <td><span class="ch-type ${typeClass}">${m.type}</span></td>
          <td class="up-dur">${u.dur}</td>
          <td class="ch-size">${m.size}</td>
          <td class="ch-url-cell"><a class="ch-url" href="${escAttr(m.url)}" target="_blank" rel="noopener" title="${escAttr(m.url)}">${u.id}.wav</a></td>
          <td class="ch-transcript" title="${escAttr(m.transcript)}">${escAttr(m.transcript)}</td>
        </tr>`;
    }).join("");
  }
  renderCallHistory();

  /* Đánh giá cuộc gọi · view switch — evaluation table vs. raw call sheet. */
  $$("[data-upview]").forEach(btn => btn.addEventListener("click", () => {
    const view = btn.dataset.upview;
    $$("[data-upview]").forEach(b => {
      const on = b === btn;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    $$("[data-uppane2]").forEach(p => { p.hidden = p.dataset.uppane2 !== view; });
    if (view === "sheet") renderCallHistory();
  }));

  /* Manual re-evaluation — the user confirms/overrides the AI result. */
  const reviewModal   = $("#reviewModal");
  const reviewForm    = $("#reviewForm");
  const reviewRate    = $("#reviewRate");
  const reviewRateVal = $("#reviewRateVal");
  const reviewNote    = $("#reviewNote");
  const reviewInfo    = $("#reviewInfo");
  const reviewAiRate  = $("#reviewAiRate");
  let reviewId = null;
  function openReview(id) {
    const u = UPLOAD_LOG.find(x => x.id === id);
    if (!u || !reviewModal) return;
    reviewId = id;
    if (reviewInfo) reviewInfo.textContent = `${u.id} · ${u.agent} (${u.caller}) → ${u.to}`;
    if (reviewAiRate) reviewAiRate.textContent = u.rate + "%";
    const eff = effRate(u);
    if (reviewRate) reviewRate.value = eff;
    if (reviewRateVal) reviewRateVal.textContent = eff + "%";
    if (reviewNote) reviewNote.value = u.note || "";
    reviewModal.hidden = false;
  }
  function closeReview() { if (reviewModal) reviewModal.hidden = true; reviewId = null; }
  if (reviewRate) reviewRate.addEventListener("input", () => {
    if (reviewRateVal) reviewRateVal.textContent = reviewRate.value + "%";
  });
  $$("[data-review-cancel]").forEach(el => el.addEventListener("click", closeReview));
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && reviewModal && !reviewModal.hidden) closeReview();
  });
  if (reviewForm) reviewForm.addEventListener("submit", e => {
    e.preventDefault();
    const u = UPLOAD_LOG.find(x => x.id === reviewId);
    if (u) {
      u.userRate = parseInt(reviewRate.value, 10);
      u.reviewed = true;
      u.note = (reviewNote.value || "").trim();
    }
    const wasCurrentResult = reviewId === resultUploadId;
    renderUploads();
    closeReview();
    // Reflect the confirmed result on the Results screen if it's showing it.
    if (wasCurrentResult && typeof selectResultFile === "function") selectResultFile(currentResultIndex);
  });

  /* -------------------------------------------------------------------------
     File strip — when several files are analysed together, show them as a
     horizontal, scrollable row at the top of the Results screen. Selecting a
     chip swaps the analysis below to that file (keeping the normal layout).
     ------------------------------------------------------------------------- */
  const fileStrip       = $("#fileStrip");
  const fileStripScroll = $("#fileStripScroll");
  const fileStripCount  = $("#fileStripCount");
  const fileStripPrev   = $("#fileStripPrev");
  const fileStripNext   = $("#fileStripNext");
  const NAV_THRESHOLD   = 2;   // need >2 files before arrows can appear
  const OUTCOME_LABEL = { success: "Tư vấn xuất sắc", warning: "Tư vấn hiệu quả", neutral: "Cần cải thiện" };
  // AI infers call direction from the agent's opening lines
  const DIRECTION_LABEL = { in: "Gọi đến", out: "Gọi đi" };

  /* Show the scroll arrows whenever the strip actually overflows (and there
     are more than 2 files) — so on a narrow phone even 3 files get arrows,
     while a wide screen only shows them when the row truly needs scrolling.
     Disable whichever arrow can't move any further. */
  function updateStripNav() {
    if (!fileStripPrev || !fileStripNext) return;
    const many = resultFiles.length > NAV_THRESHOLD;
    const scrollable = fileStripScroll.scrollWidth > fileStripScroll.clientWidth + 2;
    const show = many && scrollable;
    fileStripPrev.hidden = !show;
    fileStripNext.hidden = !show;
    if (!show) return;
    const x = fileStripScroll.scrollLeft;
    const max = fileStripScroll.scrollWidth - fileStripScroll.clientWidth;
    fileStripPrev.disabled = x <= 1;
    fileStripNext.disabled = x >= max - 1;
  }
  if (fileStripScroll) {
    fileStripScroll.addEventListener("scroll", updateStripNav, { passive: true });
    window.addEventListener("resize", updateStripNav);
  }
  function scrollStrip(dir) {
    fileStripScroll.scrollBy({ left: dir * fileStripScroll.clientWidth * 0.8, behavior: "smooth" });
  }
  if (fileStripPrev) fileStripPrev.addEventListener("click", () => scrollStrip(-1));
  if (fileStripNext) fileStripNext.addEventListener("click", () => scrollStrip(1));

  let resultFiles = [];   // names shown in the current strip
  let resultDate  = "";
  let resultsBackTarget = "dashboard";   // where the results back-button returns to

  const resultsBackBtn = $("[data-results-back]");
  if (resultsBackBtn) resultsBackBtn.addEventListener("click", () => {
    if (resultsBackTarget === "dashboard") { resetAnalysis(); show("dashboard"); }
    else show(resultsBackTarget);
  });

  function todayLabel() {
    const d = new Date();
    let h = d.getHours();
    const ap = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}, ${h}:${String(d.getMinutes()).padStart(2, "0")} ${ap}`;
  }

  // Deterministic mock metrics per file so results look realistic + stable
  function mockCall(name) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    // Spread wide enough that some calls land in the low-confidence (<30%) band
    const conf = name === DEFAULT_PROC_NAME ? 78 : 12 + (h % 87);
    const type = conf >= 85 ? "success" : conf >= 66 ? "warning" : "neutral";
    const dur = (16 + (h % 30)) + ":" + String((h >>> 3) % 60).padStart(2, "0");
    const direction = (h % 5) < 3 ? "in" : "out";
    return { conf, type, dur, outcome: OUTCOME_LABEL[type], direction };
  }

  // Build the horizontal strip of analysed files. Always shown — a single
  // result renders one chip (no subtitle).
  function renderFileStrip(names) {
    resultFiles = names || (selectedFiles.length ? selectedFiles.map(f => f.name) : [DEFAULT_PROC_NAME]);
    if (!fileStrip) return;

    fileStrip.hidden = false;
    if (fileStripCount) fileStripCount.textContent = resultFiles.length + " tệp đã phân tích";
    fileStripScroll.innerHTML = resultFiles.map((name, i) => {
      const m = mockCall(name);
      return `
        <button class="fchip${m.conf < 30 ? " fchip--low" : ""}" type="button" data-chip="${i}" title="${escAttr(name)}">
          <span class="fchip__icon">${FILE_ICON}</span>
          <span class="fchip__info">
            <span class="fchip__name">${name}</span>
            <span class="fchip__meta">
              <span class="fchip__dir fchip__dir--${m.direction}">${DIRECTION_LABEL[m.direction]}</span>
              <span class="fchip__stats">${m.conf}% &bull; ${m.dur}</span>
            </span>
          </span>
        </button>`;
    }).join("");
    fileStripScroll.scrollLeft = 0;
    updateStripNav();
  }

  let currentResultIndex = 0;
  let resultUploadId = null;

  // Swap the analysis below to a given file (by index into resultFiles)
  function selectResultFile(index) {
    currentResultIndex = index;
    const name = resultFiles[index] || DEFAULT_PROC_NAME;
    const m = mockCall(name);
    // Link this result to its upload-history record (so it can be evaluated).
    const rec = (typeof UPLOAD_LOG !== "undefined") ? UPLOAD_LOG.find(u => u.file === name) : null;
    resultUploadId = rec ? rec.id : null;
    const shownRate = rec ? effRate(rec) : m.conf;

    const title = $("#screen-results .outcome__title");
    const pct   = $("#screen-results .outcome__pct");
    if (title) title.textContent = m.outcome;
    if (pct)   pct.textContent = shownRate + "%";

    // Tint the outcome card by consultation rate: >60 green, 40–60 amber, <40 pink
    const outcome = $("#screen-results .outcome");
    const card = outcome && outcome.closest(".card");
    if (card) {
      card.classList.remove("outcome-card--good", "outcome-card--mid", "outcome-card--low");
      card.classList.add(shownRate > 60 ? "outcome-card--good" : shownRate >= 40 ? "outcome-card--mid" : "outcome-card--low");
    }

    if (fileStripScroll) {
      $$(".fchip", fileStripScroll).forEach(c =>
        c.classList.toggle("is-active", parseInt(c.dataset.chip, 10) === index)
      );
      const active = fileStripScroll.querySelector(".fchip.is-active");
      if (active) active.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
    if (typeof resetAudioPreview === "function") resetAudioPreview(m.dur);
    renderOutcomeReview();
  }

  // In-result evaluation panel — confirm the AI result or override it.
  function renderOutcomeReview() {
    const box = $("#outcomeReview");
    if (!box) return;
    const rec = (typeof UPLOAD_LOG !== "undefined") ? UPLOAD_LOG.find(u => u.id === resultUploadId) : null;
    if (!rec) { box.hidden = true; box.innerHTML = ""; renderOutcomeDetail(null); return; }
    box.hidden = false;
    if (rec.reviewed) {
      box.innerHTML =
        `<span class="outcome-review__tag outcome-review__tag--user">✓ Đã chốt bởi bạn · ${rec.userRate}%</span>` +
        `<button class="btn btn--outline btn--sm" type="button" data-outcome-review disabled>Đánh giá lại</button>`;
    } else {
      box.innerHTML =
        `<span class="outcome-review__tag outcome-review__tag--ai">Kết quả AI · chưa đánh giá tay</span>` +
        `<button class="btn btn--accent btn--sm" type="button" data-outcome-review>Đánh giá &amp; chốt kết quả</button>`;
    }
    renderOutcomeDetail(rec);
  }

  // Evaluation detail card — appears below "Tỷ lệ tư vấn" once reviewed.
  function renderOutcomeDetail(rec) {
    const box = $("#outcomeDetail");
    if (!box) return;
    if (!rec || !rec.reviewed) { box.hidden = true; box.innerHTML = ""; return; }
    const diff = rec.userRate - rec.rate;
    const diffTxt = (diff > 0 ? "+" : "") + diff + "%";
    const diffClass = diff > 0 ? "review-detail__delta--up" : diff < 0 ? "review-detail__delta--down" : "review-detail__delta--flat";
    const note = (rec.note || "").trim();
    box.hidden = false;
    box.innerHTML =
      `<div class="result-card__label">
        <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M243.28,68.24l-24-23.56a16,16,0,0,0-22.59,0L104,136.94V152h16l92.68-92.24,24,23.56L144,175.6V192h16l83.28-82.76a16,16,0,0,0,0-22.62ZM216,208H40V32h96a8,8,0,0,0,0-16H40A16,16,0,0,0,24,32V208a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V152a8,8,0,0,0-16,0Z"/></svg>
        Chi tiết đánh giá
      </div>
      <div class="review-detail__grid">
        <div class="review-detail__item">
          <span class="review-detail__k">Đánh giá của AI</span>
          <span class="review-detail__v">${rec.rate}%</span>
        </div>
        <div class="review-detail__item">
          <span class="review-detail__k">Bạn chốt</span>
          <span class="review-detail__v review-detail__v--user">${rec.userRate}%</span>
        </div>
        <div class="review-detail__item">
          <span class="review-detail__k">Chênh lệch</span>
          <span class="review-detail__v ${diffClass}">${diffTxt}</span>
        </div>
      </div>
      <div class="review-detail__note">
        <span class="review-detail__k">Chú thích</span>
        <p class="review-detail__notetext">${note ? escAttr(note) : "Không có ghi chú."}</p>
      </div>`;
  }
  {
    const box = $("#outcomeReview");
    if (box) box.addEventListener("click", e => {
      if (e.target.closest("[data-outcome-review]") && resultUploadId) openReview(resultUploadId);
    });
  }

  /* Results · mock audio preview player (play/pause sweeps the waveform) */
  const audioPlay  = $("#audioPlay");
  const audioWave  = $("#audioWave");
  const audioCur   = $("#audioCur");
  const audioDurEl = $("#audioDur");
  let audioTimer = null, audioProg = 0, audioTotalSec = 0;
  (function buildAudioWave() {
    if (!audioWave) return;
    let h = 987654321, html = "";
    for (let i = 0; i < 44; i++) {
      h = (h * 1103515245 + 12345) & 0x7fffffff;
      html += `<span class="audioprev__bar" style="height:${24 + (h % 74)}%"></span>`;
    }
    audioWave.innerHTML = html;
  })();
  function fmtSec(s) { return Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0"); }
  function togglePlayIcons(playing) {
    // Use the attribute (SVGElement.hidden doesn't reflect to the DOM attribute).
    const pl = audioPlay && audioPlay.querySelector(".audioprev__ico-play");
    const pa = audioPlay && audioPlay.querySelector(".audioprev__ico-pause");
    if (pl) pl.toggleAttribute("hidden", playing);
    if (pa) pa.toggleAttribute("hidden", !playing);
  }
  function paintAudioProgress() {
    const bars = audioWave ? audioWave.children : [];
    const k = Math.round(audioProg * bars.length);
    for (let i = 0; i < bars.length; i++) bars[i].classList.toggle("is-played", i < k);
    if (audioCur) audioCur.textContent = fmtSec(audioProg * audioTotalSec);
  }
  function stopAudio() {
    if (audioTimer) { clearInterval(audioTimer); audioTimer = null; }
    if (audioPlay) audioPlay.classList.remove("is-playing");
    togglePlayIcons(false);
  }
  function resetAudioPreview(durStr) {
    stopAudio();
    audioProg = 0;
    audioTotalSec = durToSec(durStr || "0:00");
    if (audioDurEl) audioDurEl.textContent = durStr || "0:00";
    paintAudioProgress();
  }
  if (audioPlay) audioPlay.addEventListener("click", () => {
    if (audioTimer) { stopAudio(); return; }
    if (audioProg >= 1) audioProg = 0;
    audioPlay.classList.add("is-playing");
    togglePlayIcons(true);
    const step = 80 / 9000;   // full sweep in ~9s
    audioTimer = setInterval(() => {
      audioProg = Math.min(1, audioProg + step);
      paintAudioProgress();
      if (audioProg >= 1) stopAudio();
    }, 80);
  });

  if (fileStripScroll) {
    fileStripScroll.addEventListener("click", e => {
      const chip = e.target.closest("[data-chip]");
      if (chip) selectResultFile(parseInt(chip.dataset.chip, 10));
    });
  }

  // Seed the strip with a single default chip so the Results screen always
  // shows at least one file (e.g. when opened straight from the menu).
  renderFileStrip([DEFAULT_PROC_NAME]);
  selectResultFile(0);

  // Opening a single call from History / Dashboard: show it as one chip
  function showSingleResult(file, date, from) {
    resultsBackTarget = from || "history";
    resultDate = date || todayLabel();
    renderFileStrip([file]);
    selectResultFile(0);
    show("results");
    updateStripNav();
  }

  /* -------------------------------------------------------------------------
     Results columns — distribute the cards per breakpoint so every column is
     an equal-height flex column. CSS handles the fill/stretch/scroll.
       desktop (>=1200): [outcome,keywords,sentiment] [talk,summary,actions] [transcript]
       tablet  (>=768):  [outcome,keywords,sentiment,talk,summary] [actions,transcript]
       mobile  (<768):   single column
     ------------------------------------------------------------------------- */
  const resultsPage = $("#screen-results .page");
  let resultsCards = null;
  let lastBp = null;

  function layoutResults() {
    if (!resultsPage) return;
    if (!resultsCards) {
      resultsCards = Array.prototype.filter.call(
        resultsPage.children, el => el.classList.contains("card")
      );
    }
    if (resultsCards.length < 10) return;

    const w = window.innerWidth;
    const bp = w >= 1200 ? "d" : w >= 768 ? "t" : "m";
    if (bp === lastBp && resultsPage.classList.contains("is-cols")) return;
    lastBp = bp;

    // cards: 0 outcome, 1 eval-detail, 2 audio-preview, 3 audio-quality,
    //        4 keywords, 5 sentiment, 6 talk, 7 summary, 8 actions, 9 transcript.
    // Eval-detail (1) and audio-preview (2) sit directly under the outcome (0)
    // card. Desktop: outcome col fills col 1, actions (Gợi ý) fills col 2,
    // transcript absorbs/scrolls in col 3 — so all three columns are equal height.
    const groups = bp === "d" ? [[0, 1, 2, 3, 4, 5], [6, 7, 8], [9]]
                 : bp === "t" ? [[0, 1, 2, 3, 4, 5, 6], [7, 8, 9]]
                 : [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]];

    while (resultsPage.firstChild) resultsPage.removeChild(resultsPage.firstChild);
    groups.forEach(group => {
      const col = document.createElement("div");
      col.className = "rcol";
      group.forEach(i => col.appendChild(resultsCards[i]));
      resultsPage.appendChild(col);
    });
    resultsPage.classList.add("is-cols");
  }

  layoutResults();
  let resizeRaf = null;
  window.addEventListener("resize", () => {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => { layoutResults(); syncProfileHeight(); });
  });
  syncProfileHeight();
  window.addEventListener("load", syncProfileHeight);

  /* -------------------------------------------------------------------------
     Screen 6 · Settings — positive / negative sentiment keyword sets.
     Added keywords get highlighted (green / red) wherever they appear in
     the transcript on subsequent analyses.
     ------------------------------------------------------------------------- */
  const positiveKeywords = ["cảm ơn", "real-time", "hài lòng", "hiệu quả", "tin tưởng"];
  const negativeKeywords = ["giá cả", "đắt đỏ", "lo lắng", "phản đối", "chậm trễ"];

  function renderKw(listEl, arr, kind) {
    listEl.innerHTML = arr.map((w, i) => `
      <span class="kw-chip kw-chip--${kind}">${w}
        <button class="kw-chip__x" type="button" data-kw-remove="${i}" aria-label="Xóa ${escAttr(w)}">${XCLOSE_ICON}</button>
      </span>`).join("");
  }
  function setupKwEditor(listId, inputId, addId, arr, kind) {
    const listEl = $("#" + listId), input = $("#" + inputId), addBtn = $("#" + addId);
    if (!listEl || !input || !addBtn) return;
    const draw = () => { renderKw(listEl, arr, kind); highlightTranscript(); colorKeywordChips(); };
    const add = () => {
      const v = input.value.trim();
      if (!v) { input.focus(); return; }
      if (!arr.some(k => k.toLowerCase() === v.toLowerCase())) arr.push(v);
      input.value = ""; input.focus(); draw();
    };
    addBtn.addEventListener("click", add);
    input.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); add(); } });
    listEl.addEventListener("click", e => {
      const rm = e.target.closest("[data-kw-remove]");
      if (rm) { arr.splice(parseInt(rm.dataset.kwRemove, 10), 1); draw(); }
    });
    draw();
  }

  /* Re-highlight the transcript from each bubble's plain text, wrapping any
     positive keyword in a green mark and any negative one in a red mark. */
  function escapeRegExp(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  function highlightTranscript() {
    const bubbles = $$("#screen-results .msg__bubble");
    const pos = positiveKeywords.filter(w => w.trim());
    const neg = negativeKeywords.filter(w => w.trim());
    const posSet = new Set(pos.map(s => s.toLowerCase()));
    const negSet = new Set(neg.map(s => s.toLowerCase()));
    const all = [...pos, ...neg].sort((a, b) => b.length - a.length);
    const re = all.length ? new RegExp("(" + all.map(escapeRegExp).join("|") + ")", "gi") : null;
    bubbles.forEach(bub => {
      const time = bub.querySelector(".msg__time");
      if (!("orig" in bub.dataset)) {
        const clone = bub.cloneNode(true);
        const t = clone.querySelector(".msg__time"); if (t) t.remove();
        clone.querySelectorAll("mark").forEach(m => m.replaceWith(document.createTextNode(m.textContent)));
        bub.dataset.orig = clone.textContent;
      }
      let text = bub.dataset.orig;
      let html = text.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
      if (re) html = html.replace(re, m => {
        const cls = posSet.has(m.toLowerCase()) ? "mark--pos" : negSet.has(m.toLowerCase()) ? "mark--neg" : "";
        return cls ? `<mark class="${cls}">${m}</mark>` : m;
      });
      bub.innerHTML = html + (time ? time.outerHTML : "");
    });
  }

  /* Colour the "Từ khóa nổi bật" chips by the sentiment keyword sets */
  function colorKeywordChips() {
    const posSet = new Set(positiveKeywords.map(s => s.toLowerCase()));
    const negSet = new Set(negativeKeywords.map(s => s.toLowerCase()));
    $$("#screen-results .chips .chip").forEach(chip => {
      const word = ((chip.childNodes[0] && chip.childNodes[0].textContent) || "").trim().toLowerCase();
      chip.classList.toggle("chip--pos", posSet.has(word));
      chip.classList.toggle("chip--neg", negSet.has(word));
    });
  }

  setupKwEditor("successKwList", "successKwInput", "successKwAdd", positiveKeywords, "pos");
  setupKwEditor("failureKwList", "failureKwInput", "failureKwAdd", negativeKeywords, "neg");
  highlightTranscript();
  colorKeywordChips();

  /* -------------------------------------------------------------------------
     Settings · my profile — the signed-in Google user's own details.
     ------------------------------------------------------------------------- */
  const profForm  = $("#profForm");
  const profName  = $("#profName");
  const profRole  = $("#profRole");
  const profPhone = $("#profPhone");
  const profNameLabel = $("#profNameLabel");
  const profAvatar    = $("#profAvatar");
  const profSaved     = $("#profSaved");
  if (profForm) profForm.addEventListener("submit", e => {
    e.preventDefault();
    const name = (profName.value || "").trim();
    if (!name) { profName.focus(); return; }
    if (profNameLabel) profNameLabel.textContent = name;
    if (profAvatar) profAvatar.textContent = initials(name);
    if (profSaved) {
      profSaved.hidden = false;
      clearTimeout(profForm._t);
      profForm._t = setTimeout(() => { profSaved.hidden = true; }, 2000);
    }
  });

  /* -------------------------------------------------------------------------
     Dashboard export — build a real .xlsx (3 sheets), dependency-free
     ------------------------------------------------------------------------- */
  const KEYWORD_FREQ = [
    ["Premium", 42], ["Real-time", 38], ["Giá cả", 34], ["Bảo mật", 29],
    ["ROI", 26], ["Hiệu suất", 22], ["Tích hợp", 19], ["Chi phí", 17],
    ["Hỗ trợ", 15], ["Triển khai", 13], ["Latency", 11], ["Demo", 9],
  ];
  const SENTIMENT_TOTALS = [
    ["Positive", 142, "62%"], ["Neutral", 60, "26%"], ["Negative", 27, "12%"],
  ];

  const enc = new TextEncoder();
  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function zipStore(files) {
    const u16 = n => [n & 255, (n >>> 8) & 255];
    const u32 = n => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
    const parts = [], central = [];
    let offset = 0;
    files.forEach(f => {
      const nameB = enc.encode(f.name), crc = crc32(f.data), size = f.data.length;
      const local = [].concat(u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
        u32(crc), u32(size), u32(size), u16(nameB.length), u16(0));
      parts.push(new Uint8Array(local), nameB, f.data);
      central.push({ nameB, crc, size, offset });
      offset += local.length + nameB.length + size;
    });
    const cdStart = offset;
    central.forEach(c => {
      const h = [].concat(u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
        u32(c.crc), u32(c.size), u32(c.size), u16(c.nameB.length), u16(0), u16(0), u16(0), u16(0),
        u32(0), u32(c.offset));
      parts.push(new Uint8Array(h), c.nameB);
      offset += h.length + c.nameB.length;
    });
    const end = new Uint8Array([].concat(u32(0x06054b50), u16(0), u16(0),
      u16(central.length), u16(central.length), u32(offset - cdStart), u32(cdStart), u16(0)));
    parts.push(end);
    const total = parts.reduce((a, b) => a + b.length, 0);
    const out = new Uint8Array(total);
    let p = 0;
    parts.forEach(a => { out.set(a, p); p += a.length; });
    return out;
  }
  function xmlEsc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function colLetter(n) {
    let s = ""; n++;
    while (n > 0) { s = String.fromCharCode(65 + (n - 1) % 26) + s; n = Math.floor((n - 1) / 26); }
    return s;
  }
  function sheetXml(rows) {
    const body = rows.map((row, r) => {
      const cells = row.map((val, c) => {
        const ref = colLetter(c) + (r + 1);
        if (typeof val === "number" && isFinite(val)) return `<c r="${ref}"><v>${val}</v></c>`;
        return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(val == null ? "" : val)}</t></is></c>`;
      }).join("");
      return `<row r="${r + 1}">${cells}</row>`;
    }).join("");
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`;
  }
  function buildXlsx(sheets) {
    const R = "http://schemas.openxmlformats.org";
    const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="${R}/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`;
    const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="${R}/package/2006/relationships"><Relationship Id="rId1" Type="${R}/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
    const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="${R}/spreadsheetml/2006/main" xmlns:r="${R}/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${xmlEsc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`;
    const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="${R}/package/2006/relationships">${sheets.map((s, i) => `<Relationship Id="rId${i + 1}" Type="${R}/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}</Relationships>`;
    const files = [
      { name: "[Content_Types].xml", data: enc.encode(contentTypes) },
      { name: "_rels/.rels", data: enc.encode(rels) },
      { name: "xl/workbook.xml", data: enc.encode(workbook) },
      { name: "xl/_rels/workbook.xml.rels", data: enc.encode(wbRels) },
    ];
    sheets.forEach((s, i) => files.push({ name: `xl/worksheets/sheet${i + 1}.xml`, data: enc.encode(sheetXml(s.rows)) }));
    return zipStore(files);
  }
  function downloadBlob(bytes, filename, mime) {
    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
  }

  /* Transcript export — download the conversation as a .txt file */
  const TRANSCRIPT = [
    { who: "Tư vấn viên", time: "00:15", text: "Chào anh Tâm, cảm ơn anh đã dành thời gian. Hôm nay em muốn giới thiệu về hệ thống TCPVoiceAI bên em." },
    { who: "Khách hàng",  time: "00:42", text: "Chào bạn. Mình đang quan tâm đến tính năng phân tích dữ liệu real-time. Bên bạn có hỗ trợ tốt phần này không?" },
    { who: "Tư vấn viên", time: "01:05", text: "Dạ hoàn toàn được ạ. Gói Premium bên em thiết kế đặc biệt cho xử lý luồng dữ liệu lớn theo thời gian thực, độ trễ chưa tới 50ms." },
    { who: "Khách hàng",  time: "01:38", text: "Nghe có vẻ ổn. Nhưng về giá cả thì sao? Có vẻ hơi cao so với ngân sách dự kiến của bên mình." },
  ];
  function currentResultName() {
    const active = fileStripScroll && fileStripScroll.querySelector(".fchip.is-active .fchip__name");
    if (active) return active.textContent.trim();
    return resultFiles[0] || DEFAULT_PROC_NAME;
  }
  function buildTranscriptText(fileName) {
    const lines = ["TCPVoiceAI — Bản ghi cuộc hội thoại", ""];
    if (fileName) lines.push("Tệp: " + fileName);
    lines.push("Ngày xuất: " + todayLabel(), "");
    lines.push("========================================", "");
    TRANSCRIPT.forEach(m => lines.push(`[${m.time}] ${m.who}: ${m.text}`));
    lines.push("", "======== Hết bản ghi ========");
    return lines.join("\r\n");
  }
  function exportTranscript(fileName) {
    const base = (fileName ? fileName.replace(/\.[^.]+$/, "") : "TCPVoiceAI") || "TCPVoiceAI";
    downloadBlob(enc.encode(buildTranscriptText(fileName)), base + "-transcript.txt", "text/plain;charset=utf-8");
  }

  const dashExportBtn = $("#dashExportBtn");
  if (dashExportBtn) dashExportBtn.addEventListener("click", () => {
    const src = archive.length ? archive : HISTORY;
    const callRows = [["Tên cuộc gọi", "Success rate (%)"]].concat(src.map(r => [r.file, r.conf]));
    const kwRows = [["Từ khóa", "Số lần lặp lại"]].concat(KEYWORD_FREQ.map(k => [k[0], k[1]]));
    const sentiRows = [["Sentiment", "Tổng số", "Tỉ lệ"]].concat(SENTIMENT_TOTALS.map(s => [s[0], s[1], s[2]]));
    const bytes = buildXlsx([
      { name: "Success rate", rows: callRows },
      { name: "Từ khóa lặp lại", rows: kwRows },
      { name: "Sentiment", rows: sentiRows },
    ]);
    downloadBlob(bytes, "TCPVoiceAI-Dashboard-Report.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    flashExport(dashExportBtn, "Đã xuất");
  });
})();
