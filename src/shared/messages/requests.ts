// src/shared/messages/requests.ts
// src/shared/messages/requests.ts

import type { PingRequest, ExecuteDeleteRequest } from "./logs";
import type { ListAllChatsRequest } from "./conversations";
import type {
  ListGizmoProjectsRequest,
  DeleteProjectsRequest,
  MoveChatsToProjectRequest,
  CreateProjectRequest,
} from "./projects";

/**
 * Union of all request messages that can be sent to background.
 * These request types already live in conversations/logs/projects.
 * This file only composes them.
 */
export type AnyRequest =
  | PingRequest
  | ListAllChatsRequest
  | ListGizmoProjectsRequest
  | ExecuteDeleteRequest
  | DeleteProjectsRequest
  | MoveChatsToProjectRequest
  | CreateProjectRequest;
