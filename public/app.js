(function () {
  "use strict";

  // Internal stage keys never change (renaming would break stored data).
  // Only the *display labels* differ. "passed" key now shown as "Interviewed".
  const STAGE_KEYS = ["observing", "editing", "submitted", "passed"];

  // ---------------------------------------------------------------- //
  // i18n — UI text only, never user data                             //
  // ---------------------------------------------------------------- //
  const I18N = {
    en: {
      title: "Job & Volunteer Applications",
      statTotal: "Total", statObserving: "Observing", statEditing: "Editing",
      statSubmitted: "Submitted", statInterviewed: "Interviewed", statPassed: "Passed",
      legendNone: "Not started", legendObserving: "Observing", legendEditing: "Editing",
      legendSubmitted: "Submitted", legendInterviewed: "Interviewed",
      thApplication: "Application", thObserving: "Observing", thEditing: "Editing",
      thSubmitted: "Submitted", thInterviewed: "Interviewed",
      tabTable: "Table", tabCalendar: "Calendar", tabData: "Data",
      importJobBtn: "Import job", exportBtn: "Export JSON", importBtn: "Import JSON",
      addRow: "Add row",
      hint: "Empty date: click to set today. Filled date: click to edit.",
      hintStorage: "Data is stored locally in <code>data.json</code>, not in the browser.",
      untitled: "Untitled (click to edit)", linkLabel: "Link (optional)",
      openLink: "Open link", namePlaceholder: "Application name", deleteBtn: "Delete",
      toastExported: "Backup exported", toastImported: "Import complete",
      toastJobSaved: "Job saved as a new row",
      importConfirmPrefix: "Import ",
      importConfirmSuffix: " records.\n\nClick OK to replace all current data.\nClick Cancel to append to existing data.",
      importError: "Import failed: not a valid backup JSON.\n",
      calHint: "Click a highlighted day to see what happened.",
      calNoEvents: "No activity on this day.",
      funnelTitle: "Pipeline funnel", barTitle: "Applications by current stage",
      convNote: "Conversion = passed ÷ submitted",
      jobModalTitle: "Import job info",
      jobModalSub: "Paste the full job posting text below. Key fields will be extracted automatically.",
      jobPlaceholder: "Paste job description here…",
      cancel: "Cancel", parseBtn: "Extract", saveAsRow: "Save as row",
      parsing: "Extracting…",
      noKeyMsg: "Job extraction needs an Anthropic API key. Create a file named anthropic-key.txt in the app data folder with your key inside, then restart.",
      parseFailed: "Could not extract fields. Try pasting more complete text.",
      pfTitle: "Title", pfCompany: "Company", pfSalary: "Salary",
      pfLocation: "Location", pfMode: "Mode", pfField: "Field", pfSkills: "Skills",
      months: ["January","February","March","April","May","June","July","August","September","October","November","December"],
      dow: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],
    },
    zh: {
      title: "求職與志願申請追蹤",
      statTotal: "總計", statObserving: "觀望中", statEditing: "修改中",
      statSubmitted: "已投遞", statInterviewed: "已面試", statPassed: "已通過",
      legendNone: "未開始", legendObserving: "觀望中", legendEditing: "修改中",
      legendSubmitted: "已投遞", legendInterviewed: "已面試",
      thApplication: "申請", thObserving: "觀望中", thEditing: "修改中",
      thSubmitted: "已投遞", thInterviewed: "已面試",
      tabTable: "表格", tabCalendar: "日曆", tabData: "數據",
      importJobBtn: "匯入職位", exportBtn: "匯出 JSON", importBtn: "匯入 JSON",
      addRow: "新增一行",
      hint: "空白日期：點擊填入今天。已填日期：點擊編輯。",
      hintStorage: "資料保存在本地 <code>data.json</code> 檔案，不依賴瀏覽器快取。",
      untitled: "未命名（點擊編輯）", linkLabel: "連結（選填）",
      openLink: "開啟連結", namePlaceholder: "申請名稱", deleteBtn: "刪除",
      toastExported: "已匯出備份", toastImported: "匯入完成",
      toastJobSaved: "已儲存為新的一行",
      importConfirmPrefix: "匯入 ",
      importConfirmSuffix: " 條記錄。\n\n點擊「確定」＝ 替換當前所有資料。\n點擊「取消」＝ 追加到現有資料後面。",
      importError: "匯入失敗：檔案不是有效的備份 JSON。\n",
      calHint: "點擊有標記的日期，查看當天發生了什麼。",
      calNoEvents: "當天沒有動態。",
      funnelTitle: "流程漏斗", barTitle: "按當前階段分佈",
      convNote: "轉化率 = 已通過 ÷ 已投遞",
      jobModalTitle: "匯入職位資訊",
      jobModalSub: "把完整的職位描述文字貼到下面，會自動提取關鍵欄位。",
      jobPlaceholder: "在此貼上職位描述…",
      cancel: "取消", parseBtn: "提取", saveAsRow: "儲存為一行",
      parsing: "提取中…",
      noKeyMsg: "職位提取需要 Anthropic API key。請在應用資料資料夾裡建立 anthropic-key.txt 檔案，把 key 寫進去後重啟應用。",
      parseFailed: "無法提取欄位，請嘗試貼上更完整的文字。",
      pfTitle: "職位", pfCompany: "公司", pfSalary: "薪資",
      pfLocation: "地點", pfMode: "模式", pfField: "方向", pfSkills: "技能",
      months: ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"],
      dow: ["日","一","二","三","四","五","六"],
    },
  };

  const LANG_KEY = "appLang";
  let currentLang = localStorage.getItem(LANG_KEY) || "zh";
  const t = (key) => I18N[currentLang][key];

  // ---------------------------------------------------------------- //
  // State                                                            //
  // ---------------------------------------------------------------- //
  let rows = [];
  let currentView = "table";
  let calMonth = new Date(); // first-of-month anchor for the calendar
  let selectedDay = null;
  let parsedJob = null; // holds last successful job parse for "Save as row"

  const tbody = document.getElementById("tbody");
  const toast = document.getElementById("toast");

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove("show"), 2400);
  }

  function todayISO() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function lastFilledStageIndex(stages) {
    let idx = -1;
    STAGE_KEYS.forEach((key, i) => { if (stages[key]) idx = i; });
    return idx;
  }

  // ---------------------------------------------------------------- //
  // API                                                              //
  // ---------------------------------------------------------------- //
  const api = {
    getRows: () => fetch("/api/rows").then((r) => r.json()),
    addRow: () => fetch("/api/rows", { method: "POST" }).then((r) => r.json()),
    updateRow: (id, patch) =>
      fetch("/api/rows/" + encodeURIComponent(id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }).then((r) => r.json()),
    deleteRow: (id) => fetch("/api/rows/" + encodeURIComponent(id), { method: "DELETE" }),
    importRows: (rows, mode) =>
      fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, mode }),
      }).then((r) => r.json()),
    parseStatus: () => fetch("/api/parse-job/status").then((r) => r.json()),
    parseJob: (text) =>
      fetch("/api/parse-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      }).then((r) => r.json()),
  };

  async function reload() {
    rows = await api.getRows();
    renderAll();
  }

  function renderAll() {
    renderTable();
    if (currentView === "calendar") renderCalendar();
    if (currentView === "data") renderData();
    updateStats();
  }

  // ---------------------------------------------------------------- //
  // Stats + progress bar                                             //
  // ---------------------------------------------------------------- //
  function setStat(id, value) {
    const el = document.getElementById(id);
    const str = String(value);
    if (el.textContent !== str) {
      el.textContent = str;
      el.classList.remove("pop");
      void el.offsetWidth;
      el.classList.add("pop");
    }
  }

  function setSegWidth(id, count, denom) {
    document.getElementById(id).style.width = (denom > 0 ? (count / denom) * 100 : 0) + "%";
  }

  function activeRows() {
    return rows.filter((row) => row.name.trim() || lastFilledStageIndex(row.stages) !== -1);
  }

  function computeStats() {
    const s = { total: 0, cum: { observing: 0, editing: 0, submitted: 0, passed: 0 },
                cur: { none: 0, observing: 0, editing: 0, submitted: 0, passed: 0 } };
    activeRows().forEach((row) => {
      s.total++;
      STAGE_KEYS.forEach((k) => { if (row.stages[k]) s.cum[k]++; });
      const idx = lastFilledStageIndex(row.stages);
      if (idx === 3) s.cur.passed++;
      else if (idx === 2) s.cur.submitted++;
      else if (idx === 1) s.cur.editing++;
      else if (idx === 0) s.cur.observing++;
      else s.cur.none++;
    });
    return s;
  }

  function updateStats() {
    const s = computeStats();
    setStat("statTotal", s.total);
    setStat("statObserving", s.cum.observing);
    setStat("statEditing", s.cum.editing);
    setStat("statSubmitted", s.cum.submitted);
    setStat("statPassed", s.cum.passed);
    const rate = s.cum.submitted > 0 ? Math.round((s.cum.passed / s.cum.submitted) * 100) : 0;
    setStat("statRate", rate + "%");

    const denom = s.total || 1;
    setSegWidth("segNone", s.cur.none, denom);
    setSegWidth("segObserving", s.cur.observing, denom);
    setSegWidth("segEditing", s.cur.editing, denom);
    setSegWidth("segSubmitted", s.cur.submitted, denom);
    setSegWidth("segPassed", s.cur.passed, denom);
  }

  // ---------------------------------------------------------------- //
  // Table view                                                       //
  // ---------------------------------------------------------------- //
  function renderTable() {
    tbody.innerHTML = "";
    rows.forEach((row) => {
      const tr = document.createElement("tr");
      const activeIdx = lastFilledStageIndex(row.stages);

      // Name cell
      const nameTd = document.createElement("td");
      nameTd.className = "name-cell";
      const nameWrap = document.createElement("div");

      const nameDisplay = document.createElement("div");
      nameDisplay.className = "name-display" + (row.name.trim() ? "" : " empty");
      nameDisplay.textContent = row.name.trim() || t("untitled");

      const linkEl = document.createElement("div");
      linkEl.className = "name-link";
      if (row.url) {
        const a = document.createElement("a");
        a.href = row.url; a.target = "_blank"; a.rel = "noopener noreferrer";
        a.textContent = t("openLink");
        linkEl.appendChild(a);
      }

      // Meta tags (job info)
      const meta = row.meta || {};
      const tagsWrap = document.createElement("div");
      tagsWrap.className = "meta-tags";
      const addTag = (text, cls) => {
        if (!text) return;
        const span = document.createElement("span");
        span.className = "meta-tag" + (cls ? " " + cls : "");
        span.textContent = text;
        tagsWrap.appendChild(span);
      };
      addTag(meta.salary, "");
      addTag(meta.location, "");
      addTag(meta.mode, "mode");
      (meta.skills || []).slice(0, 4).forEach((sk) => addTag(sk, ""));

      const urlRow = document.createElement("div");
      urlRow.className = "url-row";
      const urlLabel = document.createElement("label");
      urlLabel.htmlFor = "url-" + row.id;
      urlLabel.textContent = t("linkLabel");
      const urlInput = document.createElement("input");
      urlInput.type = "url"; urlInput.className = "url-input"; urlInput.id = "url-" + row.id;
      urlInput.placeholder = "https://…"; urlInput.value = row.url || "";
      urlRow.appendChild(urlLabel); urlRow.appendChild(urlInput);

      nameDisplay.addEventListener("click", () => {
        nameTd.classList.add("editing");
        const input = document.createElement("input");
        input.type = "text"; input.className = "name-edit";
        input.value = row.name; input.placeholder = t("namePlaceholder");
        nameWrap.replaceChild(input, nameDisplay);
        input.focus(); input.select();

        async function leaveEdit() {
          if (!nameTd.isConnected) return;
          const newName = input.value, newUrl = urlInput.value.trim();
          if (newName === row.name && newUrl === row.url) {
            nameTd.classList.remove("editing"); renderTable(); return;
          }
          row.name = newName; row.url = newUrl;
          await api.updateRow(row.id, { name: newName, url: newUrl });
          nameTd.classList.remove("editing"); renderAll();
        }
        function onFocusOut() {
          setTimeout(() => {
            if (!nameTd.isConnected) return;
            if (!nameWrap.contains(document.activeElement)) leaveEdit();
          }, 0);
        }
        nameWrap.addEventListener("focusout", onFocusOut);
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") { e.preventDefault(); input.blur(); }
          if (e.key === "Escape") { nameTd.classList.remove("editing"); renderTable(); }
        });
        urlInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") { e.preventDefault(); urlInput.blur(); }
          if (e.key === "Escape") { nameTd.classList.remove("editing"); renderTable(); }
        });
      });

      nameWrap.appendChild(nameDisplay);
      nameWrap.appendChild(urlRow);
      if (tagsWrap.childNodes.length) nameWrap.appendChild(tagsWrap);
      nameWrap.appendChild(linkEl);
      nameTd.appendChild(nameWrap);
      tr.appendChild(nameTd);

      // Stage date cells
      STAGE_KEYS.forEach((key, colIndex) => {
        const td = document.createElement("td");
        td.className = "date-cell";
        const val = row.stages[key];
        if (val) { td.classList.add("filled"); td.textContent = val; }
        else { td.classList.add("empty"); td.innerHTML = "&nbsp;"; }
        if (colIndex === activeIdx) td.classList.add("active-stage");

        td.addEventListener("click", (e) => {
          if (td.querySelector('input[type="date"]')) return;
          if (!row.stages[key]) {
            row.stages[key] = todayISO();
            api.updateRow(row.id, { stages: { [key]: row.stages[key] } }).then(renderAll);
            return;
          }
          e.stopPropagation();
          const inp = document.createElement("input");
          inp.type = "date"; inp.className = "date-inline-input"; inp.value = row.stages[key];
          td.textContent = ""; td.appendChild(inp); inp.focus();
          if (typeof inp.showPicker === "function") { try { inp.showPicker(); } catch (_) {} }
          function commitDate() {
            inp.removeEventListener("blur", commitDate);
            row.stages[key] = inp.value.trim() || null;
            api.updateRow(row.id, { stages: { [key]: row.stages[key] } }).then(() => requestAnimationFrame(renderAll));
          }
          inp.addEventListener("blur", commitDate);
          inp.addEventListener("keydown", (ev) => {
            if (ev.key === "Enter") { ev.preventDefault(); inp.blur(); }
            if (ev.key === "Escape") { ev.preventDefault(); inp.removeEventListener("blur", commitDate); inp.blur(); renderTable(); }
          });
        });
        tr.appendChild(td);
      });

      // Delete
      const actTd = document.createElement("td");
      actTd.className = "actions-cell";
      const delBtn = document.createElement("button");
      delBtn.type = "button"; delBtn.className = "danger"; delBtn.textContent = t("deleteBtn");
      delBtn.addEventListener("click", async () => { await api.deleteRow(row.id); await reload(); });
      actTd.appendChild(delBtn);
      tr.appendChild(actTd);

      tbody.appendChild(tr);
    });
  }

  // ---------------------------------------------------------------- //
  // Calendar view                                                    //
  // ---------------------------------------------------------------- //
  const STAGE_LABEL_KEY = { observing: "legendObserving", editing: "legendEditing", submitted: "legendSubmitted", passed: "legendInterviewed" };

  function eventsByDate() {
    // map: "YYYY-MM-DD" -> [{ name, stage }]
    const map = {};
    rows.forEach((row) => {
      const label = row.name.trim() || t("untitled");
      STAGE_KEYS.forEach((stage) => {
        const d = row.stages[stage];
        if (d) {
          if (!map[d]) map[d] = [];
          map[d].push({ name: label, stage });
        }
      });
    });
    return map;
  }

  function renderCalendar() {
    const grid = document.getElementById("calGrid");
    const title = document.getElementById("calTitle");
    const y = calMonth.getFullYear(), m = calMonth.getMonth();
    title.textContent = t("months")[m] + " " + y;

    const events = eventsByDate();
    grid.innerHTML = "";

    // Day-of-week headers
    t("dow").forEach((d) => {
      const h = document.createElement("div");
      h.className = "cal-dow"; h.textContent = d;
      grid.appendChild(h);
    });

    const first = new Date(y, m, 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const daysInPrev = new Date(y, m, 0).getDate();
    const today = todayISO();

    const cells = [];
    // leading days from previous month
    for (let i = startDow - 1; i >= 0; i--) cells.push({ day: daysInPrev - i, outside: true, month: m - 1 });
    // this month
    for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, outside: false, month: m });
    // trailing to complete the last week
    while (cells.length % 7 !== 0) cells.push({ day: cells.length, outside: true, trailing: true });

    let trailingDay = 1;
    cells.forEach((c) => {
      const cell = document.createElement("div");
      cell.className = "cal-cell";
      let dateStr = null;
      if (c.outside) {
        cell.classList.add("outside");
        cell.innerHTML = '<span class="cal-daynum">' + (c.trailing ? trailingDay++ : c.day) + "</span>";
      } else {
        dateStr = y + "-" + String(m + 1).padStart(2, "0") + "-" + String(c.day).padStart(2, "0");
        cell.innerHTML = '<span class="cal-daynum">' + c.day + "</span>";
        if (dateStr === today) cell.classList.add("today");
        const dayEvents = events[dateStr];
        if (dayEvents && dayEvents.length) {
          cell.classList.add("has-events");
          const dots = document.createElement("div");
          dots.className = "cal-dots";
          dayEvents.slice(0, 8).forEach((ev) => {
            const dot = document.createElement("span");
            dot.className = "cal-dot " + ev.stage;
            dots.appendChild(dot);
          });
          cell.appendChild(dots);
          if (dateStr === selectedDay) cell.classList.add("selected");
          cell.addEventListener("click", () => { selectedDay = dateStr; renderCalendar(); renderCalDetail(dateStr, dayEvents); });
        }
      }
      grid.appendChild(cell);
    });

    if (selectedDay && events[selectedDay]) renderCalDetail(selectedDay, events[selectedDay]);
  }

  function renderCalDetail(dateStr, dayEvents) {
    const detail = document.getElementById("calDetail");
    if (!dayEvents || !dayEvents.length) {
      detail.innerHTML = '<div class="cal-detail-empty">' + t("calNoEvents") + "</div>";
      return;
    }
    const counts = {};
    dayEvents.forEach((ev) => { counts[ev.stage] = (counts[ev.stage] || 0) + 1; });
    const summaryParts = STAGE_KEYS.filter((k) => counts[k]).map((k) => t(STAGE_LABEL_KEY[k]) + " ×" + counts[k]);

    let html = "<h3>" + dateStr + " · " + summaryParts.join(" · ") + "</h3>";
    dayEvents.forEach((ev) => {
      html += '<div class="cal-event"><span class="badge ' + ev.stage + '">' + t(STAGE_LABEL_KEY[ev.stage]) + "</span><span>" + escapeHtml(ev.name) + "</span></div>";
    });
    detail.innerHTML = html;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ---------------------------------------------------------------- //
  // Data view: funnel + bar chart                                    //
  // ---------------------------------------------------------------- //
  function renderData() {
    const s = computeStats();
    const funnel = document.getElementById("funnel");
    const stages = [
      { key: "observing", label: t("legendObserving"), count: s.cum.observing },
      { key: "editing", label: t("legendEditing"), count: s.cum.editing },
      { key: "submitted", label: t("legendSubmitted"), count: s.cum.submitted },
      { key: "passed", label: t("legendInterviewed"), count: s.cum.passed },
    ];
    const maxCount = Math.max(1, ...stages.map((st) => st.count));

    funnel.innerHTML = "";
    stages.forEach((st) => {
      const row = document.createElement("div");
      row.className = "funnel-row";
      row.innerHTML =
        '<div class="funnel-meta"><span class="label">' + st.label + '</span><span class="value">' + st.count + "</span></div>" +
        '<div class="funnel-bar-track"><div class="funnel-bar ' + st.key + '"></div></div>';
      funnel.appendChild(row);
      const bar = row.querySelector(".funnel-bar");
      requestAnimationFrame(() => {
        bar.style.width = (st.count / maxCount) * 100 + "%";
        if (st.count > 0) bar.textContent = st.count;
      });
    });

    const conv = s.cum.submitted > 0 ? Math.round((s.cum.passed / s.cum.submitted) * 100) : 0;
    document.getElementById("convNote").textContent = t("convNote") + " = " + conv + "%";

    // Bar chart: distribution by current stage
    const bars = document.getElementById("bars");
    const dist = [
      { key: "none", label: t("legendNone"), count: s.cur.none },
      { key: "observing", label: t("legendObserving"), count: s.cur.observing },
      { key: "editing", label: t("legendEditing"), count: s.cur.editing },
      { key: "submitted", label: t("legendSubmitted"), count: s.cur.submitted },
      { key: "passed", label: t("legendInterviewed"), count: s.cur.passed },
    ];
    const maxDist = Math.max(1, ...dist.map((d) => d.count));
    bars.innerHTML = "";
    dist.forEach((d) => {
      const col = document.createElement("div");
      col.className = "bar-col";
      col.innerHTML =
        '<div class="bar-value">' + d.count + "</div>" +
        '<div class="bar-fill ' + d.key + '"></div>' +
        '<div class="bar-label">' + d.label + "</div>";
      bars.appendChild(col);
      const fill = col.querySelector(".bar-fill");
      requestAnimationFrame(() => { fill.style.height = (d.count / maxDist) * 100 + "%"; });
    });
  }

  // ---------------------------------------------------------------- //
  // View switching                                                   //
  // ---------------------------------------------------------------- //
  function switchView(view) {
    currentView = view;
    document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.view === view));
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    document.getElementById("view-" + view).classList.add("active");
    if (view === "calendar") renderCalendar();
    if (view === "data") renderData();
  }

  // ---------------------------------------------------------------- //
  // Job import modal                                                 //
  // ---------------------------------------------------------------- //
  const jobModal = document.getElementById("jobModal");

  function openJobModal() {
    document.getElementById("jobText").value = "";
    const preview = document.getElementById("parsePreview");
    preview.classList.remove("show"); preview.innerHTML = "";
    document.getElementById("jobSave").style.display = "none";
    document.getElementById("jobParse").style.display = "";
    parsedJob = null;
    jobModal.classList.add("show");
  }
  function closeJobModal() { jobModal.classList.remove("show"); }

  async function runParse() {
    const text = document.getElementById("jobText").value.trim();
    if (!text) return;
    const parseBtn = document.getElementById("jobParse");
    const original = parseBtn.textContent;
    parseBtn.disabled = true;
    parseBtn.innerHTML = '<span class="spinner"></span> ' + t("parsing");

    try {
      const res = await api.parseJob(text);
      if (res.error === "no_api_key") { alert(t("noKeyMsg")); return; }
      if (!res.ok || !res.result) { showToast(t("parseFailed")); return; }
      parsedJob = res.result;
      renderParsePreview(parsedJob);
      document.getElementById("jobSave").style.display = "";
      parseBtn.style.display = "none";
    } catch (err) {
      showToast(t("parseFailed"));
    } finally {
      parseBtn.disabled = false;
      parseBtn.innerHTML = original;
    }
  }

  function renderParsePreview(r) {
    const preview = document.getElementById("parsePreview");
    const rowHtml = (k, v) => v ? '<div class="pf-row"><span class="k">' + k + '</span><span class="v">' + escapeHtml(v) + "</span></div>" : "";
    preview.innerHTML =
      rowHtml(t("pfTitle"), r.title) +
      rowHtml(t("pfCompany"), r.company) +
      rowHtml(t("pfSalary"), r.salary) +
      rowHtml(t("pfLocation"), r.location) +
      rowHtml(t("pfMode"), r.mode) +
      rowHtml(t("pfField"), r.field) +
      rowHtml(t("pfSkills"), (r.skills || []).join(", "));
    preview.classList.add("show");
  }

  async function saveJobAsRow() {
    if (!parsedJob) return;
    const newRow = await api.addRow();
    const name = parsedJob.company
      ? (parsedJob.title ? parsedJob.title + " · " + parsedJob.company : parsedJob.company)
      : (parsedJob.title || "");
    await api.updateRow(newRow.id, {
      name,
      meta: {
        salary: parsedJob.salary || "",
        location: parsedJob.location || "",
        mode: parsedJob.mode || "",
        field: parsedJob.field || "",
        skills: parsedJob.skills || [],
      },
    });
    closeJobModal();
    await reload();
    showToast(t("toastJobSaved"));
  }

  // ---------------------------------------------------------------- //
  // Language                                                         //
  // ---------------------------------------------------------------- //
  function applyStaticLabels() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const value = I18N[currentLang][key];
      if (value !== undefined) el.innerHTML = value;
    });
    const jobText = document.getElementById("jobText");
    if (jobText) jobText.placeholder = t("jobPlaceholder");
  }

  function applyLanguage(lang) {
    currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
    applyStaticLabels();
    renderAll();
  }

  // ---------------------------------------------------------------- //
  // Wiring                                                           //
  // ---------------------------------------------------------------- //
  document.getElementById("addRow").addEventListener("click", async () => { await api.addRow(); await reload(); });

  document.getElementById("exportBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "application-tracker-backup-" + todayISO() + ".json";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(t("toastExported"));
  });

  document.getElementById("importBtn").addEventListener("click", () => document.getElementById("importFile").click());
  document.getElementById("importFile").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed)) throw new Error("not an array");
      const replace = confirm(t("importConfirmPrefix") + parsed.length + t("importConfirmSuffix"));
      await api.importRows(parsed, replace ? "replace" : "append");
      await reload();
      showToast(t("toastImported"));
    } catch (err) {
      alert(t("importError") + err.message);
    } finally {
      e.target.value = "";
    }
  });

  document.getElementById("langToggle").addEventListener("click", () => applyLanguage(currentLang === "zh" ? "en" : "zh"));

  document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => switchView(tab.dataset.view)));

  document.getElementById("calPrev").addEventListener("click", () => { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1); renderCalendar(); });
  document.getElementById("calNext").addEventListener("click", () => { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1); renderCalendar(); });

  document.getElementById("importJobBtn").addEventListener("click", openJobModal);
  document.getElementById("jobCancel").addEventListener("click", closeJobModal);
  document.getElementById("jobParse").addEventListener("click", runParse);
  document.getElementById("jobSave").addEventListener("click", saveJobAsRow);
  jobModal.addEventListener("click", (e) => { if (e.target === jobModal) closeJobModal(); });

  // Init
  applyStaticLabels();
  calMonth = new Date();
  reload();
})();