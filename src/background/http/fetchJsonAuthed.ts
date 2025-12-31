
// src/background/http/fetchJsonAuthed.ts

export async function fetchJsonAuthed<T>(url: string, accessToken: string): Promise<T> {
  const resp = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(txt || `HTTP ${resp.status}`);
  }

  return (await resp.json()) as T;
}
