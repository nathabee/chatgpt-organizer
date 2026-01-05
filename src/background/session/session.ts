// src/background/session/session.ts
import { ensureApiConfigLoaded } from "../util/apiConfig";
import { apiAuthSessionUrl } from "../util/apiUrls";

 


export type SessionInfo = {
  loggedIn: boolean;
  accessToken?: string;
  meHint?: string;
};

export async function fetchSession(): Promise<SessionInfo> {
  await ensureApiConfigLoaded();
  try {
    const resp = await fetch(apiAuthSessionUrl(), {
      method: "GET",
      credentials: "include",
    });

    if (!resp.ok) return { loggedIn: false };

    const data = (await resp.json().catch(() => null)) as any;
    const accessToken = data?.accessToken as string | undefined;

    const email = data?.user?.email as string | undefined;
    const name = data?.user?.name as string | undefined;
    const meHint = email || name;

    return { loggedIn: !!accessToken, accessToken, meHint };
  } catch {
    return { loggedIn: false };
  }
}
