// src/panel/app/dom.ts

export type Dom = ReturnType<typeof getDom>;

export function getDom() {
  function must<T extends Element>(el: T | null, id: string): T {
    if (!el) throw new Error(`[dom] Missing #${id}`);
    return el;
  }

  const rootEl = must(document.getElementById("cgoRoot") as HTMLDivElement | null, "cgoRoot");

  // -----------------------------
  // Global scope
  // -----------------------------
  const scopeLabelEl = must(document.getElementById("scopeLabel") as HTMLElement | null, "scopeLabel");
  const btnScopeChange = must(document.getElementById("btnScopeChange") as HTMLButtonElement | null, "btnScopeChange");
  const btnScopeRefresh = must(document.getElementById("btnScopeRefresh") as HTMLButtonElement | null, "btnScopeRefresh");

  const scopeDialogEl = must(document.getElementById("scopeDialog") as HTMLDialogElement | null, "scopeDialog");
  const scopeDateEl = must(document.getElementById("scopeDate") as HTMLInputElement | null, "scopeDate");
  const btnScopeCancel = must(document.getElementById("btnScopeCancel") as HTMLButtonElement | null, "btnScopeCancel");
  const btnScopeApply = must(document.getElementById("btnScopeApply") as HTMLButtonElement | null, "btnScopeApply");

  const scopeLoadedSinglesEl = must(
    document.getElementById("scopeLoadedSingles") as HTMLElement | null,
    "scopeLoadedSingles"
  );
  const scopeLoadedProjectsEl = must(
    document.getElementById("scopeLoadedProjects") as HTMLElement | null,
    "scopeLoadedProjects"
  );
  const scopeLoadedProjectChatsEl = must(
    document.getElementById("scopeLoadedProjectChats") as HTMLElement | null,
    "scopeLoadedProjectChats"
  );

  // Note: class selector, but keep stable "id name" for error clarity.
  const scopeLoadingEl = must(document.querySelector(".scopeLoading") as HTMLDivElement | null, "scopeLoading");

  // Legacy “list” triggers (still in DOM, hidden by panel.ts)
  const btnListSingle = must(document.getElementById("btnListSingle") as HTMLButtonElement | null, "btnListSingle");
  const btnListProjects = must(document.getElementById("btnListProjects") as HTMLButtonElement | null, "btnListProjects");

  // -----------------------------
  // Tabs + views
  // -----------------------------
  const tabSingle = must(document.getElementById("tabSingle") as HTMLButtonElement | null, "tabSingle");
  const tabProjects = must(document.getElementById("tabProjects") as HTMLButtonElement | null, "tabProjects");
  const tabOrganize = must(document.getElementById("tabOrganize") as HTMLButtonElement | null, "tabOrganize");
  const tabSearch = must(document.getElementById("tabSearch") as HTMLButtonElement | null, "tabSearch");
  const tabSettings = must(document.getElementById("tabSettings") as HTMLButtonElement | null, "tabSettings");
  const tabLogs = must(document.getElementById("tabLogs") as HTMLButtonElement | null, "tabLogs");
  const tabStats = must(document.getElementById("tabStats") as HTMLButtonElement | null, "tabStats");

  const viewSingle = must(document.getElementById("viewSingle") as HTMLElement | null, "viewSingle");
  const viewProjects = must(document.getElementById("viewProjects") as HTMLElement | null, "viewProjects");
  const viewOrganize = must(document.getElementById("viewOrganize") as HTMLElement | null, "viewOrganize");
  const viewSearch = must(document.getElementById("viewSearch") as HTMLElement | null, "viewSearch");
  const viewSettings = must(document.getElementById("viewSettings") as HTMLElement | null, "viewSettings");
  const viewLogs = must(document.getElementById("viewLogs") as HTMLElement | null, "viewLogs");
  const viewStats = must(document.getElementById("viewStats") as HTMLElement | null, "viewStats");

  // -----------------------------
  // Search
  // -----------------------------
  const searchQueryEl = must(document.getElementById("searchQuery") as HTMLInputElement | null, "searchQuery");
  const btnSearchClear = must(document.getElementById("btnSearchClear") as HTMLButtonElement | null, "btnSearchClear");
  const btnSearchResetFilters = must(
    document.getElementById("btnSearchResetFilters") as HTMLButtonElement | null,
    "btnSearchResetFilters"
  );

  const searchScopeEl = must(document.getElementById("searchScope") as HTMLSelectElement | null, "searchScope");
  const searchArchivedEl = must(document.getElementById("searchArchived") as HTMLSelectElement | null, "searchArchived");

  const searchUpdatedWithinEl = must(
    document.getElementById("searchUpdatedWithin") as HTMLSelectElement | null,
    "searchUpdatedWithin"
  );
  const searchCreatedWithinEl = must(
    document.getElementById("searchCreatedWithin") as HTMLSelectElement | null,
    "searchCreatedWithin"
  );

  const searchUpdatedAfterEl = must(document.getElementById("searchUpdatedAfter") as HTMLInputElement | null, "searchUpdatedAfter");
  const searchUpdatedBeforeEl = must(
    document.getElementById("searchUpdatedBefore") as HTMLInputElement | null,
    "searchUpdatedBefore"
  );

  const searchCreatedAfterEl = must(document.getElementById("searchCreatedAfter") as HTMLInputElement | null, "searchCreatedAfter");
  const searchCreatedBeforeEl = must(
    document.getElementById("searchCreatedBefore") as HTMLInputElement | null,
    "searchCreatedBefore"
  );

  const searchInfoBoxEl = must(document.getElementById("searchInfoBox") as HTMLDetailsElement | null, "searchInfoBox");

  const btnSearchListSingle = must(
    document.getElementById("btnSearchListSingle") as HTMLButtonElement | null,
    "btnSearchListSingle"
  );
  const btnSearchListProjects = must(
    document.getElementById("btnSearchListProjects") as HTMLButtonElement | null,
    "btnSearchListProjects"
  );

  const searchLoadedSinglesEl = must(document.getElementById("searchLoadedSingles") as HTMLElement | null, "searchLoadedSingles");
  const searchLoadedProjectsEl = must(document.getElementById("searchLoadedProjects") as HTMLElement | null, "searchLoadedProjects");
  const searchLoadedProjectChatsEl = must(
    document.getElementById("searchLoadedProjectChats") as HTMLElement | null,
    "searchLoadedProjectChats"
  );

  const searchInfoLimitsEl = must(document.getElementById("searchInfoLimits") as HTMLElement | null, "searchInfoLimits");
  const searchStatusEl = must(document.getElementById("searchStatus") as HTMLDivElement | null, "searchStatus");
  const searchResultsCountEl = must(document.getElementById("searchResultsCount") as HTMLElement | null, "searchResultsCount");
  const searchResultsEl = must(document.getElementById("searchResults") as HTMLUListElement | null, "searchResults");

  // -----------------------------
  // Single
  // -----------------------------
  // NOTE: limits moved to Settings but IDs unchanged -> still must exist.
  const singleLimitEl = must(document.getElementById("singleLimit") as HTMLInputElement | null, "singleLimit");

  const singleStatusEl = must(document.getElementById("singleStatus") as HTMLSpanElement | null, "singleStatus");
  const cbSingleToggleAll = must(document.getElementById("cbSingleToggleAll") as HTMLInputElement | null, "cbSingleToggleAll");
  const btnSingleDelete = must(document.getElementById("btnSingleDelete") as HTMLButtonElement | null, "btnSingleDelete");

  const singleExecOutEl = must(document.getElementById("singleExecOut") as HTMLPreElement | null, "singleExecOut");
  const singleExecProgressWrapEl = must(
    document.getElementById("singleExecProgressWrap") as HTMLDivElement | null,
    "singleExecProgressWrap"
  );
  const singleExecProgressEl = must(
    document.getElementById("singleExecProgress") as HTMLProgressElement | null,
    "singleExecProgress"
  );
  const singleExecProgressTextEl = must(
    document.getElementById("singleExecProgressText") as HTMLDivElement | null,
    "singleExecProgressText"
  );

  const singleConfirmBoxEl = must(document.getElementById("singleConfirmBox") as HTMLDivElement | null, "singleConfirmBox");
  const singleConfirmTitleEl = must(document.getElementById("singleConfirmTitle") as HTMLDivElement | null, "singleConfirmTitle");
  const singleConfirmPreviewEl = must(
    document.getElementById("singleConfirmPreview") as HTMLUListElement | null,
    "singleConfirmPreview"
  );
  const singleCbConfirmEl = must(document.getElementById("singleCbConfirm") as HTMLInputElement | null, "singleCbConfirm");
  const singleBtnConfirmExecute = must(
    document.getElementById("singleBtnConfirmExecute") as HTMLButtonElement | null,
    "singleBtnConfirmExecute"
  );
  const singleBtnCancelExecute = must(
    document.getElementById("singleBtnCancelExecute") as HTMLButtonElement | null,
    "singleBtnCancelExecute"
  );

  const singleCountEl = must(document.getElementById("singleCount") as HTMLElement | null, "singleCount");
  const singleSelectedCountEl = must(document.getElementById("singleSelectedCount") as HTMLElement | null, "singleSelectedCount");
  const singleListEl = must(document.getElementById("singleList") as HTMLUListElement | null, "singleList");

  // -----------------------------
  // Projects
  // -----------------------------
  // NOTE: limits moved to Settings but IDs unchanged -> still must exist.
  const projectsLimitEl = must(document.getElementById("projectsLimit") as HTMLInputElement | null, "projectsLimit");
  const projectsChatsLimitEl = must(
    document.getElementById("projectsChatsLimit") as HTMLInputElement | null,
    "projectsChatsLimit"
  );

  const projectsStatusEl = must(document.getElementById("projectsStatus") as HTMLSpanElement | null, "projectsStatus");
  const btnProjectsDelete = must(document.getElementById("btnProjectsDelete") as HTMLButtonElement | null, "btnProjectsDelete");

  const projectsExecOutEl = must(document.getElementById("projectsExecOut") as HTMLPreElement | null, "projectsExecOut");

  const projectsChatsExecProgressWrapEl = must(
    document.getElementById("projectsChatsExecProgressWrap") as HTMLDivElement | null,
    "projectsChatsExecProgressWrap"
  );
  const projectsChatsExecProgressEl = must(
    document.getElementById("projectsChatsExecProgress") as HTMLProgressElement | null,
    "projectsChatsExecProgress"
  );
  const projectsChatsExecProgressTextEl = must(
    document.getElementById("projectsChatsExecProgressText") as HTMLDivElement | null,
    "projectsChatsExecProgressText"
  );

  const projectsProjectsExecProgressWrapEl = must(
    document.getElementById("projectsProjectsExecProgressWrap") as HTMLDivElement | null,
    "projectsProjectsExecProgressWrap"
  );
  const projectsProjectsExecProgressEl = must(
    document.getElementById("projectsProjectsExecProgress") as HTMLProgressElement | null,
    "projectsProjectsExecProgress"
  );
  const projectsProjectsExecProgressTextEl = must(
    document.getElementById("projectsProjectsExecProgressText") as HTMLDivElement | null,
    "projectsProjectsExecProgressText"
  );

  const projectsConfirmBoxEl = must(document.getElementById("projectsConfirmBox") as HTMLDivElement | null, "projectsConfirmBox");
  const projectsConfirmTitleEl = must(document.getElementById("projectsConfirmTitle") as HTMLDivElement | null, "projectsConfirmTitle");
  const projectsConfirmPreviewEl = must(
    document.getElementById("projectsConfirmPreview") as HTMLUListElement | null,
    "projectsConfirmPreview"
  );
  const projectsCbConfirmEl = must(document.getElementById("projectsCbConfirm") as HTMLInputElement | null, "projectsCbConfirm");
  const projectsBtnConfirmExecute = must(
    document.getElementById("projectsBtnConfirmExecute") as HTMLButtonElement | null,
    "projectsBtnConfirmExecute"
  );
  const projectsBtnCancelExecute = must(
    document.getElementById("projectsBtnCancelExecute") as HTMLButtonElement | null,
    "projectsBtnCancelExecute"
  );

  const projectsCountEl = must(document.getElementById("projectsCount") as HTMLElement | null, "projectsCount");
  const projectsChatsCountEl = must(document.getElementById("projectsChatsCount") as HTMLElement | null, "projectsChatsCount");
  const projectsSelectedChatsCountEl = must(
    document.getElementById("projectsSelectedChatsCount") as HTMLElement | null,
    "projectsSelectedChatsCount"
  );
  const projectsSelectedProjectsCountEl = must(
    document.getElementById("projectsSelectedProjectsCount") as HTMLElement | null,
    "projectsSelectedProjectsCount"
  );
  const projectsListEl = must(document.getElementById("projectsList") as HTMLUListElement | null, "projectsList");

  const mountCreateProjectProjectsEl = must(
    document.getElementById("mountCreateProjectProjects") as HTMLDivElement | null,
    "mountCreateProjectProjects"
  );
  const mountCreateProjectOrganizeEl = must(
    document.getElementById("mountCreateProjectOrganize") as HTMLDivElement | null,
    "mountCreateProjectOrganize"
  );

  // -----------------------------
  // Logs (audit)
  // -----------------------------
  const logsLimitEl = must(document.getElementById("logsLimit") as HTMLInputElement | null, "logsLimit");
  const btnLogsRefresh = must(document.getElementById("btnLogsRefresh") as HTMLButtonElement | null, "btnLogsRefresh");
  const logsStatusEl = must(document.getElementById("logsStatus") as HTMLSpanElement | null, "logsStatus");

  const logsTrimKeepEl = must(document.getElementById("logsTrimKeep") as HTMLInputElement | null, "logsTrimKeep");
  const btnLogsTrim = must(document.getElementById("btnLogsTrim") as HTMLButtonElement | null, "btnLogsTrim");
  const btnLogsExport = must(document.getElementById("btnLogsExport") as HTMLButtonElement | null, "btnLogsExport");
  const btnLogsClear = must(document.getElementById("btnLogsClear") as HTMLButtonElement | null, "btnLogsClear");

  const logsOutEl = must(document.getElementById("logsOut") as HTMLPreElement | null, "logsOut");

  // -----------------------------
  // Settings (new)
  // -----------------------------
  const cfgShowDevToolsEl = must(document.getElementById("cfgShowDevTools") as HTMLInputElement | null, "cfgShowDevTools");
  const settingsGeneralStatusEl = must(
    document.getElementById("settingsGeneralStatus") as HTMLElement | null,
    "settingsGeneralStatus"
  );

  const apiOriginEl = must(document.getElementById("apiOrigin") as HTMLInputElement | null, "apiOrigin");
  const btnApiOriginReset = must(
    document.getElementById("btnApiOriginReset") as HTMLButtonElement | null,
    "btnApiOriginReset"
  );
  const apiOriginStatusEl = must(document.getElementById("apiOriginStatus") as HTMLElement | null, "apiOriginStatus");

  const settingsVersionEl = must(document.getElementById("settingsVersion") as HTMLElement | null, "settingsVersion");
  const settingsGitHubLinkEl = must(
    document.getElementById("settingsGitHubLink") as HTMLAnchorElement | null,
    "settingsGitHubLink"
  );

  // Developer config inputs (moved into Settings; IDs unchanged) 

  const devConfigDetailsEl = must(document.getElementById("devConfigDetails") as HTMLDetailsElement | null, "devConfigDetails");
  const settingsConnectionBoxEl = must(document.getElementById("settingsConnectionBox") as HTMLDetailsElement | null, "settingsConnectionBox");
 
  const cfgTraceScopeEl = must(document.getElementById("cfgTraceScope") as HTMLInputElement | null, "cfgTraceScope");
  const cfgStopAfterOutOfScopeEl = must(
    document.getElementById("cfgStopAfterOutOfScope") as HTMLInputElement | null,
    "cfgStopAfterOutOfScope"
  );
  const btnCfgResetDefaults = must(
    document.getElementById("btnCfgResetDefaults") as HTMLButtonElement | null,
    "btnCfgResetDefaults"
  );
  const cfgStatusEl = must(document.getElementById("cfgStatus") as HTMLElement | null, "cfgStatus");

  const cfgActionLogMaxEl = must(document.getElementById("cfgActionLogMax") as HTMLInputElement | null, "cfgActionLogMax");
  const cfgDebugTraceMaxEl = must(
    document.getElementById("cfgDebugTraceMax") as HTMLInputElement | null,
    "cfgDebugTraceMax"
  );
  const cfgFailureLogsPerRunEl = must(
    document.getElementById("cfgFailureLogsPerRun") as HTMLInputElement | null,
    "cfgFailureLogsPerRun"
  );

  // Debug enabled checkbox moved into Settings; ID unchanged
  const logsCbDebugEl = must(document.getElementById("logsCbDebug") as HTMLInputElement | null, "logsCbDebug");

  // -----------------------------
  // Debug trace (still displayed in Logs view)
  // -----------------------------
  const debugLimitEl = must(document.getElementById("debugLimit") as HTMLInputElement | null, "debugLimit");
  const btnDebugRefresh = must(document.getElementById("btnDebugRefresh") as HTMLButtonElement | null, "btnDebugRefresh");
  const btnDebugExport = must(document.getElementById("btnDebugExport") as HTMLButtonElement | null, "btnDebugExport");
  const btnDebugClear = must(document.getElementById("btnDebugClear") as HTMLButtonElement | null, "btnDebugClear");
  const debugStatusEl = must(document.getElementById("debugStatus") as HTMLSpanElement | null, "debugStatus");
  const debugOutEl = must(document.getElementById("debugOut") as HTMLPreElement | null, "debugOut");

  // -----------------------------
  // Stats
  // -----------------------------
  const btnStatsRecalc = must(document.getElementById("btnStatsRecalc") as HTMLButtonElement | null, "btnStatsRecalc");
  const statsStatusEl = must(document.getElementById("statsStatus") as HTMLSpanElement | null, "statsStatus");
  const statsLastCacheUpdateEl = must(
    document.getElementById("statsLastCacheUpdate") as HTMLElement | null,
    "statsLastCacheUpdate"
  );

  const statsSnapshotBoxEl = must(document.getElementById("statsSnapshotBox") as HTMLDetailsElement | null, "statsSnapshotBox");
  const statsSingleChatsEl = must(document.getElementById("statsSingleChats") as HTMLElement | null, "statsSingleChats");
  const statsProjectsEl = must(document.getElementById("statsProjects") as HTMLElement | null, "statsProjects");
  const statsProjectChatsEl = must(document.getElementById("statsProjectChats") as HTMLElement | null, "statsProjectChats");
  const statsTotalChatsEl = must(document.getElementById("statsTotalChats") as HTMLElement | null, "statsTotalChats");
  const statsArchivedChatsEl = must(document.getElementById("statsArchivedChats") as HTMLElement | null, "statsArchivedChats");
  const statsAvgChatsPerProjectEl = must(
    document.getElementById("statsAvgChatsPerProject") as HTMLElement | null,
    "statsAvgChatsPerProject"
  );
  const statsLimitsHintEl = must(document.getElementById("statsLimitsHint") as HTMLElement | null, "statsLimitsHint");

  const statsActivityBoxEl = must(document.getElementById("statsActivityBox") as HTMLDetailsElement | null, "statsActivityBox");
  const statsActivityExplainEl = must(
    document.getElementById("statsActivityExplain") as HTMLElement | null,
    "statsActivityExplain"
  );
  const statsCreatedHeatmapEl = must(
    document.getElementById("statsCreatedHeatmap") as HTMLElement | null,
    "statsCreatedHeatmap"
  );
  const statsLifetimeHistEl = must(document.getElementById("statsLifetimeHist") as HTMLElement | null, "statsLifetimeHist");

  const statsProjectsBoxEl = must(document.getElementById("statsProjectsBox") as HTMLDetailsElement | null, "statsProjectsBox");
  const statsProjectSizeHistEl = must(
    document.getElementById("statsProjectSizeHist") as HTMLElement | null,
    "statsProjectSizeHist"
  );
  const statsTopProjectsEl = must(document.getElementById("statsTopProjects") as HTMLElement | null, "statsTopProjects");

  const statsDeletesBoxEl = must(document.getElementById("statsDeletesBox") as HTMLDetailsElement | null, "statsDeletesBox");
  const statsDeletedChatsEl = must(document.getElementById("statsDeletedChats") as HTMLElement | null, "statsDeletedChats");
  const statsDeletedProjectsEl = must(document.getElementById("statsDeletedProjects") as HTMLElement | null, "statsDeletedProjects");

  // -----------------------------
  // Organize
  // -----------------------------
  const organizeSourceEl = must(document.getElementById("organizeSource") as HTMLSelectElement | null, "organizeSource");
  const organizeFilterEl = must(document.getElementById("organizeFilter") as HTMLInputElement | null, "organizeFilter");
  const cbOrganizeToggleAll = must(
    document.getElementById("cbOrganizeToggleAll") as HTMLInputElement | null,
    "cbOrganizeToggleAll"
  );

  const organizeSourceStatusEl = must(
    document.getElementById("organizeSourceStatus") as HTMLElement | null,
    "organizeSourceStatus"
  );
  const organizeSourceCountEl = must(document.getElementById("organizeSourceCount") as HTMLElement | null, "organizeSourceCount");
  const organizeSelectedCountEl = must(
    document.getElementById("organizeSelectedCount") as HTMLElement | null,
    "organizeSelectedCount"
  );
  const organizeSourceListEl = must(
    document.getElementById("organizeSourceList") as HTMLUListElement | null,
    "organizeSourceList"
  );

  const organizeProjectFilterEl = must(
    document.getElementById("organizeProjectFilter") as HTMLInputElement | null,
    "organizeProjectFilter"
  );
  const btnOrganizeClearTarget = must(
    document.getElementById("btnOrganizeClearTarget") as HTMLButtonElement | null,
    "btnOrganizeClearTarget"
  );

  const organizeProjectsStatusEl = must(
    document.getElementById("organizeProjectsStatus") as HTMLElement | null,
    "organizeProjectsStatus"
  );
  const organizeProjectsCountEl = must(
    document.getElementById("organizeProjectsCount") as HTMLElement | null,
    "organizeProjectsCount"
  );
  const organizeTargetLabelEl = must(
    document.getElementById("organizeTargetLabel") as HTMLElement | null,
    "organizeTargetLabel"
  );
  const organizeProjectListEl = must(
    document.getElementById("organizeProjectList") as HTMLUListElement | null,
    "organizeProjectList"
  );

  const btnOrganizeMove = must(document.getElementById("btnOrganizeMove") as HTMLButtonElement | null, "btnOrganizeMove");

  const organizeExecOutEl = must(document.getElementById("organizeExecOut") as HTMLPreElement | null, "organizeExecOut");
  const organizeExecProgressWrapEl = must(
    document.getElementById("organizeExecProgressWrap") as HTMLDivElement | null,
    "organizeExecProgressWrap"
  );
  const organizeExecProgressEl = must(
    document.getElementById("organizeExecProgress") as HTMLProgressElement | null,
    "organizeExecProgress"
  );
  const organizeExecProgressTextEl = must(
    document.getElementById("organizeExecProgressText") as HTMLDivElement | null,
    "organizeExecProgressText"
  );

  const organizeConfirmBoxEl = must(
    document.getElementById("organizeConfirmBox") as HTMLDivElement | null,
    "organizeConfirmBox"
  );
  const organizeConfirmTitleEl = must(
    document.getElementById("organizeConfirmTitle") as HTMLDivElement | null,
    "organizeConfirmTitle"
  );
  const organizeConfirmPreviewEl = must(
    document.getElementById("organizeConfirmPreview") as HTMLUListElement | null,
    "organizeConfirmPreview"
  );
  const organizeCbConfirmEl = must(document.getElementById("organizeCbConfirm") as HTMLInputElement | null, "organizeCbConfirm");
  const organizeBtnConfirmExecute = must(
    document.getElementById("organizeBtnConfirmExecute") as HTMLButtonElement | null,
    "organizeBtnConfirmExecute"
  );
  const organizeBtnCancelExecute = must(
    document.getElementById("organizeBtnCancelExecute") as HTMLButtonElement | null,
    "organizeBtnCancelExecute"
  );

  return {
    rootEl,

    // Tabs + views
    tabSingle,
    tabProjects,
    tabOrganize,
    tabSearch,
    tabSettings,
    tabLogs,
    tabStats,

    viewSingle,
    viewProjects,
    viewOrganize,
    viewSearch,
    viewSettings,
    viewLogs,
    viewStats,

    // Global scope
    scopeLabelEl,
    btnScopeChange,
    btnScopeRefresh,
    scopeDialogEl,
    scopeDateEl,
    btnScopeCancel,
    btnScopeApply,
    scopeLoadedSinglesEl,
    scopeLoadedProjectsEl,
    scopeLoadedProjectChatsEl,
    scopeLoadingEl,

    // legacy list triggers
    btnListSingle,
    btnListProjects,

    // Search
    searchInfoBoxEl,
    btnSearchListSingle,
    btnSearchListProjects,
    searchLoadedSinglesEl,
    searchLoadedProjectsEl,
    searchLoadedProjectChatsEl,
    searchInfoLimitsEl,
    btnSearchResetFilters,
    searchStatusEl,
    searchQueryEl,
    btnSearchClear,
    searchScopeEl,
    searchArchivedEl,
    searchUpdatedWithinEl,
    searchUpdatedAfterEl,
    searchUpdatedBeforeEl,
    searchCreatedWithinEl,
    searchCreatedAfterEl,
    searchCreatedBeforeEl,
    searchResultsCountEl,
    searchResultsEl,

    // Single
    singleLimitEl,
    singleStatusEl,
    cbSingleToggleAll,
    btnSingleDelete,
    singleExecOutEl,
    singleExecProgressWrapEl,
    singleExecProgressEl,
    singleExecProgressTextEl,
    singleConfirmBoxEl,
    singleConfirmTitleEl,
    singleConfirmPreviewEl,
    singleCbConfirmEl,
    singleBtnConfirmExecute,
    singleBtnCancelExecute,
    singleCountEl,
    singleSelectedCountEl,
    singleListEl,

    // Projects
    projectsLimitEl,
    projectsChatsLimitEl,
    projectsStatusEl,
    btnProjectsDelete,
    projectsExecOutEl,
    projectsChatsExecProgressWrapEl,
    projectsChatsExecProgressEl,
    projectsChatsExecProgressTextEl,
    projectsProjectsExecProgressWrapEl,
    projectsProjectsExecProgressEl,
    projectsProjectsExecProgressTextEl,
    projectsConfirmBoxEl,
    projectsConfirmTitleEl,
    projectsConfirmPreviewEl,
    projectsCbConfirmEl,
    projectsBtnConfirmExecute,
    projectsBtnCancelExecute,
    projectsCountEl,
    projectsChatsCountEl,
    projectsSelectedChatsCountEl,
    projectsSelectedProjectsCountEl,
    projectsListEl,
    mountCreateProjectProjectsEl,
    mountCreateProjectOrganizeEl,

    // Logs (audit)
    logsLimitEl,
    btnLogsRefresh,
    logsStatusEl,
    logsTrimKeepEl,
    btnLogsTrim,
    btnLogsExport,
    btnLogsClear,
    logsOutEl,

    // Settings
    cfgShowDevToolsEl,
    settingsGeneralStatusEl,
    apiOriginEl,
    btnApiOriginReset,
    apiOriginStatusEl,
    settingsVersionEl,
    settingsGitHubLinkEl,

    // Dev config inputs (in Settings now)
    devConfigDetailsEl,
    settingsConnectionBoxEl,

    cfgTraceScopeEl,
    cfgStopAfterOutOfScopeEl,
    btnCfgResetDefaults,
    cfgStatusEl,
    cfgActionLogMaxEl,
    cfgDebugTraceMaxEl,
    cfgFailureLogsPerRunEl,
    logsCbDebugEl,

    // Debug trace
    debugLimitEl,
    btnDebugRefresh,
    btnDebugExport,
    btnDebugClear,
    debugStatusEl,
    debugOutEl,

    // Stats
    btnStatsRecalc,
    statsStatusEl,
    statsLastCacheUpdateEl,
    statsSnapshotBoxEl,
    statsSingleChatsEl,
    statsProjectsEl,
    statsProjectChatsEl,
    statsTotalChatsEl,
    statsArchivedChatsEl,
    statsAvgChatsPerProjectEl,
    statsLimitsHintEl,
    statsActivityBoxEl,
    statsActivityExplainEl,
    statsCreatedHeatmapEl,
    statsLifetimeHistEl,
    statsProjectsBoxEl,
    statsProjectSizeHistEl,
    statsTopProjectsEl,
    statsDeletesBoxEl,
    statsDeletedChatsEl,
    statsDeletedProjectsEl,

    // Organize
    organizeSourceEl,
    organizeFilterEl,
    cbOrganizeToggleAll,
    organizeSourceStatusEl,
    organizeSourceCountEl,
    organizeSelectedCountEl,
    organizeSourceListEl,
    organizeProjectFilterEl,
    btnOrganizeClearTarget,
    organizeProjectsStatusEl,
    organizeProjectsCountEl,
    organizeTargetLabelEl,
    organizeProjectListEl,
    btnOrganizeMove,
    organizeExecOutEl,
    organizeExecProgressWrapEl,
    organizeExecProgressEl,
    organizeExecProgressTextEl,
    organizeConfirmBoxEl,
    organizeConfirmTitleEl,
    organizeConfirmPreviewEl,
    organizeCbConfirmEl,
    organizeBtnConfirmExecute,
    organizeBtnCancelExecute,
  };
}
