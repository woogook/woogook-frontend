export async function fetchWithTimeout(
  input: Parameters<typeof fetch>[0],
  init: RequestInit,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  if (init.signal) {
    if (init.signal.aborted) {
      controller.abort();
    } else {
      init.signal.addEventListener("abort", () => controller.abort(), {
        once: true,
      });
    }
  }

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (
      controller.signal.aborted &&
      !init.signal?.aborted &&
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function applyBasicAuth(
  headers: Headers,
  username?: string,
  password?: string,
) {
  if (!username || !password) {
    return headers;
  }

  headers.set(
    "Authorization",
    `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
  );
  return headers;
}
