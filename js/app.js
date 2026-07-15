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
    syncNav(name);
  }

  /* -------------------------------------------------------------------------
     Bottom navigation (shared markup, rendered into every .tabbar)
     ------------------------------------------------------------------------- */
  const NAV_ITEMS = [
    {
      id: "analysis", label: "Analysis",
      icon: '<rect x="3" y="12" width="4" height="8" rx="1"/><rect x="10" y="7" width="4" height="13" rx="1"/><rect x="17" y="3" width="4" height="17" rx="1"/>'
    },
    {
      id: "history", label: "History",
      icon: '<path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/>'
    },
    {
      id: "settings", label: "Settings",
      icon: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H2a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 3.6 8a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H8a1.65 1.65 0 0 0 1-1.51V2a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V8a1.65 1.65 0 0 0 1.51 1H22a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'
    },
  ];

  function buildNav(bar) {
    bar.innerHTML = NAV_ITEMS.map(item => `
      <button class="tabbar__item" data-nav="${item.id}" type="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${item.icon}</svg>
        <span>${item.label}</span>
      </button>`).join("");

    $$(".tabbar__item", bar).forEach(btn =>
      btn.addEventListener("click", () => {
        const target = btn.dataset.nav;
        // Only "Analysis" maps to a built screen; others are placeholders.
        if (target === "analysis") show("analysis");
      })
    );
  }

  function syncNav(screenName) {
    // Both the Analysis and Results screens live under the "Analysis" tab.
    const activeTab = (screenName === "results" || screenName === "analysis")
      ? "analysis" : screenName;
    $$(".tabbar").forEach(bar =>
      $$(".tabbar__item", bar).forEach(btn =>
        btn.classList.toggle("is-active", btn.dataset.nav === activeTab)
      )
    );
  }

  $$(".tabbar").forEach(buildNav);

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
