// src/shared/types/projects.ts
import type { ConversationItem } from "./conversations";

export type ProjectItem = {
  gizmoId: string; // g-p-...
  title: string;
  href: string; // best-effort project URL
  conversations: ConversationItem[];
};
