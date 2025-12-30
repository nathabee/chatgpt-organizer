// src/shared/types.ts
 

export type ConversationItem = {
  id: string;
  title: string;
  href: string;
};

export type ProjectItem = {
  key: string; // gizmo id (stable)
  title: string;
  href: string; // best-effort URL to open the project/gizmo
  conversations: ConversationItem[];
};
