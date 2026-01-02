import { getDom } from "./app/dom";
import { createBus } from "./app/bus";
import { createTabs } from "./app/tabs";

import { createSingleTab } from "./tabs/single/tab";
import { createProjectsTab } from "./tabs/projects/tab";
import { createOrganizeTab } from "./tabs/organize/tab";
import { createSearchTab } from "./tabs/search/tab";
import { createLogsTab } from "./tabs/logs/tab";
import { createStatsTab } from "./tabs/stats/tab";

(() => {
  const dom = getDom();

  const bus = createBus();
  bus.start();

  const singleTab = createSingleTab(dom, bus);
  const projectsTab = createProjectsTab(dom, bus);
  const organizeTab = createOrganizeTab(dom, bus);
  const searchTab = createSearchTab(dom, bus);
  const logsTab = createLogsTab(dom, bus);
  const statsTab = createStatsTab(dom, bus);

  singleTab.bind();
  projectsTab.bind();
  organizeTab.bind();
  searchTab.bind();
  logsTab.bind();
  statsTab.bind();

  const tabs = createTabs(dom, {
    single: singleTab,
    projects: projectsTab,
    organize: organizeTab,
    search: searchTab,
    logs: logsTab,
    stats: statsTab,
  });

  tabs.bind();
  tabs.boot();
})();
