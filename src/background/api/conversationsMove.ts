import { ensureApiConfigLoaded } from "../util/apiConfig";
import { apiConversationUrl } from "../util/apiUrls";
import { tracedFetch } from "../util/fetch";

export type MoveResult = {
  ok: boolean;
  status?: number;
  error?: string;
};

export async function moveConversationToProject(
  accessToken: string,
  args: { conversationId: string; gizmoId: string }
): Promise<MoveResult> {
  const conversationId = String(args.conversationId || "").trim();
  const gizmoId = String(args.gizmoId || "").trim();

  if (!conversationId) return { ok: false, error: "Missing conversationId" };
  if (!gizmoId) return { ok: false, error: "Missing gizmoId" };

  await ensureApiConfigLoaded();

  try {
    const resp = await tracedFetch(apiConversationUrl(conversationId), {
      method: "PATCH",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ gizmo_id: gizmoId }),
    });

    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      return { ok: false, status: resp.status, error: txt || `HTTP ${resp.status}` };
    }

    return { ok: true, status: resp.status };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Network error" };
  }
}
