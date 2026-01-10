// demo/src/mocks/data.ts

// console.log("[cgo-demo] mock data loaded");

export const DEMO = {
  projects: [
    {
      gizmoId: "g-demo-1",
      title: "Demo Project A",
      href: "#",
      conversations: [
        { id: "c-a1", title: "Project chat 1", gizmoId: "g-demo-1" },
        { id: "c-a2", title: "Project chat 2", gizmoId: "g-demo-1" },
      ],
    },
    {
      gizmoId: "g-demo-2",
      title: "Demo Project B",
      href: "#",
      conversations: [{ id: "c-b1", title: "Project chat X", gizmoId: "g-demo-2" }],
    },
  ],
  singles: [
    { id: "c-s1", title: "Single chat 1", gizmoId: "" },
    { id: "c-s2", title: "Single chat 2", gizmoId: "" },
    { id: "c-s3", title: "Single chat 3", gizmoId: "" },
  ],
};
