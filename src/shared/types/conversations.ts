// src/shared/types/conversations.ts

export type ConversationItem = {
  id: string;
  title: string;
  href: string; // https://chatgpt.com/c/<id>

  // null = normal chat (not in a project)
  // "g-p-..." = project/gizmo chat
  gizmoId: string | null;

  updateTime?: string;
  createTime?: string;
};
