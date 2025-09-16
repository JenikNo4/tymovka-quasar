const BASE = String(import.meta.env.VITE_API_BASE_URL ?? '');

type PlainHeaders = Record<string, string>;

function toPlain(h?: HeadersInit): PlainHeaders {
  const out: PlainHeaders = {};
  if (!h) return out;
  if (h instanceof Headers) h.forEach((v, k) => (out[k] = v));
  else if (Array.isArray(h)) for (const [k, v] of h) out[String(k)] = String(v);
  else Object.assign(out, h);
  return out;
}

function mergeHeaders(...parts: (HeadersInit | undefined)[]): HeadersInit {
  return parts.reduce<PlainHeaders>((acc, p) => Object.assign(acc, toPlain(p)), {});
}

// ⚠️ odstraní undefined klíče (hlavně body) z RequestInit
function cleanInit(init: RequestInit = {}): RequestInit {
  const { body, headers, ...rest } = init;
  const out: RequestInit = { ...rest };
  if (headers !== undefined) out.headers = headers;
  if (body !== undefined) out.body = body;
  return out;
}

export async function apiGet<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const base = cleanInit(opts);
  const headers = mergeHeaders({ Accept: 'application/json' }, base.headers);

  const res = await fetch(`${BASE}${path}`, {
    ...base,
    method: 'GET',
    credentials: 'include',
    headers,
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body?: unknown, opts: RequestInit = {}): Promise<T> {
  const base = cleanInit(opts);
  const headers = mergeHeaders(
    { Accept: 'application/json', 'Content-Type': 'application/json' },
    base.headers
  );

  const res = await fetch(`${BASE}${path}`, {
    ...base,
    method: 'POST',
    credentials: 'include',
    headers,
    ...(body != null ? { body: JSON.stringify(body) as BodyInit } : {}), // přidej body jen když existuje
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<T>;
}
