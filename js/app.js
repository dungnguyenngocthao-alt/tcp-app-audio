/* =============================================================================
   SonicAI — app interactions
   ============================================================================= */
(function () {
  "use strict";

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* -------------------------------------------------------------------------
     Screen navigation
     ------------------------------------------------------------------------- */
  const screens = {
    analysis:   $("#screen-analysis"),
    processing: $("#screen-processing"),
    results:    $("#screen-results"),
    history:    $("#screen-history"),
    dashboard:  $("#screen-dashboard"),
    settings:   $("#screen-settings"),
  };

  function show(name) {
    Object.entries(screens).forEach(([key, el]) =>
      el.classList.toggle("is-active", key === name)
    );
    // reset scroll of the newly shown screen
    const active = screens[name];
    const scroller = $(".screen__scroll", active);
    if (scroller) scroller.scrollTop = 0;
    setActiveMenu(name);
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
    return el ? el.dataset.screen : "analysis";
  }
  function setActiveMenu(screenName) {
    // Both the Analysis and Results screens sit under the "Analysis" item.
    // The primary "Thêm audio mới" action is never marked active — it's a
    // command, not a destination.
    const active = screenName === "results" ? "analysis" : screenName;
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
      if (target === "analysis" || target === "history" || target === "dashboard" || target === "settings") show(target);
      closeMenu();
    })
  );

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
  const DEFAULT_PROC_META = "Size: 45 MB • Duration: 45:12";
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
    if (!modelSelect) return "SonicAI Insight 2.0 · Balanced";
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
    const link = $("#linkInput");
    if (link) link.value = "";
    setProgress(0, STAGES[0].label);
  }

  processBtn.addEventListener("click", () => {
    if (procModelName) procModelName.textContent = currentModelName();
    show("processing");
    runProcessing();
  });

  cancelBtn.addEventListener("click", () => {
    cancelled = true;
    if (timer) { clearInterval(timer); timer = null; }
    show("analysis");
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
     visible (the chips already name the files), so hide it there. */
  function setSubVisible(v) {
    const sub = $("#screen-results .results-head__sub");
    if (sub) sub.hidden = !v;
  }
  /* Fill the results subtitle with a call's file + date */
  function setResultsSub(file, date) {
    const sub = $("#screen-results .results-head__sub");
    if (!sub) return;
    sub.textContent = file;
    const sep = document.createElement("span");
    sep.className = "results-head__sep";
    sep.textContent = " • ";
    const d = document.createElement("span");
    d.className = "results-head__date";
    d.textContent = date;
    sub.append(sep, d);
  }

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
  const folders = [];               // { id, name }
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
                 <button class="btn btn--ink btn--sm" type="button" data-hist-export>Export</button>`;
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
    if (view) { showSingleResult(view.dataset.file, view.dataset.date); return; }
    const exp = e.target.closest("[data-hist-export]");
    if (exp) {
      const card = exp.closest(".hist");
      const it = card && archive.find(a => a.id === parseInt(card.dataset.id, 10));
      exportTranscript(it ? it.file : "");
      flashExport(exp, "Đã xuất");
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

  function renderDashboard() {
    if (!HISTORY.length) return;
    const rates = HISTORY.map(r => r.conf);
    const avgRate = Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
    const secs = HISTORY.map(r => {
      const [m, s] = r.dur.split(":").map(Number);
      return m * 60 + s;
    });
    const avgSec = Math.round(secs.reduce((a, b) => a + b, 0) / secs.length);
    const mm = Math.floor(avgSec / 60), ss = avgSec % 60;

    const rateEl = $("#dashAvgRate"); if (rateEl) rateEl.textContent = avgRate + "%";
    const durEl = $("#dashAvgDur"); if (durEl) durEl.textContent = mm + ":" + String(ss).padStart(2, "0");
    const totEl = $("#dashTotal"); if (totEl) totEl.textContent = HISTORY.length;

    const top = [...HISTORY].sort((a, b) => b.conf - a.conf).slice(0, 3);
    const list = $("#dashTop3");
    if (list) {
      list.innerHTML = top.map((r, i) => `
        <div class="top3__row">
          <span class="top3__rank">${i + 1}</span>
          <div class="top3__info">
            <div class="top3__name" title="${escAttr(r.file)}">${r.file}</div>
            <div class="top3__meta">${r.date.split(",")[0]} &bull; ${r.dur} &bull; <b>${r.conf}%</b></div>
          </div>
          <div class="top3__actions">
            <button class="btn btn--outline btn--sm" type="button" data-view
                    data-file="${escAttr(r.file)}" data-date="${escAttr(r.date)}">Xem lại</button>
            <button class="iconbtn top3__export" type="button" data-dash-export
                    aria-label="Export transcript" title="Export transcript">${DL_SVG}</button>
          </div>
        </div>`).join("");
    }
  }

  // Re-view (evaluation) / export transcript within a Top-3 row
  const dashTop3 = $("#dashTop3");
  if (dashTop3) {
    dashTop3.addEventListener("click", e => {
      const view = e.target.closest("[data-view]");
      if (view) {
        showSingleResult(view.dataset.file, view.dataset.date);
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
  const OUTCOME_LABEL = { success: "Successful Sale", warning: "Follow-up", neutral: "No Sale" };

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
    const conf = 12 + (h % 87);
    const type = conf >= 85 ? "success" : conf >= 66 ? "warning" : "neutral";
    const dur = (16 + (h % 30)) + ":" + String((h >>> 3) % 60).padStart(2, "0");
    return { conf, type, dur, outcome: OUTCOME_LABEL[type] };
  }

  // Build the horizontal strip from the uploaded files. Hidden for a single
  // file — then the Results screen is just the plain analysis.
  function renderFileStrip() {
    resultFiles = (selectedFiles.length ? selectedFiles.map(f => f.name) : [DEFAULT_PROC_NAME]);
    resultDate = todayLabel();
    if (!fileStrip) return;

    if (resultFiles.length <= 1) {
      fileStrip.hidden = true;
      fileStripScroll.innerHTML = "";
      setSubVisible(true);
      updateStripNav();
      return;
    }
    fileStrip.hidden = false;
    setSubVisible(false);
    if (fileStripCount) fileStripCount.textContent = resultFiles.length + " tệp đã phân tích";
    fileStripScroll.innerHTML = resultFiles.map((name, i) => {
      const m = mockCall(name);
      return `
        <button class="fchip${m.conf < 30 ? " fchip--low" : ""}" type="button" data-chip="${i}" title="${escAttr(name)}">
          <span class="fchip__icon">${FILE_ICON}</span>
          <span class="fchip__info">
            <span class="fchip__name">${name}</span>
            <span class="fchip__meta">${m.conf}% &bull; ${m.dur}</span>
          </span>
        </button>`;
    }).join("");
    fileStripScroll.scrollLeft = 0;
    updateStripNav();
  }

  // Swap the analysis below to a given file (by index into resultFiles)
  function selectResultFile(index) {
    const name = resultFiles[index] || DEFAULT_PROC_NAME;
    setResultsSub(name, resultDate || todayLabel());

    const m = mockCall(name);
    const title = $("#screen-results .outcome__title");
    const pct   = $("#screen-results .outcome__pct");
    if (title) title.textContent = m.outcome;
    if (pct)   pct.textContent = m.conf + "%";

    if (fileStripScroll) {
      $$(".fchip", fileStripScroll).forEach(c =>
        c.classList.toggle("is-active", parseInt(c.dataset.chip, 10) === index)
      );
      const active = fileStripScroll.querySelector(".fchip.is-active");
      if (active) active.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }

  if (fileStripScroll) {
    fileStripScroll.addEventListener("click", e => {
      const chip = e.target.closest("[data-chip]");
      if (chip) selectResultFile(parseInt(chip.dataset.chip, 10));
    });
  }

  // Opening a single call from History / Dashboard: no strip, just the analysis
  function showSingleResult(file, date) {
    if (fileStrip) { fileStrip.hidden = true; fileStripScroll.innerHTML = ""; }
    resultFiles = [];
    setSubVisible(true);
    updateStripNav();
    setResultsSub(file, date);
    show("results");
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
    if (resultsCards.length < 7) return;

    const w = window.innerWidth;
    const bp = w >= 1200 ? "d" : w >= 768 ? "t" : "m";
    if (bp === lastBp && resultsPage.classList.contains("is-cols")) return;
    lastBp = bp;

    const groups = bp === "d" ? [[0, 1, 2], [3, 4, 5], [6]]
                 : bp === "t" ? [[0, 1, 2, 3, 4], [5, 6]]
                 : [[0, 1, 2, 3, 4, 5, 6]];

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
    resizeRaf = requestAnimationFrame(layoutResults);
  });

  /* -------------------------------------------------------------------------
     Screen 6 · Settings — keyword sets that push success / failure rate
     ------------------------------------------------------------------------- */
  const successKeywords = ["ROI", "tiết kiệm", "real-time", "bảo mật", "hiệu suất"];
  const failureKeywords = ["giá cao", "phức tạp", "chậm", "lỗi", "khó dùng"];

  function renderKw(listEl, arr, kind) {
    listEl.innerHTML = arr.map((w, i) => `
      <span class="kw-chip kw-chip--${kind}">${w}
        <button class="kw-chip__x" type="button" data-kw-remove="${i}" aria-label="Xóa ${escAttr(w)}">${XCLOSE_ICON}</button>
      </span>`).join("");
  }
  function setupKwEditor(listId, inputId, addId, arr, kind) {
    const listEl = $("#" + listId), input = $("#" + inputId), addBtn = $("#" + addId);
    if (!listEl || !input || !addBtn) return;
    const draw = () => renderKw(listEl, arr, kind);
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
  setupKwEditor("successKwList", "successKwInput", "successKwAdd", successKeywords, "success");
  setupKwEditor("failureKwList", "failureKwInput", "failureKwAdd", failureKeywords, "failure");

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
    { who: "Agent",       time: "00:15", text: "Chào anh Tâm, cảm ơn anh đã dành thời gian. Hôm nay em muốn giới thiệu về hệ thống SonicAI bên em." },
    { who: "Khách hàng",  time: "00:42", text: "Chào bạn. Mình đang quan tâm đến tính năng phân tích dữ liệu real-time. Bên bạn có hỗ trợ tốt phần này không?" },
    { who: "Agent",       time: "01:05", text: "Dạ hoàn toàn được ạ. Gói Premium bên em thiết kế đặc biệt cho xử lý luồng dữ liệu lớn theo thời gian thực, độ trễ chưa tới 50ms." },
    { who: "Khách hàng",  time: "01:38", text: "Nghe có vẻ ổn. Nhưng về giá cả thì sao? Có vẻ hơi cao so với ngân sách dự kiến của bên mình." },
  ];
  function currentResultName() {
    const active = fileStripScroll && fileStripScroll.querySelector(".fchip.is-active .fchip__name");
    if (active) return active.textContent.trim();
    const sub = $("#screen-results .results-head__sub");
    if (sub && sub.childNodes[0]) return (sub.childNodes[0].textContent || "").trim();
    return DEFAULT_PROC_NAME;
  }
  function buildTranscriptText(fileName) {
    const lines = ["SonicAI — Bản ghi cuộc hội thoại", ""];
    if (fileName) lines.push("Tệp: " + fileName);
    lines.push("Ngày xuất: " + todayLabel(), "");
    lines.push("========================================", "");
    TRANSCRIPT.forEach(m => lines.push(`[${m.time}] ${m.who}: ${m.text}`));
    lines.push("", "======== Hết bản ghi ========");
    return lines.join("\r\n");
  }
  function exportTranscript(fileName) {
    const base = (fileName ? fileName.replace(/\.[^.]+$/, "") : "SonicAI") || "SonicAI";
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
    downloadBlob(bytes, "SonicAI-Dashboard-Report.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    flashExport(dashExportBtn, "Đã xuất");
  });
})();
