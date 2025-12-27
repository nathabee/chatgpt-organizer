// src/shared/messages.ts

import type { ConversationItem } from "./types";

export const MSG = {
  PING: "CGO_PING",
  LIST_CONVERSATIONS: "CGO_LIST_CONVERSATIONS"
} as const;

export type PingRequest = { type: typeof MSG.PING };
export type PingResponse = { ok: true };

export type ListConversationsRequest = { type: typeof MSG.LIST_CONVERSATIONS };

export type ListConversationsResponse =
  | { ok: true; conversations: ConversationItem[] }
  | { ok: false; error: string };

export type AnyRequest = PingRequest | ListConversationsRequest;
export type AnyResponse = PingResponse | ListConversationsResponse;

