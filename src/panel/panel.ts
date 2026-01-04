import { getDom } from "./app/dom";
import { createBus } from "./app/bus";
import { createTabs } from "./app/tabs";

import { createPanelCache } from "./app/cache";

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



  const cache = createPanelCache();
  const singleTab = createSingleTab(dom, bus, cache);
  const projectsTab = createProjectsTab(dom, bus, cache);
  const searchTab = createSearchTab(dom, bus, cache);

  const organizeTab = createOrganizeTab(dom, bus);
  const logsTab = createLogsTab(dom, bus);
  const statsTab = createStatsTab(dom, bus, cache);

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
