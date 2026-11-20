'use client';

// Browser-side helpers.

// The UI learns "who am I?" from the plain `cartora_uid` cookie and echoes it
// back in request bodies. That is exactly the trust the server should not place
// in it.
export function getUid(): number | null {
  const match = document.cookie.match(/(?:^|;\s*)cartora_uid=(\d+)/);
  return match ? Number(match[1]) : null;
}

export type ApiResult<T> = { ok: boolean; status: number; data: T };

export async function api<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}
