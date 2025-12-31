// src/panel/tabs/single/model.ts
import type { ConversationItem } from "../../../shared/types";

export function createSingleModel() {
  let chats: ConversationItem[] = [];
  const selected = new Set<string>();

  function setChats(next: ConversationItem[]) {
    chats = next;

    // prune selections that disappeared
    const valid = new Set(chats.map((c) => c.id));
    for (const id of Array.from(selected)) {
      if (!valid.has(id)) selected.delete(id);
    }
  }

  function toggle(id: string, checked: boolean) {
    if (checked) selected.add(id);
    else selected.delete(id);
  }

  function toggleAll(checked: boolean) {
    if (checked) {
      for (const c of chats) selected.add(c.id);
    } else {
      for (const c of chats) selected.delete(c.id);
    }
  }

  function getSelectedIds(): string[] {
    return chats.filter((c) => selected.has(c.id)).map((c) => c.id);
  }

  function removeChat(id: string) {
    chats = chats.filter((c) => c.id !== id);
    selected.delete(id);
  }

  return {
    get chats() {
      return chats;
    },
    selected,
    setChats,
    toggle,
    toggleAll,
    getSelectedIds,
    removeChat,
  };
}
