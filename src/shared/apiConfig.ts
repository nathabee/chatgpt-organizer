// src/shared/apiConfig.ts

export type ApiConfig = {
  /** Origin only, no trailing slash. Example: "https://chatgpt.com" */
  origin: string;

  /** Paths (no origin). Keep them explicit so you can override per host later. */
  pathAuthSession: string;            // "/api/auth/session"
  pathConversations: string;          // "/backend-api/conversations"
  pathConversation: string;           // "/backend-api/conversation/{id}"
  pathGizmosRoot: string;             // "/backend-api/gizmos"
  pathGizmosSidebar: string;          // "/backend-api/gizmos/snorlax/sidebar"
  pathGizmoConversations: string;     // "/backend-api/gizmos/{id}/conversations"

  /** UI href builders */
  pathUiConversation: string;         // "/c/{id}"
  pathUiGizmo: string;                // "/g/{shortUrl}"
};

export const API_CONFIG_KEY = "cgo_api_config" as const;

export const DEFAULT_API_CONFIG: ApiConfig = {
  origin: "https://chatgpt.com",

  pathAuthSession: "/api/auth/session",
  pathConversations: "/backend-api/conversations",
  pathConversation: "/backend-api/conversation/{id}",
  pathGizmosRoot: "/backend-api/gizmos",
  pathGizmosSidebar: "/backend-api/gizmos/snorlax/sidebar",
  pathGizmoConversations: "/backend-api/gizmos/{id}/conversations",

  pathUiConversation: "/c/{id}",
  pathUiGizmo: "/g/{shortUrl}",
};
