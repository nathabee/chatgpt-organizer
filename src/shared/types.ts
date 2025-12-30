// src/shared/types.ts

export type ConversationItem = {
  id: string;
  title: string;
  href: string;
};

// NEW v0.0.9
export type ProjectItem = {
  key: string; // stable-ish key derived from /g/<key>/project
  title: string;
  href: string; // absolute
  conversations: ConversationItem[];
};


