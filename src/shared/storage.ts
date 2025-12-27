const NAMESPACE = "chatgpt-organizer";

function key(k: string): string {
  return `${NAMESPACE}:${k}`;
}

export async function storageGet<T>(k: string, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    chrome.storage.local.get([key(k)], (result) => {
      if (result && key(k) in result) {
        resolve(result[key(k)] as T);
      } else {
        resolve(fallback);
      }
    });
  });
}

export async function storageSet<T>(k: string, value: T): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key(k)]: value }, () => resolve());
  });
}

export async function storageRemove(k: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove([key(k)], () => resolve());
  });
}
