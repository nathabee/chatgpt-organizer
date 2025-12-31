// src/shared/messages/conversations.ts
import type { ConversationItem } from "../types";
import { MSG } from "./msg";

/* LIST ALL CHATS */
export type ListAllChatsRequest = {
  type: typeof MSG.LIST_ALL_CHATS;
  limit?: number; // default 50
  pageSize?: number; // default 50 (max 100)
};

export type ListAllChatsResponse =
  | { ok: true; conversations: ConversationItem[]; total?: number }
  | { ok: false; error: string };

export type ListAllChatsProgressEvent = {
  type: typeof MSG.LIST_ALL_CHATS_PROGRESS;
  found: number;
  offset: number;
};

export type ListAllChatsDoneEvent = {
  type: typeof MSG.LIST_ALL_CHATS_DONE;
  total: number;
  elapsedMs: number;
};
