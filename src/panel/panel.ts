// src/panel/panel.ts

import { getDom } from "./app/dom";
import { createBus } from "./app/bus";
import { createTabs } from "./app/tabs";
import { createSingleTab } from "./tabs/single/tab";
import { createProjectsTab } from "./tabs/projects/tab";

(() => {
  const dom = getDom();

  const bus = createBus();
  bus.start();

  const singleTab = createSingleTab(dom, bus);
  const projectsTab = createProjectsTab(dom, bus);

  singleTab.bind();
  projectsTab.bind();

  const tabs = createTabs(dom, {
    single: singleTab,
    projects: projectsTab,
  });

  tabs.bind();
  tabs.boot();
})();
