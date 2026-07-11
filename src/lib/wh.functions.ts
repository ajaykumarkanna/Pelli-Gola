import { supabase } from "@/integrations/supabase/client";
import type { ChecklistItem, CollectionName, WeddingData, WeddingSession } from "./wh-types";
import { CHECKLIST_SEED } from "./wh-types";

const COLLECTIONS: CollectionName[] = ["inbox", "budget", "tasks", "vendors", "checklist", "links"];

function nowIso() {
  return new Date().toISOString();
}

function randId(len: number) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  let s = "";
  for (let i = 0; i < len; i++) s += alphabet[arr[i] % alphabet.length];
  return s;
}

function randCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const arr = new Uint8Array(6);
  crypto.getRandomValues(arr);
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[arr[i] % alphabet.length];
  return s;
}

async function hashPassword(password: string) {
  const data = new TextEncoder().encode("wh_v1_" + password);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function kvGet<T = unknown>(key: string): Promise<T | null> {
  const { data, error } = await supabase
    .from("wh_kv" as never)
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as { value: T } | null)?.value ?? null;
}

async function kvSet(key: string, value: unknown) {
  const { error } = await supabase
    .from("wh_kv" as never)
    .upsert({ key, value, updated_at: nowIso() } as never);
  if (error) throw new Error(error.message);
}

async function kvDel(key: string) {
  const { error } = await supabase
    .from("wh_kv" as never)
    .delete()
    .eq("key", key);
  if (error) throw new Error(error.message);
}

async function touchRoom(roomId: string) {
  await kvSet(`room:${roomId}:sync`, { updatedAt: nowIso() });
}

async function resolveSession(token: string): Promise<{ roomId: string }> {
  if (!token) throw new Error("No session token");
  const sess = await kvGet<{ roomId: string }>(`sess:${token}`);
  if (!sess) throw new Error("Invalid session");
  return sess;
}

// -------------------------- AUTH --------------------------

export async function authCreate({
  data,
}: {
  data: { password: string };
}): Promise<WeddingSession> {
  if (!data.password || data.password.length < 4) {
    throw new Error("Password must be at least 4 characters");
  }
  const roomId = randId(24);
  const token = randId(48);
  // Ensure unique invite code
  let inviteCode = randCode();
  for (let i = 0; i < 5; i++) {
    const existing = await kvGet(`invite:${inviteCode}`);
    if (!existing) break;
    inviteCode = randCode();
  }
  const passwordHash = await hashPassword(data.password);
  const createdAt = nowIso();

  await kvSet(`room:${roomId}`, { roomId, passwordHash, inviteCode, weddingDate: "", createdAt });
  await kvSet(`invite:${inviteCode}`, { roomId });
  await kvSet(`sess:${token}`, { roomId, createdAt });

  // Seed collections
  for (const col of COLLECTIONS) {
    if (col === "checklist") {
      const seeded: ChecklistItem[] = CHECKLIST_SEED.map((c, i) => ({
        id: `chk_${i}_${randId(6)}`,
        phase: c.phase,
        text: c.text,
        done: false,
      }));
      await kvSet(`room:${roomId}:${col}`, seeded);
    } else {
      await kvSet(`room:${roomId}:${col}`, []);
    }
  }
  await touchRoom(roomId);

  return { token, roomId, inviteCode, weddingDate: "" };
}

export async function authJoin({
  data,
}: {
  data: { inviteCode: string; password: string };
}): Promise<WeddingSession> {
  const code = data.inviteCode.trim().toUpperCase();
  const invite = await kvGet<{ roomId: string }>(`invite:${code}`);
  if (!invite) throw new Error("Invalid invite code");
  const room = await kvGet<{ passwordHash: string; inviteCode: string; weddingDate: string }>(
    `room:${invite.roomId}`,
  );
  if (!room) throw new Error("Room missing");
  const hash = await hashPassword(data.password);
  if (hash !== room.passwordHash) throw new Error("Wrong password");
  const token = randId(48);
  await kvSet(`sess:${token}`, { roomId: invite.roomId, createdAt: nowIso() });
  return {
    token,
    roomId: invite.roomId,
    inviteCode: room.inviteCode,
    weddingDate: room.weddingDate ?? "",
  };
}

export async function authMe({ data }: { data: { token: string } }): Promise<WeddingSession> {
  const { roomId } = await resolveSession(data.token);
  const room = await kvGet<{ inviteCode: string; weddingDate: string }>(`room:${roomId}`);
  if (!room) throw new Error("Room missing");
  return {
    token: data.token,
    roomId,
    inviteCode: room.inviteCode,
    weddingDate: room.weddingDate ?? "",
  };
}

export async function authLogout({ data }: { data: { token: string } }): Promise<{ ok: boolean }> {
  await kvDel(`sess:${data.token}`);
  return { ok: true };
}

// -------------------------- WEDDING SETTINGS --------------------------

export async function setWeddingDate({
  data,
}: {
  data: { token: string; weddingDate: string };
}): Promise<{ ok: boolean }> {
  const { roomId } = await resolveSession(data.token);
  const room = await kvGet<Record<string, unknown>>(`room:${roomId}`);
  if (!room) throw new Error("Room missing");
  await kvSet(`room:${roomId}`, { ...room, weddingDate: data.weddingDate });
  await touchRoom(roomId);
  return { ok: true };
}

// -------------------------- DATA / SYNC --------------------------

export async function loadAll({ data }: { data: { token: string } }): Promise<WeddingData> {
  const { roomId } = await resolveSession(data.token);
  const [room, inbox, budget, tasks, vendors, checklist, links, sync] = await Promise.all([
    kvGet<{ weddingDate: string }>(`room:${roomId}`),
    kvGet(`room:${roomId}:inbox`),
    kvGet(`room:${roomId}:budget`),
    kvGet(`room:${roomId}:tasks`),
    kvGet(`room:${roomId}:vendors`),
    kvGet(`room:${roomId}:checklist`),
    kvGet(`room:${roomId}:links`),
    kvGet<{ updatedAt: string }>(`room:${roomId}:sync`),
  ]);
  return {
    weddingDate: room?.weddingDate ?? "",
    inbox: (inbox as WeddingData["inbox"]) ?? [],
    budget: (budget as WeddingData["budget"]) ?? [],
    tasks: (tasks as WeddingData["tasks"]) ?? [],
    vendors: (vendors as WeddingData["vendors"]) ?? [],
    checklist: (checklist as WeddingData["checklist"]) ?? [],
    links: (links as WeddingData["links"]) ?? [],
    updatedAt: sync?.updatedAt ?? nowIso(),
  };
}

export async function syncCheck({
  data,
}: {
  data: { token: string };
}): Promise<{ updatedAt: string }> {
  const { roomId } = await resolveSession(data.token);
  const sync = await kvGet<{ updatedAt: string }>(`room:${roomId}:sync`);
  return { updatedAt: sync?.updatedAt ?? "" };
}

export async function putCollection({
  data,
}: {
  data: {
    token: string;
    collection: CollectionName;
    items: unknown[];
  };
}): Promise<{ ok: boolean }> {
  const { roomId } = await resolveSession(data.token);
  await kvSet(`room:${roomId}:${data.collection}`, data.items);
  await touchRoom(roomId);
  return { ok: true };
}
