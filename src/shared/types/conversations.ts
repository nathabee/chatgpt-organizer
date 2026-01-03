// src/shared/types/conversations.ts
 

export type ConversationOwner = {
  id?: string;
  // keep it loose; API shape can change
  name?: string;
  email?: string;
};

export type ConversationItem = {
  id: string;
  title: string;
  href: string; // https://chatgpt.com/c/<id>

  // null = normal chat (not in a project)
  // "g-p-..." = project/gizmo chat
  gizmoId: string | null;

  // timestamps from API
  updateTime?: string; // ISO
  createTime?: string; // ISO
  pinnedTime?: string | null; // ISO or null

  // flags and metadata
  isArchived?: boolean;
  isStarred?: boolean | null;
  isDoNotRemember?: boolean;

  memoryScope?: string | null;

  workspaceId?: string | null;
  conversationOrigin?: string | null;

  // searchable-ish text from API (often null)
  snippet?: string | null;

  // url classification (usually arrays)
  safeUrls?: string[];
  blockedUrls?: string[];

  // “sugar” fields seen in your dump
  sugarItemId?: string | null;
  sugarItemVisible?: boolean | null;

  // only appears in gizmo conversations list (in your dump)
  owner?: ConversationOwner | null;

  /**
   * A small place for extra scalar/short values you decide to keep later,
   * without bloating the core model or storing huge blobs.
   *
   * Important: do NOT store "mapping" or big trees here.
   */
  extra?: Record<string, string | number | boolean | null>;
};
