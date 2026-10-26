(() => {
  "use strict";

  const DATA = window.ART_DATA;
  const PUBLIC_EDITION = Boolean(window.PUBLIC_EDITION);
  const STORAGE_KEY = "after-seeing-research-workbench-v1";
  const cutMap = Object.fromEntries(DATA.cuts.map((cut) => [cut.id, cut]));
  const fieldMap = Object.fromEntries(DATA.fields.map((field) => [field.id, field]));
  const workMap = Object.fromEntries(DATA.works.map((work) => [work.id, work]));
  const periodMap = Object.fromEntries(DATA.periods.map((period) => [period.id, period]));
  const experimentMap = Object.fromEntries(DATA.experiments.map((lab) => [lab.id, lab]));
  const mediaMap = window.WORK_MEDIA || {};
  const timerCircumference = 2 * Math.PI * 34;
  const QUESTION_GUIDES = {
    apparatus: {
      concepts: "Barthes / Crary / Krauss",
      method: "比较取景、时长与展示界面；为每次观看记录装置条件。",
      counter: "不要只把技术当作压迫装置，也要检查使用者如何绕开、误用或重写它。",
    },
    evidence: {
      concepts: "Tagg / Sekula / Azoulay",
      method: "建立来源等级、图像版本、图注与机构记录之间的证据矩阵。",
      counter: "不要预设档案等于真相；询问谁被记录、谁有权解释、谁可以撤回。",
    },
    copy: {
      concepts: "Benjamin / Crimp / Levine",
      method: "追踪图像的复制链、版本差异、版权、署名与再语境化。",
      counter: "不要把一切复制都称为批判；必须说明复制改变了哪一种权力关系。",
    },
    gaze: {
      concepts: "Mulvey / hooks / Butler",
      method: "记录谁提出、谁同意、谁被看见、谁可以撤回和决定流通。",
      counter: "不要只用身份解释凝视；位置、制度、报酬与风险同样构成观看关系。",
    },
    material: {
      concepts: "Latour / Haraway / Demos",
      method: "绘制材料、能源、运输、维护与非人行动者的完整生命周期。",
      counter: "不要把生态当作风格；作品自身的资源消耗也必须进入分析。",
    },
  };
  const PROGRESS_PHASES = ["历史框架", "作品精读", "材料实验", "研究判断", "成果归档"];

  const els = {
    center: document.getElementById("center-content"),
    tabs: document.getElementById("main-tabs"),
    pathItems: document.getElementById("path-items"),
    headerContext: document.getElementById("header-context"),
    overviewIntro: document.getElementById("overview-intro"),
    overviewCta: document.getElementById("overview-cta"),
    overviewWorkCount: document.getElementById("overview-work-count"),
    footerWorkCount: document.getElementById("footer-work-count"),
    currentStage: document.getElementById("current-stage"),
    stageCopy: document.getElementById("stage-copy"),
    labStatusMark: document.getElementById("lab-status-mark"),
    labStatusLabel: document.getElementById("lab-status-label"),
    labNumber: document.getElementById("lab-number"),
    labTitle: document.getElementById("active-lab-title"),
    labHypothesis: document.getElementById("active-lab-hypothesis"),
    timerTotal: document.getElementById("timer-total"),
    timerDisplay: document.getElementById("timer-display"),
    timerState: document.getElementById("timer-state"),
    timerProgress: document.getElementById("timer-progress"),
    timerToggle: document.getElementById("timer-toggle"),
    timerReset: document.getElementById("timer-reset"),
    runSequence: document.getElementById("run-sequence"),
    parameterControls: document.getElementById("parameter-controls"),
    materialList: document.getElementById("material-list"),
    materialsCount: document.getElementById("materials-count"),
    relatedWorks: document.getElementById("related-works"),
    relatedCount: document.getElementById("related-count"),
    statusOptions: document.getElementById("status-options"),
    savedLabel: document.getElementById("saved-label"),
    saveRecord: document.getElementById("save-record"),
    statusWorkCount: document.getElementById("status-work-count"),
    statusWorkTotal: document.getElementById("status-work-total"),
    statusLab: document.getElementById("status-lab"),
    statusTimer: document.getElementById("status-timer"),
    statusProgress: document.getElementById("status-progress"),
    saveState: document.getElementById("save-state"),
    exportButton: document.getElementById("export-button"),
    filterAction: document.getElementById("filter-action"),
    referenceAction: document.getElementById("reference-action"),
    auditAction: document.getElementById("audit-action"),
    referenceDialog: document.getElementById("reference-dialog"),
    auditDialog: document.getElementById("audit-dialog"),
    referenceContent: document.getElementById("reference-content"),
    auditContent: document.getElementById("audit-content"),
    toast: document.getElementById("toast"),
  };

  function defaultState() {
    const labs = {};
    DATA.experiments.forEach((lab) => {
      labs[lab.id] = {
        status: "idle",
        elapsed: 0,
        demoStarted: 0,
        running: false,
        notes: "",
        materials: {},
        params: { ...lab.defaultParams },
      };
    });

    return {
      view: "history",
      periodId: "mechanical",
      cut: "all",
      field: "all",
      search: "",
      selectedWork: null,
      activeLab: "lab01",
      worksRead: {},
      labs,
      researchDraft: "",
      researchQuestions: [],
      progressLogs: [],
      savedAt: null,
    };
  }

  function loadState() {
    const base = defaultState();
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved || typeof saved !== "object") return base;
      const loaded = {
        ...base,
        ...saved,
        researchQuestions: Array.isArray(saved.researchQuestions) ? saved.researchQuestions : [],
        progressLogs: Array.isArray(saved.progressLogs) ? saved.progressLogs : [],
        labs: Object.fromEntries(
          DATA.experiments.map((lab) => [
            lab.id,
            {
              ...base.labs[lab.id],
              ...(saved.labs?.[lab.id] || {}),
              params: {
                ...base.labs[lab.id].params,
                ...(saved.labs?.[lab.id]?.params || {}),
              },
              materials: {
                ...(saved.labs?.[lab.id]?.materials || {}),
              },
              demoStarted: Number(saved.labs?.[lab.id]?.demoStarted || 0),
              running: false,
            },
          ]),
        ),
      };
      loaded.cut = loaded.cut === "all" || cutMap[loaded.cut] ? loaded.cut : "all";
      loaded.field = loaded.field === "all" || fieldMap[loaded.field] ? loaded.field : "all";
      loaded.worksRead = Object.fromEntries(
        Object.entries(loaded.worksRead || {}).filter(([workId]) => Boolean(workMap[workId])),
      );
      return loaded;
    } catch {
      return base;
    }
  }

  const state = loadState();
  const requestedView =
    window.location.hash.replace(/^#/, "") ||
    new URLSearchParams(window.location.search).get("view");
  if (["history", "works", "labs", "questions", "progress"].includes(requestedView)) {
    state.view = requestedView;
  }
  let toastTimer = null;
  let animationFrame = null;
  let lastPreviewDraw = 0;
  let editingQuestionId = null;
  let editingProgressId = null;

  function escapeHtml(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatTime(totalSeconds = 0, includeHours = false) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (includeHours || h > 0) {
      return [h, m, sec].map((v) => String(v).padStart(2, "0")).join(":");
    }
    return [m, sec].map((v) => String(v).padStart(2, "0")).join(":");
  }

  function uid(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function todayValue() {
    const date = new Date();
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  function saveState(show = false) {
    state.savedAt = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    els.saveState.textContent = show ? "已保存至本地" : "自动保存已开启";
    els.savedLabel.textContent = "SAVED";
    if (show) showToast("研究记录已保存到当前浏览器。");
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.add("is-visible");
    toastTimer = setTimeout(() => els.toast.classList.remove("is-visible"), 2600);
  }

  function activeLab() {
    return experimentMap[state.activeLab] || DATA.experiments[0];
  }

  function activeLabState() {
    return state.labs[activeLab().id];
  }

  function workStatus(workId) {
    return state.worksRead[workId] ? "已读" : "待读";
  }

  function workMedia(workId) {
    return mediaMap[workId] || { src: null, credit: "官方图像预览未确认", status: "restricted" };
  }

  function mediaLabel(media) {
    const rights =
      media.status === "open"
      ? "OPEN IMAGE"
      : media.status === "licensed"
        ? "LICENSED IMAGE"
      : media.status === "rights-held"
        ? "PUBLIC EDITION / IMAGE WITHHELD"
      : media.status === "research-preview"
        ? "RESEARCH PREVIEW"
        : "OFFICIAL IMAGE RESTRICTED";
    const viewLabels = {
      artwork: "ARTWORK",
      "artwork-detail": "ARTWORK DETAIL",
      "installation-view": "INSTALLATION VIEW",
      "installation-detail": "INSTALLATION DETAIL",
      "site-view": "SITE VIEW",
      "site-detail": "SITE DETAIL",
      drawing: "DRAWING",
      object: "OBJECT VIEW",
      "film-still": "FILM STILL",
      "performance-document": "PERFORMANCE DOCUMENT",
      "reenactment-document": "REENACTMENT DOCUMENT",
      "contact-sheet": "CONTACT SHEET",
      "project-document": "PROJECT DOCUMENT",
      "comparison-document": "COMPARISON DOCUMENT",
      "costume-display": "COSTUME DISPLAY",
      "textile-sample": "TEXTILE SAMPLE",
      "artwork-document": "ARTWORK DOCUMENT",
    };
    return media.viewType ? `${rights} / ${viewLabels[media.viewType] || "DOCUMENT"}` : rights;
  }

  function cutIcon(cutId) {
    const icons = {
      apparatus:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>',
      evidence:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4M9 11h6M9 15h6M9 7h2"/></svg>',
      copy:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="12" height="12"/><rect x="8" y="8" width="12" height="12"/></svg>',
      gaze:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.4"/></svg>',
      material:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19c1-8 6-13 14-14-1 8-6 13-14 14Z"/><path d="M5 19c4-5 8-8 13-11"/></svg>',
    };
    return icons[cutId] || icons.apparatus;
  }

  function workGlyph(cutId, index) {
    const variants = {
      apparatus: [
        '<svg viewBox="0 0 100 40"><path d="M5 30h90M24 4v32M50 4v32M76 4v32M12 10l76 20"/><circle cx="50" cy="20" r="8"/></svg>',
        '<svg viewBox="0 0 100 40"><path d="M3 36 30 4h40L97 36ZM18 28h64M50 7v29"/></svg>',
      ],
      evidence: [
        '<svg viewBox="0 0 100 40"><path d="M21 3h58v34H21zM29 11h30M29 17h42M29 23h24M29 29h38"/></svg>',
        '<svg viewBox="0 0 100 40"><path d="M9 34 30 6h48l13 28ZM37 17h30M32 24h44"/></svg>',
      ],
      copy: [
        '<svg viewBox="0 0 100 40"><path d="M12 8h56v27H12zM24 3h56v27"/><path d="M23 17h33M23 23h22"/></svg>',
        '<svg viewBox="0 0 100 40"><path d="M5 20h20M75 20h20M50 3v6M50 31v6"/><rect x="30" y="4" width="40" height="32"/><path d="M38 12h24M38 19h24M38 26h13"/></svg>',
      ],
      gaze: [
        '<svg viewBox="0 0 100 40"><path d="M3 20s16-15 47-15 47 15 47 15-16 15-47 15S3 20 3 20Z"/><circle cx="50" cy="20" r="8"/><circle cx="50" cy="20" r="2"/></svg>',
        '<svg viewBox="0 0 100 40"><circle cx="27" cy="20" r="7"/><circle cx="73" cy="20" r="7"/><path d="M34 20h32M6 5l18 10M94 5 76 15"/></svg>',
      ],
      material: [
        '<svg viewBox="0 0 100 40"><path d="M7 34c24-24 48-24 86-26M8 33c18-8 36-7 54-1M13 36c14-20 34-25 56-31"/></svg>',
        '<svg viewBox="0 0 100 40"><path d="M7 5h86M7 34h86M17 5v29M38 5v29M65 5v29M83 5v29"/></svg>',
      ],
    };
    const list = variants[cutId] || variants.apparatus;
    return list[index % list.length];
  }

  function renderOverview() {
    const readCount = DATA.works.filter((work) => state.worksRead[work.id]).length;
    const startedLabs = DATA.experiments.filter((lab) => state.labs[lab.id].status !== "idle").length;
    const groundedQuestions = state.researchQuestions.filter((item) => item.status === "grounded").length;
    const hasLogs = state.progressLogs.length > 0;
    const totalWorks = DATA.works.length;
    els.overviewIntro.textContent = DATA.project.intro;
    if (els.overviewCta) {
      els.overviewCta.innerHTML = `打开 ${totalWorks} 组作品档案 <span>→</span>`;
    }
    if (els.overviewWorkCount) els.overviewWorkCount.textContent = String(totalWorks);
    if (els.footerWorkCount) els.footerWorkCount.textContent = String(totalWorks);
    if (els.statusWorkTotal) els.statusWorkTotal.textContent = String(totalWorks);
    els.currentStage.textContent =
      groundedQuestions > 0 && hasLogs
        ? "04 / 论证"
        : startedLabs > 0
          ? "03 / 实验"
          : readCount > 0
            ? "02 / 精读"
            : "01 / 坐标";
    els.stageCopy.textContent =
      groundedQuestions > 0 && hasLogs
        ? "问题已经被证据推进，可以继续做反方检验和成果编排。"
        : startedLabs > 0
          ? "材料实验已经开始，把观察记录回填到问题与主张。"
          : readCount > 0
            ? "正在建立作品证据，下一步要把观察转化为可检验问题。"
            : "先建立历史坐标和作品证据，再进入材料实验与项目论证。";

    els.pathItems.innerHTML = DATA.cuts
      .map((cut) => {
        const works = DATA.works.filter((work) => work.cut === cut.id);
        const read = works.filter((work) => state.worksRead[work.id]).length;
        const progress = works.length ? Math.round((read / works.length) * 100) : 0;
        const active = state.cut === cut.id && state.view === "works";
        return `
          <button class="path-item ${active ? "is-active" : ""}" type="button" data-cut-filter="${cut.id}">
            <span class="path-icon">${cutIcon(cut.id)}</span>
            <span>
              <span class="path-name">${cut.index} / ${escapeHtml(cut.name)}</span>
              <span class="path-meta">${escapeHtml(cut.en)} · ${read}/${works.length} 已读</span>
            </span>
            <span class="path-count">${String(progress).padStart(2, "0")}%</span>
            <span class="path-progress"><i style="width:${progress}%"></i></span>
          </button>
        `;
      })
      .join("");
  }

  function renderTabs() {
    els.tabs.querySelectorAll(".main-tab").forEach((tab) => {
      const active = tab.dataset.view === state.view;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-current", active ? "page" : "false");
    });
    const labels = {
      history: "艺术史不是单线进步，而是一组观看制度的变化",
      works: "作品不是插图，而是可以被检验的视觉证据",
      labs: "实验不是装饰动作，而是对研究假设的材料检验",
      questions: "研究问题必须具体到对象、关系与证据",
      progress: "项目推进以证据密度和判断成熟度衡量",
    };
    els.headerContext.textContent = labels[state.view];
  }

  function renderHistory() {
    const selectedPeriod = periodMap[state.periodId] || DATA.periods[0];
    const related = DATA.works.filter((work) => work.period === selectedPeriod.id);
    els.center.innerHTML = `
      <section class="view-shell reveal">
        <header class="view-intro">
          <div>
            <p class="view-label">01 / ART HISTORICAL FRAME</p>
            <h1 class="view-title">观看如何被历史地组织？</h1>
          </div>
          <div>
            <p class="view-summary">艺术史不是名作年表，而是技术、制度、身体与意义不断重组的现场。点击时间节点，查看该阶段的核心问题与作品位置。</p>
            <p class="view-meta">${String(DATA.periods.length).padStart(2, "0")} PERIODS · ${DATA.works.length} CASE GROUPS · ${String(DATA.fields.length).padStart(2, "0")} MEDIA WORLDS · 05 RESEARCH AXES</p>
          </div>
        </header>

        <div class="timeline">
          ${DATA.periods
            .map(
              (period, index) => `
                <button type="button" class="timeline-item ${period.id === selectedPeriod.id ? "is-active" : ""}" data-period="${period.id}">
                  <span class="timeline-years">${escapeHtml(period.years)}</span>
                  <span class="timeline-dot" aria-hidden="true"></span>
                  <span class="timeline-body">
                    <strong>${escapeHtml(period.label)}</strong>
                    <span>${escapeHtml(period.question)}</span>
                  </span>
                  <span class="timeline-count">${String(DATA.works.filter((work) => work.period === period.id).length).padStart(2, "0")} 件</span>
                </button>
              `,
            )
            .join("")}
        </div>

        <div class="timeline-detail">
          <div>
            <p class="view-label">SELECTED PERIOD / ${String(DATA.periods.indexOf(selectedPeriod) + 1).padStart(2, "0")}</p>
            <h3>${escapeHtml(selectedPeriod.label)}</h3>
            <p>${escapeHtml(selectedPeriod.note)}</p>
            <p class="timeline-detail-question">${escapeHtml(selectedPeriod.question)}</p>
          </div>
          <div class="timeline-related">
            <div class="section-label compact"><span>阶段作品</span><span class="rule"></span><span>${String(related.length).padStart(2, "0")}</span></div>
            <div class="mini-work-list">
              ${
                related.length
                  ? related
                      .slice(0, 6)
                      .map(
                        (work) => `
                          <button class="mini-work" type="button" data-work="${work.id}">
                            <b>${work.no}</b>
                            <span>${escapeHtml(work.zh)}<br><em>${escapeHtml(work.artist)}</em></span>
                          </button>`,
                      )
                      .join("")
                  : '<p class="view-summary">这一阶段作为方法前史保留，尚未分配具体作品样本。</p>'
              }
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function filteredWorks() {
    const search = state.search.trim().toLowerCase();
    return DATA.works.filter((work) => {
      const matchesCut = state.cut === "all" || work.cut === state.cut;
      const matchesField = state.field === "all" || work.field === state.field;
      const haystack = [work.artist, work.title, work.zh, work.medium, work.place, work.look, fieldMap[work.field]?.name]
        .join(" ")
        .toLowerCase();
      return matchesCut && matchesField && (!search || haystack.includes(search));
    });
  }

  function filterCount(cutId = "all", fieldId = "all") {
    return DATA.works.filter(
      (work) => (cutId === "all" || work.cut === cutId) && (fieldId === "all" || work.field === fieldId),
    ).length;
  }

  function renderWorks() {
    if (state.selectedWork && workMap[state.selectedWork]) {
      renderWorkDetail(workMap[state.selectedWork]);
      return;
    }

    const list = filteredWorks();
    const imageCount = DATA.works.filter((work) => Boolean(workMedia(work.id).src)).length;
    const unverifiedCount = PUBLIC_EDITION
      ? DATA.works.filter((work) => workMedia(work.id).status === "research-preview").length
      : 0;
    const readCount = DATA.works.filter((work) => state.worksRead[work.id]).length;
    els.center.innerHTML = `
      <section class="view-shell reveal">
        <header class="view-intro">
          <div>
            <p class="view-label">02 / CLOSE READING</p>
            <h1 class="view-title">作品不是答案，<br>而是证据装置。</h1>
          </div>
          <div>
            <p class="view-summary">用“研究切口 × 媒介世界”交叉筛选 ${DATA.works.length} 组案例。每张卡先给出观看机制，再进入生产条件、制度位置、原始材料与创作转译。</p>
            <p class="view-meta">${list.length} VISIBLE / ${PUBLIC_EDITION ? `${imageCount} STUDY IMAGES / ${unverifiedCount} RIGHTS UNVERIFIED` : `${imageCount} VERIFIED IMAGES`} / ${String(DATA.fields.length).padStart(2, "0")} MEDIA WORLDS / ${readCount} READ</p>
          </div>
        </header>

        <div class="works-toolbar">
          <div class="filter-stack">
            <div class="filter-group">
              <span class="filter-label">RESEARCH AXIS / 研究切口</span>
              <div class="cut-filter" aria-label="研究切口筛选">
                <button type="button" class="${state.cut === "all" ? "is-active" : ""}" data-cut-filter="all">全部 ${filterCount("all", state.field)}</button>
                ${DATA.cuts
                  .map(
                    (cut) =>
                      `<button type="button" class="${state.cut === cut.id ? "is-active" : ""}" data-cut-filter="${cut.id}">${cut.index} ${escapeHtml(cut.name)} <small>${filterCount(cut.id, state.field)}</small></button>`,
                  )
                  .join("")}
              </div>
            </div>
            <div class="filter-group">
              <span class="filter-label">MEDIA WORLD / 媒介世界</span>
              <div class="field-filter" aria-label="媒介世界筛选">
                <button type="button" class="${state.field === "all" ? "is-active" : ""}" data-field-filter="all">全部 ${filterCount(state.cut, "all")}</button>
                ${DATA.fields
                  .map(
                    (field) =>
                      `<button type="button" class="${state.field === field.id ? "is-active" : ""}" data-field-filter="${field.id}">${field.index} ${escapeHtml(field.name)} <small>${filterCount(state.cut, field.id)}</small></button>`,
                  )
                  .join("")}
              </div>
            </div>
          </div>
          <label class="search-line">
            <span>SEARCH</span>
            <input id="work-search" type="search" value="${escapeHtml(state.search)}" placeholder="艺术家 / 标题 / 媒介 / 主题" autocomplete="off" />
          </label>
        </div>

        ${
          list.length
            ? `<div class="work-grid">${list.map(renderWorkCard).join("")}</div>`
            : '<p class="empty-state">没有符合当前筛选条件的作品。</p>'
        }
      </section>
    `;
  }

  function renderWorkCard(work, index) {
    const cut = cutMap[work.cut];
    const media = workMedia(work.id);
    return `
      <button class="work-card" type="button" data-work="${work.id}">
        <span class="work-plate" style="color:${cut.color};--r:${((Number(work.no) % 5) - 2) * 3}deg">
          ${
            media.src
              ? `<img class="work-photo" src="${escapeHtml(media.src)}" alt="${escapeHtml(work.zh)}作品预览" loading="lazy" decoding="async" referrerpolicy="no-referrer" />`
              : ""
          }
          <span class="work-glyph">${workGlyph(work.cut, index)}</span>
          <span class="image-state">${mediaLabel(media)}</span>
        </span>
        <span>
          <span class="work-number">${work.no} · ${escapeHtml(cut.en)} · ${escapeHtml(fieldMap[work.field]?.en || "UNCLASSIFIED")}</span>
          <span class="work-title">${escapeHtml(work.zh)}</span>
          <span class="work-meta-line">${escapeHtml(work.artist)}<br>${escapeHtml(work.year)} · ${escapeHtml(work.medium)}</span>
          <span class="work-status">${workStatus(work.id)}</span>
        </span>
      </button>
    `;
  }

  function renderWorkDetail(work) {
    const cut = cutMap[work.cut];
    const field = fieldMap[work.field];
    const period = periodMap[work.period];
    const isRead = Boolean(state.worksRead[work.id]);
    const media = workMedia(work.id);
    const fallbackTitle = PUBLIC_EDITION
      ? "公开版不转载该图像"
      : "馆方页面未提供可移植预览";
    const fallbackCopy = PUBLIC_EDITION
      ? "该图像仅保留在研究版中。这里公开作品说明、证据判断与官方对象页入口。"
      : "保留作品来源与图像说明；不使用无关图片替代作品。";
    els.center.innerHTML = `
      <section class="view-shell reveal">
        <button type="button" class="detail-back" data-back-works>← BACK TO SPECIMENS</button>
        <header class="work-detail-head">
          <div>
            <p class="work-detail-label">${work.no} / ${escapeHtml(field?.en || "UNCLASSIFIED")} / ${escapeHtml(cut.en)} / ${escapeHtml(period.years)}</p>
            <h1 class="work-detail-title">${escapeHtml(work.zh)}</h1>
            <p class="work-detail-subtitle">${escapeHtml(work.title)} · ${escapeHtml(work.artist)}</p>
          </div>
          <div class="detail-number">${work.no}</div>
        </header>

        <figure class="work-visual">
          <div class="work-visual-frame ${media.src ? "" : "is-restricted"}">
            ${
              media.src
                ? `<img src="${escapeHtml(media.src)}" alt="${escapeHtml(work.zh)}作品预览" loading="eager" decoding="async" referrerpolicy="no-referrer" />`
                : ""
            }
            <div class="restricted-message image-fallback">
              <span>${PUBLIC_EDITION ? "PUBLIC EDITION / RIGHTS-HELD IMAGE" : "OFFICIAL IMAGE / NOT PUBLICLY TRANSFERABLE"}</span>
              <strong>${fallbackTitle}</strong>
              <p>${fallbackCopy}</p>
            </div>
          </div>
          <figcaption>
            <span>${mediaLabel(media)}</span>
            <span>${escapeHtml(media.credit)}</span>
            <a href="${escapeHtml(work.source)}" target="_blank" rel="noreferrer">查看官方作品页 ↗</a>
            ${
              media.imageSource
                ? `<a href="${escapeHtml(media.imageSource)}" target="_blank" rel="noreferrer">图像原文件页 ↗</a>`
                : ""
            }
          </figcaption>
        </figure>

        <div class="work-meta-grid">
          <div class="meta-item"><span>YEAR</span><b>${escapeHtml(work.year)}</b></div>
          <div class="meta-item"><span>MEDIUM</span><b>${escapeHtml(work.medium)}</b></div>
          <div class="meta-item"><span>PLACE</span><b>${escapeHtml(work.place)}</b></div>
          <div class="meta-item"><span>FIELD</span><b>${escapeHtml(field?.name || "未分类")}</b></div>
          <div class="meta-item"><span>AXIS</span><b>${escapeHtml(cut.name)}</b></div>
        </div>

        <div class="reading-blocks">
          <article class="reading-block"><h3>01 / 视觉证据 / WHAT IS VISIBLE</h3><p>${escapeHtml(work.look)}</p></article>
          <article class="reading-block"><h3>02 / 方法与生产 / HOW IT IS MADE</h3><p>${escapeHtml(work.production)}</p></article>
          <article class="reading-block"><h3>03 / 理念与冲突 / WHY IT MATTERS</h3><p>${escapeHtml(work.stakes)}</p></article>
          <article class="reading-block"><h3>04 / 可转译的问题 / WHAT TO CARRY FORWARD</h3><p>${escapeHtml(work.transfer)}</p></article>
        </div>

        ${
          work.primaryMaterial || work.counterReading || work.evidenceGap
            ? `
              <details class="evidence-drawer" open>
                <summary><span>EVIDENCE DRAWER / 证据抽屉</span><span>原始材料 · 反方 · 缺口</span></summary>
                <div class="evidence-drawer-grid">
                  ${work.primaryMaterial ? `<article><span>01 / PRIMARY LEADS</span><h3>原始材料线索</h3><p>${escapeHtml(work.primaryMaterial)}</p></article>` : ""}
                  ${work.counterReading ? `<article><span>02 / COUNTER-READING</span><h3>反方解释</h3><p>${escapeHtml(work.counterReading)}</p></article>` : ""}
                  ${work.evidenceGap ? `<article><span>03 / EVIDENCE GAP</span><h3>仍需核查</h3><p>${escapeHtml(work.evidenceGap)}</p></article>` : ""}
                </div>
              </details>
            `
            : ""
        }

        ${
          Array.isArray(work.relatedExamples) && work.relatedExamples.length
            ? `
              <section class="related-case-group">
                <div class="section-label compact"><span>RELATED CASE GROUP</span><span class="rule"></span><span>${String(work.relatedExamples.length).padStart(2, "0")}</span></div>
                <div class="related-case-grid">
                  ${work.relatedExamples
                    .map(
                      (item) => `
                        <a href="${escapeHtml(item.source)}" target="_blank" rel="noreferrer">
                          <span>${escapeHtml(item.year)}</span>
                          <strong>${escapeHtml(item.title)}</strong>
                          <em>${escapeHtml(item.artist)}</em>
                          <b>打开来源 ↗</b>
                        </a>`,
                    )
                    .join("")}
                </div>
              </section>
            `
            : ""
        }

        <div class="detail-actions">
          <a href="${escapeHtml(work.source)}" target="_blank" rel="noreferrer">查看官方来源 ↗</a>
          <button type="button" data-toggle-read="${work.id}">${isRead ? "取消已读标记" : "标记为已读"}</button>
        </div>
      </section>
    `;
  }

  function renderLabs() {
    const lab = activeLab();
    const labState = activeLabState();
    els.center.innerHTML = `
      <section class="view-shell reveal">
        <header class="view-intro">
          <div>
            <p class="view-label">03 / MATERIAL EXPERIMENTS</p>
            <h1 class="view-title">把观看变成<br>可以重复的动作。</h1>
          </div>
          <div>
            <p class="view-summary">五组实验不追求成品，而是用材料、时间、规则和限制检验问题。右侧控制台会实时改变画面参数，并保存实验记录。</p>
            <p class="view-meta">05 PROTOCOLS · LOCAL RECORDS · PARAMETER PREVIEW</p>
          </div>
        </header>

        <div class="lab-list">
          ${DATA.experiments
            .map((item) => {
              const itemState = state.labs[item.id];
              return `
                <button type="button" class="lab-card ${item.id === lab.id ? "is-active" : ""}" data-lab="${item.id}">
                  <span class="lab-card-index"><span>${item.no}</span><span>${statusLabel(itemState.status).toUpperCase()}</span></span>
                  <h3>${escapeHtml(item.title)}</h3>
                  <p>${item.duration} MIN · ${escapeHtml(cutMap[item.cut].name)}</p>
                </button>
              `;
            })
            .join("")}
        </div>

        <div class="lab-console">
          <div>
            <div class="canvas-frame">
              <canvas id="lab-canvas" aria-label="实验参数实时预览"></canvas>
            </div>
            <div class="canvas-caption">
              <span>FIG. A / ACTIVE MATERIAL TEST</span>
              <span id="canvas-parameter-summary">PARAMETERS / LIVE</span>
            </div>
          </div>
          <div class="lab-brief">
            <p class="view-label">${lab.no} / ${escapeHtml(cutMap[lab.cut].en)}</p>
            <h3>${escapeHtml(lab.title)}</h3>
            <p class="hypothesis">${escapeHtml(lab.hypothesis)}</p>
            <ol class="procedure-list">
              ${lab.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}
            </ol>
          </div>
        </div>

        <div class="notes-block">
          <label for="lab-notes"><span>OBSERVATION LOG / 观察记录</span><span>${labState.notes.length} 字</span></label>
          <textarea id="lab-notes" placeholder="记录变量、意外、失败、伦理风险，以及下一轮要改变的一件事。">${escapeHtml(labState.notes)}</textarea>
          <div class="observation-tools">
            <div>
              <span class="tool-label">OBSERVE / 观察提示</span>
              <ol>${lab.observe.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
            </div>
            <button type="button" class="stamp-action" data-stamp-observation>记录当前参数 ↗</button>
          </div>
        </div>
      </section>
    `;

    requestAnimationFrame(() => {
      const canvas = document.getElementById("lab-canvas");
      if (canvas) {
        canvas.addEventListener("pointerdown", applyCanvasPointer);
        canvas.addEventListener("pointermove", applyCanvasPointer);
      }
      startPreviewLoop();
    });
  }

  function renderQuestions() {
    const editing = state.researchQuestions.find((item) => item.id === editingQuestionId);
    const activeCount = state.researchQuestions.filter((item) => item.status === "active").length;
    const groundedCount = state.researchQuestions.filter((item) => item.status === "grounded").length;
    els.center.innerHTML = `
      <section class="view-shell reveal">
        <header class="view-intro">
          <div>
            <p class="view-label">04 / RESEARCH QUESTIONS</p>
            <h1 class="view-title">从一个直觉，<br>逼近一个可研究的问题。</h1>
          </div>
          <div>
            <p class="view-summary">研究问题不是灵感句，而是一条可检验的责任链：它必须限定对象、提出判断、说明方法、预想反证，并留下下一次行动的入口。</p>
            <p class="view-meta">05 AXES · ${state.researchQuestions.length} SAVED QUESTIONS · ${activeCount} ACTIVE · ${groundedCount} GROUNDED</p>
          </div>
        </header>
        <div class="question-list">
          ${DATA.cuts
            .map(
              (cut) => `
                <details class="question-row">
                  <summary class="question-summary">
                    <b>${cut.index}</b>
                    <strong>${escapeHtml(cut.question)}</strong>
                    <span>＋</span>
                  </summary>
                  <div class="question-content">
                    <div>
                      <p>${escapeHtml(cut.description)}</p>
                    </div>
                    <div>
                      <ul>
                        <li><strong>理论锚点：</strong>${escapeHtml(QUESTION_GUIDES[cut.id].concepts)}</li>
                        <li><strong>方法：</strong>${escapeHtml(QUESTION_GUIDES[cut.id].method)}</li>
                        <li><strong>反方检查：</strong>${escapeHtml(QUESTION_GUIDES[cut.id].counter)}</li>
                      </ul>
                    </div>
                  </div>
                </details>`,
            )
            .join("")}
        </div>

        <section class="studio-section">
          <div class="studio-head">
            <div>
              <p class="view-label">QUESTION BUILDER / 问题构建器</p>
              <h3>${editing ? "修改研究问题" : "登记一个新问题"}</h3>
            </div>
            <span class="saved-badge">${editing ? "EDITING" : "LOCAL ARCHIVE"}</span>
          </div>
          <form id="research-question-form" class="record-form">
            <input type="hidden" name="id" value="${escapeHtml(editing?.id || "")}" />
            <div class="form-grid two">
              <label class="field">
                <span>所属切口</span>
                <select name="axis" required>
                  ${DATA.cuts
                    .map(
                      (cut) =>
                        `<option value="${cut.id}" ${editing?.axis === cut.id ? "selected" : ""}>${cut.index} / ${escapeHtml(cut.name)}</option>`,
                    )
                    .join("")}
                </select>
              </label>
              <label class="field">
                <span>研究阶段</span>
                <select name="status">
                  <option value="seed" ${!editing || editing.status === "seed" ? "selected" : ""}>种子问题</option>
                  <option value="active" ${editing?.status === "active" ? "selected" : ""}>正在研究</option>
                  <option value="grounded" ${editing?.status === "grounded" ? "selected" : ""}>有证据支撑</option>
                </select>
              </label>
            </div>
            <label class="field">
              <span>核心问题</span>
              <textarea name="question" rows="3" required placeholder="谁，在什么制度或材料条件中，通过什么机制，造成了什么可观察的后果？">${escapeHtml(editing?.question || state.researchDraft || "")}</textarea>
            </label>
            <div class="form-grid two">
              <label class="field">
                <span>暂时判断</span>
                <textarea name="claim" rows="3" placeholder="一句可以被证据反驳的判断。">${escapeHtml(editing?.claim || "")}</textarea>
              </label>
              <label class="field">
                <span>方法与工具</span>
                <textarea name="method" rows="3" placeholder="视觉分析、档案、访谈、比较、实践测试……">${escapeHtml(editing?.method || "")}</textarea>
              </label>
              <label class="field">
                <span>需要的证据</span>
                <textarea name="evidence" rows="3" placeholder="作品原件、图注、合同、工时表、访谈原话……">${escapeHtml(editing?.evidence || "")}</textarea>
              </label>
              <label class="field">
                <span>可能的反证</span>
                <textarea name="counter" rows="3" placeholder="什么资料会推翻这个判断？">${escapeHtml(editing?.counter || "")}</textarea>
              </label>
            </div>
            <div class="form-actions">
              <button type="submit" class="form-submit">${editing ? "更新问题" : "写入问题库"} ↗</button>
              ${editing ? '<button type="button" class="form-cancel" data-cancel-question>取消编辑</button>' : ""}
            </div>
          </form>
        </section>

        <section class="ledger-section">
          <div class="studio-head">
            <div>
              <p class="view-label">RESEARCH LEDGER</p>
              <h3>已保存的问题</h3>
            </div>
            <span class="saved-badge">${state.researchQuestions.length} RECORDS</span>
          </div>
          <div class="research-ledger">
            ${
              state.researchQuestions.length
                ? state.researchQuestions.map(renderSavedQuestion).join("")
                : '<p class="empty-ledger">尚无保存的问题。先把一个模糊直觉写成“对象—机制—后果”的关系。</p>'
            }
          </div>
        </section>
      </section>
    `;
  }

  function renderSavedQuestion(item, index) {
    const cut = cutMap[item.axis] || DATA.cuts[0];
    const status = {
      seed: "种子",
      active: "研究进行中",
      grounded: "有证据支撑",
    }[item.status] || "种子";
    return `
      <article class="saved-question" style="--accent:${cut.color}">
        <div class="saved-question-index">${String(index + 1).padStart(2, "0")}</div>
        <div class="saved-question-body">
          <div class="saved-question-meta">
            <span>${escapeHtml(cut.name)}</span>
            <span>${status}</span>
            <span>${new Date(item.updatedAt).toLocaleDateString("zh-CN")}</span>
          </div>
          <h4>${escapeHtml(item.question)}</h4>
          <p>${escapeHtml(item.claim || "尚未写下暂时判断。")}</p>
          <dl class="question-record-grid">
            <div><dt>方法</dt><dd>${escapeHtml(item.method || "待补充")}</dd></div>
            <div><dt>证据</dt><dd>${escapeHtml(item.evidence || "待补充")}</dd></div>
            <div><dt>反证</dt><dd>${escapeHtml(item.counter || "待补充")}</dd></div>
          </dl>
          <div class="record-actions">
            <button type="button" data-edit-question="${item.id}">编辑</button>
            <button type="button" data-delete-question="${item.id}">删除</button>
          </div>
        </div>
      </article>
    `;
  }

  function progressValues() {
    const totalWorks = DATA.works.length;
    const readWorks = DATA.works.filter((work) => state.worksRead[work.id]).length;
    const doneLabs = DATA.experiments.filter((lab) => state.labs[lab.id].status === "done").length;
    const startedLabs = DATA.experiments.filter((lab) => state.labs[lab.id].status !== "idle").length;
    const questionCount = state.researchQuestions.length;
    const activeQuestions = state.researchQuestions.filter((item) => item.status === "active").length;
    const groundedQuestions = state.researchQuestions.filter((item) => item.status === "grounded").length;
    const logCount = state.progressLogs.length;
    const doneLogs = state.progressLogs.filter((item) => item.status === "done").length;
    const workProgress = Math.round((readWorks / totalWorks) * 100);
    const labProgress = Math.round((doneLabs / DATA.experiments.length) * 100);
    const questionPoints = Math.min(20, questionCount * 2 + groundedQuestions * 3);
    const logPoints = Math.min(15, logCount * 1.5 + doneLogs * 1.5);
    const overall = Math.round(workProgress * 0.4 + labProgress * 0.25 + questionPoints + logPoints);
    return {
      totalWorks,
      readWorks,
      doneLabs,
      startedLabs,
      workProgress,
      labProgress,
      questionCount,
      activeQuestions,
      groundedQuestions,
      logCount,
      doneLogs,
      overall,
    };
  }

  function renderProgress() {
    const stats = progressValues();
    const editing = state.progressLogs.find((item) => item.id === editingProgressId);
    els.center.innerHTML = `
      <section class="view-shell reveal">
        <header class="view-intro">
          <div>
            <p class="view-label">05 / RESEARCH PROGRESS</p>
            <h1 class="view-title">研究不是“做完了”，<br>而是证据开始互相支撑。</h1>
          </div>
          <div>
            <p class="view-summary">进度由作品证据、实验状态、已保存问题和推进日志共同计算。这里的每一笔记录都可以修改，刷新页面后仍会保留。</p>
            <p class="view-meta">LIVE FROM LOCAL RECORDS / ${state.savedAt ? new Date(state.savedAt).toLocaleString("zh-CN", { hour12: false }) : "尚未保存"}</p>
          </div>
        </header>

        <div class="progress-topline">
          <div class="progress-stat"><strong>${String(stats.readWorks).padStart(2, "0")}</strong><span>已读作品 / 共 ${stats.totalWorks}</span></div>
          <div class="progress-stat"><strong>${String(stats.startedLabs).padStart(2, "0")}</strong><span>已启动实验 / 共 5</span></div>
          <div class="progress-stat"><strong>${String(stats.groundedQuestions).padStart(2, "0")}</strong><span>有证据支撑的问题</span></div>
          <div class="progress-stat"><strong>${String(stats.overall).padStart(2, "0")}%</strong><span>综合研究进度</span></div>
        </div>

        <div class="progress-chart">
          <div class="progress-chart-head">
            <h3>五条研究轴 / 阅读与实验覆盖</h3>
            <span>DATA FROM LOCAL STATE</span>
          </div>
          <div class="progress-rows">
            ${DATA.cuts
              .map((cut) => {
                const works = DATA.works.filter((work) => work.cut === cut.id);
                const read = works.filter((work) => state.worksRead[work.id]).length;
                const lab = DATA.experiments.find((item) => item.cut === cut.id);
                const labDone = lab && state.labs[lab.id].status === "done" ? 10 : 0;
                const value = Math.min(100, Math.round((read / works.length) * 90) + labDone);
                return `
                  <div class="progress-row">
                    <span>${cut.index} / ${escapeHtml(cut.name)}</span>
                    <div class="progress-track"><div class="progress-fill" style="--value:${value}%;--bar-color:${cut.color}"></div></div>
                    <b>${String(value).padStart(2, "0")}%</b>
                  </div>`;
              })
              .join("")}
          </div>
        </div>

        <div class="roadmap">
          ${[
            ["01", "历史坐标", "建立艺术史与媒介问题"],
            ["02", "作品证据", stats.readWorks > 0 ? `已读 ${stats.readWorks} 件` : "尚未开始"],
            ["03", "材料实验", stats.startedLabs > 0 ? `已启动 ${stats.startedLabs} 组` : "尚未开始"],
            ["04", "研究判断", stats.questionCount ? `${stats.questionCount} 个问题入库` : "等待问题"],
            ["05", "成果归档", stats.logCount ? `${stats.logCount} 条推进记录` : "持续记录"],
          ]
            .map(
              (item, index) => `
                <div class="roadmap-step ${index <= 1 || (index === 2 && stats.startedLabs) || (index === 3 && stats.questionCount) || (index === 4 && stats.logCount) ? "is-done" : ""}">
                  <span>${item[0]}</span>
                  <h4>${item[1]}</h4>
                  <p>${item[2]}</p>
                </div>`,
            )
            .join("")}
        </div>

        <section class="studio-section">
          <div class="studio-head">
            <div>
              <p class="view-label">PROGRESS JOURNAL / 推进日志</p>
              <h3>${editing ? "修改推进记录" : "登记本轮推进"}</h3>
            </div>
            <span class="saved-badge">${stats.logCount} ENTRIES</span>
          </div>
          <form id="progress-log-form" class="record-form">
            <input type="hidden" name="id" value="${escapeHtml(editing?.id || "")}" />
            <div class="form-grid three">
              <label class="field">
                <span>日期</span>
                <input type="date" name="date" required value="${escapeHtml(editing?.date || todayValue())}" />
              </label>
              <label class="field">
                <span>阶段</span>
                <select name="phase">
                  ${PROGRESS_PHASES
                    .map(
                      (phase) =>
                        `<option value="${phase}" ${editing?.phase === phase ? "selected" : ""}>${escapeHtml(phase)}</option>`,
                    )
                    .join("")}
                </select>
              </label>
              <label class="field">
                <span>状态</span>
                <select name="status">
                  <option value="planned" ${editing?.status === "planned" ? "selected" : ""}>待进行</option>
                  <option value="active" ${!editing || editing.status === "active" ? "selected" : ""}>进行中</option>
                  <option value="done" ${editing?.status === "done" ? "selected" : ""}>已完成</option>
                </select>
              </label>
            </div>
            <label class="field">
              <span>本轮标题</span>
              <input type="text" name="title" required value="${escapeHtml(editing?.title || "")}" placeholder="例：完成第一轮图像来源核验" />
            </label>
            <div class="form-grid two">
              <label class="field">
                <span>实际推进</span>
                <textarea name="detail" rows="3" required placeholder="具体完成了什么，改变了什么判断？">${escapeHtml(editing?.detail || "")}</textarea>
              </label>
              <label class="field">
                <span>证据与产物</span>
                <textarea name="evidence" rows="3" placeholder="文件、图像、访问、实验记录、会议结论……">${escapeHtml(editing?.evidence || "")}</textarea>
              </label>
            </div>
            <label class="field">
              <span>下一步</span>
              <input type="text" name="next" value="${escapeHtml(editing?.next || "")}" placeholder="下一件必须完成的具体事情" />
            </label>
            <div class="form-actions">
              <button type="submit" class="form-submit">${editing ? "更新记录" : "登记推进"} ↗</button>
              ${editing ? '<button type="button" class="form-cancel" data-cancel-progress>取消编辑</button>' : ""}
            </div>
          </form>
        </section>

        <section class="ledger-section">
          <div class="studio-head">
            <div>
              <p class="view-label">PROJECT LEDGER</p>
              <h3>研究轨迹</h3>
            </div>
            <span class="saved-badge">${stats.doneLogs} DONE</span>
          </div>
          <div class="progress-log-list">
            ${
              state.progressLogs.length
                ? [...state.progressLogs]
                    .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt))
                    .map(renderProgressLog)
                    .join("")
                : '<p class="empty-ledger">尚无推进记录。每完成一次阅读、访谈、实验或判断修正，都应在这里留下可追踪的一步。</p>'
            }
          </div>
        </section>
      </section>
    `;
  }

  function renderProgressLog(item, index) {
    const labels = { planned: "待进行", active: "进行中", done: "已完成" };
    return `
      <article class="progress-log">
        <div class="progress-log-date">${escapeHtml(item.date)}</div>
        <div class="progress-log-body">
          <div class="saved-question-meta">
            <span>${escapeHtml(item.phase)}</span>
            <span>${labels[item.status] || "进行中"}</span>
            <span>${String(index + 1).padStart(2, "0")}</span>
          </div>
          <h4>${escapeHtml(item.title)}</h4>
          <p>${escapeHtml(item.detail)}</p>
          <dl class="question-record-grid">
            <div><dt>证据 / 产物</dt><dd>${escapeHtml(item.evidence || "待补充")}</dd></div>
            <div><dt>下一步</dt><dd>${escapeHtml(item.next || "待补充")}</dd></div>
          </dl>
          <div class="record-actions">
            <button type="button" data-edit-progress="${item.id}">编辑</button>
            <button type="button" data-delete-progress="${item.id}">删除</button>
          </div>
        </div>
      </article>
    `;
  }

  function saveResearchQuestion(formData) {
    const question = String(formData.get("question") || "").trim();
    if (!question) return;
    const now = new Date().toISOString();
    const existing = state.researchQuestions.find((item) => item.id === formData.get("id"));
    const record = {
      id: existing?.id || uid("q"),
      axis: String(formData.get("axis") || "apparatus"),
      status: String(formData.get("status") || "seed"),
      question,
      claim: String(formData.get("claim") || "").trim(),
      method: String(formData.get("method") || "").trim(),
      evidence: String(formData.get("evidence") || "").trim(),
      counter: String(formData.get("counter") || "").trim(),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    state.researchQuestions = existing
      ? state.researchQuestions.map((item) => (item.id === record.id ? record : item))
      : [record, ...state.researchQuestions];
    editingQuestionId = null;
    state.researchDraft = "";
    renderQuestions();
    renderOverview();
    renderStatusBar();
    saveState(true);
  }

  function saveProgressLog(formData) {
    const title = String(formData.get("title") || "").trim();
    const detail = String(formData.get("detail") || "").trim();
    if (!title || !detail) return;
    const now = new Date().toISOString();
    const existing = state.progressLogs.find((item) => item.id === formData.get("id"));
    const record = {
      id: existing?.id || uid("log"),
      date: String(formData.get("date") || todayValue()),
      phase: String(formData.get("phase") || ""),
      status: String(formData.get("status") || "active"),
      title,
      detail,
      evidence: String(formData.get("evidence") || "").trim(),
      next: String(formData.get("next") || "").trim(),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    state.progressLogs = existing
      ? state.progressLogs.map((item) => (item.id === record.id ? record : item))
      : [record, ...state.progressLogs];
    editingProgressId = null;
    renderProgress();
    renderOverview();
    renderStatusBar();
    saveState(true);
  }

  function stampObservation() {
    const lab = activeLab();
    const labState = activeLabState();
    const timestamp = new Date().toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parameters = Object.entries(labState.params)
      .map(([key, value], index) => `${lab.paramLabels[index] || key}=${value}`)
      .join(" / ");
    const materialCount = Object.values(labState.materials).filter(Boolean).length;
    const stamped = `[${timestamp} · ${lab.title}] 参数：${parameters}；材料：${materialCount}/${lab.materials.length}。观察：`;
    labState.notes = `${labState.notes.trim()}\n${stamped}`.trim();
    renderLabs();
    saveState(true);
    setTimeout(() => {
      const notes = document.getElementById("lab-notes");
      if (notes) {
        notes.focus();
        notes.setSelectionRange(notes.value.length, notes.value.length);
      }
    }, 60);
  }

  let lastCanvasPointerAt = 0;

  function applyCanvasPointer(event) {
    if (event.type === "pointermove" && event.buttons !== 1) return;
    const now = performance.now();
    if (now - lastCanvasPointerAt < 45) return;
    lastCanvasPointerAt = now;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
    const lab = activeLab();
    const labState = activeLabState();
    if (lab.id === "lab01") {
      labState.params.asymmetry = Math.round(x);
      labState.params.distance = Math.round(100 - y);
    } else if (lab.id === "lab02") {
      labState.params.redaction = Math.round(y);
      labState.params.source = Math.round(x);
    } else if (lab.id === "lab03") {
      labState.params.resolution = Math.round(x);
      labState.params.compression = Math.round(100 - y);
    } else if (lab.id === "lab04") {
      labState.params.visibility = Math.round(x);
      labState.params.consent = Math.round(y);
    } else {
      labState.params.ink = Math.round(x);
      labState.params.transport = Math.round(100 - y);
    }
    if (labState.status === "idle") labState.status = "active";
    Object.entries(labState.params).forEach(([key, value]) => {
      const input = document.querySelector(`[data-param="${key}"]`);
      const output = document.getElementById(`output-${key}`);
      if (input) input.value = String(value);
      if (output) output.textContent = String(value);
    });
    renderOverview();
    saveState(false);
  }

  function renderCenter() {
    if (state.view === "history") renderHistory();
    else if (state.view === "works") renderWorks();
    else if (state.view === "labs") renderLabs();
    else if (state.view === "questions") renderQuestions();
    else renderProgress();
  }

  function statusLabel(status) {
    return { idle: "尚未开始", active: "进行中", done: "已完成" }[status] || "尚未开始";
  }

  function renderLabPanel() {
    const lab = activeLab();
    const labState = activeLabState();
    const materialsDone = Object.values(labState.materials).filter(Boolean).length;
    els.labStatusMark.className = `status-mark is-${labState.status}`;
    els.labStatusLabel.textContent = statusLabel(labState.status);
    els.labNumber.textContent = lab.no;
    els.labTitle.textContent = lab.title;
    els.labHypothesis.textContent = lab.hypothesis;
    els.timerTotal.textContent = `${lab.duration} MIN`;
    els.timerToggle.textContent = labState.running ? "暂停" : labState.elapsed ? "继续" : "开始";
    els.timerState.textContent = labState.running ? "RUNNING" : labState.elapsed ? "PAUSED" : "READY";
    els.materialsCount.textContent = `${materialsDone}/${lab.materials.length}`;
    els.relatedCount.textContent = String(lab.works.length).padStart(2, "0");

    els.parameterControls.innerHTML = Object.entries(lab.defaultParams)
      .map(([key], index) => {
        const value = labState.params[key];
        return `
          <div class="parameter">
            <label for="param-${key}"><span>${escapeHtml(lab.paramLabels[index] || key)}</span><output id="output-${key}">${value}</output></label>
            <input id="param-${key}" type="range" min="0" max="100" value="${value}" data-param="${key}" />
          </div>
        `;
      })
      .join("");

    els.materialList.innerHTML = lab.materials
      .map(
        (material, index) => `
          <label class="material-item">
            <input type="checkbox" data-material="${escapeHtml(material)}" ${labState.materials[material] ? "checked" : ""} />
            <span>${escapeHtml(material)}</span>
          </label>`,
      )
      .join("");

    els.relatedWorks.innerHTML = lab.works
      .map((id) => {
        const work = workMap[id];
        return work
          ? `<button class="related-work" type="button" data-work="${work.id}"><b>${work.no}</b><span>${escapeHtml(work.zh)}<br><em>${escapeHtml(work.artist)}</em></span></button>`
          : "";
      })
      .join("");

    els.statusOptions.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.status === labState.status);
    });

    updateTimerDisplay();
  }

  function renderStatusBar() {
    const stats = progressValues();
    els.statusWorkCount.textContent = String(stats.readWorks).padStart(2, "0");
    els.statusLab.textContent = activeLab().no;
    els.statusTimer.textContent = formatTime(activeLabState().elapsed, true);
    els.statusProgress.textContent = `${String(stats.overall).padStart(2, "0")}%`;
  }

  function renderAll() {
    renderOverview();
    renderTabs();
    renderCenter();
    renderLabPanel();
    renderStatusBar();
    saveState(false);
  }

  function setView(view) {
    state.view = view;
    if (view !== "works") state.selectedWork = null;
    if (view !== "labs") stopPreviewLoop();
    history.replaceState(null, "", `${window.location.pathname}#${view}`);
    renderTabs();
    renderCenter();
    renderOverview();
    saveState(false);
    els.center.focus({ preventScroll: true });
    if (window.matchMedia("(max-width: 900px)").matches) {
      scrollToPanel("center");
    }
  }

  function setCut(cutId) {
    state.cut = cutId;
    state.view = "works";
    state.selectedWork = null;
    renderAll();
    if (window.matchMedia("(max-width: 900px)").matches) scrollToPanel("center");
  }

  function setField(fieldId) {
    state.field = fieldId;
    state.view = "works";
    state.selectedWork = null;
    renderAll();
    if (window.matchMedia("(max-width: 900px)").matches) scrollToPanel("center");
  }

  function selectWork(workId) {
    if (!workMap[workId]) return;
    state.selectedWork = workId;
    state.view = "works";
    renderAll();
    els.center.scrollTop = 0;
    if (window.matchMedia("(max-width: 900px)").matches) scrollToPanel("center");
  }

  function scrollToPanel(target) {
    const shell = document.querySelector(".app-shell");
    const panels = {
      overview: document.querySelector(".overview-panel"),
      center: document.querySelector(".center-panel"),
      lab: document.querySelector(".lab-panel"),
    };
    const panel = panels[target];
    if (!shell || !panel) return;
    shell.scrollTo({ left: panel.offsetLeft, behavior: "smooth" });
    document.querySelectorAll("[data-panel-target]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.panelTarget === target);
    });
  }

  function toggleRead(workId) {
    state.worksRead[workId] = !state.worksRead[workId];
    renderAll();
    showToast(state.worksRead[workId] ? "作品已标记为已读。" : "已取消作品阅读标记。");
  }

  function selectLab(labId) {
    if (!experimentMap[labId]) return;
    DATA.experiments.forEach((lab) => {
      if (lab.id !== labId) state.labs[lab.id].running = false;
    });
    state.activeLab = labId;
    renderAll();
  }

  function updateActiveLab(mutator) {
    mutator(activeLabState(), activeLab());
    renderLabPanel();
    renderStatusBar();
    saveState(false);
    if (state.view === "progress") renderProgress();
    renderOverview();
  }

  function setupTimerLoop() {
    setInterval(() => {
      const labState = activeLabState();
      if (!labState.running) return;
      labState.elapsed += 1;
      const max = activeLab().duration * 60;
      if (labState.elapsed >= max) {
        labState.elapsed = max;
        labState.running = false;
        if (labState.status !== "done") labState.status = "active";
        showToast("本轮计时已到预设时长，可以记录并决定是否完成实验。");
      }
      updateTimerDisplay();
      renderStatusBar();
      saveState(false);
      if (state.view === "progress") renderProgress();
    }, 1000);
  }

  function updateTimerDisplay() {
    const lab = activeLab();
    const labState = activeLabState();
    const max = lab.duration * 60;
    const ratio = Math.min(1, labState.elapsed / max);
    els.timerDisplay.textContent = formatTime(labState.elapsed, true);
    els.statusTimer.textContent = formatTime(labState.elapsed, true);
    els.timerProgress.style.strokeDasharray = String(timerCircumference);
    els.timerProgress.style.strokeDashoffset = String(timerCircumference * (1 - ratio));
  }

  function prepareCanvas() {
    const canvas = document.getElementById("lab-canvas");
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { canvas, ctx, width: rect.width, height: rect.height };
  }

  function drawPreview(now = 0) {
    if (state.view !== "labs") return;
    const canDraw = prepareCanvas();
    if (!canDraw) return;
    const { ctx, width, height } = canDraw;
    const lab = activeLab();
    const params = animatedParams(lab, activeLabState(), now);
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    drawGrid(ctx, width, height);
    if (lab.id === "lab01") drawApparatus(ctx, width, height, params, now);
    else if (lab.id === "lab02") drawEvidence(ctx, width, height, params, now);
    else if (lab.id === "lab03") drawCopy(ctx, width, height, params, now);
    else if (lab.id === "lab04") drawGaze(ctx, width, height, params, now);
    else drawMaterial(ctx, width, height, params, now);
    drawSignals(ctx, width, height, now, lab.id);
    drawScanline(ctx, width, height, now);
    ctx.restore();

    const summary = Object.values(params).slice(0, 4).map((value) => String(value).padStart(3, "0")).join(" / ");
    const summaryEl = document.getElementById("canvas-parameter-summary");
    if (summaryEl) summaryEl.textContent = `PARAM / ${summary}`;

  }

  function previewLoop(time) {
    if (state.view !== "labs") {
      animationFrame = null;
      return;
    }
    if (time - lastPreviewDraw > 60) {
      lastPreviewDraw = time;
      drawPreview(time);
    }
    animationFrame = requestAnimationFrame(previewLoop);
  }

  function animatedParams(lab, labState, now) {
    const params = { ...labState.params };
    const elapsed = now - Number(labState.demoStarted || 0);
    if (!labState.demoStarted || elapsed < 0 || elapsed > 4000) return params;
    const t = elapsed / 1000;
    const wave = (Math.sin(t * Math.PI * 2.4) + 1) / 2;
    if (lab.id === "lab01") {
      params.opening = Math.round(18 + wave * 74);
      params.asymmetry = Math.round(12 + Math.abs(Math.sin(t * 1.8)) * 76);
    } else if (lab.id === "lab02") {
      params.caption = Math.round(20 + wave * 80);
      params.redaction = Math.round(8 + (1 - wave) * 84);
    } else if (lab.id === "lab03") {
      params.resolution = Math.round(18 + (1 - wave) * 80);
      params.compression = Math.round(15 + wave * 82);
      params.crop = Math.round(wave * 45);
      params.reposts = 1 + Math.round(wave * 5);
    } else if (lab.id === "lab04") {
      params.consent = Math.round(25 + wave * 75);
      params.visibility = Math.round(12 + Math.abs(Math.sin(t * 1.5)) * 88);
    } else {
      params.sheets = Math.round(2 + wave * 28);
      params.ink = Math.round(8 + wave * 85);
      params.transport = Math.round(6 + (1 - wave) * 90);
      params.copies = Math.round(wave * 85);
    }
    return params;
  }

  function drawSignals(ctx, w, h, now, labId) {
    const colors = {
      lab01: "#d1e65d",
      lab02: "#b75839",
      lab03: "#d9a246",
      lab04: "#8b5966",
      lab05: "#63725d",
    };
    ctx.save();
    for (let i = 0; i < 9; i += 1) {
      const x = ((i * 71 + now * (0.018 + i * 0.001)) % (w + 24)) - 12;
      const y = h * (0.18 + ((i * 17) % 64) / 100) + Math.sin(now / 700 + i) * 10;
      ctx.fillStyle = colors[labId] || "#d1e65d";
      ctx.globalAlpha = 0.18 + (i % 3) * 0.08;
      ctx.fillRect(x, y, i % 2 ? 1 : 3, i % 2 ? 5 : 1);
    }
    ctx.globalAlpha = 1;
    if (Math.floor(now / 500) % 2 === 0) {
      ctx.fillStyle = "#151714";
      ctx.fillRect(13, 13, 4, 4);
      ctx.font = '8px "DIN Condensed", sans-serif';
      ctx.fillText("CAPTURING", 22, 19);
    }
    ctx.restore();
  }

  function startPreviewLoop() {
    stopPreviewLoop();
    lastPreviewDraw = 0;
    animationFrame = requestAnimationFrame(previewLoop);
  }

  function stopPreviewLoop() {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
  }

  function drawGrid(ctx, w, h) {
    ctx.fillStyle = "#bdb9ad";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(21,23,20,.12)";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(21,23,20,.52)";
    ctx.font = '9px "DIN Condensed", sans-serif';
    ctx.fillText("00", 12, h - 11);
    ctx.textAlign = "right";
    ctx.fillText("100", w - 12, h - 11);
    ctx.textAlign = "left";
  }

  function drawApparatus(ctx, w, h, p, now) {
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(((p.tilt - 50) / 50) * 0.16);
    const openW = 50 + p.opening * 2.1;
    const openH = h * 0.68;
    const x = -openW / 2 + (p.asymmetry - 50) * 0.95;
    ctx.fillStyle = "rgba(21,23,20,.33)";
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.clearRect(x, -openH / 2, openW, openH);
    ctx.strokeStyle = "#1d201a";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, -openH / 2, openW, openH);
    ctx.restore();

    const objectW = 104 + (100 - p.distance) * 0.65;
    const objectH = 106 + (100 - p.distance) * 0.42;
    ctx.fillStyle = "#ece8dd";
    ctx.fillRect(w / 2 - objectW / 2, h / 2 - objectH / 2, objectW, objectH);
    ctx.strokeStyle = "#272b24";
    ctx.strokeRect(w / 2 - objectW / 2, h / 2 - objectH / 2, objectW, objectH);
    ctx.beginPath();
    ctx.moveTo(w / 2 - objectW * 0.28, h / 2 + objectH * 0.3);
    ctx.lineTo(w / 2 + objectW * 0.22, h / 2 - objectH * 0.26);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w / 2 + objectW * 0.2, h / 2 - objectH * 0.2, 12 + p.opening * 0.05, 0, Math.PI * 2);
    ctx.stroke();

    drawCoordinateLines(ctx, w, h, now);
    ctx.fillStyle = "#20251e";
    ctx.font = '10px "DIN Condensed", sans-serif';
    ctx.fillText(`OPENING ${String(p.opening).padStart(3, "0")}`, 14, 24);
    ctx.fillText(`DISTANCE ${String(p.distance).padStart(3, "0")}`, 14, 39);
  }

  function drawCoordinateLines(ctx, w, h, now) {
    ctx.strokeStyle = "rgba(209,230,93,.65)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2, 18);
    ctx.lineTo(w / 2, h - 18);
    ctx.moveTo(18, h / 2);
    ctx.lineTo(w - 18, h / 2);
    ctx.stroke();
    const pulse = 3 + Math.sin(now / 500) * 1.5;
    ctx.fillStyle = "#d1e65d";
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, pulse, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawEvidence(ctx, w, h, p, now) {
    const pad = 42;
    const docW = w - pad * 2;
    const docH = h - pad * 2;
    ctx.fillStyle = "#eeeae0";
    ctx.fillRect(pad, pad, docW, docH);
    ctx.strokeStyle = "#252821";
    ctx.lineWidth = 1.2;
    ctx.strokeRect(pad, pad, docW, docH);

    ctx.fillStyle = "#252821";
    ctx.font = '10px "DIN Condensed", sans-serif';
    ctx.fillText("EVIDENCE CARD / UNVERIFIED", pad + 16, pad + 22);

    const imageW = docW * 0.36;
    ctx.fillStyle = "#767a6c";
    ctx.fillRect(pad + 16, pad + 39, imageW, docH * 0.55);
    ctx.fillStyle = "#c5b99c";
    ctx.beginPath();
    ctx.arc(pad + 16 + imageW * 0.62, pad + 39 + docH * 0.22, imageW * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#2a2e27";
    ctx.beginPath();
    ctx.moveTo(pad + 16, pad + 39 + docH * 0.45);
    ctx.lineTo(pad + 16 + imageW * 0.42, pad + 39 + docH * 0.24);
    ctx.lineTo(pad + 16 + imageW, pad + 39 + docH * 0.45);
    ctx.stroke();

    const textX = pad + imageW + 34;
    const lineGap = 18;
    const lines = [
      ["CAPTION", p.caption],
      ["SOURCE", p.source],
      ["TIMESTAMP", p.timestamp],
      ["WITNESS", 100 - p.redaction],
    ];
    lines.forEach(([label, value], index) => {
      const y = pad + 48 + index * 36;
      ctx.fillStyle = "#64685e";
      ctx.font = '8px "DIN Condensed", sans-serif';
      ctx.fillText(label, textX, y);
      ctx.fillStyle = "rgba(21,23,20,.15)";
      ctx.fillRect(textX, y + 8, docW * 0.4, 6);
      ctx.fillStyle = "#242820";
      ctx.fillRect(textX, y + 8, docW * 0.4 * (value / 100), 6);
    });

    const redactW = imageW * (p.redaction / 100);
    ctx.fillStyle = "#171a16";
    ctx.fillRect(pad + 16 + imageW - redactW, pad + 39, redactW, docH * 0.55);

    ctx.strokeStyle = "rgba(21,23,20,.25)";
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.moveTo(pad + 16, pad + 68 + i * 19);
      ctx.lineTo(pad + 16 + imageW, pad + 55 + i * 19);
      ctx.stroke();
    }
    drawStamp(ctx, pad + docW - 72, pad + docH - 46, "UNVERIFIED", p.source < 50 ? "LOW" : "MED");
  }

  function drawStamp(ctx, x, y, text, sub) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.08);
    ctx.strokeStyle = "#a84e34";
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-42, -15, 84, 30);
    ctx.fillStyle = "#a84e34";
    ctx.font = '9px "DIN Condensed", sans-serif';
    ctx.fillText(text, -34, -1);
    ctx.font = '8px "DIN Condensed", sans-serif';
    ctx.fillText(sub, -11, 9);
    ctx.restore();
  }

  function drawCopy(ctx, w, h, p, now) {
    const lowRes = Math.max(0.18, p.resolution / 100);
    const off = document.createElement("canvas");
    off.width = Math.max(48, Math.round(w * lowRes));
    off.height = Math.max(30, Math.round(h * lowRes));
    const octx = off.getContext("2d");
    octx.fillStyle = "#e6dfcf";
    octx.fillRect(0, 0, off.width, off.height);
    octx.fillStyle = "#4a584b";
    octx.fillRect(off.width * 0.08, off.height * 0.15, off.width * 0.55, off.height * 0.55);
    octx.fillStyle = "#b85536";
    octx.fillRect(off.width * 0.55, off.height * 0.42, off.width * 0.3, off.height * 0.35);
    octx.strokeStyle = "#22251f";
    octx.lineWidth = 2;
    octx.beginPath();
    octx.moveTo(0, off.height * 0.78);
    octx.lineTo(off.width, off.height * 0.45);
    octx.stroke();
    octx.fillStyle = "#d6af56";
    octx.beginPath();
    octx.arc(off.width * 0.65, off.height * 0.29, off.height * 0.13, 0, Math.PI * 2);
    octx.fill();
    ctx.imageSmoothingEnabled = p.resolution > 50;
    ctx.drawImage(off, 0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    if (p.compression > 20) {
      ctx.fillStyle = `rgba(230,223,207,${p.compression / 260})`;
      for (let y = 0; y < h; y += 12 + p.compression / 5) {
        ctx.fillRect(0, y, w, 1);
      }
    }
    if (p.crop > 0) {
      const cw = w * (p.crop / 260);
      const ch = h * (p.crop / 260);
      ctx.fillStyle = "#161814";
      ctx.fillRect(0, 0, cw, h);
      ctx.fillRect(w - cw, 0, cw, h);
      ctx.fillRect(0, 0, w, ch);
      ctx.fillRect(0, h - ch, w, ch);
    }
    for (let i = 0; i < p.reposts; i += 1) {
      const x = 18 + i * 34;
      const y = h - 30 - i * 9;
      ctx.fillStyle = "rgba(21,23,20,.46)";
      ctx.font = '8px "DIN Condensed", sans-serif';
      ctx.fillText(`R${i + 1}`, x, y);
    }
    ctx.fillStyle = "rgba(209,230,93,.78)";
    ctx.font = '9px "DIN Condensed", sans-serif';
    ctx.fillText("SOURCE LOST", w - 96, 22);
  }

  function drawGaze(ctx, w, h, p, now) {
    const eyeY = h * 0.45;
    const leftX = w * 0.24;
    const rightX = w * 0.76;
    const separation = (p.distance / 100) * w * 0.34;
    const leftEye = w / 2 - separation / 2;
    const rightEye = w / 2 + separation / 2;

    ctx.strokeStyle = "#252821";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(leftEye, eyeY, 24, 11, 0, 0, Math.PI * 2);
    ctx.ellipse(rightEye, eyeY, 24, 11, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = p.consent > 70 ? "#d1e65d" : "#b75839";
    ctx.beginPath();
    ctx.arc(leftEye, eyeY, 4.5, 0, Math.PI * 2);
    ctx.arc(rightEye, eyeY, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = p.consent > 70 ? "rgba(209,230,93,.8)" : "rgba(183,88,57,.72)";
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(leftEye, eyeY);
    ctx.lineTo(rightEye, eyeY);
    ctx.stroke();
    ctx.setLineDash([]);

    const visibility = p.visibility / 100;
    ctx.fillStyle = "rgba(21,23,20,.82)";
    ctx.fillRect(leftX - 40, h * 0.62, 80, 10);
    ctx.fillRect(rightX - 40, h * 0.62, 80, 10);
    ctx.fillStyle = "rgba(21,23,20,.34)";
    ctx.fillRect(leftX - 40, h * 0.62, 80 * visibility, 10);

    ctx.fillStyle = "#20251e";
    ctx.font = '9px "DIN Condensed", sans-serif';
    ctx.fillText(`DIST ${String(p.distance).padStart(3, "0")}`, 14, 22);
    ctx.fillText(`DURATION ${String(p.duration).padStart(3, "0")}`, 14, 36);
    ctx.fillText(`CONSENT ${String(p.consent).padStart(3, "0")}`, 14, 50);

    const borderColor = p.consent > 70 ? "#d1e65d" : "#b75839";
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(11, 11, w - 22, h - 22);
    if (p.consent < 50) {
      ctx.fillStyle = "#b75839";
      ctx.font = '9px "DIN Condensed", sans-serif';
      ctx.fillText("STOP / CONSENT NOT SECURED", w - 164, h - 20);
    }

    const pulse = (Math.sin(now / 450) + 1) * 0.5;
    ctx.fillStyle = `rgba(21,23,20,${0.12 + pulse * 0.25})`;
    ctx.beginPath();
    ctx.moveTo(leftEye + 5, eyeY + 18);
    ctx.lineTo(rightEye - 5, eyeY + 18);
    ctx.lineTo(rightEye - 5, eyeY + 25);
    ctx.lineTo(leftEye + 5, eyeY + 25);
    ctx.closePath();
    ctx.fill();
  }

  function drawMaterial(ctx, w, h, p, now) {
    const pad = 34;
    ctx.fillStyle = "#e7e1d5";
    ctx.fillRect(pad, pad, w - pad * 2, h - pad * 2);
    ctx.strokeStyle = "#252821";
    ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);

    ctx.fillStyle = "#252821";
    ctx.font = '10px "DIN Condensed", sans-serif';
    ctx.fillText("IMAGE MATERIAL LEDGER", pad + 15, pad + 21);

    const rows = [
      ["PAPER", p.sheets, "#7d846f"],
      ["INK", p.ink, "#ad5639"],
      ["TRANSPORT", p.transport, "#b58c40"],
      ["COPIES", p.copies, "#426c7d"],
    ];
    const rowX = pad + 16;
    const startY = pad + 49;
    rows.forEach(([label, value, color], index) => {
      const y = startY + index * 31;
      ctx.fillStyle = "#5d6157";
      ctx.font = '8px "DIN Condensed", sans-serif';
      ctx.fillText(label, rowX, y);
      ctx.fillStyle = "rgba(21,23,20,.12)";
      ctx.fillRect(rowX + 68, y - 6, (w - pad * 2) * 0.43, 6);
      ctx.fillStyle = color;
      ctx.fillRect(rowX + 68, y - 6, (w - pad * 2) * 0.43 * (value / 100), 6);
      ctx.fillStyle = "#252821";
      ctx.textAlign = "right";
      ctx.fillText(String(value).padStart(3, "0"), w - pad - 16, y);
      ctx.textAlign = "left";
    });

    const total = Math.round((p.sheets * 0.04 + p.ink * 0.12 + p.transport * 0.16 + p.copies * 0.08) * 10) / 10;
    ctx.fillStyle = "#151714";
    ctx.font = '27px "Bodoni 72", serif';
    ctx.fillText(`${total}`, rowX, h - pad - 23);
    ctx.font = '8px "DIN Condensed", sans-serif';
    ctx.fillText("EST. MATERIAL INDEX", rowX + 48, h - pad - 25);

    ctx.strokeStyle = "rgba(21,23,20,.45)";
    ctx.beginPath();
    ctx.moveTo(w * 0.62, h * 0.7);
    ctx.bezierCurveTo(w * 0.7, h * 0.46, w * 0.82, h * 0.8, w * 0.92, h * 0.53);
    ctx.stroke();
    ctx.fillStyle = "#d1e65d";
    ctx.beginPath();
    ctx.arc(w * 0.62, h * 0.7, 4 + Math.sin(now / 450) * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawScanline(ctx, w, h, now) {
    const y = ((now / 32) % (h + 40)) - 20;
    ctx.fillStyle = "rgba(255,255,255,.08)";
    ctx.fillRect(0, y, w, 1);
    ctx.fillStyle = "rgba(21,23,20,.4)";
    ctx.font = '8px "DIN Condensed", sans-serif';
    ctx.fillText("LIVE / MATERIAL TEST", 12, h - 11);
  }

  function renderReferences() {
    const work = state.selectedWork ? workMap[state.selectedWork] : null;
    const lab = activeLab();
    els.referenceContent.innerHTML = `
      <div class="dialog-list">
        ${
          work
            ? `<div class="dialog-item"><strong>${escapeHtml(work.zh)}</strong><p>当前作品：${escapeHtml(work.artist)}，${escapeHtml(work.year)}。</p><p><a href="${escapeHtml(work.source)}" target="_blank" rel="noreferrer">打开官方作品来源 ↗</a></p></div>`
            : ""
        }
        <div class="dialog-item"><strong>视觉与媒介</strong><p>Roland Barthes, <em>Camera Lucida</em>; John Tagg, <em>The Burden of Representation</em>; Rosalind Krauss, “Photography’s Discursive Spaces”.</p></div>
        <div class="dialog-item"><strong>场域与制度</strong><p>Pierre Bourdieu, <em>The Field of Cultural Production</em>; Howard Becker, <em>Art Worlds</em>; Nathalie Heinich, <em>The Glory of Van Gogh</em>.</p></div>
        <div class="dialog-item"><strong>跨媒介证据</strong><p>先确认对象页与图像版本，再分开记录作品事实、视觉判断、生产条件、制度冲突和证据缺口。展览现场不冒充作品原图，印次也不混作同一原作。</p></div>
        <div class="dialog-item"><strong>方法与工具</strong><p>馆藏 API、艺术家官网、机构档案目录、IIIF、ExifTool、Tropy、Zotero、OCR、图像哈希与版本记录。机器用于发现差异，不能替事实签字。</p></div>
        <div class="dialog-item"><strong>当前实验</strong><p>${escapeHtml(lab.title)}：${escapeHtml(lab.hypothesis)}</p></div>
      </div>
    `;
    els.referenceDialog.showModal();
  }

  function renderAudit() {
    const stats = progressValues();
    const active = activeLabState();
    const missingParams = Object.entries(active.params).length !== activeLab().paramLabels.length;
    const missingImages = DATA.works.filter((work) => !workMedia(work.id).src);
    const evidenceDrawerCount = DATA.works.filter((work) => work.primaryMaterial && work.counterReading && work.evidenceGap).length;
    const unresolved = [];
    if (stats.readWorks < 10) unresolved.push("作品证据尚未达到基本密度（少于 10 件）。");
    if (active.status === "idle") unresolved.push("当前实验尚未启动。");
    if (!active.notes.trim()) unresolved.push("当前实验没有观察记录。");
    if (!state.researchQuestions.length) unresolved.push("研究问题库尚未建立。");
    if (state.researchQuestions.length && !stats.groundedQuestions) unresolved.push("已有研究问题尚无可核验证据。");
    if (!state.progressLogs.length) unresolved.push("项目推进日志为空。");
    if (missingParams) unresolved.push("实验参数标签与参数数量不一致。");
    if (missingImages.length) unresolved.push(`${missingImages.length} 组案例仍是空图记录，应按当前规则删除或补齐。`);

    els.auditContent.innerHTML = `
      <div class="dialog-list">
        <div class="dialog-item"><strong>当前工作量</strong><p>${stats.readWorks}/${stats.totalWorks} 组案例已读，${stats.startedLabs}/5 组实验已启动，${stats.doneLabs}/5 组完成，${stats.questionCount} 个问题已入库，${stats.logCount} 条推进记录。</p></div>
        <div class="dialog-item"><strong>判断边界</strong><p>该工具只检查研究流程是否完整，不评价作品好坏，也不为理论引用替代原文核验。</p></div>
        <div class="dialog-item"><strong>图像与证据</strong><p>${DATA.works.length - missingImages.length}/${DATA.works.length} 组案例有主图；${evidenceDrawerCount}/${DATA.works.length} 组已有原始材料、反方与缺口字段。旧摄影记录仍保留四段分析，可作为扩展模板。</p></div>
        <div class="dialog-item"><strong>仍需处理</strong><p>${unresolved.length ? unresolved.join(" ") : "当前记录没有明显的流程缺口。"}</p></div>
        <div class="dialog-item"><strong>伦理提醒</strong><p>涉及身体、创伤、劳动与档案的实验必须保留停止条件、知情同意和撤回权，不能以“实验”为由绕过。</p></div>
      </div>
    `;
    els.auditDialog.showModal();
  }

  function exportResearch() {
    const payload = {
      exportedAt: new Date().toISOString(),
      project: DATA.project,
      progress: progressValues(),
      state,
      activeExperiment: {
        ...activeLab(),
        record: activeLabState(),
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `after-exposure-research-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast("研究数据已导出为 JSON。");
  }

  function handleClick(event) {
    const submitButton = event.target.closest(".form-submit");
    if (submitButton) {
      event.preventDefault();
      const form = submitButton.closest("form");
      if (form?.getAttribute("id") === "research-question-form") {
        saveResearchQuestion(new FormData(form));
        return;
      }
      if (form?.getAttribute("id") === "progress-log-form") {
        saveProgressLog(new FormData(form));
        return;
      }
    }

    const viewButton = event.target.closest("[data-view]");
    if (viewButton) {
      setView(viewButton.dataset.view);
      return;
    }

    if (event.target.closest("[data-open-works]")) {
      state.selectedWork = null;
      state.cut = "all";
      state.field = "all";
      setView("works");
      return;
    }

    const panelButton = event.target.closest("[data-panel-target]");
    if (panelButton) {
      scrollToPanel(panelButton.dataset.panelTarget);
      return;
    }

    const cutButton = event.target.closest("[data-cut-filter]");
    if (cutButton) {
      setCut(cutButton.dataset.cutFilter);
      return;
    }

    const fieldButton = event.target.closest("[data-field-filter]");
    if (fieldButton) {
      setField(fieldButton.dataset.fieldFilter);
      return;
    }

    const periodButton = event.target.closest("[data-period]");
    if (periodButton) {
      state.periodId = periodButton.dataset.period;
      renderHistory();
      renderOverview();
      saveState(false);
      return;
    }

    const workButton = event.target.closest("[data-work]");
    if (workButton) {
      selectWork(workButton.dataset.work);
      return;
    }

    if (event.target.closest("[data-back-works]")) {
      state.selectedWork = null;
      renderCenter();
      saveState(false);
      return;
    }

    const readButton = event.target.closest("[data-toggle-read]");
    if (readButton) {
      toggleRead(readButton.dataset.toggleRead);
      return;
    }

    const labButton = event.target.closest("[data-lab]");
    if (labButton) {
      selectLab(labButton.dataset.lab);
      return;
    }

    const editQuestionButton = event.target.closest("[data-edit-question]");
    if (editQuestionButton) {
      editingQuestionId = editQuestionButton.dataset.editQuestion;
      renderQuestions();
      document.querySelector("#research-question-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    const deleteQuestionButton = event.target.closest("[data-delete-question]");
    if (deleteQuestionButton) {
      const item = state.researchQuestions.find((question) => question.id === deleteQuestionButton.dataset.deleteQuestion);
      if (item && window.confirm("删除这条研究问题？此操作会同时删除其判断、方法和证据记录。")) {
        state.researchQuestions = state.researchQuestions.filter((question) => question.id !== item.id);
        editingQuestionId = null;
        renderQuestions();
        renderOverview();
        renderStatusBar();
        saveState(true);
      }
      return;
    }

    if (event.target.closest("[data-cancel-question]")) {
      editingQuestionId = null;
      renderQuestions();
      return;
    }

    const editProgressButton = event.target.closest("[data-edit-progress]");
    if (editProgressButton) {
      editingProgressId = editProgressButton.dataset.editProgress;
      renderProgress();
      document.querySelector("#progress-log-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    const deleteProgressButton = event.target.closest("[data-delete-progress]");
    if (deleteProgressButton) {
      const item = state.progressLogs.find((entry) => entry.id === deleteProgressButton.dataset.deleteProgress);
      if (item && window.confirm("删除这条推进记录？")) {
        state.progressLogs = state.progressLogs.filter((entry) => entry.id !== item.id);
        editingProgressId = null;
        renderProgress();
        renderOverview();
        renderStatusBar();
        saveState(true);
      }
      return;
    }

    if (event.target.closest("[data-cancel-progress]")) {
      editingProgressId = null;
      renderProgress();
      return;
    }

    if (event.target.closest("[data-stamp-observation]")) {
      stampObservation();
      return;
    }

    const statusButton = event.target.closest("[data-status]");
    if (statusButton) {
      updateActiveLab((labState) => {
        labState.status = statusButton.dataset.status;
        if (labState.status === "done") labState.running = false;
      });
      if (state.view === "labs") renderLabs();
      renderStatusBar();
      return;
    }

    if (event.target.closest("[data-close-dialog]")) {
      event.target.closest("dialog")?.close();
    }
  }

  document.addEventListener("click", handleClick);

  document.addEventListener("submit", (event) => {
    if (event.target.getAttribute("id") === "research-question-form") {
      event.preventDefault();
      saveResearchQuestion(new FormData(event.target));
    }
    if (event.target.getAttribute("id") === "progress-log-form") {
      event.preventDefault();
      saveProgressLog(new FormData(event.target));
    }
  });

  document.addEventListener(
    "error",
    (event) => {
      const image = event.target;
      if (!(image instanceof HTMLImageElement)) return;
      image.style.display = "none";
      const plate = image.closest(".work-plate");
      if (plate) plate.classList.add("image-failed");
      const frame = image.closest(".work-visual-frame");
      if (frame) frame.classList.add("image-failed");
    },
    true,
  );

  els.timerToggle.addEventListener("click", () => {
    updateActiveLab((labState) => {
      labState.running = !labState.running;
      if (labState.running && labState.status === "idle") labState.status = "active";
    });
  });

  els.timerReset.addEventListener("click", () => {
    updateActiveLab((labState) => {
      labState.elapsed = 0;
      labState.running = false;
    });
  });

  els.runSequence.addEventListener("click", () => {
    updateActiveLab((labState) => {
      labState.demoStarted = performance.now();
      if (labState.status === "idle") labState.status = "active";
    });
    const frame = document.querySelector(".canvas-frame");
    if (frame) {
      frame.classList.add("is-running");
      setTimeout(() => frame.classList.remove("is-running"), 4100);
    }
    showToast("实验序列已启动：观察参数如何在四秒内改变同一对象。");
  });

  els.parameterControls.addEventListener("input", (event) => {
    const input = event.target.closest("[data-param]");
    if (!input) return;
    const key = input.dataset.param;
    const value = Number(input.value);
    const output = document.getElementById(`output-${key}`);
    if (output) output.textContent = String(value);
    updateActiveLab((labState) => {
      labState.params[key] = value;
    });
  });

  els.materialList.addEventListener("change", (event) => {
    const input = event.target.closest("[data-material]");
    if (!input) return;
    updateActiveLab((labState) => {
      labState.materials[input.dataset.material] = input.checked;
    });
  });

  els.center.addEventListener("input", (event) => {
    if (event.target.id === "work-search") {
      state.search = event.target.value;
      const caret = event.target.selectionStart;
      renderWorks();
      const nextSearch = document.getElementById("work-search");
      if (nextSearch) {
        nextSearch.focus();
        nextSearch.setSelectionRange(caret, caret);
      }
      saveState(false);
    }

    if (event.target.id === "lab-notes") {
      activeLabState().notes = event.target.value;
      const counter = event.target.closest(".notes-block")?.querySelector("label span:last-child");
      if (counter) counter.textContent = `${event.target.value.length} 字`;
      saveState(false);
    }

    if (event.target.id === "research-draft") {
      state.researchDraft = event.target.value;
      const counter = event.target.closest(".notes-block")?.querySelector("label span:last-child");
      if (counter) counter.textContent = `${event.target.value.length} 字`;
      saveState(false);
    }
  });

  els.saveRecord.addEventListener("click", () => saveState(true));
  els.exportButton.addEventListener("click", exportResearch);
  els.filterAction.addEventListener("click", () => {
    setView("works");
    setTimeout(() => document.getElementById("work-search")?.focus(), 80);
  });
  els.referenceAction.addEventListener("click", renderReferences);
  els.auditAction.addEventListener("click", renderAudit);

  window.addEventListener("resize", () => {
    if (state.view === "labs") {
      lastPreviewDraw = 0;
      drawPreview(performance.now());
    }
  });

  window.addEventListener("beforeunload", () => {
    DATA.experiments.forEach((lab) => {
      state.labs[lab.id].running = false;
    });
    saveState(false);
  });

  renderAll();
  const shell = document.querySelector(".app-shell");
  let panelScrollFrame = null;
  shell.addEventListener("scroll", () => {
    if (panelScrollFrame) cancelAnimationFrame(panelScrollFrame);
    panelScrollFrame = requestAnimationFrame(() => {
      const panels = [
        ["overview", document.querySelector(".overview-panel")],
        ["center", document.querySelector(".center-panel")],
        ["lab", document.querySelector(".lab-panel")],
      ];
      const nearest = panels.reduce((best, current) => {
        const currentDistance = Math.abs(shell.scrollLeft - current[1].offsetLeft);
        return currentDistance < best.distance ? { name: current[0], distance: currentDistance } : best;
      }, { name: "overview", distance: Infinity });
      document.querySelectorAll("[data-panel-target]").forEach((button) => {
        button.classList.toggle("is-active", button.dataset.panelTarget === nearest.name);
      });
    });
  }, { passive: true });
  setupTimerLoop();
})();
