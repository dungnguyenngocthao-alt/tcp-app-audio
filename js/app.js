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
      // "history" / "settings" are placeholders in this prototype
      if (target === "analysis") show("analysis");
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

  const exportBtn = $("#exportBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      const original = exportBtn.innerHTML;
      exportBtn.innerHTML =
        '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" ' +
        'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Exported';
      exportBtn.disabled = true;
      setTimeout(() => { exportBtn.innerHTML = original; exportBtn.disabled = false; }, 1600);
    });
  }
})();
