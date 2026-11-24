import "server-only";

const pending = new Map<string, Promise<string>>();
const attempts = 2;
const timeoutMs = 12000;
const budgetMs = 15000;

export class PublishedReadError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
    this.name = "PublishedReadError";
  }
}

export function publishedReadFailure(error: unknown) {
  return error instanceof PublishedReadError ? error.code : "RELEASE_VALIDATION_FAILED";
}

function networkFailure(error: unknown) {
  return error instanceof TypeError || (error instanceof Error && ["AbortError", "TimeoutError"].includes(error.name));
}

async function requestText(url: string, revalidate: number) {
  const started = Date.now();
  for (let attempt = 0; attempt < attempts; attempt++) {
    let waitMs = 250;
    const remaining = budgetMs - (Date.now() - started);
    if (remaining <= 0) throw new PublishedReadError("SOURCE_TIMEOUT");
    try {
      const response = await fetch(url, { headers: { "User-Agent": "Statistical-Levels-Web" },
        redirect: "error", signal: AbortSignal.timeout(Math.min(timeoutMs, remaining)), next: { revalidate } });
      if (response.ok) return await response.text();
      const retryAfter = response.headers.get("retry-after");
      const rateLimited = response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0";
      const transient = [408, 429].includes(response.status) || response.status >= 500 || rateLimited;
      if (retryAfter !== null) {
        const seconds = Number(retryAfter);
        waitMs = Number.isFinite(seconds) ? Math.max(250, seconds * 1000) : Infinity;
      }
      try { await response.body?.cancel(); } catch { /* Preserve the original upstream failure. */ }
      if (!transient || attempt === attempts - 1 || waitMs > 1000) throw new PublishedReadError("HTTP_" + response.status);
    } catch (error) {
      if (error instanceof PublishedReadError) throw error;
      if (!networkFailure(error)) throw new PublishedReadError("SOURCE_READ_FAILED");
      if (attempt === attempts - 1) throw new PublishedReadError(error instanceof TypeError ? "NETWORK_FAILED" : "SOURCE_TIMEOUT");
    }
    if (Date.now() - started + waitMs >= budgetMs) throw new PublishedReadError("SOURCE_TIMEOUT");
    await new Promise(resolve => setTimeout(resolve, waitMs));
  }
  throw new PublishedReadError("SOURCE_READ_FAILED");
}

export async function readPublishedText(url: string, revalidate: number): Promise<string> {
  const key = JSON.stringify([url, revalidate]);
  let request = pending.get(key);
  if (!request) {
    request = requestText(url, revalidate);
    pending.set(key, request);
  }
  try { return await request; }
  finally { if (pending.get(key) === request) pending.delete(key); }
}
