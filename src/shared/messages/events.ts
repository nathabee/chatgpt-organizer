import type { ListAllChatsProgressEvent, ListAllChatsDoneEvent } from "./conversations";
import type {
  ListGizmoProjectsProgressEvent,
  ListGizmoProjectsDoneEvent,
  DeleteProjectsProgressEvent,
  DeleteProjectsDoneEvent,
} from "./projects";
import type { ExecuteDeleteProgressEvent, ExecuteDeleteDoneEvent } from "./logs";

/**
 * Events pushed from background -> panel via chrome.runtime.sendMessage
 * and forwarded through the panel bus.
 */
export type AnyEvent =
  | ListAllChatsProgressEvent
  | ListAllChatsDoneEvent
  | ListGizmoProjectsProgressEvent
  | ListGizmoProjectsDoneEvent
  | ExecuteDeleteProgressEvent
  | ExecuteDeleteDoneEvent
  | DeleteProjectsProgressEvent
  | DeleteProjectsDoneEvent;
