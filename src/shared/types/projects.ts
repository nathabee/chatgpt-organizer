// src/shared/types/projects.ts
import type { ConversationItem } from "./conversations";
 

export type ProjectItem = {
  gizmoId: string; // g-p-...
  title: string;
  href: string; // best-effort project URL

  // optional metadata we can derive from sidebar response
  shortUrl?: string | null;     // e.g. "g-p-...-something"
  ownedOnly?: boolean;          // we call API with owned_only=true
  workspaceId?: string | null;  // if it exists later

  conversations: ConversationItem[];

  // small extras (safe scalars only)
  extra?: Record<string, string | number | boolean | null>;
};
