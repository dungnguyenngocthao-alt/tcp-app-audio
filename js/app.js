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
    const active = (screenName === "results") ? "analysis" : screenName;
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
      if (target === "analysis" || target === "history") show(target);
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

  /* File picking + drag & drop */
  const fileInput  = $("#fileInput");
  const browseBtn  = $("#browseBtn");
  const dropzone   = $("#dropzone");
  const chosenFile = $("#chosenFile");
  const procName   = $("#procFileName");

  function setFile(name) {
    if (!name) return;
    chosenFile.hidden = false;
    chosenFile.textContent = "Selected: " + name;
    procName.textContent = name;
  }

  browseBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    if (fileInput.files && fileInput.files[0]) setFile(fileInput.files[0].name);
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
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) setFile(f.name);
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
        setTimeout(() => { if (!cancelled) show("results"); }, 550);
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
    if (chosenFile) { chosenFile.hidden = true; chosenFile.textContent = ""; }
    if (procName) procName.textContent = "Q3_Sales_Call_JohnDoe.wav";
    const link = $("#linkInput");
    if (link) link.value = "";
    setProgress(0, STAGES[0].label);
  }

  processBtn.addEventListener("click", () => {
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
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" ' +
    'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  function flashExport(btn, doneLabel) {
    if (btn.disabled) return;
    const original = btn.innerHTML;
    btn.innerHTML = CHECK_SVG + " " + doneLabel;
    btn.disabled = true;
    setTimeout(() => { btn.innerHTML = original; btn.disabled = false; }, 1600);
  }

  const exportBtn = $("#exportBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      if (exportBtn.disabled) return;
      const original = exportBtn.innerHTML;
      exportBtn.innerHTML = CHECK_SVG;
      exportBtn.disabled = true;
      setTimeout(() => { exportBtn.innerHTML = original; exportBtn.disabled = false; }, 1400);
    });
  }

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
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>' +
    '<path d="M14 2v6h6"/><path d="M11 12v5a1.6 1.6 0 1 1-1.4-1.6"/></svg>';

  function escAttr(s) { return String(s).replace(/"/g, "&quot;"); }

  function renderHistory() {
    const pages = Math.max(1, Math.ceil(HISTORY.length / PER_PAGE));
    historyPage = Math.min(Math.max(1, historyPage), pages);
    const start = (historyPage - 1) * PER_PAGE;
    const rows = HISTORY.slice(start, start + PER_PAGE);

    historyList.innerHTML = rows.map(r => `
      <article class="hist">
        <div class="hist__head">
          <span class="hist__icon">${FILE_SVG}</span>
          <div class="hist__info">
            <div class="hist__titlerow">
              <div class="hist__name" title="${escAttr(r.file)}">${r.file}</div>
              <span class="pill pill--${r.type}">${r.outcome}</span>
            </div>
            <div class="hist__meta">${r.date} &bull; ${r.dur}</div>
          </div>
        </div>
        <div class="hist__foot">
          <span class="hist__conf">Độ tin cậy <b>${r.conf}%</b></span>
          <div class="hist__actions">
            <button class="btn btn--outline btn--sm" type="button" data-view
                    data-file="${escAttr(r.file)}" data-date="${escAttr(r.date)}">Xem lại</button>
            <button class="btn btn--ink btn--sm" type="button" data-hist-export>Export</button>
          </div>
        </div>
      </article>`).join("");

    renderPager(pages);
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

  // Pagination clicks
  historyPager.addEventListener("click", e => {
    const btn = e.target.closest(".page-btn");
    if (!btn || btn.disabled) return;
    const pages = Math.max(1, Math.ceil(HISTORY.length / PER_PAGE));
    const p = btn.dataset.page;
    if (p === "prev") historyPage--;
    else if (p === "next") historyPage++;
    else historyPage = parseInt(p, 10);
    renderHistory();
    const scroller = $(".screen__scroll", screens.history);
    if (scroller) scroller.scrollTop = 0;
  });

  // Re-view / export within a history row
  historyList.addEventListener("click", e => {
    const view = e.target.closest("[data-view]");
    if (view) {
      const sub = $("#screen-results .results-head__sub");
      if (sub) {
        sub.textContent = view.dataset.file;
        const sep = document.createElement("span");
        sep.className = "results-head__sep";
        sep.textContent = " • ";
        const date = document.createElement("span");
        date.className = "results-head__date";
        date.textContent = view.dataset.date;
        sub.append(sep, date);
      }
      show("results");
      return;
    }
    const exp = e.target.closest("[data-hist-export]");
    if (exp) flashExport(exp, "Đã xuất");
  });

  renderHistory();

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
})();
