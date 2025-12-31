// src/panel/app/dom.ts
export type Dom = ReturnType<typeof getDom>;

export function getDom() {
  // Tabs
  const tabSingle = document.getElementById("tabSingle") as HTMLButtonElement;
  const tabProjects = document.getElementById("tabProjects") as HTMLButtonElement;
  const viewSingle = document.getElementById("viewSingle") as HTMLElement;
  const viewProjects = document.getElementById("viewProjects") as HTMLElement;

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

  return {
    tabSingle, tabProjects, viewSingle, viewProjects,
    singleLimitEl, btnListSingle, singleStatusEl, cbSingleToggleAll, btnSingleDelete,
    singleExecOutEl, singleExecProgressWrapEl, singleExecProgressEl, singleExecProgressTextEl,
    singleConfirmBoxEl, singleConfirmTitleEl, singleConfirmPreviewEl, singleCbConfirmEl,
    singleBtnConfirmExecute, singleBtnCancelExecute,
    singleCountEl, singleSelectedCountEl, singleListEl,
    projectsLimitEl, projectsChatsLimitEl, btnListProjects, projectsStatusEl, btnProjectsDelete,
    projectsExecOutEl,
    projectsChatsExecProgressWrapEl, projectsChatsExecProgressEl, projectsChatsExecProgressTextEl,
    projectsProjectsExecProgressWrapEl, projectsProjectsExecProgressEl, projectsProjectsExecProgressTextEl,
    projectsConfirmBoxEl, projectsConfirmTitleEl, projectsConfirmPreviewEl, projectsCbConfirmEl,
    projectsBtnConfirmExecute, projectsBtnCancelExecute,
    projectsCountEl, projectsChatsCountEl, projectsSelectedChatsCountEl, projectsSelectedProjectsCountEl,
    projectsListEl,
  };
}
