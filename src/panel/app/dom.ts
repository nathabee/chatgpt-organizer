// src/panel/app/dom.ts
export type Dom = ReturnType<typeof getDom>;

export function getDom() {

  function must<T extends Element>(el: T | null, id: string): T {
    if (!el) throw new Error(`[dom] Missing #${id}`);
    return el;
  }



  // Tabs
  const tabSingle = document.getElementById("tabSingle") as HTMLButtonElement;
  const tabProjects = document.getElementById("tabProjects") as HTMLButtonElement;
  const viewSingle = document.getElementById("viewSingle") as HTMLElement;
  const viewProjects = document.getElementById("viewProjects") as HTMLElement;
  const tabOrganize = document.getElementById("tabOrganize") as HTMLButtonElement;
  const tabSearch = document.getElementById("tabSearch") as HTMLButtonElement;
  const tabLogs = document.getElementById("tabLogs") as HTMLButtonElement;
  const tabStats = document.getElementById("tabStats") as HTMLButtonElement;

  const viewOrganize = document.getElementById("viewOrganize") as HTMLElement;
  const viewSearch = document.getElementById("viewSearch") as HTMLElement;
  const viewLogs = document.getElementById("viewLogs") as HTMLElement;
  const viewStats = document.getElementById("viewStats") as HTMLElement;

  // Search

  // Top row
  const searchQueryEl = must(document.getElementById("searchQuery"), "searchQuery") as HTMLInputElement;
  const btnSearchClear = must(document.getElementById("btnSearchClear"), "btnSearchClear") as HTMLButtonElement;
  const btnSearchResetFilters = must(document.getElementById("btnSearchResetFilters"), "btnSearchResetFilters") as HTMLButtonElement;

  // Extra filters (details)
  const searchScopeEl = must(document.getElementById("searchScope"), "searchScope") as HTMLSelectElement;
  const searchArchivedEl = must(document.getElementById("searchArchived"), "searchArchived") as HTMLSelectElement;

  const searchUpdatedWithinEl = must(document.getElementById("searchUpdatedWithin"), "searchUpdatedWithin") as HTMLSelectElement;
  const searchCreatedWithinEl = must(document.getElementById("searchCreatedWithin"), "searchCreatedWithin") as HTMLSelectElement;

  const searchUpdatedAfterEl = must(document.getElementById("searchUpdatedAfter"), "searchUpdatedAfter") as HTMLInputElement;
  const searchUpdatedBeforeEl = must(document.getElementById("searchUpdatedBefore"), "searchUpdatedBefore") as HTMLInputElement;

  const searchCreatedAfterEl = must(document.getElementById("searchCreatedAfter"), "searchCreatedAfter") as HTMLInputElement;
  const searchCreatedBeforeEl = must(document.getElementById("searchCreatedBefore"), "searchCreatedBefore") as HTMLInputElement;

  // Info box
  const searchInfoBoxEl = must(document.getElementById("searchInfoBox"), "searchInfoBox") as HTMLDetailsElement;
  const btnSearchListSingle = must(document.getElementById("btnSearchListSingle"), "btnSearchListSingle") as HTMLButtonElement;
  const btnSearchListProjects = must(document.getElementById("btnSearchListProjects"), "btnSearchListProjects") as HTMLButtonElement;

  const searchInfoLoadedSinglesEl = must(document.getElementById("searchInfoLoadedSingles"), "searchInfoLoadedSingles") as HTMLElement;
  const searchInfoLoadedProjectsEl = must(document.getElementById("searchInfoLoadedProjects"), "searchInfoLoadedProjects") as HTMLElement;
  const searchInfoLoadedProjectChatsEl = must(document.getElementById("searchInfoLoadedProjectChats"), "searchInfoLoadedProjectChats") as HTMLElement;
  const searchInfoLimitsEl = must(document.getElementById("searchInfoLimits"), "searchInfoLimits") as HTMLElement;

  // Always visible status + results
  const searchStatusEl = must(document.getElementById("searchStatus"), "searchStatus") as HTMLDivElement; // ✅ it's a <div> now
  const searchResultsCountEl = must(document.getElementById("searchResultsCount"), "searchResultsCount") as HTMLElement;

  // Results list
  const searchResultsEl = must(document.getElementById("searchResults"), "searchResults") as HTMLUListElement;



  // Single
  const singleLimitEl = document.getElementById("singleLimit") as HTMLInputElement;
  const btnListSingle = document.getElementById("btnListSingle") as HTMLButtonElement;
  const singleStatusEl = document.getElementById("singleStatus") as HTMLSpanElement;
  const cbSingleToggleAll = document.getElementById("cbSingleToggleAll") as HTMLInputElement;
  const btnSingleDelete = document.getElementById("btnSingleDelete") as HTMLButtonElement;

  const singleExecOutEl = document.getElementById("singleExecOut") as HTMLPreElement;
  const singleExecProgressWrapEl = document.getElementById("singleExecProgressWrap") as HTMLDivElement;
  const singleExecProgressEl = document.getElementById("singleExecProgress") as HTMLProgressElement;
  const singleExecProgressTextEl = document.getElementById("singleExecProgressText") as HTMLDivElement;

  const singleConfirmBoxEl = document.getElementById("singleConfirmBox") as HTMLDivElement;
  const singleConfirmTitleEl = document.getElementById("singleConfirmTitle") as HTMLDivElement;
  const singleConfirmPreviewEl = document.getElementById("singleConfirmPreview") as HTMLUListElement;
  const singleCbConfirmEl = document.getElementById("singleCbConfirm") as HTMLInputElement;
  const singleBtnConfirmExecute = document.getElementById("singleBtnConfirmExecute") as HTMLButtonElement;
  const singleBtnCancelExecute = document.getElementById("singleBtnCancelExecute") as HTMLButtonElement;

  const singleCountEl = document.getElementById("singleCount") as HTMLElement;
  const singleSelectedCountEl = document.getElementById("singleSelectedCount") as HTMLElement;
  const singleListEl = document.getElementById("singleList") as HTMLUListElement;

  // Projects
  const projectsLimitEl = document.getElementById("projectsLimit") as HTMLInputElement;
  const projectsChatsLimitEl = document.getElementById("projectsChatsLimit") as HTMLInputElement;
  const btnListProjects = document.getElementById("btnListProjects") as HTMLButtonElement;
  const projectsStatusEl = document.getElementById("projectsStatus") as HTMLSpanElement;
  const btnProjectsDelete = document.getElementById("btnProjectsDelete") as HTMLButtonElement;

  const projectsExecOutEl = document.getElementById("projectsExecOut") as HTMLPreElement;

  const projectsChatsExecProgressWrapEl = document.getElementById("projectsChatsExecProgressWrap") as HTMLDivElement;
  const projectsChatsExecProgressEl = document.getElementById("projectsChatsExecProgress") as HTMLProgressElement;
  const projectsChatsExecProgressTextEl = document.getElementById("projectsChatsExecProgressText") as HTMLDivElement;

  const projectsProjectsExecProgressWrapEl = document.getElementById("projectsProjectsExecProgressWrap") as HTMLDivElement;
  const projectsProjectsExecProgressEl = document.getElementById("projectsProjectsExecProgress") as HTMLProgressElement;
  const projectsProjectsExecProgressTextEl = document.getElementById("projectsProjectsExecProgressText") as HTMLDivElement;

  const projectsConfirmBoxEl = document.getElementById("projectsConfirmBox") as HTMLDivElement;
  const projectsConfirmTitleEl = document.getElementById("projectsConfirmTitle") as HTMLDivElement;
  const projectsConfirmPreviewEl = document.getElementById("projectsConfirmPreview") as HTMLUListElement;
  const projectsCbConfirmEl = document.getElementById("projectsCbConfirm") as HTMLInputElement;
  const projectsBtnConfirmExecute = document.getElementById("projectsBtnConfirmExecute") as HTMLButtonElement;
  const projectsBtnCancelExecute = document.getElementById("projectsBtnCancelExecute") as HTMLButtonElement;

  const projectsCountEl = document.getElementById("projectsCount") as HTMLElement;
  const projectsChatsCountEl = document.getElementById("projectsChatsCount") as HTMLElement;
  const projectsSelectedChatsCountEl = document.getElementById("projectsSelectedChatsCount") as HTMLElement;
  const projectsSelectedProjectsCountEl = document.getElementById("projectsSelectedProjectsCount") as HTMLElement;

  const projectsListEl = document.getElementById("projectsList") as HTMLUListElement;

  // Logs
  const logsLimitEl = document.getElementById("logsLimit") as HTMLInputElement;
  const btnLogsRefresh = document.getElementById("btnLogsRefresh") as HTMLButtonElement;
  const logsStatusEl = document.getElementById("logsStatus") as HTMLSpanElement;

  const logsTrimKeepEl = document.getElementById("logsTrimKeep") as HTMLInputElement;
  const btnLogsTrim = document.getElementById("btnLogsTrim") as HTMLButtonElement;
  const btnLogsExport = document.getElementById("btnLogsExport") as HTMLButtonElement;
  const btnLogsClear = document.getElementById("btnLogsClear") as HTMLButtonElement;

  const logsOutEl = document.getElementById("logsOut") as HTMLPreElement;


  // Debug trace
  const logsCbDebugEl = document.getElementById("logsCbDebug") as HTMLInputElement;
  const debugLimitEl = document.getElementById("debugLimit") as HTMLInputElement;
  const btnDebugRefresh = document.getElementById("btnDebugRefresh") as HTMLButtonElement;
  const btnDebugExport = document.getElementById("btnDebugExport") as HTMLButtonElement;
  const btnDebugClear = document.getElementById("btnDebugClear") as HTMLButtonElement;
  const debugStatusEl = document.getElementById("debugStatus") as HTMLSpanElement;
  const debugOutEl = document.getElementById("debugOut") as HTMLPreElement;



  return {
    tabSingle, tabProjects, viewSingle, viewProjects,
    tabOrganize, tabSearch, tabLogs, tabStats,
    viewOrganize, viewSearch, viewLogs, viewStats,
 
    // Search ...
    searchInfoBoxEl, btnSearchListSingle, btnSearchListProjects,
    searchInfoLoadedSinglesEl, searchInfoLoadedProjectsEl, searchInfoLoadedProjectChatsEl,
    searchInfoLimitsEl,

    btnSearchResetFilters,
    searchStatusEl, searchQueryEl, btnSearchClear,

    searchScopeEl, searchArchivedEl,
    searchUpdatedWithinEl, searchUpdatedAfterEl, searchUpdatedBeforeEl,
    searchCreatedWithinEl, searchCreatedAfterEl, searchCreatedBeforeEl,

    searchResultsCountEl, searchResultsEl,


    // Single ...
    singleLimitEl, btnListSingle, singleStatusEl, cbSingleToggleAll, btnSingleDelete,
    singleExecOutEl, singleExecProgressWrapEl, singleExecProgressEl, singleExecProgressTextEl,
    singleConfirmBoxEl, singleConfirmTitleEl, singleConfirmPreviewEl, singleCbConfirmEl,
    singleBtnConfirmExecute, singleBtnCancelExecute,
    singleCountEl, singleSelectedCountEl, singleListEl,

    // Projects ...
    projectsLimitEl, projectsChatsLimitEl, btnListProjects, projectsStatusEl, btnProjectsDelete,
    projectsExecOutEl,
    projectsChatsExecProgressWrapEl, projectsChatsExecProgressEl, projectsChatsExecProgressTextEl,
    projectsProjectsExecProgressWrapEl, projectsProjectsExecProgressEl, projectsProjectsExecProgressTextEl,
    projectsConfirmBoxEl, projectsConfirmTitleEl, projectsConfirmPreviewEl, projectsCbConfirmEl,
    projectsBtnConfirmExecute, projectsBtnCancelExecute,
    projectsCountEl, projectsChatsCountEl, projectsSelectedChatsCountEl, projectsSelectedProjectsCountEl,
    projectsListEl,

    // Logs (audit)
    logsLimitEl, btnLogsRefresh, logsStatusEl,
    logsTrimKeepEl, btnLogsTrim, btnLogsExport, btnLogsClear,
    logsOutEl,

    // Debug trace
    logsCbDebugEl, debugLimitEl, btnDebugRefresh, btnDebugExport, btnDebugClear,
    debugStatusEl, debugOutEl,
  };
}
